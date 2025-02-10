import { useState } from "react";

const initialSimulations = [
  { id: 1, name: "Simulation #1" },
  { id: 2, name: "Simulation #2" },
  { id: 3, name: "Simulation #3" },
  { id: 4, name: "Simulation #4", highest: true, parameters: ["Left Turn Lane", "West inbound and outbound traffic flow", "3 Lanes configuration"] },
  { id: 5, name: "Simulation #5" },
  { id: 6, name: "Simulation #6" },
  { id: 7, name: "Simulation #7" }
];

const History = () => {
  const [simulations, setSimulations] = useState(initialSimulations);
  const [selectedSim, setSelectedSim] = useState(null);

  const clearHistory = () => {
    setSimulations([]);
    setSelectedSim(null);
  };

  return (
    <div className="flex h-screen p-4">
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
        {simulations.length > 0 ? (
          <ul>
            {simulations.map((sim) => (
              <li
                key={sim.id}
                className="p-2 bg-white my-2 rounded cursor-pointer hover:bg-gray-300"
                onClick={() => setSelectedSim(sim)}
              >
                {sim.name}
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
