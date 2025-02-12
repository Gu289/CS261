# myapp/tasks.py
from celery import shared_task
import time

@shared_task
def my_background_task():
    time.sleep(10)  # Simulate a long-running process
    return "Task completed in the background."
