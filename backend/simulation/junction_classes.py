from django.utils import timezone
from queue import Queue
import threading
import time, random
import numpy as np

class Vehicle:
    def __init__(self, incoming_lane=1, exit_direction=None):
        self.arrival_time = None       # Timestamp when the Vehicle arrives at the junction.
        self.departure_time = None     # Timestamp when the Vehicle departs from the junction.
        self.exit_direction = exit_direction  # String for the exit direction of the Vehicle.
        self.incoming_lane = incoming_lane    # Integer for the incoming lane number.
     

class Direction:
    def __init__(self, direction_name, incoming_flow_rate=0, lane_count=1):
        self.direction_name = direction_name
        self.incoming_flow_rate = incoming_flow_rate
        self.incoming_lanes = [Queue() for _ in range(lane_count)] # List of Queues for incoming lanes.
        self.outgoing_lanes = [Queue() for _ in range(lane_count)] # List of Queues for outgoing lanes.

class TrafficLight:
    def __init__(self):
        self.state = "red"  # Initial state of the traffic light.

class TrafficLightController:
    def __init__(self, cycle_time=30):
        self.NS_traffic_light = TrafficLight()
        self.EW_traffic_light = TrafficLight()
        self.cycle_time = cycle_time
        self._stop_event = threading.Event()  # Stop signal
        self.thread = None  # Store thread reference

    def run(self):
        while not self._stop_event.is_set():  # Check stop flag
            self.NS_traffic_light.state = "green"
            self.EW_traffic_light.state = "red"
            if self._stop_event.wait(self.cycle_time):  # Allows early exit
                break
            
            self.NS_traffic_light.state = "red"
            self.EW_traffic_light.state = "green"
            if self._stop_event.wait(self.cycle_time):
                break

    def start(self):
        if self.thread is None or not self.thread.is_alive():
            self._stop_event.clear()
            self.thread = threading.Thread(target=self.run)
            self.thread.start()

    def stop(self):
        self._stop_event.set()  # Signal thread to stop
        if self.thread:
            self.thread.join()  # Wait for thread to finish

class SimulationResults:
    def __init__(self, directions):
        self.directions = directions
        self.average_wait_time = 0
        self.max_wait_time = 0
        self.max_queue_length = 0

    def calculate_metrics(self):
        # (optional) Further custom calculations using directions if needed.
        pass

    def generate_report(self):
        report = (
            f"Average wait time: {self.average_wait_time}, "
            f"Max wait time: {self.max_wait_time}, "
            f"Max queue length: {self.max_queue_length}"
        )
        return report

'''
junction_config = {
    "north": {
        "inbound": 0,
        "east": 0,
        "south": 0,
        "west": 0
    },
    "east": {
        "inbound": 0,
        "north": 0,
        "south": 0,
        "west": 0
    },
    "south": {
        "inbound": 0,
        "north": 0,
        "east": 0,
        "west": 0
    },
    "west": {
        "inbound": 0,
        "north": 0,
        "east": 0,
        "south": 0
    },
    "leftTurn": False,
    "numLanes": 2
}
'''

class VehiclesWarehouse:
    
    def __init__(self, junction_config):
        self.warehouse = {
            "north": [],
            "east": [], 
            "south": [],
            "west": []
        }
        self.junction_config = junction_config

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
        n = 10 # Number of vehicles to generate

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
            self.warehouse[direction] = self.generateVehicles(self.junction_config, direction)

        return self.warehouse[direction].pop(0)

class Junction:
    def __init__(self, junction_config):
        self.directions = ["south", "north", "east", "west"] # List of directions at the junction.
        self.TF_controller = TrafficLightController(cycle_time=10) # Initialize the TrafficLightController.
        self.directions = [Direction(direction_name, junction_config[direction_name], junction_config["numLanes"]) for direction_name in self.directions] # Create Direction objects.

    

    # def process_traffic(self):
    #     # Update the traffic light phase.
    #     self.controller.update_phase()
    #     running_direction = self.controller.get_running_direction()
    #     # Process a vehicle from the running direction.
    #     if running_direction:
    #         running_direction.process_queue()

    # def get_traffic_report(self):
    #     return self.controller.generate_report()
    
