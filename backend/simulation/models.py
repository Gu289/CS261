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

