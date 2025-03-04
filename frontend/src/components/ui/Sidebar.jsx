import InputMenu from "./InputMenu"
import ConfigMenu from "./ConfigMenu"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom";
import axios from 'axios';

const Sidebar = ( { handleSimId, handleResults, setStartAnimation, setJunctionConfig, setGlobalLeftTurn, setStatus }) => {

  // used to efficiently map and return Input Form components
  const directions = ["north", "east", "south", "west"]

  // simulation state
  // set to true by start simulation button
  // when true the button becomes disabled
  const [startSim, setStartSim] = useState(false) 

  const [errorMsg, setErrorMsg] = useState("")

  // state containing all traffic data
  // passed down to InputMenu -> InboundItem and InputMenu -> OutboundItem to show changed values
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
      // copy the whole previous state, but then change specific direction and inbound/outbound with value
      setTrafficData((prev) => ({
        ...prev,
        [direction]: {
          ...prev[direction],
          [type]: Number(value),
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
    // copy previous state and update leftTurn or numLanes value based on who called the function
      setTrafficData((prev) => ({
        ...prev,
        [type]: value
      }))
    }

  // validation function when user tries to start simulation
  const validateTrafficValues = () => {
    let allZero = true;

    for(const dir of directions){
      const inbound = trafficData[dir].inbound;
      const outboundSum = Object.entries(trafficData[dir])
        .filter(([key]) => key !== "inbound")
        .reduce((sum, [, value]) => sum + value, 0)

      if(inbound !== outboundSum){
        setErrorMsg("Inputs invalid. Inbound value must be equal to sum of Outbound values.")
        setStartSim(false)
        return false;
      }
      if(inbound > 2000){
        setErrorMsg("Inputs invalid. Values must not exceed 2000vph.")
        setStartSim(false)
        return false
      }  
      if(inbound !== 0 || outboundSum !== 0){
        allZero = false;
      }
    }

    if(allZero){
      setErrorMsg("Inputs invalid. All values cannot be zero.")
      setStartSim(false)
      return false;
    }
      setErrorMsg("")
      handleConfig()
      return true
  }

  const handleConfig = () => {
    const transformTrafficData = (data) => {
      let trafficFlow = [];
  
      Object.keys(data).forEach((from) => {
        if (from === "leftTurn" || from === "numLanes") return; // Ignore these fields
  
        Object.keys(data[from]).forEach((to) => {
          if (to !== "inbound" && data[from][to] > 0) {
            trafficFlow.push({ from, to, vph: data[from][to] });
          }
        });
      });
  
      return trafficFlow;
    };
  
    const newConfig = transformTrafficData(trafficData);
    setJunctionConfig(newConfig);
  }
  

  // send post request to backend to create the simulation and receive the simulation id
  // then send post request with given simulation id to start the simulation
  const createSimulation = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/simulation/create-simulation/",trafficData);
      const sim_id = response.data.simulation_id
      handleSimId(sim_id)
      if(response.status === 200){
        const res = await axios.post(`http://127.0.0.1:8000/simulation/start-simulation/?simulation_id=${sim_id}`)
        setStartAnimation(true);
        console.log(res);
      }
      return sim_id
    } catch (error) {
      setErrorMsg("Error with the creation of the simulation")
      console.error(error)
    }
  }

  // send trafficData to the backend for simulation
  useEffect(() => {

    if(!startSim) return; 

    // if inputs are valid then send to backend and start the simulation
    if(validateTrafficValues()){
      createSimulation().then((sim_id) => {
        setStatus("is running")
        const interval = setInterval(async () => {
          try{
            const { data } = await axios.get(`http://127.0.0.1:8000/simulation/check-simulation-status/?simulation_id=${sim_id}`)
            console.log(data);
            if(data.simulation_status === "completed"){
              setStatus("is completed")
              clearInterval(interval)
              displayResults(data);
            } else if(data.simulation_status === "failed"){
              throw "Simulation Failed"
            }
          } catch(error){
            console.error("Error checking simulation status:", error);
            setStatus("has failed")
            clearInterval(interval);
          }
        }, 3000)
      })
    }
  }, [startSim])

  const displayResults = (data) => {
    console.log(data);
    setStartSim(false);
    handleResults(data);
  }

  return (
    <div className="bg-background flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
      <div className="mt-5 ml-5">
        <Link to="/history"><button type="button" className="bg-button px-8 py-5 rounded-2xl shadow-md text-2xl hover:bg-button-hover transition duration-300 cursor-pointer">History</button></Link>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {/* make input form for each direction */}
        {directions.map((direction, index) => (
          <InputMenu key={index} inboundDirection={direction} directions={directions} handleTrafficChange={handleTrafficChange} trafficData={trafficData}/>
        ))}
        <ConfigMenu trafficData={trafficData} handleConfigurable={handleConfigurable} setGlobalLeftTurn={setGlobalLeftTurn} />
        <div className="flex flex-col items-center gap-2">
          <button type="button" disabled={startSim} onClick={() => setStartSim(true)} className={`w-full text-2xl rounded-lg text-white px-5 py-3 shadow-md transition duration-300 
    ${startSim ? "bg-gray-400 cursor-not-allowed" : "bg-accent hover:bg-accent-hover cursor-pointer"}`}>Start Simulation</button>
          {errorMsg && <p className="text-red-500">{errorMsg}</p>}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
