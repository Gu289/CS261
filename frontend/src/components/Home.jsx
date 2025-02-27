// import Sidebar from "./ui/Sidebar"
// import Simulation from "./simulation/Simulation"
// import { useState } from "react"

// const Home = ( { handleSimId }) => {

//     const [showResults, setShowResults] = useState(false)

//     const handleResults = (data) => {
//         setShowResults(!showResults);
//         console.log(data)
//     }

//     return(
//         <div className="bg-white h-screen grid grid-cols-3 overflow-y-hidden">
//             <Sidebar handleSimId={handleSimId} handleResults={handleResults}/>
//             <Simulation 
//                 junctionConfig={yourJunctionConfigObject} 
//                 onSimulationEnd={(results) => {
//                     console.log("Simulation completed with results:", results);
//                     // Handle results, maybe update state or navigate to results page
//                 }} 
//             />
//             <dialog>
//                 C
//             </dialog>
//         </div>
//     )
// }

// export default Home

import Sidebar from "./ui/Sidebar"
import Simulation from "./simulation/Simulation"
import { useState } from "react"

const Home = ({ handleSimId }) => {
    const [showResults, setShowResults] = useState(false)
    const [junctionConfig, setJunctionConfig] = useState(null)
    const [simulationResults, setSimulationResults] = useState(null)

    const handleResults = (data) => {
        setSimulationResults(data)
        setShowResults(!showResults)
    }

    const handleJunctionConfig = (config) => {
        setJunctionConfig(config)
    }

    return(
        <div className="bg-white h-screen grid grid-cols-3 overflow-y-hidden">
            <Sidebar 
                handleSimId={handleSimId} 
                handleResults={handleResults}
                setJunctionConfig={handleJunctionConfig} 
            />
            {junctionConfig && (
                <Simulation 
                    junctionConfig={junctionConfig}
                    onSimulationEnd={handleResults}
                />
            )}
            <dialog open={showResults}>
                {simulationResults && JSON.stringify(simulationResults)}
            </dialog>
        </div>
    )
}

export default Home