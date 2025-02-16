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
south_incoming = Queue()
north_exiting = Queue()
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
        "inbound": 500,
        "north": 150,
        "south": 150,
        "west": 200
    },
    "south": {
        "inbound": 500,
        "north": 100,
        "east":100,
        "west": 300
    },
    "west": {
        "inbound": 500,
        "north": 400,
        "east": 70,
        "south": 30
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

def vehicleBuilder(lane:int, incoming_direction:str, junction_config:dict) -> Vehicle:
    """
    Creates and persists a Vehicle instance based on the provided lane, incoming direction, and junction configuration.
    Parameters:
        lane (int): The lane number from which the vehicle originates.
        incoming_direction (str): The key representing the incoming direction in the junction configuration.
        junction_config (dict): A dictionary containing sub-dictionaries for each direction. Each sub-dictionary 
                                should have an inbound value (first value) followed by exit rates for the available exit directions.
    Returns:
        Vehicle: The created and saved Vehicle instance with the assigned incoming direction, computed exit direction, and lane.
    Notes:
        The function retrieves the inbound flow and exit rates from the junction configuration for the specified incoming direction.
        It then normalizes the exit rates relative to the inbound value to compute a probability distribution.
        Using a random number generator, it selects one of the exit directions according to the computed probabilities and creates
        a Vehicle instance accordingly.
    """

    inbound, *exit_rates = junction_config[incoming_direction].values()
    _, *exit_directions = junction_config[incoming_direction].keys()
    exit_dist = list(np.array(exit_rates)/inbound)

    rng = np.random.default_rng()
    exit_direction = rng.choice(exit_directions, p=exit_dist)

    vehicle = {
        "incoming_direction": incoming_direction,
        "exit_direction": exit_direction,
        "lane": lane
    }

    vehicle = Vehicle.objects.create(**vehicle)
    vehicle.save()

    return vehicle

class Enqueuer:
    def __init__(self, traffic_dict, junction_config=junction_config):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.lock = threading.Lock()

    def enqueue_vehicles(self, direction):
        while not stop_event.is_set():
            # print(f"Trying to enqueue vehicles for {direction} traffic...")
            rng = np.random.default_rng()
            random_lane = rng.integers(0, len(self.traffic_dict[direction]["incoming"]))

            VPH = self.junction_config[direction]["inbound"]  # Vehicles per hour
            # print(f"[{direction} traffic]: {VPH} vehicles per second")

            VPS = VPH / 3600  # Vehicles per second
            rate = 1/VPS
            
            random_delay = rng.exponential(rate)
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {direction} traffic] A new vehicle is arriving in {round(random_delay, 2)}s")
            time.sleep(random_delay)

            vehicle = vehicleBuilder(random_lane, direction, self.junction_config)

            with self.lock:
                self.traffic_dict[direction]["incoming"][random_lane].put(vehicle)
                vehicle.arrival_time = timezone.now()
                vehicle.save()

            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {direction} traffic, lane {random_lane}] A new vehicle reached the junction.")

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.enqueue_vehicles, args=(direction,), daemon=True).start()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {direction} traffic ] A thread for enqueueing traffic has stared.")


class Dequeuer:
    def __init__(self, traffic_dict, junction_config, traffic_light, crossing_time=0.5):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.traffic_light = traffic_light
        self.lock = threading.Lock()
        self.CROSSING_TIME = crossing_time

    def dequeue_vehicles(self, dir):
        old_q_size = [lane.qsize() for lane in self.traffic_dict[dir]["incoming"]]
        while not stop_event.is_set():
            
            if self.traffic_light.is_green(dir):
                for index,lane in enumerate(self.traffic_dict[dir]["incoming"]):
                    if not lane.empty():
                        time.sleep(self.CROSSING_TIME) 
                        with self.lock:
                            vehicle = lane.get()
                            incoming_dir = vehicle.incoming_direction
                            exit_dir = vehicle.exit_direction
                            self.traffic_dict[exit_dir]["exiting"][index].put(vehicle)
                            vehicle.departure_time = timezone.now()
                            vehicle.save()

                        print(f"{time.strftime('%Y-%m-%d %H:%M:%S')}: Vehicle from {incoming_dir} exited to {exit_dir}")
                    # else:
                    #     print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {dir} traffic] Lane {index} is empty.")
            else:
                new_q_size = [lane.qsize() for lane in self.traffic_dict[dir]["incoming"]]
                if new_q_size != old_q_size:
                    old_q_size = new_q_size
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {dir} traffic] Traffic light is red, current queue length: {new_q_size}")

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.dequeue_vehicles, daemon=True, args=(direction,)).start()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {direction} traffic ] A thread for dequeuing traffic has stared.")

class VehiclesWarehouse:
    
    def __init__(self, junction_config, num_vehicle=50):
        self.warehouse = {
            "north": [],
            "east": [], 
            "south": [],
            "west": []
        }
        self.junction_config = junction_config
        self.num_vehicle = num_vehicle

        for d in self.warehouse:
            self.warehouse[d] = self.generateVehicles(junction_config, d)
    
    def generateVehicles(self, junction_config, incoming_direction):
        """
        Generate a list of Vehicle objects based on junction configuration data.
        Args:
            junction_config (dict): Dictionary containing junction configuration with flow rates and lane information.
            incoming_direction (str): The direction from which vehicles are entering the junction.
        Returns:
            list: A shuffled list of Vehicle objects generated according to the flow rates relative to the inbound flow.
        """
        n = self.num_vehicle # Number of vehicles to generate

        vehicles = []
        incoming_flow_rate = junction_config[incoming_direction]["inbound"]
        lane_count = junction_config["numLanes"]
        exit_flow_rates = junction_config[incoming_direction]


        for d,v in enumerate(exit_flow_rates):
            if d == "inbound": continue # Skip the inbound direction
            
            n = round(n*(v/incoming_flow_rate)) # Number of vehicles exiting at this direction
            lane = random.randint(0, lane_count - 1)
            for i in range(n):
                vehicles.append(Vehicle(incoming_direction, lane, d))

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
        return not bool(self.warehouse[direction])


traffic_light = TrafficLight()
enqueuer = Enqueuer(traffic_dict, junction_config)
dequeuer = Dequeuer(traffic_dict, junction_config, traffic_light)

enqueuer.start()
dequeuer.start()
traffic_light.start()


duration = 20 # seconds
start_time = time.time()

while time.time() - start_time < duration:
    time.sleep(1)

stop_event.set()

print("Simulation completed.")
