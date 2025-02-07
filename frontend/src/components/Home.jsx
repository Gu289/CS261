import Sidebar from "./Sidebar"
import Simulation from "./Simulation"

const Home = () => {

    return(
        <div className="bg-white h-screen grid grid-cols-3 overflow-hidden">
            <Sidebar />
            <Simulation />
        </div>
    )
}

export default Home