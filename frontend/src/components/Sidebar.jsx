import InputMenu from "./InputMenu"
import ConfigMenu from "./ConfigMenu"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom";
import axios from 'axios';

const Sidebar = () => {

  const directions = ["north", "east", "south", "west"]
  const [startSim, setStartSim] = useState(false)
  const url = "http://127.0.0.1:8000/simulation/create-simulation/"
  const header = {
    "X-CSRFToken": "OUsTjuV6IITnimp08TrObS65eMI4fyC5",
    "Content-Type": "application/x-www-form-urlencoded"
  }

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded"
  }

  

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

  // change configurable parameters value
  const handleConfigurable = (type, value) => {
      setTrafficData((prev) => ({
        ...prev,
        [type]: value
      }))
    }

  // validation function when user tries to start simulation
  const validateTrafficValues = () => {

  }

  // send trafficData to the backend for simulation
  useEffect(() => {

    if(!startSim) return;

    const createSimulation = async () => {
      try {
        const response = await axios.post(url,trafficData);
        const sim_id = response.data.simulation_id
        if(response.status === 200){
          const res = await axios.post(`http://127.0.0.1:8000/simulation/start-simulation/?simulation_id=${sim_id}`)
          console.log(res);
        }
      } catch (error) {
        console.error(error)
      }

    }

    createSimulation()
  }, [startSim])

  let axiosConfig = {
    withCredentials: true,
  }
  
  const [token, setToken] = useState("");

  useEffect(() => {
    const getToken = async () => {
      const { data } = await axios.get("http://127.0.0.1:8000/simulation/get-csrf-token/");
      console.log(data.csrf_token)
      setToken(data.csrf_token)
    }

    getToken();
  }, [])

  // useEffect(() => {
  //   const getToken = async () => {
  //     try{
  //       const response = await axios.get("http://127.0.0.1:8000/admin/", axiosConfig);
        
  //       const getCookie = (name) => {
  //         const value = `; ${document.cookie}`;
  //         const parts = value.split(`; ${name}=`);
  //         if (parts.length === 2) return parts.pop().split(";").shift();
  //       };
    
  //       const csrftoken = getCookie("csrftoken");
  //       console.log(csrftoken)
  //     } catch(error){
  //       console.error(error)
  //     }
  //   }

  //   getToken();
  // }, [])

  return (
    <div className="bg-background flex flex-col overflow-y-auto">
      <div className="mt-5 ml-5">
        <Link to="/history"><button type="button" className="bg-button px-8 py-5 rounded-2xl shadow-md text-2xl hover:bg-button-hover transition duration-300 cursor-pointer">History</button></Link>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {/* make input form for each direction */}
        {directions.map((direction, index) => (
          <InputMenu key={index} inboundDirection={direction} directions={directions} handleTrafficChange={handleTrafficChange} trafficData={trafficData}/>
        ))}
        <ConfigMenu trafficData={trafficData} handleConfigurable={handleConfigurable} />
        <div className="flex justify-center">
          <button type="button" onClick={() => setStartSim(true)} className="text-2xl rounded-lg text-white bg-accent px-5 py-3 shadow-md cursor-pointer hover:bg-accent-hover transition duration-300">Start Simulation</button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
