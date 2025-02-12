from django.db import models

class Simulation(models.Model):
    simulation_id = models.AutoField(primary_key=True)
    simulation_status = models.CharField(max_length=50, blank=False)
    max_wait_time = models.FloatField(blank=True, null=True)
    avg_wait_time = models.FloatField(blank=True, null=True)
    max_queue_length = models.IntegerField(blank=True, null=True)
    efficiency_score = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    junction_config = models.JSONField(blank=False)

    def __str__(self):
        return f"Simulation {self.simulation_id}"

<<<<<<< HEAD
from django.utils import timezone

class Queue(models.Model):
    max_size = models.IntegerField(default=10)

    def current_vehicles(self):
        """
        Retrieve vehicles in the queue ordered by their arrival time.
        This serves as a basic ordering for our queue.
        """
        return self.vehicle_set.order_by('arrival_time')
        # Django automatically creates a manager called vehicle_set on each Queue instance.
   
    def enqueue(self, vehicle):
        """
        Adds a vehicle to the queue if there is available space.
        Returns True if the vehicle was successfully enqueued, otherwise False.
        """
        if self.vehicle_set.count() < self.max_size:
            # Set the vehicle's queue to this queue and save it
            vehicle.queue = self
            vehicle.arrival_time = timezone.now()  # Capture the time of enqueuing
            vehicle.save()
            return True
        return False

    def dequeue(self):
        """
        Removes and returns the first vehicle in the queue.
        If the queue is empty, returns None.
        """
        vehicles = list(self.current_vehicles())
        if vehicles:
            first_vehicle = vehicles[0]
            # Mark the vehicle's departure time before removing it
            first_vehicle.departure_time = timezone.now()
            first_vehicle.save()
            # For simulation purposes, we might simply remove the vehicle from the queue
            first_vehicle.queue = None
            first_vehicle.save()
            return first_vehicle
        return None

    def current_size(self):
        """
        Returns the current number of vehicles in the queue.
        """
        return self.vehicle_set.count()

    def __str__(self):
        return f"Queue (Current: {self.current_size()}/{self.max_size})"


class Vehicle(models.Model):
    # AutoField 'id' is added by default as the primary key.
    arrival_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    # Establish a ForeignKey relationship; a vehicle belongs to one queue (nullable in case it's not enqueued).
    queue = models.ForeignKey(Queue, on_delete=models.SET_NULL, null=True, blank=True)


    def __str__(self):
        return f"Vehicle {self.id} ({self.vehicle_type}) - Arrived: {self.arrival_time}, Departed: {self.departure_time}"
=======
>>>>>>> origin/api
