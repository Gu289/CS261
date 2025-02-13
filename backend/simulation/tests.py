import datetime
from django.test import TestCase
from django.utils import timezone
from .models import Simulation, Vehicle, Queue
from .simulation_engine import SimulationEngine
from .junction_classes import SimulationResults, Junction, Direction

class SimulationEngineTest(TestCase):
    def setUp(self):
        # Create a dummy Simulation instance with a junction_config.
        # Adjust the fields as appropriate for your Simulation model.
        self.simulation = Simulation.objects.create(
            simulation_status="not_started",
            junction_config={
                "directions": [
                    {"name": "north", "incoming_flow_rate": 50, "lane_count": 2, "exit_distribution": {}},
                    {"name": "east", "incoming_flow_rate": 40, "lane_count": 2, "exit_distribution": {}},
                    {"name": "south", "incoming_flow_rate": 30, "lane_count": 1, "exit_distribution": {}},
                    {"name": "west", "incoming_flow_rate": 20, "lane_count": 1, "exit_distribution": {}}
                ]
            }
        )

    def test_run_simulation_results(self):
        """
        Test that after running the simulation the results are calculated and realistic.
        """
        # Instantiate the simulation engine (simulate for 10 seconds with timestep 1)
        engine = SimulationEngine(simulation=self.simulation, simulationTime=10, timeStep=1)
        engine.runSimulation()
        
        # Verify that simulation results are not None.
        self.assertIsNotNone(engine.results)
        
        # Verify that result attributes are of expected types.
        self.assertIsInstance(engine.results.average_wait_time, float)
        self.assertIsInstance(engine.results.max_wait_time, float)
        self.assertIsInstance(engine.results.max_queue_length, int)
        self.assertIsInstance(engine.results.total_vehicles_processed, int)

        # Verify that the calculated metrics are non-negative.
        self.assertGreaterEqual(engine.results.average_wait_time, 0)
        self.assertGreaterEqual(engine.results.max_wait_time, 0)
        self.assertGreaterEqual(engine.results.max_queue_length, 0)
        self.assertGreaterEqual(engine.results.total_vehicles_processed, 0)

    def test_vehicle_processing(self):
        """
        Test that vehicles are created, enqueued and processed during the simulation.
        """
        # Clear any pre-existing queues (if necessary)
        Queue.objects.all().delete()

        # Create a minimal junction configuration.
        self.simulation.junction_config = {
            "directions": [
                {"name": "north", "incoming_flow_rate": 50, "lane_count": 2, "exit_distribution": {}}
            ]
        }
        self.simulation.save()
        
        engine = SimulationEngine(simulation=self.simulation, simulationTime=5, timeStep=1)
        engine.runSimulation()

        # Verify that vehicles exist.
        vehicles = Vehicle.objects.all()
        self.assertTrue(vehicles.count() > 0, "No vehicles were created during the simulation.")

        # Verify that at least some vehicles have been processed (departure_time set)
        processed = Vehicle.objects.filter(departure_time__isnull=False)
        self.assertTrue(processed.count() > 0, "No vehicles were processed (departed).")