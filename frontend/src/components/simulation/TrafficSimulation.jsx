import { useRef, useEffect, useState } from 'react';
import { FaRegPauseCircle, FaRegPlayCircle } from 'react-icons/fa';
import { initializeSimulation, drawFrame } from './simulationRenderer';
import { useSimulationState } from './useSimulationState';

const TrafficSimulation = ({ junctionConfig }) => {
  const canvasRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  const {
    simulationState,
    addVehicle,
    updateVehicles,
    toggleTrafficLight
  } = useSimulationState(junctionConfig);
  
  // Toggle pause/play
  const togglePause = () => {
    setIsPaused(!isPaused);
  };
  
  // Effect for animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationId;
    let lastTimestamp = 0;
    
    // Initialize the simulation
    const dimensions = initializeSimulation(ctx, junctionConfig);
    
    // In TrafficSimulation.jsx, modify the animation loop
    const animate = (timestamp) => {
    // First call of requestAnimationFrame passes a high-resolution timestamp
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
      animationId = requestAnimationFrame(animate);
      return; // Skip the first frame to establish a baseline
    }
  
    const deltaTime = (timestamp - lastTimestamp) / 1000 * speed; // Convert to seconds
    lastTimestamp = timestamp;
    
    // Skip updates if paused but continue rendering
    if (!isPaused) {
      updateVehicles(deltaTime);
    }
    
    // Clear and redraw
    drawFrame(ctx, simulationState, dimensions);
    
    animationId = requestAnimationFrame(animate);
  };
    
    // Start the loop
    animationId = requestAnimationFrame(animate);
    
    // Set up timed traffic light changes
    const lightInterval = setInterval(() => {
      if (!isPaused) {
        toggleTrafficLight();
      }
    }, simulationState.config.trafficLightDuration);
    
    // Setup vehicle generation
    const vehicleGenerators = [];
    
    if (simulationState.config.trafficFlows) {
        console.log("Traffic flows:", simulationState.config.trafficFlows);
        
        simulationState.config.trafficFlows.forEach(flow => {
          if (flow.vph <= 0) {
            console.log(`Flow ${flow.from}->${flow.to} has 0 vph, skipping`);
            return;
          }
          
          // Calculate time between vehicles (in ms)
          const msPerVehicle = Math.max(500, 3600000 / flow.vph);
          //console.log(`Flow ${flow.from}->${flow.to}: ${flow.vph} VPH = ${msPerVehicle}ms between vehicles`);
          
          const generator = setInterval(() => {
            if (!isPaused) {
              console.log(`Adding vehicle: ${flow.from} -> ${flow.to}`);
              addVehicle(flow.from, flow.to);
            }
          }, msPerVehicle);
          
          vehicleGenerators.push(generator);
        });
      }

    setTimeout(() => {
      if (simulationState.config.trafficFlows && simulationState.config.trafficFlows.length > 0) {
        // Create test vehicles only for selected pairs
        const testFlows = [
        { from: 'north', to: 'south' },
        { from: 'east', to: 'west' }
        ];
        
        testFlows.forEach(flow => {
        console.log(`Creating test vehicle: ${flow.from} → ${flow.to}`);
        addVehicle(flow.from, flow.to);
        });
      }
    }, 1000);
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(lightInterval);
      vehicleGenerators.forEach(interval => clearInterval(interval));
    };
  }, [junctionConfig, isPaused, speed, updateVehicles, addVehicle, toggleTrafficLight, simulationState]);
  
  return (
    <div className="flex flex-col items-center">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={800}
        className="border border-gray-300 bg-gray-100 shadow-md"
      />
      
      <div className="mt-4 flex items-center gap-4">
        <button 
          onClick={togglePause}
          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
        >
          {isPaused ? <FaRegPlayCircle size={24} /> : <FaRegPauseCircle size={24} />}
        </button>
        
        <div className="flex items-center gap-2">
          <span>Speed:</span>
          <select 
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="p-1 border rounded"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={2}>2.0x</option>
            <option value={4}>4.0x</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default TrafficSimulation;