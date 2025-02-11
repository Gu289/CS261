from django.contrib import admin
from django.urls import path, include
from .views import create_simulation, check_simulation_status, start_simulation, get_completed_simulations, delete_simulation

urlpatterns = [
    path('create-simulation/', create_simulation),
    path('start-simulation/', start_simulation),
    path('check-simulation-status/', check_simulation_status),
    path('completed-simulations/', get_completed_simulations),
    path('delete-simulation/', delete_simulation),
]
