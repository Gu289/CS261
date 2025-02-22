# myapp/tasks.py
from celery import shared_task
import time

from .models import Simulation
from .simulation_engine import SimulationEngine

@shared_task
def my_background_task():
    time.sleep(10)  # Simulate a long-running process
    return "Task completed in the background."

@shared_task
def run_simulation(simulation_id):
    # Get the simulation instance
    try:
        simulation = Simulation.objects.get(simulation_id=simulation_id)
    except Simulation.DoesNotExist:
        raise Exception("Simulation not found")
    
    # Create an instance of the simulation engine
    engine = SimulationEngine(simulation, 60, 1)
    
    # Run the simulation
    engine.runSimulation()
    results = engine.results

    # Update simulation object in the database.
    simulation.avg_wait_time = results.average_wait_time
    simulation.max_wait_time = results.max_wait_time
    simulation.max_queue_length = results.max_queue_length
    simulation.simulation_status = "completed"
    simulation.save()
    
    print(results)

