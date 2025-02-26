import Sidebar from "./ui/Sidebar"
import Simulation from "./simulation/Simulation"

const Home = () => {

    return(
        <div className="bg-white h-screen grid grid-cols-3 overflow-y-hidden">
            <Sidebar />
            <Simulation />
        </div>
    )
}

export default Home