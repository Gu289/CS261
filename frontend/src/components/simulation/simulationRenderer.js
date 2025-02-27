import { getBezierPoint, getVehicleAngle } from './bezierUtils';

// Car colors by direction
const DIRECTION_COLORS = {
  north: '#3498db', // Blue
  east: '#2ecc71',  // Green
  south: '#e74c3c', // Red
  west: '#f39c12'   // Orange
};

// Initialize the simulation and return dimensions
export function initializeSimulation(ctx, junctionConfig) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  // Draw initial background if needed
  
  return { width, height };
}

// Add to drawFrame in simulationRenderer.js
export function drawFrame(ctx, state, dimensions) {
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear the canvas first (important!)
    ctx.clearRect(0, 0, width, height);
    
    // Draw background (roads, junction)
    drawBackground(ctx, state.config, centerX, centerY);
    
    // Draw traffic lights
    drawTrafficLights(ctx, state.trafficLights, state.config, centerX, centerY);
    
    // Add debug information
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.fillText(`Vehicles: ${state.vehicles.length}`, 10, 20);
    
    if (state.vehicles.length > 0) {
      const sample = state.vehicles[0];
      ctx.fillText(`Sample: ${sample.from}->${sample.to} pos:${sample.position.toFixed(2)}`, 10, 40);
    }
    
    // Draw vehicles
    state.vehicles.forEach(vehicle => {
      drawVehicle(ctx, vehicle, state.config);
    });
    
    // Draw sample trajectory for debugging
    if (state.vehicles.length > 0) {
      const vehicle = state.vehicles[0];
      drawTrajectory(ctx, vehicle.trajectory);
    }
  }
  
  // Add this helper function
  function drawTrajectory(ctx, trajectory) {
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(trajectory.p0.x, trajectory.p0.y);
    ctx.bezierCurveTo(
      trajectory.p1.x, trajectory.p1.y,
      trajectory.p2.x, trajectory.p2.y,
      trajectory.p3.x, trajectory.p3.y
    );
    ctx.stroke();
    
    // Draw control points
    const drawPoint = (point, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
    };
    
    drawPoint(trajectory.p0, 'red');
    drawPoint(trajectory.p1, 'green');
    drawPoint(trajectory.p2, 'blue');
    drawPoint(trajectory.p3, 'purple');
  }

// Draw the background (roads, junction)
function drawBackground(ctx, config, centerX, centerY) {
  const roadWidth = config.roadWidth;
  const laneWidth = config.laneWidth;
  
  // Draw roads
  ctx.fillStyle = '#555555'; // Road color
  
  // Horizontal road
  ctx.fillRect(0, centerY - roadWidth/2, ctx.canvas.width, roadWidth);
  
  // Vertical road
  ctx.fillRect(centerX - roadWidth/2, 0, roadWidth, ctx.canvas.height);
  
  // Draw lane markings
  ctx.strokeStyle = '#FFFFFF';
  ctx.setLineDash([5, 5]); // Dashed line
  ctx.lineWidth = 2;
  
  // Draw lane markings for multi-lane roads
  const numLanes = config.numLanes;
  
  if (numLanes > 1) {
    // Draw horizontal lane markers
    for (let i = 1; i < numLanes; i++) {
      const y = centerY - roadWidth/2 + i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(centerX - roadWidth/2, y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(centerX + roadWidth/2, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
    
    // Draw vertical lane markers
    for (let i = 1; i < numLanes; i++) {
      const x = centerX - roadWidth/2 + i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, centerY - roadWidth/2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x, centerY + roadWidth/2);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }
  }
  
  ctx.setLineDash([]); // Reset dash
  
  // Draw junction box
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    centerX - roadWidth/2,
    centerY - roadWidth/2,
    roadWidth,
    roadWidth
  );
}

// Draw traffic lights
function drawTrafficLights(ctx, trafficLights, config, centerX, centerY) {
  const roadWidth = config.roadWidth;
  const lightSize = 15;
  
  // North light
  drawLight(
    ctx,
    centerX - roadWidth/2 - lightSize - 5,
    centerY - roadWidth/2 - lightSize - 5,
    lightSize,
    trafficLights.northSouth
  );
  
  // South light
  drawLight(
    ctx,
    centerX + roadWidth/2 + 5,
    centerY + roadWidth/2 + 5,
    lightSize,
    trafficLights.northSouth
  );
  
  // East light
  drawLight(
    ctx,
    centerX + roadWidth/2 + 5,
    centerY - roadWidth/2 - lightSize - 5,
    lightSize,
    trafficLights.eastWest
  );
  
  // West light
  drawLight(
    ctx,
    centerX - roadWidth/2 - lightSize - 5,
    centerY + roadWidth/2 + 5,
    lightSize,
    trafficLights.eastWest
  );
}

// Draw single traffic light
function drawLight(ctx, x, y, size, isGreen) {
  // Draw light box
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, size * 2, size * 3);
  
  // Draw red light (top)
  ctx.fillStyle = isGreen ? '#550000' : '#FF0000';
  ctx.beginPath();
  ctx.arc(x + size, y + size * 0.7, size * 0.6, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw yellow light (middle) - optional
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(x + size, y + size * 1.5, size * 0.6, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw green light (bottom)
  ctx.fillStyle = isGreen ? '#00FF00' : '#005500';
  ctx.beginPath();
  ctx.arc(x + size, y + size * 2.3, size * 0.6, 0, 2 * Math.PI);
  ctx.fill();
}

// Fix the drawVehicle function - it's not fully implemented
function drawVehicle(ctx, vehicle, config) {
    try {
      // Get current position on bezier curve
      const pos = getBezierPoint(
        vehicle.position,
        vehicle.trajectory.p0,
        vehicle.trajectory.p1,
        vehicle.trajectory.p2,
        vehicle.trajectory.p3
      );
      
      // Get angle for rotation
      const angle = getVehicleAngle(vehicle.position, vehicle.trajectory);
      
      // Make vehicles larger and more visible
      const vehicleWidth = 30;  // Increased from 20
      const vehicleHeight = 20; // Increased from 10
      
      // Save context for rotation
      ctx.save();
      
      // Move to vehicle position and rotate
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);
      
      // Add a clear outline to make vehicle more visible
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(-vehicleWidth/2, -vehicleHeight/2, vehicleWidth, vehicleHeight);
      
      // Draw vehicle body
      ctx.fillStyle = DIRECTION_COLORS[vehicle.from];
      ctx.fillRect(-vehicleWidth/2, -vehicleHeight/2, vehicleWidth, vehicleHeight);
      
      // Draw direction indicator (forward-facing triangle)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(vehicleWidth/2 - 2, 0);
      ctx.lineTo(vehicleWidth/2 - 8, -vehicleHeight/4);
      ctx.lineTo(vehicleWidth/2 - 8, vehicleHeight/4);
      ctx.closePath();
      ctx.fill();
      
      // Draw waiting indicator if vehicle is stopped
      if (vehicle.waiting) {
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Restore context
      ctx.restore();
    } catch (error) {
      console.error("Error drawing vehicle:", error, vehicle);
    }
  }