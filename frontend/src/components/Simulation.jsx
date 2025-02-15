import { useRef, useEffect, useState } from 'react'
import grassSrc from "../assets/backgroundGrass.jpg"
import carSrc from "../assets/carSmall2.png"
import road1lanesWithSrc from "../assets/road1lanesCropWith.png"
import Car from '../entities/Car'

const Simulation = () => {

  const [carImage, setCarImage] = useState(null);
  const [road1WithImage, setRoad1WithImage] = useState(null);
  const [grassImage, setGrassImage] = useState(null);

  // get reference of canvas tags
  const bgCanvasRef = useRef(null);
  const frontCanvasRef = useRef(null);

  // load car, road, traffic lights image when component is mounted
  const loadImages = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img)
    })
  }


  useEffect(() => {
    // load the images
    Promise.all([loadImages(carSrc), 
      loadImages(road1lanesWithSrc),
      loadImages(grassSrc)
    ]).then(
      ([loadedCarImg, loadedRoad1WithImg, loadedGrassImg]) => {
        setCarImage(loadedCarImg);
        setRoad1WithImage(loadedRoad1WithImg);
        setGrassImage(loadedGrassImg);
      }
    )
  }, [])

  useEffect(() => {

    

    // initialize background layer
    const bg = bgCanvasRef.current;
    const bgCtx = bg.getContext("2d");

    // // initialize front layer for cars
    const front = frontCanvasRef.current;
    const frontCtx = bg.getContext("2d");

    // draws the background grass once 
    const drawGrass = () => {
      if(grassImage){
        bgCtx.drawImage(grassImage, 0, 0, bg.width, bg.height)
      } 
    }


    // main function that animates the canvas
    const animate = () => {
      frontCtx.clearRect(0, 0, front.width, front.height);

      // will be moved out and called only once when component is mounted and attached only to background canvas so clearRect will not clear it
      

      
      if(road1WithImage){

        const scaleFactor = 0.3

        const newWidth = road1WithImage.width * scaleFactor;
        const newHeight = road1WithImage.height * scaleFactor;

        // bottom center coordinates
        const x = (bg.width - newWidth) / 2;
        const y = (bg.height - newHeight)

        frontCtx.drawImage(road1WithImage, x, y, newWidth, newHeight);
      }

      if(carRef.current){
        carRef.current.move();
        carRef.current.draw(frontCtx);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate();
    // car.onload = () => {
    //   frontCtx.drawImage(car, 0, 0, 50, 25)
    // }

    // grassImg.onload = () => {
    //   bgCtx.drawImage(grassImg, 0, 0, bg.width, bg.height)

    //   const squareX = 150;
    //   const squareY = 100;
    //   const x = (bg.width - squareX) / 2
    //   const y = (bg.height - squareY) / 2

    //   bgCtx.fillStyle = 'gray';
    //   bgCtx.fillRect(x, y, squareX, squareY);

    //   const vertices = {
    //     topLeft: { x: x, y: y},
    //     topRight: { x: x + squareX, y: y + squareY},
    //     bottomLeft: { x: x, y: y + squareY},
    //     bottomRight: { x: x + squareX, y: y + squareY}
    //   }

    //   const drawTop = (vertices) => {
    //     const newSquare = { x: vertices.topLeft.x, y: vertices.topLeft.y - squareY}
    //     bgCtx.fillStyle = 'red';
    //     bgCtx.fillRect(vertices.topLeft.x, vertices.topLeft.y - squareY, squareX, squareY)
    //   }

    //   drawTop(vertices)
    // }
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [])

  return (
    <div className="col-span-2 relative bg-gray-100 overflow-y-hidden p-5">
      <div className="p-5 relative w-full h-full">
        <canvas ref={frontCanvasRef} id="vehicles-layer" className="absolute top-0 left-0 w-full h-full border" width={window.innerWidth} height={window.innerHeight}></canvas>
        <canvas ref={bgCanvasRef} id="background-layer" className="absolute top-0 left-0 w-full h-full border" width={window.innerWidth} height={window.innerHeight}></canvas>
      </div>
    </div>
  )
}

export default Simulation
