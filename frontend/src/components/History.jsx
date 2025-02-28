import { useState, useEffect } from "react";
import { Trash, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// const initialSimulations = [
//   { id: 1, name: "Simulation #1", score: 85, date: "2024-02-10" },
//   { id: 2, name: "Simulation #2", score: 78, date: "2024-02-09" },
//   { id: 3, name: "Simulation #3", score: 90, date: "2024-02-08" },
//   { id: 4, name: "Simulation #4", highest: true, parameters: ["Left Turn Lane: Yes", "West inbound and outbound traffic flow", "3 Lanes configuration"], score: 95, date: "2024-02-07" },
//   { id: 5, name: "Simulation #5", score: 80, date: "2024-02-06" },
//   { id: 6, name: "Simulation #6", score: 82, date: "2024-02-05" },
//   { id: 7, name: "Simulation #7", score: 88, date: "2024-02-04" }
// ];

const History = () => {

  const navigate = useNavigate();
  const [simulations, setSimulations] = useState([]);
  const [selectedSim, setSelectedSim] = useState(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const clearHistory = () => {
    try {
      console.log(simulations)
      simulations.forEach(async (simulation) => {
        const response = await axios.delete(`http://127.0.0.1:8000/simulation/delete-simulation/?simulation_id=${simulation.simulation_id}`)
        console.log(response)
      })
      setSimulations([]);
      setSelectedSim(null);
    } catch (error) {
      console.error(error);
    }
  }

  const deleteSimulation = (id) => {
    setSimulations(simulations.filter(sim => sim.id !== id));
    if (selectedSim && selectedSim.id === id) {
      setSelectedSim(null);
    }
  };

  const sortSimulations = (option) => {
    let sortedSimulations = [...simulations];
    if (option === "score") {
      sortedSimulations.sort((a, b) => b.score - a.score);
    } else if (option === "date") {
      sortedSimulations.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (option === "name") {
      sortedSimulations.sort((a, b) => a.name.localeCompare(b.name));
    }
    setSimulations(sortedSimulations);
    setIsSortMenuOpen(false);
  };

  useEffect(() => {
    const getData = async () => {
      const response = await axios.get(`http://127.0.0.1:8000/simulation/completed-simulations/`)
      console.log(response)
      setSimulations(response.data);
    }

    getData();
  }, [])

  return (
    <div className="flex h-screen bg-gray-900 text-white p-6 relative">
      
      {/* Close Button (Top Left) */}
      <button 
        className="cursor-pointer absolute top-4 left-4 text-gray-300 hover:text-gray-500"
        onClick={() => navigate("/")}
      >
        <X size={32} />
      </button>

      {/* Sidebar - Past Simulations */}
      <div className="w-1/3 bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Past Simulations</h2>
          
          {/* Sorting Button */}
          <div className="relative">
            <button 
              className="bg-gray-700 text-white px-3 py-2 rounded flex items-center gap-2 cursor-pointer" 
              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            >
              <Filter size={20} /> Sort
            </button>
            {isSortMenuOpen && (
              <div className="absolute right-0 bg-gray-800 text-white shadow-lg rounded mt-1">
                <button className="block w-full px-4 py-2 text-left hover:bg-gray-600 cursor-pointer" onClick={() => sortSimulations("score")}>
                  Overall Score
                </button>
                <button className="block w-full px-4 py-2 text-left hover:bg-gray-600 cursor-pointer" onClick={() => sortSimulations("date")}>
                  Date Created
                </button>
                <button className="block w-full px-4 py-2 text-left hover:bg-gray-600 cursor-pointer" onClick={() => sortSimulations("name")}>
                  Alphabetic Order
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Simulations List */}
        <div className="mt-4 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          {simulations.length > 0 ? (
            <ul>
              {simulations.map((sim) => (
                <li
                  key={sim.simulation_id}
                  className={`flex justify-between items-center p-3 my-2 rounded-lg cursor-pointer hover:bg-gray-800 ${selectedSim?.id === sim.id ? 'bg-gray-700' : 'bg-gray-900'}`}
                  onClick={() => setSelectedSim(sim)}
                >
                  <span className="text-lg">Simulation {sim.simulation_id}</span>
                  <button onClick={() => deleteSimulation(sim.simulation_id)} className="text-red-400 hover:text-red-600">
                    <Trash size={20} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 mt-4">No simulations found.</p>
          )}
        </div>

        {/* Clear History Button */}
        <button 
          className="bg-red-500 text-white px-4 py-2 mt-6 w-full rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
          onClick={clearHistory}
        >
          <X size={20} /> Clear History
        </button>
      </div>

      {/* Simulation Report */}
      <div className="w-2/3 bg-gray-100 text-black p-6 ml-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold">Simulation Report</h2>
        
        {selectedSim ? (
          <div className="mt-4">
            <p className="text-lg font-semibold">Current Simulation: <strong>Simulation {selectedSim.simulation_id}</strong></p>
            {simulations.every((sim) => {
              if(sim.efficiency_score < selectedSim.efficiency_score){
                return true
              } 
            }) && <p className="text-green-600 font-bold mt-2">🔥 Highest Scoring Simulation!</p>}
            
            {selectedSim.metrics && (
              <>
                <p className="text-lg font-semibold mt-4">Key Parameters:</p>
                <ul className="list-disc pl-6 text-lg mt-2">
                  {Object.entries(selectedSim.metrics).forEach(([direction, values]) => {
                    <p>{direction}</p>
                    Object.entries(values).forEach((metric, value) => {
                      <li>{metric}: {value}</li>
                    })
                  })}
                </ul>
              </>
            )}
          </div>
        ) : (
          <p className="text-gray-500 mt-4 text-lg italic">Click on a simulation to view the report.</p>
        )}
      </div>
    </div>
  );
};

export default History;

