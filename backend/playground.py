import queue
import time
import threading
import numpy as np
from queue import Queue
import os
import django
import random


# Set up Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "traffic_sim.settings")

# Initialize Django
django.setup()

from simulation.models import Vehicle
from django.utils import timezone

# Global variables
n = 2  # Number of lanes
stop_event = threading.Event()

junction_config = {
    "north": {
        "inbound": 500,
        "east": 200,
        "south": 150,
        "west": 150
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

traffic_dict = {
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

locks_dict = {
    
    direction: {
        key: [threading.Lock() for _ in range(n)]
        for key in ["incoming", "exiting"]
    }
    for direction in traffic_dict
    
}

locks_dict["warehouse"] = {
    direction: threading.Lock() for direction in traffic_dict
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
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: north-south Traffic Light] {self.NS_traffic}")
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: east-west Traffic Light] {self.EW_traffic}")

    def is_green(self, direction:str):
        with self.lock:
            if direction == "north" or direction == "south":
                return self.NS_traffic
            else :
                return self.EW_traffic
            
    def operation(self):
        while not stop_event.is_set():
            time.sleep(self.cycle_time)
            traffic_light.switch_state() # Switch traffic light state

    def start(self):
        threading.Thread(target=self.operation, daemon=True).start()  
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: Traffic Light] A thread for a traffic light has started.")

class Enqueuer:
    def __init__(self, traffic_dict, locks_dict, vehicle_warehouse, junction_config=junction_config):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.locks_dict = locks_dict
        self.vehicle_warehouse = vehicle_warehouse

    def enqueue_vehicles(self, direction):
        while not vehicle_warehouse.is_empty(direction):
            VPH = self.junction_config[direction]["inbound"]  # Vehicles per hour
            # print(f"[{direction} traffic]: {VPH} vehicles per second")

            VPS = VPH / 3600  # Vehicles per second
            SPV = 1/VPS # Seconds per vehicle

            time.sleep(SPV)

            with self.locks_dict["warehouse"][direction]:
                vehicle = self.vehicle_warehouse.get_vehicle(direction)

            lane = vehicle.lane
            with self.locks_dict[direction]["incoming"][lane]:
                self.traffic_dict[direction]["incoming"][lane].put(vehicle)
                vehicle.arrival_time = timezone.now()
                vehicle.save()

            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} | {direction} traffic, lane {lane}] A new vehicle going to the {vehicle.exit_direction} reached the junction.")
        
        if self.vehicle_warehouse.is_abs_empty():
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] No more vehicles in the warehouse. Stopping the simulation.")
            stop_event.set()

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.enqueue_vehicles, args=(direction,), daemon=True).start()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} | {direction} traffic ] A thread for enqueueing traffic has stared.")


class Dequeuer:
    def __init__(self, traffic_dict, locks_dict, junction_config, traffic_light, crossing_time=0.5):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.traffic_light = traffic_light
        self.locks_dict = locks_dict
        
        self.CROSSING_TIME = crossing_time

    def dequeue_vehicles(self, dir):
        old_q_size = [lane.qsize() for lane in self.traffic_dict[dir]["incoming"]]
        while not stop_event.is_set():
            for index,lane in enumerate(self.traffic_dict[dir]["incoming"]):
                if not lane.empty():
                    self.locks_dict[dir]["incoming"][index].acquire()  
                    vehicle = lane.queue[0] # Peek at the first vehicle in the queue
                    if self.traffic_light.is_green(vehicle.exit_direction):
                        vehicle = lane.get()
                        self.locks_dict[dir]["incoming"][index].release() 

                        incoming_dir = vehicle.incoming_direction
                        exit_dir = vehicle.exit_direction
                        
                        with self.locks_dict[exit_dir]["exiting"][index]:
                            time.sleep(self.CROSSING_TIME) 
                            self.traffic_dict[exit_dir]["exiting"][index].put(vehicle)
                            vehicle.departure_time = timezone.now()
                            vehicle.save()
                            print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} | Vehicle from {incoming_dir} exited to {exit_dir}")

                    else:
                        new_q_size = [lane.qsize() for lane in self.traffic_dict[dir]["incoming"]]
                        if new_q_size != old_q_size:
                            old_q_size = new_q_size
                            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')} | {dir} traffic] Traffic light is red, current queue length: {new_q_size}")
                        self.locks_dict[dir]["incoming"][index].release() 

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.dequeue_vehicles, daemon=True, args=(direction,)).start()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {direction} traffic ] A thread for dequeuing traffic has stared.")

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

        vehicle = {
            "incoming_direction": incoming_direction,
            "exit_direction": exit_direction,
            "lane": random_lane
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

vehicle_warehouse = VehiclesWarehouse(junction_config, 10)
traffic_light = TrafficLight()
enqueuer = Enqueuer(traffic_dict, locks_dict, vehicle_warehouse, junction_config)
dequeuer = Dequeuer(traffic_dict, locks_dict, junction_config, traffic_light)


enqueuer.start()
dequeuer.start()
traffic_light.start()

try:
    while not vehicle_warehouse.is_abs_empty():
        time.sleep(1)
    stop_event.set()
    print("Simulation completed.")
except KeyboardInterrupt:
    stop_event.set()
    print("Simulation stopped.")
