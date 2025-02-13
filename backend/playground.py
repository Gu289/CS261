import os
import django

# Set up Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "traffic_sim.settings")

# Initialize Django
django.setup()

from simulation.simulation_engine import SimulationEngine
from simulation.models import Simulation

def main():
    # Get the simulation instance
    try:
        simulation = Simulation.objects.get(simulation_id=1)
    except Simulation.DoesNotExist:
        raise Exception("Simulation not found")
    
    # Create an instance of the simulation engine
    engine = SimulationEngine(simulation, 10, 1)
    
    # Run the simulation
    engine.runSimulation()
    results = engine.results
    print(results)

if __name__ == "__main__":
    main()

