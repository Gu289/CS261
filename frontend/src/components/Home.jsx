import Sidebar from "./ui/Sidebar"
import Simulation from "./simulation/Simulation"
import { useState } from "react"

const Home = ( { handleSimId }) => {

    const [showResults, setShowResults] = useState(false)

    const handleResults = (data) => {
        setShowResults(!showResults);
        console.log(data)
    }

    return(
        <div className="bg-white h-screen grid grid-cols-3 overflow-y-hidden">
            <Sidebar handleSimId={handleSimId} handleResults={handleResults}/>
            <Simulation />
            <dialog>
                C
            </dialog>
        </div>
    )
}

export default Home