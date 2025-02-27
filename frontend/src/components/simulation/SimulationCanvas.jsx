import React, { useRef, useEffect, useState } from 'react';
import { FaRegPauseCircle, FaRegPlayCircle } from "react-icons/fa";
import grassSrc from "../../assets/finale2.png";
import redLightSrc from "../../assets/red-light.png";
import greenLightSrc from "../../assets/green-light.png";
import carNorthSrc from "../../assets/car-north.png";
import carEastSrc from "../../assets/car-east.png";
import carSouthSrc from "../../assets/car-south.png";
import carWestSrc from "../../assets/car-west.png";

const SimulationCanvas = ({ trafficData, simulationConfig, onSimulationEnd }) => {
  const canvasRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const requestIdRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const [fps, setFps] = useState(60);
  const [carCount, setCarCount] = useState({ total: 0, active: 0 });
  
  // Traffic light state
  const [trafficLightState, setTrafficLightState] = useState({
    northSouth: true, // true = green, false = red
    eastWest: false
  });

  // Pre-load images
  const images = useRef({
    grass: new Image(),
    redLight: new Image(),
    greenLight: new Image(),
    cars: {
      north: new Image(),
      east: new Image(),
      south: new Image(),
      west: new Image()
    }
  });

  // Vehicle state management
  const vehiclesRef = useRef([]);
  const laneQueuesRef = useRef({
    north: [[], []],
    east: [[], []],
    south: [[], []],
    west: [[], []]
  });

  // Constants for the simulation
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 800;
  const ROAD_WIDTH = 120;
  const CENTER_X = CANVAS_WIDTH / 2;
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const CAR_SIZE = 30;
  const LANE_WIDTH = ROAD_WIDTH / 2;
  const TRAFFIC_LIGHT_SIZE = 20;
  const TRAFFIC_LIGHT_CYCLE = 5000; // ms

  // Initialize images
  useEffect(() => {
    images.current.grass.src = grassSrc;
    images.current.redLight.src = redLightSrc;
    images.current.greenLight.src = greenLightSrc;
    images.current.cars.north.src = carNorthSrc || carSouthSrc; // Fallback if specific asset missing
    images.current.cars.east.src = carEastSrc || carWestSrc;
    images.current.cars.south.src = carSouthSrc || carNorthSrc;
    images.current.cars.west.src = carWestSrc || carEastSrc;
  }, []);

  // Traffic light cycle
  useEffect(() => {
    const trafficLightInterval = setInterval(() => {
      if (!isPaused) {
        setTrafficLightState(prev => ({
          northSouth: !prev.northSouth,
          eastWest: !prev.eastWest
        }));
      }
    }, TRAFFIC_LIGHT_CYCLE);

    return () => clearInterval(trafficLightInterval);
  }, [isPaused]);

  // Vehicle generation based on traffic flow
  useEffect(() => {
    if (!trafficData || isPaused) return;

    // Create vehicle spawn intervals for each traffic flow
    const intervals = [];
    
    trafficData.forEach(flow => {
      if (flow.vph <= 0) return;
      
      // Calculate milliseconds between vehicles based on vehicles per hour
      const msPerVehicle = 3600000 / flow.vph;
      
      const intervalId = setInterval(() => {
        if (isPaused) return;
        
        // Create a new vehicle
        const vehicle = createVehicle(flow.from, flow.to);
        
        // Add to appropriate lane queue
        const laneQueues = laneQueuesRef.current;
        const laneIndex = Math.floor(Math.random() * 2); // Random lane assignment
        laneQueues[flow.from][laneIndex].push(vehicle);
        
        // Update vehicle count
        setCarCount(prev => ({ 
          ...prev, 
          total: prev.total + 1
        }));
        
      }, msPerVehicle);
      
      intervals.push(intervalId);
    });
    
    return () => intervals.forEach(id => clearInterval(id));
  }, [trafficData, isPaused]);

  // Main animation loop
  useEffect(() => {
    const animate = (timestamp) => {
      if (!canvasRef.current) return;
      
      const deltaTime = timestamp - (lastUpdateTimeRef.current || timestamp);
      lastUpdateTimeRef.current = timestamp;
      
      // Only update at desired FPS
      if (deltaTime < 1000 / fps) {
        requestIdRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const ctx = canvasRef.current.getContext('2d');
      updateSimulation(ctx, deltaTime);
      renderSimulation(ctx);
      
      requestIdRef.current = requestAnimationFrame(animate);
    };

    if (!isPaused) {
      requestIdRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      cancelAnimationFrame(requestIdRef.current);
    };
  }, [isPaused, fps]);

  // Helper function to create a vehicle object
  const createVehicle = (from, to) => {
    // Determine entrance/exit positions and lanes
    const entrancePos = getEntrancePosition(from);
    const exitPos = getExitPosition(to);
    
    // Calculate control points for the Bezier curve
    const controlPoints = calculateControlPoints(from, to);
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      from,
      to,
      position: { x: entrancePos.x, y: entrancePos.y },
      progress: 0, // 0 to 1, position along curve
      speed: 0.0003, // Adjust as needed
      controlPoints,
      waitingForLight: false,
      collision: false,
      createdAt: Date.now()
    };
  };

  // Get entrance position based on direction
  const getEntrancePosition = (direction) => {
    // Each direction will have different start positions
    switch (direction) {
      case 'north':
        return { x: CENTER_X - LANE_WIDTH / 2, y: 0 };
      case 'east':
        return { x: CANVAS_WIDTH, y: CENTER_Y - LANE_WIDTH / 2 };
      case 'south':
        return { x: CENTER_X + LANE_WIDTH / 2, y: CANVAS_HEIGHT };
      case 'west':
        return { x: 0, y: CENTER_Y + LANE_WIDTH / 2 };
      default:
        return { x: 0, y: 0 };
    }
  };

  // Get exit position based on direction
  const getExitPosition = (direction) => {
    switch (direction) {
      case 'north':
        return { x: CENTER_X + LANE_WIDTH / 2, y: 0 };
      case 'east':
        return { x: CANVAS_WIDTH, y: CENTER_Y + LANE_WIDTH / 2 };
      case 'south':
        return { x: CENTER_X - LANE_WIDTH / 2, y: CANVAS_HEIGHT };
      case 'west':
        return { x: 0, y: CENTER_Y - LANE_WIDTH / 2 };
      default:
        return { x: 0, y: 0 };
    }
  };

  // Calculate control points for Bezier curve based on from/to directions
  const calculateControlPoints = (from, to) => {
    // Entry and exit points
    const entry = getEntrancePosition(from);
    const exit = getExitPosition(to);
    
    // We need 4 points for a cubic Bezier:
    // P0: entry point
    // P1, P2: control points
    // P3: exit point
    
    // Calculate mid-points for the junction center
    const p0 = { x: entry.x, y: entry.y };
    const p3 = { x: exit.x, y: exit.y };
    
    let p1, p2;
    
    // Going straight
    if ((from === 'north' && to === 'south') || 
        (from === 'south' && to === 'north') || 
        (from === 'east' && to === 'west') || 
        (from === 'west' && to === 'east')) {
      
      p1 = { x: entry.x, y: entry.y };
      p2 = { x: exit.x, y: exit.y };
      
      if (from === 'north' || from === 'south') {
        p1.y = CENTER_Y - ROAD_WIDTH/4;
        p2.y = CENTER_Y + ROAD_WIDTH/4;
      } else {
        p1.x = CENTER_X - ROAD_WIDTH/4;
        p2.x = CENTER_X + ROAD_WIDTH/4;
      }
    }
    // Turning left
    else if ((from === 'north' && to === 'east') || 
             (from === 'east' && to === 'south') || 
             (from === 'south' && to === 'west') || 
             (from === 'west' && to === 'north')) {
      
      if (from === 'north') {
        p1 = { x: entry.x, y: CENTER_Y - ROAD_WIDTH/2 };
        p2 = { x: CENTER_X + ROAD_WIDTH/2, y: exit.y };
      } else if (from === 'east') {
        p1 = { x: CENTER_X + ROAD_WIDTH/2, y: entry.y };
        p2 = { x: exit.x, y: CENTER_Y + ROAD_WIDTH/2 };
      } else if (from === 'south') {
        p1 = { x: entry.x, y: CENTER_Y + ROAD_WIDTH/2 };
        p2 = { x: CENTER_X - ROAD_WIDTH/2, y: exit.y };
      } else { // west
        p1 = { x: CENTER_X - ROAD_WIDTH/2, y: entry.y };
        p2 = { x: exit.x, y: CENTER_Y - ROAD_WIDTH/2 };
      }
    }
    // Turning right
    else {
      if (from === 'north') {
        p1 = { x: entry.x, y: CENTER_Y - ROAD_WIDTH/2 };
        p2 = { x: CENTER_X - ROAD_WIDTH/2, y: exit.y };
      } else if (from === 'east') {
        p1 = { x: CENTER_X + ROAD_WIDTH/2, y: entry.y };
        p2 = { x: exit.x, y: CENTER_Y - ROAD_WIDTH/2 };
      } else if (from === 'south') {
        p1 = { x: entry.x, y: CENTER_Y + ROAD_WIDTH/2 };
        p2 = { x: CENTER_X + ROAD_WIDTH/2, y: exit.y };
      } else { // west
        p1 = { x: CENTER_X - ROAD_WIDTH/2, y: entry.y };
        p2 = { x: exit.x, y: CENTER_Y + ROAD_WIDTH/2 };
      }
    }
    
    return { p0, p1, p2, p3 };
  };

  // Calculate position on a cubic Bezier curve
  const getBezierPoint = (t, controlPoints) => {
    const { p0, p1, p2, p3 } = controlPoints;
    
    // Formula for cubic Bezier:
    // B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
    const invT = 1 - t;
    const invTSquared = invT * invT;
    const invTCubed = invTSquared * invT;
    const tSquared = t * t;
    const tCubed = tSquared * t;
    
    return {
      x: invTCubed * p0.x + 3 * invTSquared * t * p1.x + 3 * invT * tSquared * p2.x + tCubed * p3.x,
      y: invTCubed * p0.y + 3 * invTSquared * t * p1.y + 3 * invT * tSquared * p2.y + tCubed * p3.y
    };
  };

  // Update simulation state
  const updateSimulation = (ctx, deltaTime) => {
    const vehicles = vehiclesRef.current;
    const laneQueues = laneQueuesRef.current;
    const activeVehicles = [];
    let activeCount = 0;
    
    // Move vehicles from lane queues to active vehicles if it's safe
    Object.keys(laneQueues).forEach(direction => {
      laneQueues[direction].forEach(lane => {
        if (lane.length > 0) {
          const nextVehicle = lane[0];
          
          // Check if it's safe to release the vehicle
          const canRelease = checkSafeRelease(nextVehicle, vehicles);
          
          if (canRelease) {
            lane.shift(); // Remove from queue
            vehicles.push(nextVehicle); // Add to active vehicles
          }
        }
      });
    });
    
    // Process active vehicles
    vehicles.forEach(vehicle => {
      // Check if vehicle should wait at traffic light
      const shouldWait = checkTrafficLightStop(vehicle);
      
      // Check for potential collisions with other vehicles
      const collision = checkCollision(vehicle, vehicles);
      
      if (!shouldWait && !collision) {
        // Move the vehicle along its path
        vehicle.progress += vehicle.speed * deltaTime;
        
        // Update position based on Bezier curve
        const newPos = getBezierPoint(vehicle.progress, vehicle.controlPoints);
        vehicle.position = newPos;
        
        // No longer waiting
        vehicle.waitingForLight = false;
      } else {
        // Vehicle is waiting
        vehicle.waitingForLight = shouldWait;
        vehicle.collision = collision;
      }
      
      // Keep vehicle if still on screen
      if (vehicle.progress < 1) {
        activeVehicles.push(vehicle);
        activeCount++;
      }
    });
    
    // Update vehicle references
    vehiclesRef.current = activeVehicles;
    
    // Update active car count
    setCarCount(prev => ({
      ...prev,
      active: activeCount
    }));
  };

  // Check if vehicle should stop at traffic light
  const checkTrafficLightStop = (vehicle) => {
    // If the progress is near the center of the junction
    if (vehicle.progress > 0.4 && vehicle.progress < 0.6) {
      // Traffic light logic
      if ((vehicle.from === 'north' || vehicle.from === 'south') && !trafficLightState.northSouth) {
        return true;
      }
      if ((vehicle.from === 'east' || vehicle.from === 'west') && !trafficLightState.eastWest) {
        return true;
      }
    }
    return false;
  };

  // Check for collisions with other vehicles
  const checkCollision = (vehicle, allVehicles) => {
    // Skip self-collision check
    const otherVehicles = allVehicles.filter(v => v !== vehicle);
    
    // Simple distance-based collision detection
    for (const other of otherVehicles) {
      const dx = vehicle.position.x - other.position.x;
      const dy = vehicle.position.y - other.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < CAR_SIZE * 0.8) {
        return true;
      }
    }
    
    return false;
  };

  // Check if it's safe to release a vehicle from the queue
  const checkSafeRelease = (vehicle, activeVehicles) => {
    // Make sure there's enough space near the entrance
    for (const active of activeVehicles) {
      if (active.from === vehicle.from) {
        const dx = getEntrancePosition(vehicle.from).x - active.position.x;
        const dy = getEntrancePosition(vehicle.from).y - active.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Don't release if another vehicle is too close to the entrance
        if (distance < CAR_SIZE * 3) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Render the simulation
  const renderSimulation = (ctx) => {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    ctx.drawImage(
      images.current.grass, 
      0, 0, 
      CANVAS_WIDTH, CANVAS_HEIGHT
    );
    
    // Draw roads
    drawRoads(ctx);
    
    // Draw traffic lights
    drawTrafficLights(ctx);
    
    // Draw vehicles
    vehiclesRef.current.forEach(vehicle => {
      drawVehicle(ctx, vehicle);
    });
    
    // Draw stats
    drawStats(ctx);
  };

  // Draw the roads
  const drawRoads = (ctx) => {
    ctx.fillStyle = '#444';
    
    // Horizontal road
    ctx.fillRect(0, CENTER_Y - ROAD_WIDTH/2, CANVAS_WIDTH, ROAD_WIDTH);
    
    // Vertical road
    ctx.fillRect(CENTER_X - ROAD_WIDTH/2, 0, ROAD_WIDTH, CANVAS_HEIGHT);
    
    // Lane markings
    ctx.strokeStyle = '#FFF';
    ctx.setLineDash([20, 20]); // Dashed line
    ctx.lineWidth = 2;
    
    // Horizontal road lane markings
    ctx.beginPath();
    ctx.moveTo(0, CENTER_Y);
    ctx.lineTo(CENTER_X - ROAD_WIDTH/2, CENTER_Y);
    ctx.moveTo(CENTER_X + ROAD_WIDTH/2, CENTER_Y);
    ctx.lineTo(CANVAS_WIDTH, CENTER_Y);
    ctx.stroke();
    
    // Vertical road lane markings
    ctx.beginPath();
    ctx.moveTo(CENTER_X, 0);
    ctx.lineTo(CENTER_X, CENTER_Y - ROAD_WIDTH/2);
    ctx.moveTo(CENTER_X, CENTER_Y + ROAD_WIDTH/2);
    ctx.lineTo(CENTER_X, CANVAS_HEIGHT);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset dash
  };

  // Draw traffic lights
  const drawTrafficLights = (ctx) => {
    // North traffic light
    const northLight = trafficLightState.northSouth ? 
                       images.current.greenLight : 
                       images.current.redLight;
    ctx.drawImage(
      northLight,
      CENTER_X - ROAD_WIDTH/2 - TRAFFIC_LIGHT_SIZE - 5,
      CENTER_Y - ROAD_WIDTH/2 - TRAFFIC_LIGHT_SIZE - 5,
      TRAFFIC_LIGHT_SIZE,
      TRAFFIC_LIGHT_SIZE
    );
    
    // South traffic light
    const southLight = trafficLightState.northSouth ? 
                       images.current.greenLight : 
                       images.current.redLight;
    ctx.drawImage(
      southLight,
      CENTER_X + ROAD_WIDTH/2 + 5,
      CENTER_Y + ROAD_WIDTH/2 + 5,
      TRAFFIC_LIGHT_SIZE,
      TRAFFIC_LIGHT_SIZE
    );
    
    // East traffic light
    const eastLight = trafficLightState.eastWest ? 
                      images.current.greenLight : 
                      images.current.redLight;
    ctx.drawImage(
      eastLight,
      CENTER_X + ROAD_WIDTH/2 + 5,
      CENTER_Y - ROAD_WIDTH/2 - TRAFFIC_LIGHT_SIZE - 5,
      TRAFFIC_LIGHT_SIZE,
      TRAFFIC_LIGHT_SIZE
    );
    
    // West traffic light
    const westLight = trafficLightState.eastWest ? 
                      images.current.greenLight : 
                      images.current.redLight;
    ctx.drawImage(
      westLight,
      CENTER_X - ROAD_WIDTH/2 - TRAFFIC_LIGHT_SIZE - 5,
      CENTER_Y + ROAD_WIDTH/2 + 5,
      TRAFFIC_LIGHT_SIZE,
      TRAFFIC_LIGHT_SIZE
    );
  };

  // Draw an individual vehicle
  const drawVehicle = (ctx, vehicle) => {
    // Select car image based on direction
    let carImage;
    
    // Get angle based on position on Bezier curve
    const progress = Math.min(0.99, Math.max(0.01, vehicle.progress));
    const currentPos = getBezierPoint(progress, vehicle.controlPoints);
    const nextPos = getBezierPoint(progress + 0.01, vehicle.controlPoints);
    
    // Calculate angle
    const dx = nextPos.x - currentPos.x;
    const dy = nextPos.y - currentPos.y;
    const angle = Math.atan2(dy, dx);
    
    // Choose image based on general direction
    if (angle > -Math.PI/4 && angle < Math.PI/4) {
      carImage = images.current.cars.east;
    } else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) {
      carImage = images.current.cars.south;
    } else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) {
      carImage = images.current.cars.west;
    } else {
      carImage = images.current.cars.north;
    }
    
    // Save context for rotation
    ctx.save();
    
    // Move to vehicle position
    ctx.translate(vehicle.position.x, vehicle.position.y);
    
    // Rotate canvas
    ctx.rotate(angle);
    
    // Draw vehicle
    ctx.drawImage(
      carImage,
      -CAR_SIZE / 2,
      -CAR_SIZE / 2,
      CAR_SIZE,
      CAR_SIZE
    );
    
    // Debug visualization for waiting/collision
    if (vehicle.waitingForLight || vehicle.collision) {
      ctx.fillStyle = vehicle.waitingForLight ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 165, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, CAR_SIZE/2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Restore context
    ctx.restore();
  };

  // Draw stats
  const drawStats = (ctx) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 70);
    
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`FPS: ${fps}`, 20, 30);
    ctx.fillText(`Cars (Total): ${carCount.total}`, 20, 50);
    ctx.fillText(`Cars (Active): ${carCount.active}`, 20, 70);
  };

  // Toggle pause/play
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Adjust FPS
  const handleFpsChange = (e) => {
    setFps(Number(e.target.value));
  };

  return (
    <div className="relative bg-gray-900 w-full h-full flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border border-gray-700 rounded-lg shadow-lg"
      />
      
      <div className="absolute bottom-4 left-4 flex gap-4 items-center">
        <button 
          onClick={togglePause}
          className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
        >
          {isPaused ? <FaRegPlayCircle size={24} /> : <FaRegPauseCircle size={24} />}
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">FPS:</span>
          <input
            type="range"
            min="1"
            max="120"
            value={fps}
            onChange={handleFpsChange}
            className="w-32"
          />
          <span className="text-sm text-white">{fps}</span>
        </div>
      </div>
    </div>
  );
};

export default SimulationCanvas;