

import React, { useState, useEffect } from "react";
import Sidebar from "./ui/Sidebar";
import Simulation from "./simulation/Simulation";
import axios from "axios";

const Home = ({ handleSimId }) => {
  const [showResults, setShowResults] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [simulationId, setSimulationId] = useState(null);
  const [error, setError] = useState(null);

  // Callback triggered when simulation starts/completes
  const handleResults = (data) => {
    console.log("Received simulation data:", data);
    setSimulationId(data.simulation_id);
  };

  useEffect(() => {
    let interval;
    if (simulationId) {
      console.log("Starting polling for simulationId:", simulationId);
      // Start polling the simulation status every 2 seconds
      interval = setInterval(() => {
        axios
          .get(
            `http://127.0.0.1:8000/simulation/check-simulation-status/?simulation_id=${simulationId}`
          )
          .then((response) => {
            console.log("Status check response:", response.data);
            if (response.data.simulation_status === "completed") {
              clearInterval(interval);
              // When completed, fetch the results
              axios
                .get(
                  `http://127.0.0.1:8000/simulation/completed-simulation/?simulation_id=${simulationId}`
                )
                .then((completedResponse) => {
                  console.log("Simulation data received:", completedResponse.data);
                  setSimulationData(completedResponse.data);
                  setShowResults(true);
                })
                .catch((error) => {
                  console.error("Error fetching completed simulation data:", error);
                  setError(
                    `Failed to get simulation results: ${error.response?.status || error.message}`
                  );
                  // Even if this call fails, we should show something to the user
                  setShowResults(true);
                });
            }
          })
          .catch((error) => {
            console.error("Error checking simulation status:", error);
            setError("Error checking simulation status");
          });
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simulationId]);

  // Helper function to render any value, including nested objects
  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return "N/A";
    } else if (typeof value === "object") {
      return (
        <div className="ml-4 mt-1">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} className="mb-1">
              <span className="font-bold">{subKey}:</span>{" "}
              {typeof subValue === "object" ? JSON.stringify(subValue) : subValue}
            </div>
          ))}
        </div>
      );
    } else {
      return String(value);
    }
  };

  const closeDialog = () => {
    setShowResults(false);
    setSimulationData(null);
    setSimulationId(null);
    setError(null);
  };

  return (
    <div className="bg-white h-screen grid grid-cols-3 overflow-y-hidden">
      <Sidebar handleSimId={handleSimId} handleResults={handleResults} />
      <Simulation />
    
    {showResults && (
    <dialog
        open
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-xl z-50 max-w-4xl w-3/4 max-h-[80vh] overflow-y-auto"
    >
        <h2 className="text-xl font-bold mb-4">Simulation Results</h2>

        {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
        </div>
        )}

        {simulationData ? (
        <>
            <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Metrics</h3>
            {simulationData.metrics ? (
                <div className="bg-gray-100 p-3 rounded">
                {Object.entries(simulationData.metrics).map(([key, value]) => (
                    <div key={key} className="mb-1">
                    <span className="font-bold">{key.replace(/_/g, ' ')}:</span> {renderValue(value)}
                    </div>
                ))}
                </div>
            ) : (
                <p>No metrics available</p>
            )}
            </div>
            <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Junction Configuration</h3>
            {simulationData.junction_config ? (
                <div className="bg-gray-100 p-3 rounded">
                {Object.entries(simulationData.junction_config).map(
                    ([region, config]) => (
                    <div key={region} className="mb-3">
                        <span className="font-bold">
                        {region.charAt(0).toUpperCase() + region.slice(1)}:
                        </span>
                        {typeof config === "object" ? renderValue(config) : config}
                    </div>
                    )
                )}
                </div>
            ) : (
                <p>No junction configuration available</p>
            )}
            </div>
        </>
        ) : (
        <p>Loading simulation results...</p>
        )}

        <button
        onClick={closeDialog}
        className="mt-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
        Close
        </button>
    </dialog>
    )}
    </div>
  );
};

export default Home;