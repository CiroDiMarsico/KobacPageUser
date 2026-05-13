//sfc -> crear funcion de componente
import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Navbar from "./components/Navbar"
import { useState, useEffect } from "react"
import Loading from "./components/Loading";
function App() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000)
  }, [])

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={loading ? <Loading /> : <Home />} />
      </Routes>
    </>
  )
}

export default App
