SELECT incoming_direction, avg(waiting_time) AS avg_waiting_time, max(waiting_time) AS max_waiting_time
FROM (
  SELECT *, (julianday(departure_time) - julianday(arrival_time))*24*3600*20 AS waiting_time
  FROM simulation_vehicle
)
GROUP BY incoming_direction


