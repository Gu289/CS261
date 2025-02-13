from django.utils import timezone
from .models import Queue, Vehicle

class Direction:
    def __init__(self, direction_name, incoming_flow_rate=0, lane_count=1, exit_distribution=None):
        self.direction_name = direction_name
        self.incoming_flow_rate = incoming_flow_rate
        self.lane_count = lane_count
        # For each direction we assume a separate queue; adjust as needed.
        self.queue, _ = Queue.objects.get_or_create(id=hash(direction_name) % 100000, defaults={'max_size': 10})
        self.exit_distribution = exit_distribution or {}

    def add_to_queue(self, vehicle):
        # Add vehicle to this direction’s queue.
        vehicle.queue = self.queue
        vehicle.arrival_time = timezone.now()
        vehicle.save()
        return True

    def remove_from_queue(self):
        # Dequeue a vehicle from the associated queue.
        return self.queue.dequeue()

    def process_queue(self):
        # For demonstration, simply dequeue one vehicle.
        return self.remove_from_queue()


class TrafficLightController:
    def __init__(self, directions, cycle_time=30):
        # Use the names of directions to drive the light sequence.
        self.directions = directions  # List of Direction objects
        self.sequence = [d.direction_name for d in directions]
        self.current_phase_index = 0
        self.cycle_time = cycle_time
        self.current_phase = self.sequence[self.current_phase_index]
        self.phase_start_time = timezone.now()

    def update_phase(self):
        if (timezone.now() - self.phase_start_time).total_seconds() >= self.cycle_time:
            self.current_phase_index = (self.current_phase_index + 1) % len(self.sequence)
            self.current_phase = self.sequence[self.current_phase_index]
            self.phase_start_time = timezone.now()

    def get_running_direction(self):
        for d in self.directions:
            if d.direction_name == self.current_phase:
                return d
        return None

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
    
    def __str__(self):
        return self.generate_report()


class Junction:
    def __init__(self, directions):
        self.directions = directions  # List of Direction objects
        self.controller = TrafficLightController(directions=directions, cycle_time=30)

    def process_traffic(self):
        # Update the traffic light phase.
        self.controller.update_phase()
        running_direction = self.controller.get_running_direction()
        # Process a vehicle from the running direction.
        if running_direction:
            running_direction.process_queue()

    def get_traffic_report(self):
        return self.controller.generate_report()