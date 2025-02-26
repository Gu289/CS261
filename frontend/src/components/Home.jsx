import Sidebar from "./ui/Sidebar"
import Simulation from "./simulation/Simulation"

const Home = ( { handleSimId }) => {

    

    return(
        <div className="bg-white h-screen grid grid-cols-3 overflow-y-hidden">
            <Sidebar handleSimId={handleSimId} />
            <Simulation />
        </div>
    )
}

export default Home