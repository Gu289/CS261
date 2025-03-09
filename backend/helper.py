from django.db import connection
from django.conf import settings
import os
import django

# Set up Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "traffic_sim.settings")

# Initialize Django
django.setup()

def compute_metrics(path_to_queries):
    with open(path_to_queries, "r") as file:
        sql_query = file.read()
    
    with connection.cursor() as cursor:
        cursor.execute(sql_query)
        result = cursor.fetchall()  # If your query returns results
    
    metrics = {}
    for direction, average_waiting_time, max_waiting_time in result:
        metrics[direction] = {
            'average_waiting_time': average_waiting_time,
            'max_waiting_time': max_waiting_time
        }
    print(metrics)
    return metrics



path_to_queries = r"queries\compute_AWT_MWT.sql"
# path_to_queries = "backend\queries\compute_AWT_MWT.sql"
compute_metrics(path_to_queries)