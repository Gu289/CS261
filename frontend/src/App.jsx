import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home.jsx'
import History from './components/History.jsx'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={Home} />
        <Route path="/history" element={History} />
      </Routes>
    </BrowserRouter>
    
  )
}

export default App
