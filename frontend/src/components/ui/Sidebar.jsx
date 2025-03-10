import InputMenu from "./InputMenu"
import ConfigMenu from "./ConfigMenu"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom";
import axios from 'axios';

const Sidebar = ( { handleSimId, handleResults, setStartAnimation, setJunctionConfig, setGlobalLeftTurn, setGlobalLanes, setStatus }) => {

  // used to efficiently map and return Input Form components
  const directions = ["north", "east", "south", "west"]

  // simulation state
  // set to true by start simulation button
  // when true the button becomes disabled
  const [startSim, setStartSim] = useState(false) 

  // error message to display when inputs are invalid
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

  // change traffic data by copying previous state and updating the new value
  const handleTrafficChange = (direction, type, value) => {
    setTrafficData((prev) => ({
      ...prev,
      [direction]: {
        ...prev[direction],
        [type]: value,
      }
    }))
  }

  // change configurable parameters value
  const handleConfigurable = (type, value) => {
    // copy previous state and update leftTurn or numLanes value based on who called the function
      setTrafficData((prev) => ({
        ...prev,
        [type]: value
      }))
    }

  const validateInput = () => {
    let allZero = true;

    for(const dir of directions){
      
      const inboundStr = String(trafficData[dir].inbound).trim();

      // empty input so invalid
      if(inboundStr === ""){
        setErrorMsg("Inputs empty. Please fill all inputs.")
        setStartSim(false)
        return false
      }

      const inbound = Number(inboundStr);

      // non numeric characters so invalid
      if(isNaN(inbound)){
        setErrorMsg("Inputs invalid. All values must be numeric.")
        setStartSim(false)
        return false
      }

      // negative or zero values so invalid
      if(inbound <= 0){
        setErrorMsg("Inputs invalid. All values must be greater than 0.")
        setStartSim(false)
        return false
      }

      if(inbound > 2000){
        setErrorMsg("Inputs invalid. All values must be less than 2000.")
        setStartSim(false)
        return false
      }

      // convert to string, trim then convert to number
      const outboundValues = Object.entries(trafficData[dir])
        .filter(([key]) => key !== "inbound")
        .map(([, value]) => Number(String(value).trim()));

      if(outboundValues.some(val => isNaN(val))){
        setErrorMsg("Inputs invalid. All values must be numeric.")
        setStartSim(false)
        return false;
      }

      if(outboundValues.some(val => val < 0)){
        setErrorMsg("Inputs invalid. All values must be greater than 0.")
        setStartSim(false)
        return false
      }

      const outboundSum = outboundValues.reduce((sum, val) => sum + val, 0);

      if(inbound !== outboundSum){
        setErrorMsg("Inputs invalid. Inbound value must be equal to sum of Outbound values.")
        setStartSim(false)
        return false
      }

      if(inbound !== 0 || outboundSum !== 0){
        allZero = false;
      }

      trafficData[dir].inbound = inbound;
      Object.keys(trafficData[dir]).forEach(key => {
        if (key !== "inbound") {
          trafficData[dir][key] = Number(trafficData[dir][key]);
        }
      });
    }

    if(allZero){
      setErrorMsg("Inputs invalid. All values cannot be zero.")
      setStartSim(false)
      return false
    }
    console.log("Inputs are validated successfully.");
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
      console.log("Sending a POST request to create the simulation entry in the database...")
      const response = await axios.post("http://127.0.0.1:8000/simulation/create-simulation/",trafficData);
      console.log(response);
      const sim_id = response.data.simulation_id
      handleSimId(sim_id)
      if(response.status === 200){
        console.log("Sending POST request to start the simulation...")
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
    if(validateInput()){
      createSimulation().then((sim_id) => {
        setStatus("Running")
        const interval = setInterval(async () => {
          try{
            console.log("Sending a GET request to check the simulation status...")
            const { data } = await axios.get(`http://127.0.0.1:8000/simulation/check-simulation-status/?simulation_id=${sim_id}`)
            console.log(data);
            if(data.simulation_status === "completed"){
              setStatus("Completed")
              clearInterval(interval)
              displayResults(data);
              setStartSim(false);
            } else if(data.simulation_status === "failed"){
              throw "Simulation Failed"
            }
          } catch(error){
            console.error("Error checking simulation status:", error);
            setStatus("Failed")
            setStartSim(false)
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
          <InputMenu key={index} inboundDirection={direction} directions={directions} handleTrafficChange={handleTrafficChange} trafficData={trafficData} disabled={startSim}/>
        ))}
        <ConfigMenu trafficData={trafficData} handleConfigurable={handleConfigurable} setGlobalLeftTurn={setGlobalLeftTurn} setGlobalLanes={setGlobalLanes} disabled={startSim}/>
        <div className="flex flex-col items-center gap-2">
          <button type="button" disabled={startSim} onClick={() => setStartSim(true)} className={`w-full text-2xl rounded-lg text-white px-5 py-3 shadow-md transition duration-300 
    ${startSim ? "bg-gray-400 cursor-not-allowed" : "bg-accent hover:bg-accent-hover cursor-pointer"}`}>Start Simulation</button>
          {errorMsg && <p className="text-red-500 text-center p-2">{errorMsg}</p>}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
