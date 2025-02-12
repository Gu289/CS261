import os
from celery import Celery

# Set the environment variable DJANGO_SETTINGS_MODULE to traffic_sim.settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "traffic_sim.settings")

# Create a Celery instance with the name traffic_sim
app = Celery("traffic_sim")

# Load the Celery configuration from the Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Set Celerey to autodiscover tasks from all registered Django apps
app.autodiscover_tasks()
