import { useRef, useEffect, useState } from 'react';
import grassSrc from "../../assets/finale.png";
import carSouthSrc from "../../assets/car-south.png";
import carNorthSrc from "../../assets/car-north.png";
import carEastSrc from "../../assets/car-east.png";
import carWestSrc from "../../assets/car-west.png";
import redLightSrc from "../../assets/red-light.png"; // Import traffic light
import Car from './entities/Car';

const Simulation = () => {

  // track mouse position
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  // store animation frame ID
  const animationFrameRef = useRef(null);
  
  // store array of cars
  const carRef = useRef([]);
  
  // reference canvas background and front layers
  const backgroundRef = useRef(null);
  const frontRef = useRef(null);

  // reference images
  const grassImageRef = useRef(null);
  const carImageRef = useRef({});
  const redLightImageRef = useRef(null);

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

  const updateState = () => {
    if (carRef.current) {
      carRef.current.forEach((car) => {
        if (!car.waiting) {
          car.checkJunction();
        } 
      });
    }
  };

  const renderFrame = (frontCtx) => {
    
    // clear canvas
    frontCtx.clearRect(0, 0, frontRef.current.width, frontRef.current.height);

    // check if there are cars to render
    if (carRef.current && carRef.current.length > 0) {
      carRef.current.forEach((car) => {
        try{
          car.draw(frontCtx);
        } catch (error){
          console.error("Error drawing car:", error)
        }
      });
    }
  };

  useEffect(() => {
    Promise.all([
      loadImages(carNorthSrc),
      loadImages(carSouthSrc),
      loadImages(carEastSrc),
      loadImages(carWestSrc),
      loadImages(grassSrc),
      loadImages(redLightSrc),
    ]).then(([loadedCarNorth,
      loadedCarSouth,
      loadedCarEast,
      loadedCarWest, loadedGrassImg, loadedRedLightImg]) => {
      carImageRef.current = {
        north: loadedCarNorth,
        south: loadedCarSouth,
        east: loadedCarEast,
        west: loadedCarWest,
      };
      grassImageRef.current = loadedGrassImg;
      redLightImageRef.current = loadedRedLightImg;

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

      const lightWidth = 50;
      const lightHeight = 100;
      
      const trafficLightPositions = [
        { x: backgroundRef.current.width / 2 - 8, y: 194, rotate: false }, // Top
        { x: backgroundRef.current.width / 2 - 73, y: backgroundRef.current.height - 288, rotate: false }, // Bottom
        { x: 215, y: backgroundRef.current.height / 2 - 100, rotate: true }, // Left
        { x: backgroundRef.current.width - 268, y: backgroundRef.current.height / 2 - 36, rotate: true } // Right
      ];

      trafficLightPositions.forEach(({ x, y, rotate }) => {
        backgroundCtx.save();
        
        if (rotate) {
          backgroundCtx.translate(x + lightWidth / 2, y + lightHeight / 2);
          backgroundCtx.rotate(Math.PI / 2);
          backgroundCtx.drawImage(
            redLightImageRef.current,
            -lightWidth / 2,
            -lightHeight / 2,
            lightWidth + 35,
            lightHeight
          );
        } else {
          backgroundCtx.drawImage(
            redLightImageRef.current,
            x,
            y,
            lightWidth + 30,
            lightHeight
          );
        }
        
        backgroundCtx.restore();
      });

      carRef.current.push(
        new Car(carImageRef.current, "north", "south", "west")
      );
      
      const spawnInterval = setInterval(() => {
        carRef.current.push(
          new Car(carImageRef.current, "north", "south", "west")
        );
      }, 1000);

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
    <div className="col-span-2 relative bg-gray-100 overflow-y-hidden p-5 flex justify-center items-center">
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
    </div>
  );
};

export default Simulation;