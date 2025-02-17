import queue
import time
import threading
import numpy as np
from queue import Queue
import os
import django


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

locks_dict = {
    direction: {
        key: [threading.Lock() for _ in range(n)]
        for key in ["incoming", "exiting"]
    }
    for direction in traffic_dict
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
    def __init__(self, traffic_dict, locks_dict, junction_config=junction_config):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.locks_dict = locks_dict

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

            with self.locks_dict[direction]["incoming"][random_lane]:
                self.traffic_dict[direction]["incoming"][random_lane].put(vehicle)
                vehicle.arrival_time = timezone.now()
                vehicle.save()

            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {direction} traffic, lane {random_lane}] A new vehicle going to the {vehicle.exit_direction} reached the junction.")

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.enqueue_vehicles, args=(direction,), daemon=True).start()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {direction} traffic ] A thread for enqueueing traffic has stared.")


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
                            self.traffic_dict[exit_dir]["exiting"][index].put(vehicle)
                            vehicle.departure_time = timezone.now()
                            vehicle.save()

                        time.sleep(self.CROSSING_TIME) 
                        print(f"{time.strftime('%Y-%m-%d %H:%M:%S')}: Vehicle from {incoming_dir} exited to {exit_dir}")
                    else:
                        new_q_size = [lane.qsize() for lane in self.traffic_dict[dir]["incoming"]]
                        if new_q_size != old_q_size:
                            old_q_size = new_q_size
                            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {dir} traffic] Traffic light is red, current queue length: {new_q_size}")
                        self.locks_dict[dir]["incoming"][index].release() 

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.dequeue_vehicles, daemon=True, args=(direction,)).start()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}: {direction} traffic ] A thread for dequeuing traffic has stared.")


traffic_light = TrafficLight()
enqueuer = Enqueuer(traffic_dict, locks_dict, junction_config)
dequeuer = Dequeuer(traffic_dict, locks_dict, junction_config, traffic_light)

enqueuer.start()
dequeuer.start()
traffic_light.start()


duration = 20  # seconds
start_time = time.time()

while time.time() - start_time < duration:
    time.sleep(1)

stop_event.set()

print("Simulation completed.")
