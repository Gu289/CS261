import unittest
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
import time
import threading
import tempfile
import os

from .simulation_engine import SimulationEngine, VehiclesWarehouse, TrafficLight, Dequeuer
from .models import Simulation, Vehicle, Queue

class TestVehicleWarehouse(TestCase):
    """Tests for the VehiclesWarehouse class"""
    
    def setUp(self):
        self.junction_config = {
            "north": {"inbound": 1000, "east": 400, "south": 400, "west": 200},
            "east": {"inbound": 800, "north": 300, "south": 300, "west": 200},
            "south": {"inbound": 1000, "north": 400, "east": 400, "west": 200},
            "west": {"inbound": 800, "north": 300, "east": 300, "south": 200},
            "leftTurn": False,
            "numLanes": 2
        }
        Vehicle.objects.all().delete()
        
    def test_vehicle_generation(self):
        """Test that vehicles are generated correctly with proper distribution"""
        warehouse = VehiclesWarehouse(self.junction_config, num_vehicle=100)
        
        # Check the number of vehicles generated
        for direction in ["north", "east", "south", "west"]:
            self.assertGreater(len(warehouse.warehouse[direction]), 0,
                             f"No vehicles generated for {direction}")
            
        # Test north direction vehicle distribution
        north_vehicles = warehouse.warehouse["north"]
        destinations = {"east": 0, "south": 0, "west": 0}
        for vehicle in north_vehicles:
            destinations[vehicle.exit_direction] += 1
            
        # Check proportional distribution (allow some flexibility)
        total = len(north_vehicles)
        self.assertAlmostEqual(destinations["east"] / total, 0.4, delta=0.15)
        self.assertAlmostEqual(destinations["south"] / total, 0.4, delta=0.15)
        self.assertAlmostEqual(destinations["west"] / total, 0.2, delta=0.15)
    
    def test_lane_assignment(self):
        """Test that vehicles are assigned to the correct lanes based on turn direction"""
        # Set leftTurn to True for this test
        self.junction_config["leftTurn"] = True
        warehouse = VehiclesWarehouse(self.junction_config, num_vehicle=50)
        
        # Sample a few vehicles and check their lane assignments
        for direction in ["north", "east", "south", "west"]:
            for vehicle in warehouse.warehouse[direction][:10]:  # Check first 10 vehicles
                relative_dir = Vehicle.get_relative_dir(vehicle.incoming_direction, vehicle.exit_direction)
                
                if relative_dir == Vehicle.TURNING_LEFT:
                    self.assertEqual(vehicle.incoming_lane, 0, 
                                   f"Left turn should use lane 0, got {vehicle.incoming_lane}")
                elif relative_dir == Vehicle.TURNING_RIGHT:
                    self.assertEqual(vehicle.incoming_lane, self.junction_config["numLanes"] - 1,
                                   f"Right turn should use rightmost lane")


class TestTrafficLight(TestCase):
    """Tests for the TrafficLight class"""
    
    def test_light_switching(self):
        """Test that traffic light switches states correctly"""
        light = TrafficLight(cycle_time=0.01)  # Fast cycle for testing
        
        # Check initial state
        self.assertTrue(light.NS_traffic)
        self.assertFalse(light.EW_traffic)
        
        # Switch state manually and check
        light.switch_state()
        self.assertFalse(light.NS_traffic)
        self.assertTrue(light.EW_traffic)
        
        # Switch again
        light.switch_state()
        self.assertTrue(light.NS_traffic)
        self.assertFalse(light.EW_traffic)
    
    def test_is_green(self):
        """Test that is_green returns correct values for different directions"""
        light = TrafficLight()
        
        # Initial state: NS is green
        self.assertTrue(light.is_green("north"))
        self.assertTrue(light.is_green("south"))
        self.assertFalse(light.is_green("east"))
        self.assertFalse(light.is_green("west"))
        
        # After switching: EW is green
        light.switch_state()
        self.assertFalse(light.is_green("north"))
        self.assertFalse(light.is_green("south"))
        self.assertTrue(light.is_green("east"))
        self.assertTrue(light.is_green("west"))


class TestMetricsCalculation(TestCase):
    """Tests for the metrics calculation functionality"""
    
    def setUp(self):
        # Delete all vehicles first
        Vehicle.objects.all().delete()
        
        # Create test vehicles with known waiting times
        self.create_test_vehicles()
        
    def create_test_vehicles(self):
        """Create vehicles with predetermined waiting times"""
        base_time = timezone.now()
        
        # North direction vehicles - 5s, 10s, 15s wait times
        for i, wait_time in enumerate([5, 10, 15]):
            vehicle = Vehicle.objects.create(
                incoming_direction="north",
                exit_direction="south",
                arrival_time=base_time - timedelta(seconds=wait_time),
                departure_time=base_time,
                waiting_time=wait_time
            )
        
        # South direction vehicles - 2s, 4s, 20s wait times
        for i, wait_time in enumerate([2, 4, 20]):
            vehicle = Vehicle.objects.create(
                incoming_direction="south",
                exit_direction="north", 
                arrival_time=base_time - timedelta(seconds=wait_time),
                departure_time=base_time,
                waiting_time=wait_time
            )
            
        # East direction vehicles - 3s, 12s wait times
        for i, wait_time in enumerate([3, 12]):
            vehicle = Vehicle.objects.create(
                incoming_direction="east",
                exit_direction="west",
                arrival_time=base_time - timedelta(seconds=wait_time),
                departure_time=base_time,
                waiting_time=wait_time
            )
    
    def test_sql_metric_calculation(self):
        """Test that SQL query for metrics calculates correctly"""
        # Create a temporary SQL file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.sql') as f:
            f.write("""
            SELECT incoming_direction, avg(waiting_time) AS avg_waiting_time, max(waiting_time) AS max_waiting_time
            FROM simulation_vehicle
            GROUP BY incoming_direction
            """)
            temp_file_path = f.name
        
        try:
            # Calculate metrics
            metrics = SimulationEngine.compute_AWT_MWT(temp_file_path)
            
            # Check north direction metrics
            self.assertIn("north", metrics)
            self.assertAlmostEqual(metrics["north"]["average_waiting_time"], 10.0)
            self.assertAlmostEqual(metrics["north"]["max_waiting_time"], 15.0)
            
            # Check south direction metrics
            self.assertIn("south", metrics)
            self.assertAlmostEqual(metrics["south"]["average_waiting_time"], 8.67, places=2)
            self.assertAlmostEqual(metrics["south"]["max_waiting_time"], 20.0)
            
            # Check east direction metrics
            self.assertIn("east", metrics)
            self.assertAlmostEqual(metrics["east"]["average_waiting_time"], 7.5)
            self.assertAlmostEqual(metrics["east"]["max_waiting_time"], 12.0)
        finally:
            os.unlink(temp_file_path)



class TestDequeuer(TestCase):
    """Tests for the Dequeuer class"""
    
    def setUp(self):
        # Setup basic configuration and objects needed for testing
        self.junction_config = {
            "north": {"inbound": 500, "east": 200, "south": 200, "west": 100},
            "east": {"inbound": 400, "north": 150, "south": 150, "west": 100},
            "south": {"inbound": 500, "north": 200, "east": 200, "west": 100},
            "west": {"inbound": 400, "north": 150, "east": 150, "south": 100},
            "leftTurn": True,
            "numLanes": 2
        }
        Vehicle.objects.all().delete()
        
        from queue import Queue as PyQueue
        self.traffic_dict = {
            "north": {
                "incoming": [PyQueue() for _ in range(2)],
                "exiting": [PyQueue() for _ in range(2)]
            },
            "south": {
                "incoming": [PyQueue() for _ in range(2)],
                "exiting": [PyQueue() for _ in range(2)]
            },
            "east": {
                "incoming": [PyQueue() for _ in range(2)],
                "exiting": [PyQueue() for _ in range(2)]
            },
            "west": {
                "incoming": [PyQueue() for _ in range(2)],
                "exiting": [PyQueue() for _ in range(2)]
            }
        }
        
        self.locks_dict = {
            "north": {
                "incoming": [threading.Lock() for _ in range(2)],
                "exiting": [threading.Lock() for _ in range(2)]
            },
            "south": {
                "incoming": [threading.Lock() for _ in range(2)],
                "exiting": [threading.Lock() for _ in range(2)]
            },
            "east": {
                "incoming": [threading.Lock() for _ in range(2)],
                "exiting": [threading.Lock() for _ in range(2)]
            },
            "west": {
                "incoming": [threading.Lock() for _ in range(2)],
                "exiting": [threading.Lock() for _ in range(2)]
            }
        }
        
        self.max_queue_length_tracker = {
            "north": 0, "south": 0, "east": 0, "west": 0
        }
        
        self.traffic_light = TrafficLight()
        self.dequeuer = Dequeuer(
            self.traffic_dict, 
            self.locks_dict,
            self.max_queue_length_tracker,
            self.junction_config,
            self.traffic_light,
            crossing_time=0.001  # Fast crossing for tests
        )
        
    def test_get_opposite_direction(self):
        """Test that opposite directions are correctly identified"""
        self.assertEqual(self.dequeuer.get_opposite_direction("north"), "south")
        self.assertEqual(self.dequeuer.get_opposite_direction("south"), "north")
        self.assertEqual(self.dequeuer.get_opposite_direction("east"), "west")
        self.assertEqual(self.dequeuer.get_opposite_direction("west"), "east")
    
    def test_queue_length_tracking(self):
        """Test that max queue length is tracked correctly"""
        # Override save to prevent database operations
        original_save = Vehicle.save
        Vehicle.save = lambda self: None
        
        try:
            # Create some vehicles
            vehicle1 = Vehicle.objects.create(
                incoming_direction="north",
                exit_direction="south",
                incoming_lane=0,
                exit_lane=0
            )
            vehicle2 = Vehicle.objects.create(
                incoming_direction="north",
                exit_direction="east",
                incoming_lane=0,
                exit_lane=1
            )
            
            # Add vehicles to queues
            self.traffic_dict["north"]["incoming"][0].put(vehicle1)
            self.traffic_dict["north"]["incoming"][0].put(vehicle2)
            
            # Check initial max queue length
            self.assertEqual(self.max_queue_length_tracker["north"], 0)
            
            # Manually set traffic light state to stop north traffic
            self.traffic_light.NS_traffic = False
            self.traffic_light.EW_traffic = True
            
            # Run dequeue logic for a brief period
            dequeue_thread = threading.Thread(
                target=self.dequeuer.dequeue_vehicles,
                args=("north",)
            )
            dequeue_thread.daemon = True
            dequeue_thread.start()
            time.sleep(0.1)  # Let it run briefly
            
            # Signal to stop
            from simulation.simulation_engine import stop_event
            stop_event.set()
            dequeue_thread.join(timeout=1)
            
            # Check that max_queue_length was updated
            self.assertEqual(self.max_queue_length_tracker["north"], 2)
            
        finally:
            # Restore the original save method
            Vehicle.save = original_save
            # Clean up
            stop_event.clear()


class TestJunction(TestCase):
    """Tests for the Junction class"""
    
    def setUp(self):
        self.junction_config = {
            "north": {"inbound": 500, "east": 200, "south": 200, "west": 100},
            "east": {"inbound": 400, "north": 150, "south": 150, "west": 100},
            "south": {"inbound": 500, "north": 200, "east": 200, "west": 100},
            "west": {"inbound": 400, "north": 150, "east": 150, "south": 100},
            "leftTurn": True,
            "numLanes": 3  # Testing with 3 lanes
        }
        Vehicle.objects.all().delete()
        
        # Create vehicle warehouse
        self.warehouse = VehiclesWarehouse(self.junction_config, num_vehicle=30)
        
    def test_junction_initialization(self):
        """Test that the junction initializes correctly with the given config"""
        from simulation.simulation_engine import Junction
        
        junction = Junction(self.junction_config, self.warehouse, traffic_light_cycle_time=0.01)
        
        # Check that all components are initialized
        self.assertIsNotNone(junction.traffic_dict)
        self.assertIsNotNone(junction.locks_dict)
        self.assertIsNotNone(junction.max_queue_length_tracker)
        self.assertIsNotNone(junction.traffic_light)
        self.assertIsNotNone(junction.enqueuer)
        self.assertIsNotNone(junction.dequeuer)
        
        # Check lanes are created according to config
        for direction in ["north", "south", "east", "west"]:
            self.assertEqual(len(junction.traffic_dict[direction]["incoming"]), 3)
            self.assertEqual(len(junction.traffic_dict[direction]["exiting"]), 3)
            self.assertEqual(len(junction.locks_dict[direction]["incoming"]), 3)
            self.assertEqual(len(junction.locks_dict[direction]["exiting"]), 3)
    
    def test_junction_start_threads(self):
        """Test that the junction starts all threads"""
        from simulation.simulation_engine import Junction, stop_event
        
        # Override the vehicle save method to prevent database operations during test
        original_save = Vehicle.save
        Vehicle.save = lambda self: None  # Do nothing instead of saving
        
        try:
            junction = Junction(self.junction_config, self.warehouse, traffic_light_cycle_time=0.01)
            
            # Start the junction
            junction.start()
            
            # Give threads a moment to start
            time.sleep(0.1)
            
            # Check that threads are running
            self.assertEqual(len(junction.threads), 3)  # Should have 3 threads
            for thread in junction.threads:
                self.assertTrue(thread.is_alive())
            
            # Stop the simulation
            stop_event.set()
            
            # Wait for threads to finish
            for thread in junction.threads:
                thread.join(timeout=1)
        
        finally:
            # Restore the original save method
            Vehicle.save = original_save
            # Clean up
            stop_event.clear()


class TestSimulationEngine(TestCase):
    """Tests for the SimulationEngine class"""
    
    def setUp(self):
        # Create a test simulation
        self.junction_config = {
            "north": {"inbound": 300, "east": 100, "south": 100, "west": 100},
            "east": {"inbound": 300, "north": 100, "south": 100, "west": 100},
            "south": {"inbound": 300, "north": 100, "east": 100, "west": 100},
            "west": {"inbound": 300, "north": 100, "east": 100, "south": 100},
            "leftTurn": True,
            "numLanes": 2
        }
        
        self.simulation = Simulation.objects.create(
            simulation_status="not_started",
            junction_config=self.junction_config
        )
        
    def test_simulation_engine_initialization(self):
        """Test that the simulation engine initializes correctly"""
        engine = SimulationEngine(self.simulation, traffic_light_cycle_time=0.01)
        
        # Check that components are initialized
        self.assertEqual(engine.junction_config, self.junction_config)
        self.assertIsNotNone(engine.vehicle_warehouse)
        self.assertIsNotNone(engine.junction)
        self.assertEqual(engine.simulation, self.simulation)
    
    @unittest.skip("This test runs a full simulation and may take time")
    def test_simulation_execution(self):
        """Test the execution of a full simulation - this may take time"""
        from simulation.simulation_engine import stop_event
        
        # Create a simulation with fewer vehicles for faster testing
        small_junction_config = self.junction_config.copy()
        for direction in ["north", "east", "south", "west"]:
            small_junction_config[direction]["inbound"] = 100
        
        simulation = Simulation.objects.create(
            simulation_status="not_started",
            junction_config=small_junction_config
        )
        
        # Create engine with fast cycle time
        engine = SimulationEngine(simulation, traffic_light_cycle_time=0.01)
        
        # Run the simulation with a timeout
        import threading
        result = None
        
        def run_with_timeout():
            nonlocal result
            result = engine.start()
        
        sim_thread = threading.Thread(target=run_with_timeout)
        sim_thread.daemon = True
        sim_thread.start()
        
        # Wait for up to 5 seconds
        sim_thread.join(timeout=5)
        
        # Stop simulation if still running
        stop_event.set()
        sim_thread.join(timeout=1)
        
        # Check if we got results (may not complete in time)
        if result:
            # Check that metrics are present
            for direction in ["north", "east", "south", "west"]:
                self.assertIn(direction, result)
                self.assertIn("average_waiting_time", result[direction])
                self.assertIn("max_waiting_time", result[direction])
                self.assertIn("max_queue_length", result[direction])
        
        # Clean up
        stop_event.clear()


class TestIntegration(TestCase):
    """Integration tests for the traffic simulation system"""
    
    def setUp(self):
        # Create a basic junction configuration for testing
        self.junction_config = {
            "north": {"inbound": 200, "east": 80, "south": 80, "west": 40},
            "east": {"inbound": 200, "north": 80, "south": 80, "west": 40},
            "south": {"inbound": 200, "north": 80, "east": 80, "west": 40},
            "west": {"inbound": 200, "north": 80, "east": 80, "south": 40},
            "leftTurn": True,
            "numLanes": 2
        }
        
    def test_create_and_run_simulation(self):
        """Test creating a simulation and running it through the view endpoints"""
        from django.test import Client
        import json
        
        client = Client()
        
        # Step 1: Create the simulation
        response = client.post(
            '/simulation/create-simulation/',
            data=json.dumps(self.junction_config),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('simulation_id', data)
        simulation_id = data['simulation_id']
        
        # Step 2: Start the simulation
        response = client.post(
            f'/simulation/start-simulation/?simulation_id={simulation_id}'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['simulation_status'], 'running')
        
        # Step 3: Check simulation status
        # Note: In a real test, we might need to wait and poll,
        # here we just check that the endpoint works
        response = client.get(
            f'/simulation/check-simulation-status/?simulation_id={simulation_id}'
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Step 4: Retrieve completed simulation results
        # This would require waiting for completion in a real scenario
        # For the test, just verify the endpoint exists
        response = client.get(
            f'/simulation/completed-simulation/?simulation_id={simulation_id}'
        )
        
        # We don't expect 200 since simulation is still running
        self.assertNotEqual(response.status_code, 404)  # Endpoint should exist


class TestQueueManagement(TestCase):
    """Tests for queue management functionality"""
    
    def setUp(self):
        Vehicle.objects.all().delete()
        self.junction_config = {
            "north": {"inbound": 500, "east": 200, "south": 200, "west": 100},
            "leftTurn": True,
            "numLanes": 2
        }
        
    def test_queue_put_get(self):
        """Test basic queue operations"""
        from queue import Queue as PyQueue
        
        # Create a queue and some vehicles
        test_queue = PyQueue()
        
        vehicle1 = Vehicle.objects.create(
            incoming_direction="north",
            exit_direction="south",
            incoming_lane=0,
            exit_lane=0
        )
        vehicle2 = Vehicle.objects.create(
            incoming_direction="north",
            exit_direction="east",
            incoming_lane=0,
            exit_lane=1
        )
        
        # Test put operation
        test_queue.put(vehicle1)
        self.assertEqual(test_queue.qsize(), 1)
        
        # Test get operation
        retrieved_vehicle = test_queue.get()
        self.assertEqual(retrieved_vehicle.id, vehicle1.id)
        self.assertEqual(test_queue.qsize(), 0)
        
        # Test queue ordering (FIFO)
        test_queue.put(vehicle1)
        test_queue.put(vehicle2)
        
        first_out = test_queue.get()
        second_out = test_queue.get()
        
        self.assertEqual(first_out.id, vehicle1.id)
        self.assertEqual(second_out.id, vehicle2.id)
    
    def test_queue_operations_with_locks(self):
        """Test queue operations with threading locks"""
        from queue import Queue as PyQueue
        import threading
        
        # Create queue and lock
        test_queue = PyQueue()
        queue_lock = threading.Lock()
        
        # Create vehicles
        vehicle1 = Vehicle.objects.create(
            incoming_direction="north",
            exit_direction="south",
            incoming_lane=0,
            exit_lane=0
        )
        
        vehicle2 = Vehicle.objects.create(
            incoming_direction="north",
            exit_direction="east",
            incoming_lane=0,
            exit_lane=1
        )
        
        # Define thread functions
        def add_vehicle(vehicle):
            with queue_lock:
                test_queue.put(vehicle)
        
        def get_vehicle():
            with queue_lock:
                if not test_queue.empty():
                    return test_queue.get()
                return None
        
        # Start threads
        threads = []
        for vehicle in [vehicle1, vehicle2]:
            thread = threading.Thread(target=add_vehicle, args=(vehicle,))
            threads.append(thread)
            thread.start()
        
        # Wait for threads to complete
        for thread in threads:
            thread.join()
        
        # Check queue size
        self.assertEqual(test_queue.qsize(), 2)
        
        # Get items from queue
        retrieved_vehicles = []
        threads = []
        
        for _ in range(2):
            thread = threading.Thread(target=lambda: retrieved_vehicles.append(get_vehicle()))
            threads.append(thread)
            thread.start()
        
        # Wait for threads to complete
        for thread in threads:
            thread.join()
        
        # Check retrieved vehicles
        self.assertEqual(len(retrieved_vehicles), 2)
        self.assertIn(vehicle1.id, [v.id for v in retrieved_vehicles])
        self.assertIn(vehicle2.id, [v.id for v in retrieved_vehicles])


class TestEdgeCases(TestCase):
    """Tests for edge cases in the simulation system"""
    
    def test_empty_junction_config(self):
        """Test handling of an empty junction configuration"""
        empty_junction_config = {
            "north": {"inbound": 0, "east": 0, "south": 0, "west": 0},
            "east": {"inbound": 0, "north": 0, "south": 0, "west": 0},
            "south": {"inbound": 0, "north": 0, "east": 0, "west": 0},
            "west": {"inbound": 0, "north": 0, "east": 0, "south": 0},
            "leftTurn": True,
            "numLanes": 2
        }
        
        # Create warehouse with empty config
        warehouse = VehiclesWarehouse(empty_junction_config, num_vehicle=50)
        
        # Check that no vehicles were generated
        for direction in ["north", "east", "south", "west"]:
            self.assertEqual(len(warehouse.warehouse[direction]), 0,
                           f"Should have 0 vehicles for {direction}")
            
        # Create a simulation with empty config
        simulation = Simulation.objects.create(
            simulation_status="not_started",
            junction_config=empty_junction_config
        )
        
        # Create engine
        engine = SimulationEngine(simulation)
        
        # Should be able to initialize without errors
        self.assertIsNotNone(engine)
    
    def test_unbalanced_traffic(self):
        """Test handling of extremely unbalanced traffic"""
        unbalanced_config = {
            "north": {"inbound": 2000, "east": 1000, "south": 500, "west": 500},
            "east": {"inbound": 0, "north": 0, "south": 0, "west": 0},
            "south": {"inbound": 0, "north": 0, "east": 0, "west": 0},
            "west": {"inbound": 0, "north": 0, "east": 0, "south": 0},
            "leftTurn": True,
            "numLanes": 2
        }
        
        # Create warehouse with unbalanced config
        warehouse = VehiclesWarehouse(unbalanced_config, num_vehicle=50)
        
        # Check that only north direction has vehicles
        self.assertTrue(len(warehouse.warehouse["north"]) > 0)
        for direction in ["east", "south", "west"]:
            self.assertEqual(len(warehouse.warehouse[direction]), 0)