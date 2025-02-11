import { useState } from "react";
import { Trash, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialSimulations = [
  { id: 1, name: "Simulation #1", score: 85, date: "2024-02-10" },
  { id: 2, name: "Simulation #2", score: 78, date: "2024-02-09" },
  { id: 3, name: "Simulation #3", score: 90, date: "2024-02-08" },
  { id: 4, name: "Simulation #4", highest: true, parameters: ["Left Turn Lane", "West inbound and outbound traffic flow", "3 Lanes configuration"], score: 95, date: "2024-02-07" },
  { id: 5, name: "Simulation #5", score: 80, date: "2024-02-06" },
  { id: 6, name: "Simulation #6", score: 82, date: "2024-02-05" },
  { id: 7, name: "Simulation #7", score: 88, date: "2024-02-04" }
];

const History = () => {
  const navigate = useNavigate();
  const [simulations, setSimulations] = useState(initialSimulations);
  const [selectedSim, setSelectedSim] = useState(null);
  const [sortOption, setSortOption] = useState(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const clearHistory = () => {
    setSimulations([]);
    setSelectedSim(null);
  };

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
    setSortOption(option);
    setSimulations(sortedSimulations);
    setIsSortMenuOpen(false);
  };

  return (
    <div className="flex h-screen p-4 relative">
      {/* Close Button */}
      <button 
        className="absolute top-4 right-4 bg-gray-300 p-2 rounded-full hover:bg-gray-400"
        onClick={() => navigate("/")}
      >
        <X size={24} />
      </button>
      
      {/* Past Simulations List */}
      <div className="w-1/3 bg-gray-200 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Past Simulations</h2>
          <button 
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700"
            onClick={clearHistory}
          >
            Clear History
          </button>
        </div>
        {/* Sorting Button */}
        <div className="relative mt-2">
          <button 
            className="bg-gray-300 text-black px-3 py-1 rounded flex items-center gap-2" 
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
          >
            <Filter size={18} /> Sort By
          </button>
          {isSortMenuOpen && (
            <div className="absolute bg-white shadow-md rounded mt-1">
              <button className="block w-full px-4 py-2 text-left hover:bg-gray-200" onClick={() => sortSimulations("score")}>
                Overall Score
              </button>
              <button className="block w-full px-4 py-2 text-left hover:bg-gray-200" onClick={() => sortSimulations("date")}>
                Date Created
              </button>
              <button className="block w-full px-4 py-2 text-left hover:bg-gray-200" onClick={() => sortSimulations("name")}>
                Alphabetic Order
              </button>
            </div>
          )}
        </div>
        {simulations.length > 0 ? (
          <ul>
            {simulations.map((sim) => (
              <li
                key={sim.id}
                className={`flex justify-between items-center p-2 my-2 rounded cursor-pointer hover:bg-gray-300 ${selectedSim?.id === sim.id ? 'bg-gray-400' : 'bg-white'}`}
                onClick={() => setSelectedSim(sim)}
              >
                <span>{sim.name}</span>
                <button onClick={() => deleteSimulation(sim.id)} className="text-red-500 hover:text-red-700">
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 mt-4">No simulations found.</p>
        )}
      </div>

      {/* Simulation Report */}
      <div className="w-2/3 bg-white p-4 ml-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold">Simulation Report</h2>
        {selectedSim ? (
          <div>
            <p>Current simulation: <strong>{selectedSim.name}</strong></p>
            {selectedSim.highest && <p className="text-green-600">🔥 Highest Scoring Simulation!</p>}
            {selectedSim.parameters && (
              <>
                <p className="font-semibold">Key Parameters:</p>
                <ul className="list-disc pl-5">
                  {selectedSim.parameters.map((param, index) => (
                    <li key={index}>{param}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <p>Click on a simulation to view the report.</p>
        )}
      </div>
    </div>
  );
};

export default History;

