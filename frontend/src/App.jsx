import { Router, Route } from 'react-router-dom';
import Home from './components/Home.jsx'

function App() {

  return (
    <Router>
      <Route path="/" element={Home} />
      <Route path="/history" />
    </Router>
  )
}

export default App
