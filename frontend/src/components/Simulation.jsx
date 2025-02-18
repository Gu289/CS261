import { useRef, useEffect, useState } from 'react'
import grassSrc from "../assets/junction2lanes.png"
import carSrc from "../assets/car1.png"
import Car from '../entities/Car'

const Simulation = () => {

  // Top = W/2, 0
  // Bottom = W/2, H
  // Left = 0, H/2
  // Right = W, H/2

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const animationFrameRef = useRef(null);
  const carRef = useRef([]);
  
  // reference for canvas
  const backgroundRef = useRef(null);
  const frontRef = useRef(null);

  // reference for images
  const grassImageRef = useRef(null);
  const carImageRef = useRef(null);

  // load car, road, traffic lights image when component is mounted
  const loadImages = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img)
    })
  }

  // main animation function that constantly renders each frame
  const animationLoop = (frontCtx, backgroundCtx) => {
    updateState(); // update positions
    renderFrame(frontCtx); // redraw elements
    animationFrameRef.current = requestAnimationFrame(() => animationLoop(frontCtx, backgroundCtx))
  }

  // updates car positions etc
  const updateState = () => {
    

    if(carRef.current){
      carRef.current.forEach((car) => {
        if(!car.waiting){
          car.move();
        } else if(car.waiting){
          car.enterJunction("right");
        }
      })
    }
  }

  // clears previous frame and draws new car positions
  const renderFrame = (frontCtx) => {
    frontCtx.clearRect(0, 0, frontRef.current.width, frontRef.current.height);
    if(carRef.current){
      carRef.current.forEach((car) => {
        car.draw(frontCtx)
      })
    }
  }


  

  useEffect(() => {

    // load the images
    Promise.all([loadImages(carSrc),
      loadImages(grassSrc)
    ]).then(
      ([loadedCarImg, loadedGrassImg]) => {
        carImageRef.current = loadedCarImg;
        grassImageRef.current = loadedGrassImg;
      
        const backgroundCtx = backgroundRef.current.getContext("2d");
        const frontCtx = frontRef.current.getContext("2d");

        carRef.current.push(new Car(frontRef.current.width / 2 + 20, 0, carImageRef.current));
        
        const spawnInterval = setInterval(() => {
          carRef.current.push(new Car(frontRef.current.width / 2 + 20, 0, carImageRef.current));
        }, 1000);
        frontRef.current.addEventListener("mousemove", (event) => {
          const rect = frontRef.current.getBoundingClientRect(); // Get canvas position on screen
          setX(event.clientX - rect.left); // Adjust for canvas position
          setY(event.clientY - rect.top);
          
          console.log(`Clicked at: (${x}, ${y})`);
        });
        // background drawn only once when component is mounted
        backgroundCtx.drawImage(grassImageRef.current, 0, 0, backgroundRef.current.width, backgroundRef.current.height);
        
        animationLoop(frontCtx, backgroundCtx);
      }
    )
    
    // clean up after component dismounts for performance
    return () => cancelAnimationFrame(animationFrameRef.current);

  }, [])




  return (
    <div className="col-span-2 relative bg-gray-100 overflow-y-hidden p-5 flex justify-center items-center">
      <div className="relative w-[600px] h-[600px]">
        <canvas ref={backgroundRef} id="background-layer" className="absolute top-0 left-0 border" width={600} height={600}></canvas>
        <canvas ref={frontRef} id="vehicles-layer" className="absolute top-0 left-0 border" width={600} height={600}></canvas>
        <h1 className='absolute text-white'>x={x}, y={y}</h1>
      </div>
    </div>
  )
}

export default Simulation
