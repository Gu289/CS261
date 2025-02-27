// Calculate point on cubic bezier curve: P = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
export function getBezierPoint(t, p0, p1, p2, p3) {
    const invT = 1 - t;
    const invT2 = invT * invT;
    const invT3 = invT2 * invT;
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
      x: invT3 * p0.x + 3 * invT2 * t * p1.x + 3 * invT * t2 * p2.x + t3 * p3.x,
      y: invT3 * p0.y + 3 * invT2 * t * p1.y + 3 * invT * t2 * p2.y + t3 * p3.y
    };
  }
  
  // Calculate a full bezier curve trajectory based on start/end directions
  export function calculateTrajectory(fromDirection, toDirection, laneIndex, numLanes, roadWidth) {
    // Canvas center point (assuming 800x800 canvas)
    const centerX = 400;
    const centerY = 400;
    
    // Lane width based on road width
    const laneWidth = roadWidth / numLanes;
    
    // Calculate lane offset from center of road
    const getLaneOffset = (direction, lane) => {
      // Calculate the offset from the centerline of the road
      // lane 0 is closest to center, higher lanes are further
      const offset = (laneWidth * 0.5) + (laneWidth * lane);
      
      switch (direction) {
        case 'north': return { x: offset, y: 0 };
        case 'east': return { x: 0, y: offset };
        case 'south': return { x: -offset, y: 0 };
        case 'west': return { x: 0, y: -offset };
        default: return { x: 0, y: 0 };
      }
    };
    
    // Calculate entry point (p0)
    const getEntryPoint = (direction, lane) => {
      const offset = getLaneOffset(direction, lane);
      
      switch (direction) {
        case 'north':
          return { x: centerX + offset.x, y: 0 };
        case 'east':
          return { x: 800, y: centerY + offset.y };
        case 'south':
          return { x: centerX + offset.x, y: 800 };
        case 'west':
          return { x: 0, y: centerY + offset.y };
        default:
          return { x: 0, y: 0 };
      }
    };
    
    // Calculate exit point (p3)
    const getExitPoint = (direction, lane) => {
      const offset = getLaneOffset(direction, lane);
      
      switch (direction) {
        case 'north':
          return { x: centerX + offset.x, y: 0 };
        case 'east':
          return { x: 800, y: centerY + offset.y };
        case 'south':
          return { x: centerX + offset.x, y: 800 };
        case 'west':
          return { x: 0, y: centerY + offset.y };
        default:
          return { x: 0, y: 0 };
      }
    };
    
    // Determine turn type: left, straight, right
    const getTurnType = (from, to) => {
      const directionValues = { 'north': 0, 'east': 1, 'south': 2, 'west': 3 };
      const fromVal = directionValues[from];
      const toVal = directionValues[to];
      
      const diff = (toVal - fromVal + 4) % 4;
      
      if (diff === 1) return 'right';
      if (diff === 2) return 'straight';
      if (diff === 3) return 'left';
      return 'u-turn'; // Unlikely case
    };
    
    // Entry and exit points
    const p0 = getEntryPoint(fromDirection, laneIndex);
    const p3 = getExitPoint(toDirection, numLanes - laneIndex - 1); // Mirror lane for exit
    
    // Control points depend on the turn type
    let p1, p2;
    const turnType = getTurnType(fromDirection, toDirection);
    const controlPointDistance = roadWidth * 1.5; // Distance of control points from junction center
    
    // Junction approach point (where vehicle enters junction)
    const getApproachPoint = (direction, lane) => {
      const offset = getLaneOffset(direction, lane);
      const distance = roadWidth * 0.5; // Distance from junction center
      
      switch (direction) {
        case 'north':
          return { x: centerX + offset.x, y: centerY - distance };
        case 'east':
          return { x: centerX + distance, y: centerY + offset.y };
        case 'south':
          return { x: centerX + offset.x, y: centerY + distance };
        case 'west':
          return { x: centerX - distance, y: centerY + offset.y };
        default:
          return { x: centerX, y: centerY };
      }
    };
    
    // Junction exit point (where vehicle exits junction)
    const getExitApproachPoint = (direction, lane) => {
      const offset = getLaneOffset(direction, lane);
      const distance = roadWidth * 0.5;
      
      switch (direction) {
        case 'north':
          return { x: centerX + offset.x, y: centerY - distance };
        case 'east':
          return { x: centerX + distance, y: centerY + offset.y };
        case 'south':
          return { x: centerX + offset.x, y: centerY + distance };
        case 'west':
          return { x: centerX - distance, y: centerY + offset.y };
        default:
          return { x: centerX, y: centerY };
      }
    };
    
    // Junction approach points
    const approachPoint = getApproachPoint(fromDirection, laneIndex);
    const exitApproachPoint = getExitApproachPoint(toDirection, numLanes - laneIndex - 1);
    
    if (turnType === 'straight') {
      // For straight paths, control points are in a line
      p1 = approachPoint;
      p2 = exitApproachPoint;
    } else if (turnType === 'right') {
      // For right turns, bring control points closer to the corner
      p1 = approachPoint;
      p2 = exitApproachPoint;
      
      // Adjust based on direction
      if (fromDirection === 'north' && toDirection === 'east') {
        p1 = { x: approachPoint.x, y: approachPoint.y + roadWidth * 0.3 };
        p2 = { x: exitApproachPoint.x - roadWidth * 0.3, y: exitApproachPoint.y };
      } else if (fromDirection === 'east' && toDirection === 'south') {
        p1 = { x: approachPoint.x - roadWidth * 0.3, y: approachPoint.y };
        p2 = { x: exitApproachPoint.x, y: exitApproachPoint.y - roadWidth * 0.3 };
      } else if (fromDirection === 'south' && toDirection === 'west') {
        p1 = { x: approachPoint.x, y: approachPoint.y - roadWidth * 0.3 };
        p2 = { x: exitApproachPoint.x + roadWidth * 0.3, y: exitApproachPoint.y };
      } else if (fromDirection === 'west' && toDirection === 'north') {
        p1 = { x: approachPoint.x + roadWidth * 0.3, y: approachPoint.y };
        p2 = { x: exitApproachPoint.x, y: exitApproachPoint.y + roadWidth * 0.3 };
      }
    } else if (turnType === 'left') {
      // For left turns, control points need to create a wider curve
      p1 = approachPoint;
      p2 = exitApproachPoint;
      
      // Adjust based on direction
      if (fromDirection === 'north' && toDirection === 'west') {
        p1 = { x: approachPoint.x, y: centerY };
        p2 = { x: centerX, y: exitApproachPoint.y };
      } else if (fromDirection === 'east' && toDirection === 'north') {
        p1 = { x: centerX, y: approachPoint.y };
        p2 = { x: exitApproachPoint.x, y: centerY };
      } else if (fromDirection === 'south' && toDirection === 'east') {
        p1 = { x: approachPoint.x, y: centerY };
        p2 = { x: centerX, y: exitApproachPoint.y };
      } else if (fromDirection === 'west' && toDirection === 'south') {
        p1 = { x: centerX, y: approachPoint.y };
        p2 = { x: exitApproachPoint.x, y: centerY };
      }
    }
    
    // Return all the control points for the bezier curve
    return { p0, p1, p2, p3 };
  }
  
  // Calculate the angle of a vehicle based on its position on the bezier curve
  export function getVehicleAngle(position, trajectory) {
    // Calculate points slightly before and after current position
    const before = position > 0.02 ? position - 0.02 : 0;
    const after = position < 0.98 ? position + 0.02 : 1;
    
    const pointBefore = getBezierPoint(
      before, 
      trajectory.p0, 
      trajectory.p1, 
      trajectory.p2, 
      trajectory.p3
    );
    
    const pointAfter = getBezierPoint(
      after, 
      trajectory.p0, 
      trajectory.p1, 
      trajectory.p2, 
      trajectory.p3
    );
    
    // Calculate angle
    return Math.atan2(
      pointAfter.y - pointBefore.y,
      pointAfter.x - pointBefore.x
    );
  }