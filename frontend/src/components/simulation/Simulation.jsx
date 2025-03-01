import { useRef, useEffect, useState } from 'react';
import grassSrc from "../../assets/finale2.png";
import carEastSrc from "../../assets/car-east.png";
import redLightSrc from "../../assets/red-light.png"; // Import traffic light
import greenLightSrc from "../../assets/green-light.png";
import Car from './entities/Car';
import TrafficLight from './entities/TrafficLight';
import { FaRegPauseCircle } from "react-icons/fa";
import { FaRegPlayCircle } from "react-icons/fa";

const Simulation = () => {

  const trafficFlow = [
    {from: "north", to: "east", vph: 1000},
    {from: "north", to: "south", vph: 1000},
    {from: "north", to: "west", vph: 1000},
    {from: "east", to: "south", vph: 900},
    {from: "east", to: "west", vph: 900},
    {from: "east", to: "north", vph: 900},
    {from: "south", to: "west", vph: 800},
    {from: "south", to: "north", vph: 800},
    {from: "south", to: "east", vph: 800},
    {from: "west", to: "north", vph: 700},
    {from: "west", to: "east", vph: 700},
    {from: "west", to: "south", vph: 700},
  ]

  const isPausedRef = useRef(false);

  const [speed, setSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // track mouse position
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  // store animation frame ID
  const animationFrameRef = useRef(null);
  
  // reference canvas background and front layers
  const backgroundRef = useRef(null);
  const frontRef = useRef(null);

  // reference images
  const grassImageRef = useRef(null);
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

  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(!isPaused)

  }

  const animationLoop = (frontCtx, backgroundCtx) => {
    if(!isPausedRef.current){
      updateState();
    }
    renderFrame(frontCtx);
    animationFrameRef.current = requestAnimationFrame(() =>
      animationLoop(frontCtx, backgroundCtx)
    );
  };

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

  useEffect(() => {
    Promise.all([
      loadImages(carEastSrc),
      loadImages(grassSrc),
      loadImages(redLightSrc),
      loadImages(greenLightSrc)
    ]).then(([
      loadedCarEast,
      loadedGrassImg, 
      loadedRedLightImg,
      loadedGreenLightImg
    ]) => {
      carImageRef.current = loadedCarEast
      grassImageRef.current = loadedGrassImg;
      lightImageRef.current = {
        red: loadedRedLightImg,
        green: loadedGreenLightImg
      }

      const backgroundCtx = backgroundRef.current.getContext("2d");
      const frontCtx = frontRef.current.getContext("2d");

      // draw the background only once when the component mounts
      backgroundCtx.drawImage(
        grassImageRef.current,
        0,
        0,
        backgroundRef.current.width,
        backgroundRef.current.height
      );

      // const lightWidth = 50;
      // const lightHeight = 100;
      
      // const trafficLightPositions = [
      //   { x: backgroundRef.current.width / 2 - 8, y: 196, rotate: false }, // Top
      //   { x: backgroundRef.current.width / 2 - 73, y: backgroundRef.current.height - 289, rotate: false }, // Bottom
      //   { x: 217, y: backgroundRef.current.height / 2 - 100, rotate: true }, // Left
      //   { x: backgroundRef.current.width - 269, y: backgroundRef.current.height / 2 - 36, rotate: true } // Right
      // ];

      // trafficLightPositions.forEach(({ x, y, rotate }) => {
      //   backgroundCtx.save();
        
      //   if (rotate) {
      //     backgroundCtx.translate(x + lightWidth / 2, y + lightHeight / 2);
      //     backgroundCtx.rotate(Math.PI / 2);
      //     backgroundCtx.drawImage(
      //       redLightImageRef.current,
      //       -lightWidth / 2,
      //       -lightHeight / 2,
      //       lightWidth + 35,
      //       lightHeight
      //     );
      //   } else {
      //     backgroundCtx.drawImage(
      //       redLightImageRef.current,
      //       x,
      //       y,
      //       lightWidth + 30,
      //       lightHeight
      //     );
      //   }
        
      //   backgroundCtx.restore();
      // });

      // for(let i=0;i<4;i++){
      //   greenLightStates.current.push(new TrafficLight(greenLightImageRef.current, i))
      // }

      new TrafficLight(lightImageRef.current, 0)
      new TrafficLight(lightImageRef.current, 1)
      new TrafficLight(lightImageRef.current, 2)
      new TrafficLight(lightImageRef.current, 3)

      // new Car(carImageRef.current, "east", "north")
      // new Car(carImageRef.current, "north", "east")
      // new Car(carImageRef.current, "north", "south")
      
      // const spawnInterval = setInterval(() => {
      //   new Car(carImageRef.current, "north", "west")
      // }, 1000);

      // const spawnInterval1 = setInterval(() => {
      //   new Car(carImageRef.current, "north", "east")
      // }, 1000);

      trafficFlow.forEach(({ from, to, vph }) => {
        // console.log(from, to, vph)
        generateCars(from, to, vph)
      
      })

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

  return (
    <div className="col-span-2 relative bg-gray-100 overflow-y-hidden p-5 flex flex-col items-center space-y-4">
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
      <nav className='bg-gray-200 w-full shadow-md p-4 rounded-lg flex justify-center items-center space-x-4'>
        {!isPaused && <FaRegPauseCircle className='w-6 h-6 cursor-pointer' onClick={togglePause}/>}
        {isPaused && <FaRegPlayCircle className='w-6 h-6 cursor-pointer' onClick={togglePause}/>}
        <select
          value={speed}
          onChange={(e) => {
            Car.speed = e.target.value
            setSpeed(e.target.value)
          }}
          className='p-2 rounded border'
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </nav>
    </div>
  );
};

export default Simulation;