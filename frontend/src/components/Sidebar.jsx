import InputMenu from "./InputMenu"
import ConfigMenu from "./ConfigMenu"
import { useState } from "react"

const Sidebar = () => {

  const directions = ["north", "east", "south", "west"]

  // state containing all traffic data
  // passed down to InputMenu -> InboundItem and OutboundItem to show changed values
  const [trafficData, setTrafficData] = useState({
    north: { inbound: 0, east: 0, south: 0, west: 0},
    east: { inbound: 0, north: 0, south: 0, west: 0},
    south: { inbound: 0, north: 0, east: 0, west: 0},
    west:{ inbound: 0, north: 0, east: 0, south: 0},
    leftTurn: false,
    numLanes: 2
  })
  
  // change traffic data according to user
  // direction: north, east, south, west
  // type: inbound, north, east, south, west (each direction is outbound)
  // passed down to InputMenu -> InboundItem and OutboundItem to change values
  const handleTrafficChange = (direction, type, value) => {
    const num = Number(value)
    // only accept numeric values
    if(!isNaN(num) && value !== ""){
      setTrafficData((prev) => ({
        ...prev,
        [direction]: {
          ...prev[direction],
          [type]: Math.max(0, Math.min(1000, Number(value))),
        }
      }))
    } else if(value === ""){
      setTrafficData((prev) => ({
        ...prev,
        [direction]: {
          ...prev[direction],
          [type]: 0,
        }
      }))
    }
  }

  const handleConfigurable = (type, value) => {
    setTrafficData((prev) => ({
      ...prev,
      [type]: value
    }))
  }

  // to fix

  // validation function when user tries to start simulation
  const validateTrafficValues = () => {

  }

  return (
    <div className="bg-background flex flex-col overflow-y-auto">
      <div className="mt-5 ml-5">
        <button type="button" className="bg-button px-8 py-5 rounded-2xl shadow-md text-2xl hover:bg-button-hover transition duration-300 cursor-pointer">History</button>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {/* make input form for each direction */}
        {directions.map((direction, index) => (
          <InputMenu key={index} inboundDirection={direction} directions={directions} handleTrafficChange={handleTrafficChange} trafficData={trafficData}/>
        ))}
        <ConfigMenu handleConfigurable={handleConfigurable} />
        <div className="flex justify-center">
          <button type="button" onClick={validateTrafficValues} className="text-2xl rounded-lg text-white bg-accent px-5 py-3 shadow-md cursor-pointer hover:bg-accent-hover transition duration-300">Start Simulation</button>
        </div>
        
      </div>
      <div>
        
      </div>
    </div>
  )
}

export default Sidebar
