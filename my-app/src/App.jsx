//sfc -> crear funcion de componente
import { Routes, Route } from "react-router-dom"
import { useState, useEffect } from "react"

// Páginas usuario
import Home from "./pages/Home"
import Location from "./pages/Location"
import Confirm from "./pages/Confirm"
import NotFound from "./pages/NotFound"
import Navbar from "./components/Navbar"
import Loading from "./components/Loading"
import HomeVapes from "./pages/HomeVapes"

// Páginas admin
import AdminLogin from "./pagesAdmin/AdminLogin"
import AdminDashboard from "./pagesAdmin/AdminDashboard"
import ProtectedRoute from "./pagesAdmin/ProtectedRoute"
function App() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000)
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={loading ? <Loading /> : <><Navbar /><Home /></>} />
        <Route path="/v" element={loading ? <Loading /> : <><Navbar /><HomeVapes /></>} />
        <Route path="/location" element={<><Navbar /><Location /></>} />
        <Route path="/confirm" element={<><Navbar /><Confirm /></>} />

        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
