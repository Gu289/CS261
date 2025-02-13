from django.utils import timezone
from .models import Simulation, Queue, Vehicle
from .junction_classes import Junction, Direction, SimulationResults

class SimulationEngine:
    def __init__(self, simulation, simulationTime, timeStep):
        """
        Initialize the simulation engine.

        Attributes:
            simulationTime (int): Total simulation running time in seconds.
            timeStep (int): The simulation time step in seconds.
            simulation (Simulation): A Simulation model instance with a junction_config.
            junction (Junction): The junction built from simulation.junction_config.
            results (SimulationResults): The simulation results (populated after simulation run).
        """
        self.simulation = simulation
        self.simulationTime = simulationTime
        self.timeStep = timeStep

        # For backwards compatibility, continue using the default queue.
        self.queue, _ = Queue.objects.get_or_create(id=1, defaults={'max_size': 10})
        
        # Create Junction from simulation configuration.
        directions_config = self.simulation.junction_config.get("directions", [])
        directions = []
        for d_conf in directions_config:
            direction_obj = Direction(
                direction_name=d_conf.get("name"),
                incoming_flow_rate=d_conf.get("incoming_flow_rate", 0),
                lane_count=d_conf.get("lane_count", 1),
                exit_distribution=d_conf.get("exit_distribution", {})
            )
            directions.append(direction_obj)
        # Create default directions if none provided.
        if not directions:
            default_names = ["north", "east", "south", "west"]
            directions = [Direction(direction_name=name) for name in default_names]
        self.junction = Junction(directions)
        self.results = None

    def runSimulation(self):
        """
        Runs the simulation over the specified simulationTime using the timeStep.
        Vehicles are enqueued, processed and the junction traffic is updated at each time step.
        At the end, the simulation results are calculated and stored in self.results.
        """
        start_time = timezone.now()
        end_time = start_time + timezone.timedelta(seconds=self.simulationTime)
        current_time = start_time
        iteration = 0

        while current_time < end_time:
            # Create and enqueue a new vehicle.
            new_vehicle = Vehicle.objects.create()
            enqueued = self.queue.enqueue(new_vehicle)
            if not enqueued:
                print(f"Iteration {iteration}: Queue is full. Vehicle {new_vehicle.id} was dropped.")
            else:
                print(f"Iteration {iteration}: Vehicle {new_vehicle.id} enqueued at {timezone.now()}.")

            # Dequeue a vehicle every 2 iterations.
            if iteration % 2 == 0:
                departed_vehicle = self.queue.dequeue()
                if departed_vehicle:
                    print(f"Iteration {iteration}: Vehicle {departed_vehicle.id} dequeued at {timezone.now()}.")

            # Process traffic through the junction.
            self.junction.process_traffic()

            iteration += 1
            current_time += timezone.timedelta(seconds=self.timeStep)
            # You may optionally pause with time.sleep(self.timeStep)

        # After simulation, calculate and store results.
        self.results = self.calculateResults()

    def calculateResults(self):
        """
        Calculates the key traffic metrics based on departed vehicles.
        Returns:
            SimulationResults: An instance containing average_wait_time, max_wait_time, max_queue_length
                               and total_vehicles_processed.
        """
        departed_vehicles = Vehicle.objects.filter(departure_time__isnull=False)
        total_wait_time = 0
        max_wait_time = 0
        count = departed_vehicles.count()

        for vehicle in departed_vehicles:
            wait_time = (vehicle.departure_time - vehicle.arrival_time).total_seconds()
            total_wait_time += wait_time
            if wait_time > max_wait_time:
                max_wait_time = wait_time

        avg_wait_time = total_wait_time / count if count > 0 else 0
        max_queue_length = self.queue.current_size()
        total_processed = Vehicle.objects.filter(queue__isnull=True).count()

        # Create a SimulationResults instance from the junction's directions.
        results = SimulationResults(self.junction.directions)
        results.average_wait_time = avg_wait_time
        results.max_wait_time = max_wait_time
        results.max_queue_length = max_queue_length
        # Optionally, store total vehicles processed if desired.
        results.total_vehicles_processed = total_processed

        return results