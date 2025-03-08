import { useRef, useEffect, useState } from 'react';
import oneLaneSrc from "../../assets/oneLane.png"
import twoLanesSrc from "../../assets/twoLanes.png";
import twoLanesLeftSrc from "../../assets/twoLanesLeft.png"
import threeLanesSrc from "../../assets/threeLanes.png"
import fourLanesSrc from "../../assets/fourLanes.png"
import fiveLanesSrc from "../../assets/fiveLanes.png"


import carEastSrc from "../../assets/car-east.png";
import redLightSrc from "../../assets/red-light.png"; // Import traffic light
import greenLightSrc from "../../assets/green-light.png";
import Car from './entities/Car';
import TrafficLight from './entities/TrafficLight';

const Simulation = ( { startAnimation, junctionConfig, globalLeftTurn, globalLanes, status } ) => {

  const trafficFlow = useRef([]);

  const [speed, setSpeed] = useState(2.5);

  // track mouse position
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  // store animation frame ID
  const animationFrameRef = useRef(null);
  
  // reference canvas background and front layers
  const backgroundRef = useRef(null);
  const frontRef = useRef(null);

  // reference images
  const mapImagesRef = useRef({});
  const carImageRef = useRef(null);
  const lightImageRef = useRef({});

  // load images asynchronously
  const loadImages = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
    });
  };

  const animationLoop = (frontCtx, backgroundCtx) => {
    updateState();
    renderFrame(frontCtx);
    animationFrameRef.current = requestAnimationFrame(() =>
      animationLoop(frontCtx, backgroundCtx)
    );
  };

  useEffect(() => {
    if(status === "Completed" || status === "Failed"){
      Object.values(spawnIntervals.current).forEach(clearInterval);
      spawnIntervals.current = {};
      Car.cars = []
    }
  }, [status])

  const updateState = () => {
    // remove cars out of bounds
    Car.cars = Car.cars.filter(car => !(car.x > 600 || car.y > 600 || car.x < 0 || car.y < 0));
    
    if (Car.cars.length > 0) {
      Car.cars.forEach((car) => {
        if (!car.waiting) {
          car.updateCar();
        } 
      });
    }
  };

  const renderFrame = (frontCtx) => {
    
    // clear canvas
    frontCtx.clearRect(0, 0, frontRef.current.width, frontRef.current.height);

    if(TrafficLight.instances && TrafficLight.instances.length > 0){
      TrafficLight.instances.forEach((light) => {
        try{
          light.draw(frontCtx);
        } catch(error){
          console.error("Error drawing traffic light:", error)
        }
      })
    }

    // check if there are cars to render
    if (Car.cars && Car.cars.length > 0) {
      Car.cars.forEach((car) => {
        try{
          car.draw(frontCtx);
        } catch (error){
          console.error("Error drawing car:", error)
        }
      });
    }
  };

  const spawnIntervals = useRef({});

  const generateCars = (start, end, vph) => {
    
    const key = `${start}-${end}`

    if(spawnIntervals.current[key]) clearInterval(spawnIntervals.current[key]);

    const intervalTime = (3600 * 1000) / vph;

    spawnIntervals.current[key] = setInterval(() => {
      new Car(carImageRef.current, start, end);
    }, intervalTime)

  }

  // handles left turn configuration
  useEffect(() => {
    if(!mapImagesRef.current.twoLanesLeft) return;

    const backgroundCtx = backgroundRef.current.getContext("2d");

    if(globalLeftTurn){
      backgroundCtx.drawImage(
        mapImagesRef.current.twoLanesLeft,
        0,
        0,
        backgroundRef.current.width,
        backgroundRef.current.height
      )
    } else{
      let current = null
      switch(Number(globalLanes)){
        case 1:
          current = mapImagesRef.current.oneLane
          break;
        case 2:
          current = mapImagesRef.current.twoLanes
          break;
        case 3:
          current = mapImagesRef.current.threeLanes
          break;
        case 4:
          current = mapImagesRef.current.fourLanes
          break;
        case 5:
          current = mapImagesRef.current.fiveLanes
          break;
      }
      backgroundCtx.drawImage(
        current,
        0,
        0,
        backgroundRef.current.width,
        backgroundRef.current.height
      )
    }
    
  }, [globalLeftTurn, globalLanes])


  // changes vph after starting simulation
  useEffect(() => {
    if(junctionConfig){
      trafficFlow.current = junctionConfig;
    }
    // console.log(trafficFlow.current);
  }, [junctionConfig])

  useEffect(() => {
    Promise.all([
      loadImages(carEastSrc),
      loadImages(twoLanesSrc),
      loadImages(redLightSrc),
      loadImages(greenLightSrc),
      loadImages(twoLanesLeftSrc),
      loadImages(oneLaneSrc),
      loadImages(threeLanesSrc),
      loadImages(fourLanesSrc),
      loadImages(fiveLanesSrc),

    ]).then(([
      loadedCarEast,
      loadedTwoLanesImg, 
      loadedRedLightImg,
      loadedGreenLightImg,
      loadedTwoLanesLeftImg,
      loadedOneLaneImg,
      loadedThreeLanesImg,
      loadedFourLanesImg,
      loadedFiveLanesImg
    ]) => {
      carImageRef.current = loadedCarEast
      mapImagesRef.current = {
        oneLane: loadedOneLaneImg,
        twoLanes: loadedTwoLanesImg,
        twoLanesLeft: loadedTwoLanesLeftImg,
        threeLanes: loadedThreeLanesImg,
        fourLanes: loadedFourLanesImg,
        fiveLanes: loadedFiveLanesImg 
      };
      lightImageRef.current = {
        red: loadedRedLightImg,
        green: loadedGreenLightImg
      }

      const backgroundCtx = backgroundRef.current.getContext("2d");
      const frontCtx = frontRef.current.getContext("2d");

      // draw the background only once when the component mounts
      backgroundCtx.drawImage(
        mapImagesRef.current.twoLanes,
        0,
        0,
        backgroundRef.current.width,
        backgroundRef.current.height
      );

      // track mouse position
      frontRef.current.addEventListener("mousemove", (event) => {
        const rect = frontRef.current.getBoundingClientRect();
        setX(event.clientX - rect.left);
        setY(event.clientY - rect.top);
      });
      
      animationLoop(frontCtx, backgroundCtx);
    });

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  // when startAnimation changes, it starts spawning cars
  useEffect(() => {
    if(startAnimation){
      // define the traffic lights
      new TrafficLight(lightImageRef.current, 0)
      new TrafficLight(lightImageRef.current, 1)
      new TrafficLight(lightImageRef.current, 2)
      new TrafficLight(lightImageRef.current, 3)

        // Start the cycle every 10 seconds
      setInterval(TrafficLight.toggleLights, 10000);
      trafficFlow.current.forEach(({ from, to, vph }) => {
        generateCars(from, to, vph)
      })
    }

  }, [startAnimation])

  return (
    <div className="col-span-2 mt-25 relative bg-gray-100 overflow-y-hidden p-5 flex flex-col items-center space-y-4">
      <div className="relative w-[600px] h-[600px]">
        <canvas
          ref={backgroundRef}
          id="background-layer"
          className="absolute top-0 left-0 border"
          width={600}
          height={600}
        ></canvas>
        <canvas
          ref={frontRef}
          id="vehicles-layer"
          className="absolute top-0 left-0 border"
          width={600}
          height={600}
        ></canvas>
        <h1 className="absolute text-white">
          x={x}, y={y}
        </h1>
      </div>
      <nav className='bg-gray-200 w-full shadow-md p-4 rounded-lg flex justify-center items-center space-x-12'>
        <p className='text-lg'>Simulation Status: {status}</p>
        <div className='flex items-center space-x-2'>
          <p className='text-lg'>Timelapse: </p>
          <select
          value={speed}
          onChange={(e) => {
            Car.speed = e.target.value
            setSpeed(e.target.value)
          }}
          className='p-2 rounded border'
        >
          <option value={1.25}>0.5x</option>
          <option value={2.5}>1x</option>
          <option value={5}>2x</option>
          <option value={10}>4x</option>
        </select>
        </div>
        
      </nav>
    </div>
  );
};

export default Simulation;