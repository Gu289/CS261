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
    try:
        engine = SimulationEngine(simulation)
        
        # Run the simulation
        results = engine.start()
        simulation.metrics = results
        simulation.simulation_status = "completed"
        simulation.save()
        
        print(results)
    except Exception as e:
        print(e)
        simulation.simulation_status = "failed"
        simulation.save()

