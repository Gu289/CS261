from django.db import models

class Simulation(models.Model):
    simulation_id = models.AutoField(primary_key=True)
    simulation_status = models.CharField(max_length=50, blank=False)
    max_wait_time = models.FloatField(blank=True, null=True)
    avg_wait_time = models.FloatField(blank=True, null=True)
    max_queue_length = models.IntegerField(blank=True, null=True)
    efficiency_score = models.FloatField(default=0.0)
    metrics = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    junction_config = models.JSONField(blank=False)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Simulation {self.simulation_id}"


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
    # Define constants for the each direction
    TURNING_LEFT =  1
    GOING_STRAIGHT = 2
    TURNING_RIGHT = 3

    relative_dir_map = {
            ("north", "east"): TURNING_LEFT,
            ("south", "west"): TURNING_LEFT,
            ("east", "south"): TURNING_LEFT,
            ("west", "north"): TURNING_LEFT,
            ("north", "west"): TURNING_RIGHT,
            ("south", "east"): TURNING_RIGHT,
            ("east", "north"): TURNING_RIGHT,
            ("west", "south"): TURNING_RIGHT,
            ("north", "south"): GOING_STRAIGHT,
            ("south", "north"): GOING_STRAIGHT,
            ("east", "west"): GOING_STRAIGHT,
            ("west", "east"): GOING_STRAIGHT,
        }
    
    @classmethod
    def get_relative_dir(cls, incoming_direction, exit_direction, default=None):
        relative_dir = cls.relative_dir_map.get((incoming_direction, exit_direction), default)
        if relative_dir is None: raise ValueError("Invalid directions provided")
        return relative_dir
    
    # def get_relative_dir(self):
    #     return Vehicle.get_relative_dir(self.incoming_direction, self.exit_direction)

    #make car id the primary key
    id = models.AutoField(primary_key=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    incoming_direction = models.CharField(max_length=50, blank=False)
    exit_direction = models.CharField(max_length=50, blank=False)
    waiting_time = models.FloatField(blank=True, null=True)
    incoming_lane = models.IntegerField(blank=False, default=1)
    exit_lane = models.IntegerField(blank=False, default=1)


    def __str__(self):
        return f"Vehicle {self.id} - Arrived: {self.arrival_time}, Departed: {self.departure_time}"
