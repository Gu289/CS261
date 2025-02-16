import queue
import threading
import time
import numpy as np
from queue import Queue

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
            print(f"[north-south Traffic Light] {self.NS_traffic}")
            print(f"[east-west Traffic Light] {self.EW_traffic}")

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
        print("A thread for a traffic light has started.")

def vehicleBuilder(lane, incoming_direction, junction_config):
    inbound, *exit_rates = junction_config[incoming_direction].values()
    _, *exit_directions = junction_config[incoming_direction].keys()
    exit_dist = list(np.array(exit_rates)/inbound)

    rng = np.random.default_rng()
    exit_direction = rng.choice(exit_directions, p=exit_dist)

    vehicle = {
        "type": "car",
        "incoming_direction": incoming_direction,
        "exit_direction": exit_direction,
        "lane": lane
    }
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
            print(f"[{direction} traffic] A new vehicle is arriving in {round(random_delay, 2)}s")
            time.sleep(random_delay)

            vehicle = vehicleBuilder(random_lane, direction, self.junction_config)

            with self.lock:
                self.traffic_dict[direction]["incoming"][random_lane].put(vehicle)

            print(f"[{direction} traffic, lane {random_lane}] A new vehicle reached the junction.")

    def start(self):
        for direction in self.traffic_dict:
            threading.Thread(target=self.enqueue_vehicles, args=(direction,), daemon=True).start()
            print(f"[{direction} traffic ] A thread for incoming traffic has stared.")


class Dequeuer:
    def __init__(self, traffic_dict, junction_config, traffic_light, crossing_time=0.5):
        self.traffic_dict = traffic_dict
        self.junction_config = junction_config
        self.traffic_light = traffic_light
        self.lock = threading.Lock()
        self.CROSSING_TIME = crossing_time

    def dequeue_vehicles(self):
        while not stop_event.is_set():
            time.sleep(self.CROSSING_TIME) 

            for dir in self.traffic_dict:
                if self.traffic_light.is_green(dir):
                    for index,lane in enumerate(self.traffic_dict[dir]["incoming"]):
                        if not lane.empty():
                            with self.lock:
                                item = lane.get()
                                type, incoming_dir, exit_dir, _ = item.values()
                                self.traffic_dict[exit_dir]["exiting"][index].put(item)
                            print(f"Vehicle from {incoming_dir} exited to {exit_dir}")
                        else:
                            print(f"[{dir} traffic] Lane {index} is empty.")
                else:
                    q = [lane.qsize() for lane in self.traffic_dict[dir]["incoming"]]
                    print(f"[{dir} traffic] Traffic light is red, current queue length: {q}")

    def start(self):
        threading.Thread(target=self.dequeue_vehicles, daemon=True).start()
        print("A thread for dequeuing vehicles has started.")

traffic_light = TrafficLight()
enqueuer = Enqueuer(traffic_dict, junction_config)
dequeuer = Dequeuer(traffic_dict, junction_config, traffic_light)

enqueuer.start()
dequeuer.start()
traffic_light.start()


duration = 20  # seconds
start_time = time.time()

while time.time() - start_time < duration:
    time.sleep(1)

stop_event.set()

print("Simulation completed.")
