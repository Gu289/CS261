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
counter = 0
SPEED_FACTOR = 20
stop_event = threading.Event()


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
    def __init__(self, traffic_dict, locks_dict, vehicle_warehouse, junction_config):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.locks_dict = locks_dict
        self.vehicle_warehouse = vehicle_warehouse

    def enqueue_vehicles(self, direction):
        while not self.vehicle_warehouse.is_empty(direction):
            VPH = self.junction_config[direction]["inbound"]  # Vehicles per hour
            VPS = VPH / 3600  # Vehicles per second
            SPV = 1/VPS # Seconds per vehicle
            
            time.sleep(SPV / SPEED_FACTOR)

            with self.locks_dict["warehouse"][direction]:
                vehicle = self.vehicle_warehouse.get_vehicle(direction)

            incoming_lane = vehicle.incoming_lane
            # with self.locks_dict[direction]["incoming"][incoming_lane]:
            #     self.traffic_dict[direction]["incoming"][incoming_lane].put(vehicle)
            #     vehicle.arrival_time = timezone.now()
            #     vehicle.save()
            self.traffic_dict[direction]["incoming"][incoming_lane].put(vehicle)
            vehicle.arrival_time = timezone.now()
            vehicle.save()

            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} {direction} traffic, lane {incoming_lane}] A new vehicle going to the {vehicle.exit_direction} reached the junction.")
        
        if self.vehicle_warehouse.is_one_empty():
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] No more vehicles in the warehouse. Stopping the simulation.")
            stop_event.set()

    def start(self):
        for direction in self.traffic_dict:
            # Only start threads for directions with inbound traffic
            if self.junction_config[direction]["inbound"] > 0:
                threading.Thread(target=self.enqueue_vehicles, args=(direction,), daemon=True).start()
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} {direction} traffic ] Thread for enqueueing traffic has started.")

class Dequeuer:
    def __init__(self, traffic_dict, locks_dict, max_queue_length_tracker, junction_config, traffic_light, crossing_time=1/SPEED_FACTOR):   
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
        global counter

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
                    
                    with self.locks_dict[dir]["incoming"][index]:

                        if lane.empty():
                            continue
                    
                    # Peek at the first vehicle in the queue
                    vehicle = lane.queue[0] 
                            
                    # Check if the traffic light is green for the incoming direction of the vehicle
                    if self.traffic_light.is_green(vehicle.incoming_direction): 

                        # Check if the vehicle is turning right
                        if vehicle.get_relative_dir(vehicle.incoming_direction, vehicle.exit_direction) == Vehicle.TURNING_RIGHT:  
                            # Need to check ALL lanes from the opposite direction
                            opp_dir = self.get_opposite_direction(vehicle.incoming_direction)
                            
                            # Try to acquire locks for all opposite direction lanes
                            acquired_locks = []
                            try:
                                # Try to acquire all locks for opposite lanes
                                for opp_idx in range(len(self.traffic_dict[opp_dir]["incoming"])):
                                    opp_lane_lock = self.locks_dict[opp_dir]["incoming"][opp_idx]
                                    if not opp_lane_lock.acquire(blocking=False):
                                        # If can't get any lock, release all acquired locks and try again later
                                        for lock in acquired_locks:
                                            lock.release()
                                        continue  # Skip this vehicle for now
                                    acquired_locks.append(opp_lane_lock)
                                    
                                # Check all opposite lanes for vehicles going straight
                                straight_going_vehicles = []
                                for opp_idx, opp_lane in enumerate(self.traffic_dict[opp_dir]["incoming"]):
                                    if not opp_lane.empty():
                                        opp_vehicle = opp_lane.queue[0]
                                        
                                        if (opp_vehicle.get_relative_dir(opp_vehicle.incoming_direction, 
                                            opp_vehicle.exit_direction) == Vehicle.GOING_STRAIGHT and
                                            self.traffic_light.is_green(opp_vehicle.incoming_direction)):
                                            
                                            # Found a straight-going vehicle with right of way
                                            # Get the vehicle and add to our processing list
                                            opp_vehicle = opp_lane.get()
                                            straight_going_vehicles.append((opp_idx, opp_vehicle))
                                
                                # Process all straight-going vehicles first
                                for opp_idx, opp_vehicle in straight_going_vehicles:
                                    incoming_dir = opp_vehicle.incoming_direction
                                    exit_dir = opp_vehicle.exit_direction
                                    exit_lane = opp_vehicle.exit_lane
                                    
                                    with self.locks_dict[exit_dir]["exiting"][exit_lane]:
                                        opp_vehicle.departure_time = timezone.now()
                                        time_diff = (opp_vehicle.departure_time - opp_vehicle.arrival_time).total_seconds()
                                        opp_vehicle.waiting_time = time_diff
                                        opp_vehicle.save()
                                        time.sleep(self.CROSSING_TIME)
                                        self.traffic_dict[exit_dir]["exiting"][exit_lane].put(opp_vehicle)
                                        print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} [RIGHT-OF-WAY] Vehicle{opp_vehicle.id} from {incoming_dir} lane {opp_idx} went straight to {exit_dir}, waited for {time_diff*SPEED_FACTOR}")
                                
                                # If we processed any straight-going vehicles, skip this cycle for the right-turning vehicle
                                if straight_going_vehicles:
                                    continue
                                    
                            finally:
                                # Always release all acquired locks
                                for lock in acquired_locks:
                                    lock.release()
                        
                        vehicle = lane.get()

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
                            print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} Vehicle{vehicle.id} from {incoming_dir} exited to {exit_dir}, waited for {time_diff*SPEED_FACTOR}")
                        
                        counter += 1
                        print(f"COUNTERR: {counter}")

                    else:
                        self.max_queue_length_tracker[dir] = max(self.max_queue_length_tracker[dir], lane.qsize())
                        new_q_size = [lane.qsize() for lane in self.traffic_dict[dir]["incoming"]]
                        if new_q_size != old_inc_q_size:
                            old_inc_q_size = new_q_size
                            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} {dir} traffic] Traffic light is red, current queue length: {new_q_size}")
                       

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
        lane_count = self.junction_config["numLanes"]
        random_lane = random.randint(0,  lane_count - 1)
        relative_dir = Vehicle.get_relative_dir(incoming_direction, exit_direction)
        match relative_dir:
            case Vehicle.TURNING_LEFT:
                incoming_lane = 0
            case Vehicle.GOING_STRAIGHT:
                if self.junction_config["leftTurn"]:
                    # For straight, use any lane except left turn lane (which is 0)
                    incoming_lane = random.randint(1, lane_count - 1)
                else:
                    incoming_lane = random_lane
            case Vehicle.TURNING_RIGHT:
                incoming_lane = lane_count - 1
            case _:
                incoming_lane = random_lane
        
       
        #create vehicle
        vehicle = Vehicle.objects.create(
            incoming_direction=incoming_direction,
            exit_direction=exit_direction,
            incoming_lane=incoming_lane,
            exit_lane=list(range(lane_count))[::-1][incoming_lane]  
        )
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
        # Skip directions with no inbound traffic
        if incoming_flow_rate == 0:
            return vehicles
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
    
    def is_one_empty(self):
        with self.lock:
            return any([not bool(self.warehouse[d]) for d in self.warehouse])
        
    def is_abs_empty(self):
        with self.lock:
            return all([not bool(self.warehouse[d]) for d in self.warehouse])

class Junction:
    def __init__(self, junction_config, vehicle_warehouse, traffic_light_cycle_time=20/SPEED_FACTOR):
        self.junction_config = junction_config
        self.vehicle_warehouse = vehicle_warehouse
        lane_count = self.junction_config["numLanes"]
        self.traffic_dict = {
            "north": {
                "incoming": [Queue() for _ in range(lane_count)],
                "exiting": [Queue() for _ in range(lane_count)]
            },
            "south": {
                "incoming": [Queue() for _ in range(lane_count)],
                "exiting": [Queue() for _ in range(lane_count)]
            },
            "east": {
                "incoming": [Queue() for _ in range(lane_count)],
                "exiting": [Queue() for _ in range(lane_count)]
            },
            "west": {
                "incoming": [Queue() for _ in range(lane_count)],
                "exiting": [Queue() for _ in range(lane_count)]
            }
        }

        self.locks_dict = {
            
            direction: {
                key: [threading.Lock() for _ in range(lane_count)]
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
        self.threads = []

    def start(self):
        # Create threads with references
        enqueuer_thread = threading.Thread(target=self.enqueuer.start, daemon=True)
        dequeuer_thread = threading.Thread(target=self.dequeuer.start, daemon=True)
        traffic_light_thread = threading.Thread(target=self.traffic_light.start, daemon=True)
        
        # Start threads
        enqueuer_thread.start()
        dequeuer_thread.start()
        traffic_light_thread.start()
        
        # Store references
        self.threads = [enqueuer_thread, dequeuer_thread, traffic_light_thread]

class SimulationEngine:
    def __init__(self, simulation:Simulation, traffic_light_cycle_time=3):
        global stop_event
        stop_event = threading.Event()
        
        self.junction_config = simulation.junction_config
        self.vehicle_warehouse = VehiclesWarehouse(self.junction_config, 50)
        self.junction = Junction(self.junction_config, self.vehicle_warehouse, traffic_light_cycle_time)
        self.simulation = simulation

    @classmethod
    def compute_AWT_MWT(cls, path_to_queries):
        with open(path_to_queries, "r") as file:
            sql_query = file.read()
        
        with connection.cursor() as cursor:
            cursor.execute(sql_query)
            result = cursor.fetchall()         
        metrics = {}
        for direction, average_waiting_time, max_waiting_time in result:
            metrics[direction] = {
                'average_waiting_time': average_waiting_time,
                'max_waiting_time': max_waiting_time
            }

        return metrics
    
    def calculate_efficiency_score(metrics):
        """
        Calculate the overall efficiency score for a traffic junction configuration.
        
        For each direction, the following steps are performed:
          1. Apply min–max normalization to the average waiting time,
             maximum waiting time, and maximum queue length across directions.
          2. Invert each normalized value (since lower values are better).
          3. Compute a weighted score:
                0.5 * (inverted average waiting time) +
                0.25 * (inverted maximum waiting time) +
                0.25 * (inverted maximum queue length)
        
        The final efficiency score is the average of the per-direction scores, scaled to 0-100.
        """
        directions = list(metrics.keys())
        
        # Gather raw metric lists, might include None
        avg_waits = [metrics[d]["average_waiting_time"] for d in directions]
        max_waits = [metrics[d]["max_waiting_time"] for d in directions]
        max_queues = [metrics[d]["max_queue_length"] for d in directions]
        
        # For avg and max wait times, replace None by the worst-case (max) among the valid entries.
        valid_avg = [x for x in avg_waits if x is not None]
        valid_max = [x for x in max_waits if x is not None]
        avg_wait_max = max(valid_avg) if valid_avg else 0
        avg_wait_min = min(valid_avg) if valid_avg else 0
        max_wait_max = max(valid_max) if valid_max else 0
        max_wait_min = min(valid_max) if valid_max else 0

        updated_metrics = {}
        for d in directions:
            updated_metrics[d] = {
                "average_waiting_time": metrics[d]["average_waiting_time"] if metrics[d]["average_waiting_time"] is not None else avg_wait_max,
                "max_waiting_time": metrics[d]["max_waiting_time"] if metrics[d]["max_waiting_time"] is not None else max_wait_max,
                "max_queue_length": metrics[d]["max_queue_length"]
            }
        
        total_score = 0
        for d in directions:
            av = updated_metrics[d]["average_waiting_time"]
            mw = updated_metrics[d]["max_waiting_time"]
            mq = updated_metrics[d]["max_queue_length"]
            
            # Normalize average waiting time and invert
            if avg_wait_max > avg_wait_min:
                norm_av = (av - avg_wait_min) / (avg_wait_max - avg_wait_min)
            else:
                norm_av = 0
            inv_av = 1 - norm_av
            
            # Normalize maximum waiting time and invert
            if max_wait_max > max_wait_min:
                norm_mw = (mw - max_wait_min) / (max_wait_max - max_wait_min)
            else:
                norm_mw = 0
            inv_mw = 1 - norm_mw
            
            # Normalize maximum queue length and invert.
            # These values come from the tracker, so they are assumed numeric.
            queue_min = min(max_queues)
            queue_max = max(max_queues)
            if queue_max > queue_min:
                norm_mq = (mq - queue_min) / (queue_max - queue_min)
            else:
                norm_mq = 0
            inv_mq = 1 - norm_mq
            
            # Apply weights: 50% average wait, 25% max wait, 25% max queue length.
            direction_score = 0.5 * inv_av + 0.25 * inv_mw + 0.25 * inv_mq
            total_score += direction_score
            
        overall_score = (total_score / len(directions)) * 100  # Scale to 0-100 range
        return round(overall_score, 1)
    

    def start(self):
        '''
        Run the simulation and return the metrics upon completion.
        '''
        self.junction.start()
        try:
            # Main simulation loop
            while not stop_event.is_set() and not self.vehicle_warehouse.is_abs_empty():
                time.sleep(1)
                
            # Signal threads to stop
            stop_event.set()
            print("Simulation completed.")
            print("Computing metrics...")
            
            # Wait for threads to finish
            for thread in self.junction.threads:
                thread.join(timeout=5)
                
            # Calculate metrics
            path_to_queries = r"queries\compute_AWT_MWT.sql"
            metrics = SimulationEngine.compute_AWT_MWT(path_to_queries)
            
            # Add queue lengths to metrics
            for dir in metrics:
                metrics[dir]["max_queue_length"] = self.junction.max_queue_length_tracker[dir]
            
            # IMPORTANT: Calculate the efficiency score
            efficiency_score = SimulationEngine.calculate_efficiency_score(metrics)
            print(f"Efficiency Score: {efficiency_score}")
            
            # Return BOTH metrics AND efficiency_score
            return {
                "metrics": metrics,
                "efficiency_score": efficiency_score
            }

        except KeyboardInterrupt:
            stop_event.set()
            print("Simulation stopped.")
        
        finally:
            # Wait for threads to finish if they haven't already
            for thread in self.junction.threads:
                if thread.is_alive():
                    thread.join(timeout=2)
            
            Vehicle.objects.all().delete()
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM simulation_vehicle;")
                cursor.execute("DELETE FROM sqlite_sequence WHERE name='simulation_vehicle';")
            
            print("Vehicle table was reset.")


# simulation = Simulation.objects.create(
#     simulation_status="not_started",
#     junction_config=junction_config
# )
# engine = SimulationEngine(simulation)
# engine.start()
