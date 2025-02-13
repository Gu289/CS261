from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from .models import Simulation
from .serializers import SimulationSerializer
from django.middleware.csrf import get_token
from .tasks import my_background_task
from .simulation_engine import SimulationEngine
import json

def get_csrf_token(request):
    csrf_token = get_token(request)
    return JsonResponse({"csrf_token": csrf_token},status=200)

def test_background_task(request):
    '''
    This function is called when a POST request is made to the /test-background-task/ endpoint.
    It starts a background task using Celery and returns a JSON response with the task ID.
    '''
    task = my_background_task.delay()
    return JsonResponse({"task_id": task.id},status=200)

def create_simulation(request):
    '''
    This function is called when a POST request is made to the /start-simulation/ endpoint. 
    It creates a new Simulation object in the database with the provided traffic flow parameters and returns a JSON response with the simulation ID and status.
    '''
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except:
            error_message = {
                "Error": "Invalid JSON format",
                "simulation_status": "Not started"
            }
            return JsonResponse(error_message,status=400)
        
        try:
            simulation = Simulation(simulation_status="Not started", junction_config=data)
            simulation.save()
        except Exception as e:
            error_message = {
                "Error": "Failed to create simulation",
                "simulation_status": "Not started",
                "error_message": str(e)
            }
            return JsonResponse(error_message,status=400)
        
        success_message = {
            "message": "Simulation created and saved in the database successfully",
            "simulation_id": simulation.simulation_id,
            "simulation_status": simulation.simulation_status,
            "junction_config": data
        }

        return JsonResponse(success_message,status=200)

    return JsonResponse({"Error": "Invalid request method"},status=405)

def start_simulation(request):
    '''
    This function is called when a POST request is made to the /start-simulation/ endpoint.
    It starts the simulation with the provided simulation_id and returns a JSON response with the simulation status and parameters used.
    '''
    if request.method != 'POST': 
        return JsonResponse({"Error": "Invalid request method"},status=405)

    simulation_id = request.GET.get('simulation_id')
    try:
        simulation = Simulation.objects.get(simulation_id=simulation_id)
    except Simulation.DoesNotExist:
        error_message = {
            "Error": f"Simulation id {simulation_id} not found",
            "simulation_status": "Not found"
        }
        return JsonResponse(error_message,status=404)

    if simulation.simulation_status == "running" or simulation.simulation_status == "completed":
        return JsonResponse({"Error": "Simulation already running or completed"},status=400)

    # TODO: Start simulation with the parameters and returns a boolean, true if successful, false otherwise
    
    # Call the simulation engine to run the simulation.
    engine = SimulationEngine(simulation=simulation, simulationTime=60, timeStep=1)
    engine.runSimulation()
    simulation_results = engine.results 
    # update simulation fields and return a JSON response.


    is_successful = True

    junction_config = simulation.junction_config
    if is_successful:
        simulation.simulation_status = "running"
        simulation.save()
        success_message = {
            "message": "Simulation started and updated successfully",
            "simulation_id": simulation.simulation_id,
            "simulation_status": "running",
            "junction_config": junction_config
        }
        return JsonResponse(success_message,status=200)
    

def check_simulation_status(request):
    '''
    This function is called when a GET request is made to the /check-simulation-status/ endpoint.
    The following tasks are performed:
        1. Parse the simulation_id from the request parameters.
        2. Retrieve the Simulation object from the database using the simulation_id.
        3. Return a JSON response with the simulation status and parameters used.
    '''
    if request.method == 'GET':
        simulation_id = request.GET.get('simulation_id')
        if simulation_id:
            try:
                simulation = Simulation.objects.get(simulation_id=simulation_id)
                simulation_data = {
                    "simulation_id": simulation.simulation_id,
                    "simulation_status": simulation.simulation_status,
                    "junction_config": simulation.junction_config
                }
                return JsonResponse(simulation_data,status=200)
            except Simulation.DoesNotExist:
                error_message = {
                    "Error": f"Simulation id {simulation_id} not found",
                    "simulation_status": "Not found"
                }
                return JsonResponse(error_message,status=404)
        else:
            error_message = {
                "Error": "Simulation ID not provided",
                "simulation_status": "Not found"
            }
            return JsonResponse(error_message,status=400)
    return JsonResponse({"Error": "Invalid request method"},status=405)

def get_completed_simulations(request):
    '''
    This function is called when a GET request is made to the /completed-simulations/ endpoint.
    It retrieves all Simulation objects from the database and returns a JSON response with all simulations.
    '''
    if request.method == 'GET':
        simulations = Simulation.objects.filter(simulation_status = "completed", is_deleted=False)
        serializer = SimulationSerializer(simulations, many=True)
        return JsonResponse(serializer.data,status=200, safe=False)
    return JsonResponse({"Error": "Invalid request method"},status=405)

def delete_simulation(request):
    '''
    This function is called when a DELETE request is made to the /delete-simulation/ endpoint.
    It deletes the Simulation object with the provided simulation_id from the database and returns a JSON response with the status.
    '''
    if request.method == 'DELETE':
        simulation_id = request.GET.get('simulation_id')
        if simulation_id:
            try:
                simulation = Simulation.objects.get(simulation_id=simulation_id)
                simulation.is_deleted = True
                simulation.save()
                success_message = {
                    "message": f"Simulation id {simulation_id} deleted successfully",
                    "simulation_status": "Deleted"
                }
                return JsonResponse(success_message,status=200)
            except Simulation.DoesNotExist:
                error_message = {
                    "Error": f"Simulation id {simulation_id} not found",
                    "simulation_status": "Not found"
                }
                return JsonResponse(error_message,status=404)
        else:
            error_message = {
                "Error": "Simulation ID not provided",
                "simulation_status": "Not found"
            }
            return JsonResponse(error_message,status=400)
    return JsonResponse({"Error": "Invalid request method"},status=405)
