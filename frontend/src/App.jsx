import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home.jsx'
import History from './components/History.jsx'
import { useState } from "react";


function App() {

  const [simulationId, setSimulationId] = useState(0);


  const handleSimId = (id) => {
      setSimulationId(id)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home handleSimId={handleSimId}/>} />
        <Route path="/history" element={<History simId={simulationId}/>} />
      </Routes>
    </BrowserRouter>
    
  )
}

export default App
