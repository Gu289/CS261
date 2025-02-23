from django.utils import timezone
from .models import Simulation, Queue, Vehicle

class SimulationEngine:
    def __init__(self, simulation, time_step=1):
        """
        Initialize the simulation engine.

        Args:
            simulation (Simulation): An instance of the Simulation model containing junction configuration.
            time_step (int): The simulation time step in seconds.
        """
        self.simulation = simulation
        self.time_step = time_step

        # For simplicity, assume we are using a single Queue for our simulation.
        # Here, we retrieve the first available queue or create one if none exist.
        self.queue, created = Queue.objects.get_or_create(id=1, defaults={'max_size': 10})

    def run_simulation(self, simulation_duration):
        """
        Run the simulation for a specified duration.

        Args:
            simulation_duration (int): Duration in seconds for which the simulation will run.

        Returns:
            dict: A dictionary with simulation metrics such as average wait time, maximum wait time, maximum queue length, and total vehicles processed.
        """
        start_time = timezone.now()
        end_time = start_time + timezone.timedelta(seconds=simulation_duration)
        current_time = start_time
        iteration = 0

        # For demonstration purposes, at each time step:
        # - A new vehicle is created and enqueued.
        # - Every 2 iterations, a vehicle is dequeued (if available).
        while current_time < end_time:
            # Create and enqueue a new vehicle.
            new_vehicle = Vehicle.objects.create(vehicle_type="car")
            enqueued = self.queue.enqueue(new_vehicle)
            if not enqueued:
                # Optionally, log that the queue is full and the vehicle was not enqueued.
                print(f"Iteration {iteration}: Queue is full. Vehicle {new_vehicle.id} was dropped.")
            else:
                print(f"Iteration {iteration}: Vehicle {new_vehicle.id} enqueued at {timezone.now()}.")

            # Dequeue a vehicle every 2 iterations.
            if iteration % 2 == 0:
                departed_vehicle = self.queue.dequeue()
                if departed_vehicle:
                    print(f"Iteration {iteration}: Vehicle {departed_vehicle.id} dequeued at {timezone.now()}.")

            iteration += 1
            current_time += timezone.timedelta(seconds=self.time_step)
            # In a real simulation you might want to pause for self.time_step seconds:
            # time.sleep(self.time_step)

        # Calculate simulation metrics after completion.
        avg_wait_time, max_wait_time, max_queue_length = self.calculate_metrics()
        total_processed = Vehicle.objects.filter(queue__isnull=True).count()  # Vehicles that have been dequeued.

        return {
            "average_wait_time": avg_wait_time,
            "max_wait_time": max_wait_time,
            "max_queue_length": max_queue_length,
            "total_vehicles_processed": total_processed,
        }

    def calculate_metrics(self):
        """
        Calculate key traffic metrics based on departed vehicles.

        Returns:
            tuple: (average_wait_time, max_wait_time, max_queue_length)
        """
        departed_vehicles = Vehicle.objects.filter(departure_time__isnull=False)
        total_wait_time = 0
        max_wait_time = 0
        count = departed_vehicles.count()

        for vehicle in departed_vehicles:
            # Calculate the waiting time in seconds.
            wait_time = (vehicle.departure_time - vehicle.arrival_time).total_seconds()
            total_wait_time += wait_time
            if wait_time > max_wait_time:
                max_wait_time = wait_time

        avg_wait_time = total_wait_time / count if count > 0 else 0

        # For simplicity, we use the current queue size as our max queue length.

        max_queue_length = self.queue.current_size()

        return avg_wait_time, max_wait_time, max_queue_length
