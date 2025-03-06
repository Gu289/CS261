import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import axios from "axios"
import { FaLongArrowAltLeft } from "react-icons/fa";
import { FaDeleteLeft } from "react-icons/fa6";
import { IoIosFunnel } from "react-icons/io";
import { RiDeleteBin5Fill } from "react-icons/ri";



const Historynew = () => {

    const navigate = useNavigate();
    const [simulations, setSimulations] = useState([]);
    const [current, setCurrent] = useState(null);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

    // removes all simulation data from database
    const clearHistory = () => {
        try {
            simulations.forEach(async (simulation) => {
                const response = await axios.delete(`http://127.0.0.1:8000/simulation/delete-simulation/?simulation_id=${simulation.simulation_id}`)
                console.log("Clear History Response:",response);
            })
            setSimulations([]);
            setCurrent(null);
        } catch (error) {
            console.error(error);
        }
    }

    // deletes the simulation given the id
    const deleteSimulation = async (id) => {
        try{
            const response = await axios.delete(`http://127.0.0.1:8000/simulation/delete-simulation/?simulation_id=${id}`);
            console.log("Simulation Delete:", response);
            setSimulations(simulations.filter(sim => sim.simulation_id !== id));
            if(current && current.simulation_id === id){
                setCurrent(null);
            }
        } catch(error){
            console.error(error);
        }
    }

    // sorts the simulation based on efficiency score, oldest and most recent simulations
    const sortSimulations = (option) => {
        let sims = [...simulations];
        if(option === "score"){
            sims.sort((a, b) => b.efficiency_score - a.efficiency_score); 
        } else if(option === "oldDate"){
            sims.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        } else if(option === "newDate"){
            sims.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        }
        setSimulations(sims);
        setIsSortMenuOpen(false);
    }

    useEffect(() => {
        const getData = async () => {
            const response = await axios.get(`http://127.0.0.1:8000/simulation/completed-simulations/`)
            console.log("All completed simulations:", response);
            setSimulations(response.data);
        }

        getData();
    }, [])

  return (
    <div className="grid grid-cols-7 gap-5 h-screen bg-white p-5 overflow-y-hidden">

        {/* Sidebar - Past Simulations */}
      <div className="col-span-3 flex flex-col items-start bg-background rounded-lg shadow-md p-5">
        
        {/* Close Button */}
        <FaLongArrowAltLeft onClick={() => navigate("/")} className="cursor-pointer w-6 h-6 hover:text-gray-600"/>
        <div className="p-5 flex flex-col w-full gap-5 h-full">

            {/* Title and Filter */}
            <div className="flex justify-between">
                <h1 className="text-2xl font-bold ">Past Simulations</h1>
                <div className="relative">
                    <IoIosFunnel onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className="w-6 h-6 cursor-pointer"/>
                    {isSortMenuOpen && (
                        <div className="absolute right-0 mt-2 w-32 border bg-white border-gray-300 shadow-md rounded-lg">
                            <button className="w-full px-4 py-2 text-left hover:bg-gray-100 cursor-pointer" onClick={() => sortSimulations("score")}>
                                Sort by Overall Score
                            </button>
                            <button className="w-full px-4 py-2 text-left hover:bg-gray-100 cursor-pointer" onClick={() => sortSimulations("oldDate")}>
                                Sort by Less Recent
                            </button>
                            <button className="w-full px-4 py-2 text-left hover:bg-gray-100 cursor-pointer" onClick={() => sortSimulations("newDate")}>
                                Sort by Most Recent
                            </button>
                        </div>
                    )}  
                </div>
            </div>
            
            {/* Simulations List */}
            <div className="flex-grow overflow-y-auto">
                {simulations.length > 0 ? (
                    <ul className="max-h-[calc(70vh-40px)]">
                        {simulations.map((sim, index) => (
                            <li key={index} className="flex justify-between items-center p-3 my-2 hover:bg-gray-100 rounded-lg cursor-pointer" onClick={() => setCurrent(sim)}>
                                <p className="text-lg">Simulation {sim.simulation_id}</p>
                                <FaDeleteLeft onClick={() => deleteSimulation(sim.simulation_id)} className="w-6 h-6 cursor-pointer"/>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No simulations found.</p>
                )}
            </div>

            {/* Clear History */}
            <button className="bg-red-400 hover:bg-red-300 cursor-pointer transition duration-300 rounded-lg flex justify-center items-center gap-5 px-4 py-2" onClick={() => clearHistory()}>
                <p className="text-lg">Clear History</p>
                <RiDeleteBin5Fill className="w-6 h-6"/>
            </button>
        </div>
      </div>

      {/* Simulation Report */}
      <div className="bg-background col-span-4 rounded-lg shadow-md p-5">
        <div className="p-5 flex flex-col w-full gap-5 h-full overflow-y-auto max-h-[calc(90vh-40px)]">
            <h1 className="font-bold text-3xl">Simulation Report</h1>
            {current ? (
                <div>
                    <p className="text-lg mb-2">Simulation ID: {current.simulation_id}</p>
                    {simulations.every((sim) => {
                        if(sim.efficiency_score < current.efficiency_score){
                            return true
                        }
                    }) && <p>Highest Scoring Simulation!</p>}
                    <p className="text-lg font-semibold mb-2">Efficiency Score</p>
                    <div className="bg-gray-100 p-4 rounded flex items-center">
                  <div className="w-20 h-20 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center mr-4">
                      <span className="text-2xl font-bold">
                          {current.efficiency_score ? current.efficiency_score : 'N/A'}
                      </span>
                  </div>
                  <div>
                      <p className="font-medium">
                          {current.efficiency_score >= 80 ? 'Excellent' : 
                          current.efficiency_score >= 60 ? 'Good' : 
                          current.efficiency_score >= 40 ? 'Average' : 'Needs Improvement'}
                      </p>
                      <p className="text-sm text-gray-600">
                          Based on average wait times, maximum wait times, and queue lengths across all directions
                      </p>
                  </div>
              </div>
                    <p className="text-xl font-semibold mt-5">Key Parameters</p>
                    {current.metrics && (
                            <ul className="grid grid-cols-2 gap-5 mt-5">
                                {Object.entries(current.metrics).map(([direction, values]) => (
                                    <li key={direction}>
                                        <p className="text-lg font-bold capitalize">{direction}</p>
                                        {Object.entries(values).map(([metric, value]) => {
                                            let word = ""
                                            if(metric === "average_waiting_time"){
                                                word = "Average Waiting Time"
                                            } else if(metric === "max_waiting_time"){
                                                word = "Maximum Waiting Time"
                                            } else{
                                                word = "Maximum Queue Length"
                                            }

                                            return (<p key={metric}>{word}: {Math.round(value)}</p>)
                                        })}
                                    </li>
                                ))}
                            </ul>
                    )}

                    <p className="text-xl font-semibold mt-5">Junction Configurations</p>
                    {current.junction_config && (
                        <ul className="grid grid-cols-2 gap-5 mt-5">
                            {Object.entries(current.junction_config).filter(([key, _]) => key !== "leftTurn" && key !== "numLanes").map(([direction, values]) => (
                                <li key={direction}>
                                    <p className="text-lg font-bold capitalize">{direction}</p>
                                    {Object.entries(values).map(([metric, value]) => (
                                        <p key={metric}>{metric}: {value}</p>
                                    ))}
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="text-xl font-semibold mt-5">Configurable Parameters</p>
                    <div className="mt-2">
                        <p>Left Turn Lane: {current.junction_config.leftTurn ? "Yes" : "No"}</p>
                        <p>Number of Lanes: {current.junction_config.numLanes}</p>
                    </div>
                    <p className="text-xl font-semibold mt-5">Other Informations</p>
                    <div className="mt-2">
                        <p>Creation Date: {current.created_at.split("T")[0]}</p>
                    </div>
                </div>
            ) : (
                <p>Choose a simulation on the left to view the report.</p>
            )}
        </div>
      </div>
    </div>
  )
}

export default Historynew
