import time, threading, numpy as np, os, django, random, sys
from queue import Queue
from django.db import connection
from django.utils import timezone
from django.conf import settings

# Set up Django settings
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))) 
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "traffic_sim.settings")

# Initialize Django
django.setup()

# Import Django models and packages
from simulation.models import Vehicle, Simulation

# Global variables
n = 2  # Number of lanes
stop_event = threading.Event()

junction_config = {
    "north": {
        "inbound": 1500,
        "east": 500,
        "south": 200,
        "west": 800
    },
    "east": {
        "inbound": 550,
        "north": 200,
        "south": 150,
        "west": 200
    },
    "south": {
        "inbound": 450,
        "north": 100,
        "east":50,
        "west": 300
    },
    "west": {
        "inbound": 620,
        "north": 400,
        "east": 170,
        "south": 50
    },
    "leftTurn": False,
    "numLanes": 2
}

class TrafficLight:
    def __init__(self, cycle_time=3):
        self.NS_traffic = True
        self.EW_traffic = False
        self.lock = threading.Lock()
        self.cycle_time = cycle_time

    def switch_state(self):
        with self.lock:
            self.NS_traffic, self.EW_traffic = self.EW_traffic, self.NS_traffic
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} north-south Traffic Light] {self.NS_traffic}")
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} east-west Traffic Light] {self.EW_traffic}")

    def is_green(self, direction:str):
        with self.lock:
            if direction == "north" or direction == "south":
                return self.NS_traffic
            else :
                return self.EW_traffic
            
    def operation(self):
        while not stop_event.is_set():
            time.sleep(self.cycle_time)
            self.switch_state() # Switch traffic light state

    def start(self):
        threading.Thread(target=self.operation, daemon=True).start()  
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} Traffic Light] A thread for a traffic light has started.")

class Enqueuer:
    def __init__(self, traffic_dict, locks_dict, vehicle_warehouse, junction_config=junction_config):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.locks_dict = locks_dict
        self.vehicle_warehouse = vehicle_warehouse

    def enqueue_vehicles(self, direction):
        while not self.vehicle_warehouse.is_empty(direction):
            VPH = self.junction_config[direction]["inbound"]  # Vehicles per hour
            # print(f"[{direction} traffic]: {VPH} vehicles per second")

            VPS = VPH / 3600  # Vehicles per second
            SPV = 1/VPS # Seconds per vehicle

            time.sleep(SPV)

            with self.locks_dict["warehouse"][direction]:
                vehicle = self.vehicle_warehouse.get_vehicle(direction)

            incoming_lane = vehicle.incoming_lane
            with self.locks_dict[direction]["incoming"][incoming_lane]:
                self.traffic_dict[direction]["incoming"][incoming_lane].put(vehicle)
                vehicle.arrival_time = timezone.now()
                vehicle.save()

            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} {direction} traffic, lane {incoming_lane}] A new vehicle going to the {vehicle.exit_direction} reached the junction.")
        
        if self.vehicle_warehouse.is_abs_empty():
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] No more vehicles in the warehouse. Stopping the simulation.")
            stop_event.set()

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.enqueue_vehicles, args=(direction,), daemon=True).start()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} {direction} traffic ] A thread for enqueueing traffic has stared.")


class Dequeuer:
    def __init__(self, traffic_dict, locks_dict, max_queue_length_tracker, junction_config, traffic_light, crossing_time=0.5):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.traffic_light = traffic_light
        self.locks_dict = locks_dict
        self.max_queue_length_tracker = max_queue_length_tracker
        
        self.CROSSING_TIME = crossing_time
    
    @staticmethod
    def get_opposite_direction(incoming_direction):
        match incoming_direction:
            case "north":
                return "south"
            case "south":
                return "north"
            case "east":
                return "west"
            case "west":  
                return "east"


    def dequeue_vehicles(self, dir):
        # Initialize the old queue size for the incoming lanes
        old_inc_q_size = [int(lane.qsize()) for lane in self.traffic_dict[dir]["incoming"]]

        # Initialize the old queue size for the exiting lanes
        old_ext_q_size = [int(lane.qsize()) for lane in self.traffic_dict[dir]["exiting"]]

        # Dequeue vehicles as long as the stop event is not set, i.e., the simulation is not stopped
        while not stop_event.is_set():

            # Iterate over the lanes in the direction this function is handling
            for index,lane in enumerate(self.traffic_dict[dir]["incoming"]):

                # Check if the lane is not empty
                if not lane.empty():
                    # Acquire the lock for this particular lane
                    self.locks_dict[dir]["incoming"][index].acquire()  
                    
                    # Peek at the first vehicle in the queue
                    vehicle = lane.queue[0] 
                            
                    # Check if the traffic light is green for the incoming direction of the vehicle
                    if self.traffic_light.is_green(vehicle.incoming_direction): 
                        vehicle = lane.get()
                        self.locks_dict[dir]["incoming"][index].release() 

                        # Check if the vehicle is and can cross the junction
                        if vehicle.get_relative_dir(vehicle.incoming_direction, vehicle.exit_direction) == Vehicle.TURNING_RIGHT:  
                            # Check if the adjacent lane is empty
                            opp_dir = self.get_opposite_direction(vehicle.incoming_direction)
                            new_ext_q_size = [int(lane.qsize()) for lane in self.traffic_dict[opp_dir]["incoming"]]
                            if new_ext_q_size != [0 for _ in range(self.junction_config["numLanes"])]:
                                if new_ext_q_size != old_ext_q_size:
                                    old_ext_q_size = new_ext_q_size
                                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} {dir} traffic] Vehicle from {vehicle.incoming_direction} is turning right but the adjacent lane is not empty:{new_ext_q_size}")
                                continue

                        incoming_dir = vehicle.incoming_direction
                        exit_dir = vehicle.exit_direction
                        exit_lane = vehicle.exit_lane
                        
                        with self.locks_dict[exit_dir]["exiting"][exit_lane]:
                            vehicle.departure_time = timezone.now()
                            time_diff = (vehicle.departure_time - vehicle.arrival_time).total_seconds()
                            vehicle.waiting_time = time_diff
                            vehicle.save()
                            time.sleep(self.CROSSING_TIME) 
                            self.traffic_dict[exit_dir]["exiting"][exit_lane].put(vehicle)
                            print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} Vehicle from {incoming_dir} exited to {exit_dir}, waited for {time_diff}")

                    else:
                        self.max_queue_length_tracker[dir] = max(self.max_queue_length_tracker[dir], lane.qsize())
                        new_q_size = [lane.qsize() for lane in self.traffic_dict[dir]["incoming"]]
                        if new_q_size != old_inc_q_size:
                            old_inc_q_size = new_q_size
                            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} {dir} traffic] Traffic light is red, current queue length: {new_q_size}")
                        self.locks_dict[dir]["incoming"][index].release() 

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.dequeue_vehicles, daemon=True, args=(direction,)).start()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} {direction} traffic ] A thread for dequeuing traffic has stared.")

class VehiclesWarehouse:
    
    def __init__(self, junction_config, num_vehicle=50):
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Warehouse is creating vehicles...")
        self.warehouse = {
            "north": [],
            "east": [], 
            "south": [],
            "west": []
        }
        self.junction_config = junction_config
        self.num_vehicle = num_vehicle
        self.lock = threading.Lock()

        for d in self.warehouse:
            self.warehouse[d] = self.generateVehicles(d)

        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Warehouse has been stocked with vehicles.")

    def vehicleBuilder(self, incoming_direction:str, exit_direction:str) -> Vehicle:
        lane_count = junction_config["numLanes"]
        random_lane = random.randint(0,  lane_count - 1)
        relative_dir = Vehicle.get_relative_dir(incoming_direction, exit_direction)
        match relative_dir:
            case Vehicle.TURNING_LEFT:
                incoming_lane = 0
            case Vehicle.GOING_STRAIGHT:
                incoming_lane = random_lane
            case Vehicle.TURNING_RIGHT:
                incoming_lane = lane_count - 1
            case _:
                incoming_lane = random_lane
                
        
        vehicle = {
            "incoming_direction": incoming_direction,
            "exit_direction": exit_direction,
            "incoming_lane": incoming_lane,
            "exit_lane": list(range(lane_count))[::-1][incoming_lane]
        }

        vehicle = Vehicle.objects.create(**vehicle)
        vehicle.save()

        return vehicle
    
    def generateVehicles(self, incoming_direction):
        """
        Generate a list of Vehicle objects based on junction configuration data.
        Args:
            junction_config (dict): Dictionary containing junction configuration with flow rates and lane information.
            incoming_direction (str): The direction from which vehicles are entering the junction.
        Returns:
            list: A shuffled list of Vehicle objects generated according to the flow rates relative to the inbound flow.
        """
        vehicles = []
        incoming_flow_rate = self.junction_config[incoming_direction]["inbound"]
        exit_flow_rates = self.junction_config[incoming_direction]

        for d,v in exit_flow_rates.items():
            if d == "inbound": continue # Skip the inbound direction

            n = round(self.num_vehicle*(v/incoming_flow_rate)) # Number of vehicles exiting at this direction            
            for i in range(n):

                vehicles.append(self.vehicleBuilder(incoming_direction, d))

        vehicles = list(np.random.permutation(vehicles))

        return vehicles
    
    def get_vehicle(self, direction):
        """
        Retrieves a vehicle from the warehouse for the given direction.

        If a vehicle is available in the warehouse for the specified direction, it removes and returns it.
        Otherwise, the warehouse is replenished with new vehicles based on the junction configuration,
        and the function returns None.
        Args:
            direction: The key indicating which directional lane or queue in the warehouse to access.
        Returns:
            The first vehicle from the warehouse if available; otherwise, None.
        """
        if not self.warehouse[direction]:
            raise ValueError("No vehicle available in the warehouse.")

        return self.warehouse[direction].pop(0)
    
    def is_empty(self, direction):
        with self.lock:
            return not bool(self.warehouse[direction])
        
    def is_abs_empty(self):
        with self.lock:
            return all([not bool(self.warehouse[d]) for d in self.warehouse])

class Junction:
    def __init__(self, junction_config, vehicle_warehouse, traffic_light_cycle_time=3):
        self.junction_config = junction_config
        self.vehicle_warehouse = vehicle_warehouse
        self.traffic_dict = {
            "north": {
                "incoming": [Queue() for _ in range(n)],
                "exiting": [Queue() for _ in range(n)]
            },
            "south": {
                "incoming": [Queue() for _ in range(n)],
                "exiting": [Queue() for _ in range(n)]
            },
            "east": {
                "incoming": [Queue() for _ in range(n)],
                "exiting": [Queue() for _ in range(n)]
            },
            "west": {
                "incoming": [Queue() for _ in range(n)],
                "exiting": [Queue() for _ in range(n)]
            }
        }

        self.locks_dict = {
            
            direction: {
                key: [threading.Lock() for _ in range(n)]
                for key in ["incoming", "exiting"]
            }
            for direction in self.traffic_dict
            
        }

        self.locks_dict["warehouse"] = {
            direction: threading.Lock() for direction in self.traffic_dict
        }

        self.max_queue_length_tracker = {
            "north": 0,
            "south": 0,
            "east": 0,   
            "west": 0
        }

        self.traffic_light = TrafficLight(traffic_light_cycle_time)
        self.enqueuer = Enqueuer(self.traffic_dict, self.locks_dict, self.vehicle_warehouse, self.junction_config)
        self.dequeuer = Dequeuer(self.traffic_dict, self.locks_dict, self.max_queue_length_tracker, self.junction_config, self.traffic_light)

    def start(self):
        self.enqueuer.start()
        self.dequeuer.start()
        self.traffic_light.start()

class SimulationEngine:
    def __init__(self, simulation:Simulation, traffic_light_cycle_time=3):
        self.junction_config = simulation.junction_config
        self.vehicle_warehouse = VehiclesWarehouse(junction_config, 2)
        self.junction = Junction(junction_config, self.vehicle_warehouse, traffic_light_cycle_time)

    @classmethod
    def compute_AWT_MWT(cls, path_to_queries):
        with open(path_to_queries, "r") as file:
            sql_query = file.read()
        
        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            result = cursor.fetchall()  # If your query returns results
        
        metrics = {}
        for direction, average_waiting_time, max_waiting_time in result:
            metrics[direction] = {
                'average_waiting_time': average_waiting_time,
                'max_waiting_time': max_waiting_time
            }

        return metrics
    
    def start(self):
        '''
        Run the simulation and return the metrics upon completion.
        '''
        self.junction.start()
        try:
            while not self.vehicle_warehouse.is_abs_empty():
                time.sleep(1)
            stop_event.set()
            print("Simulation completed.")
            print("Computing metrics...")

            path_to_queries = r"queries\compute_AWT_MWT.sql"
            metrics = SimulationEngine.compute_AWT_MWT(path_to_queries)
            for dir in metrics:
                metrics[dir]["max_queue_length"] = self.junction.max_queue_length_tracker[dir]

            return metrics

        except KeyboardInterrupt:
            stop_event.set()
            print("Simulation stopped.")

        finally:
            # Delete all vehicles from the database and reset the primary key sequence
            Vehicle.objects.all().delete()

            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM simulation_vehicle;")
                cursor.execute("DELETE FROM sqlite_sequence WHERE name='simulation_vehicle';")

            print("Vehicle table was reset.")


# simulation = SimulationEngine(junction_config)
# simulation.start()