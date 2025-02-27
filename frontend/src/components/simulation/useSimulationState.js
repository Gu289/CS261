import { useState, useCallback } from 'react';
import { calculateTrajectory } from './bezierUtils';
import { nanoid } from 'nanoid';

export const useSimulationState = (junctionConfig) => {
  // Parse and initialize the junction configuration
  const parseConfig = (config) => {
    // Default configuration
    const defaultConfig = {
      numLanes: 2,
      trafficLightDuration: 5000, // ms
      roadWidth: 80,
      laneWidth: 40,
      trafficFlows: []
    };
    
    if (!config) return defaultConfig;
    
    // Extract traffic flows from junction configuration
    const trafficFlows = [];
    const directions = ['north', 'east', 'south', 'west'];
    
    directions.forEach(from => {
      if (config[from]) {
        directions.forEach(to => {
          if (to !== from && config[from][to] && config[from][to] > 0) {
            trafficFlows.push({
              from,
              to,
              vph: parseInt(config[from][to], 10) || 0
            });
          }
        });
      }
    });
    
    return {
      ...defaultConfig,
      numLanes: parseInt(config.numLanes, 10) || defaultConfig.numLanes,
      trafficFlows
    };
  };

  // Initialize state
  const [simulationState, setSimulationState] = useState(() => {
    const config = parseConfig(junctionConfig);
    return {
      config,
      vehicles: [],
      trafficLights: {
        northSouth: true, // Green for North-South
        eastWest: false   // Red for East-West
      }
    };
  });

  // Toggle traffic lights
  const toggleTrafficLight = useCallback(() => {
    setSimulationState(prev => ({
      ...prev,
      trafficLights: {
        northSouth: !prev.trafficLights.northSouth,
        eastWest: !prev.trafficLights.eastWest
      }
    }));
  }, []);

  // Add a new vehicle
  const addVehicle = useCallback((from, to) => {
    setSimulationState(prev => {
      // Get lane configuration
      const numLanes = prev.config.numLanes;
      const laneIndex = Math.floor(Math.random() * numLanes);
      
      // Create trajectory for vehicle
      const trajectory = calculateTrajectory(from, to, laneIndex, numLanes, prev.config.roadWidth);
      
      // Create a new vehicle
      const newVehicle = {
        id: nanoid(),
        from,
        to,
        lane: laneIndex,
        position: 0, // 0 to 1 progress along the trajectory
        speed: 0.1 + (Math.random() * 0.05), // Random speed variation
        trajectory,
        waiting: false
      };
      
      return {
        ...prev,
        vehicles: [...prev.vehicles, newVehicle]
      };
    });
  }, []);

  // Update all vehicles
  const updateVehicles = useCallback((deltaTime) => {
    setSimulationState(prev => {
      const vehicles = [...prev.vehicles];
      const updatedVehicles = [];
      
      // Check if vehicle can move based on traffic light
      const canMove = (vehicle) => {
        // At junction point (progress 0.4-0.6), check traffic light
        const atJunction = vehicle.position > 0.4 && vehicle.position < 0.6;
        
        if (!atJunction) return true;
        
        // Check if light is green for this direction
        const fromDirection = vehicle.from;
        if (['north', 'south'].includes(fromDirection)) {
          return prev.trafficLights.northSouth;
        } else {
          return prev.trafficLights.eastWest;
        }
      };
      
      // Check if vehicle can move based on other vehicles
      const checkCollision = (vehicle, allVehicles) => {
        for (const other of allVehicles) {
          if (other.id !== vehicle.id) {
            // Simple collision detection: if two vehicles are on the same trajectory
            // and close to each other, the following one should wait
            if (
              other.from === vehicle.from && 
              other.to === vehicle.to && 
              other.lane === vehicle.lane && 
              other.position > vehicle.position && 
              other.position - vehicle.position < 0.1
            ) {
              return true;
            }
            
            // More complex collision detection at junction
            if (
              vehicle.position > 0.4 && 
              vehicle.position < 0.6 && 
              other.position > 0.4 && 
              other.position < 0.6
            ) {
              // Simple priority: north-south has priority over east-west
              if (['north', 'south'].includes(vehicle.from) && 
                  ['east', 'west'].includes(other.from)) {
                return false; // North-south has priority
              } else if (['east', 'west'].includes(vehicle.from) && 
                         ['north', 'south'].includes(other.from)) {
                return true; // East-west yields
              }
            }
          }
        }
        return false;
      };
      
      // Update each vehicle
      for (const vehicle of vehicles) {
        // If vehicle can move (lights and no collision)
        if (canMove(vehicle) && !checkCollision(vehicle, vehicles)) {
          const newPosition = vehicle.position + (vehicle.speed * deltaTime);
          
          // If vehicle is still on the road, update it
          if (newPosition <= 1.0) {
            updatedVehicles.push({
              ...vehicle,
              position: newPosition,
              waiting: false
            });
          }
          // Otherwise, the vehicle has exited the simulation
        } else {
          // Vehicle is waiting
          updatedVehicles.push({
            ...vehicle,
            waiting: true
          });
        }
      }
      
      return {
        ...prev,
        vehicles: updatedVehicles
      };
    });
  }, []);

  return {
    simulationState,
    addVehicle,
    updateVehicles,
    toggleTrafficLight
  };
};