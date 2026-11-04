import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import api from "../api/axios"
import Loading from "../components/Loading"

// Verifica que el token en localStorage siga siendo válido en el servidor y lo renueva
const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState("checking") // "checking" | "ok" | "fail"

  useEffect(() => {
    const token = localStorage.getItem("adminToken")
    if (!token) {
      setStatus("fail")
      return
    }

    api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        // El servidor devuelve un token renovado: la sesión se extiende sola
        if (res.data?.token) localStorage.setItem("adminToken", res.data.token)
        setStatus("ok")
      })
      .catch((err) => {
        // Solo cerrar sesión si el servidor rechazó el token. Un corte de red
        // o un 5xx no debe desloguear: se entra igual y el panel reintenta.
        const estado = err.response?.status
        if (estado === 401 || estado === 403) {
          localStorage.removeItem("adminToken")
          localStorage.removeItem("adminUsername")
          setStatus("fail")
        } else {
          setStatus("ok")
        }
      })
  }, [])

  if (status === "checking") return <Loading />
  if (status === "fail") return <Navigate to="/admin" replace />
  return children
}

export default ProtectedRoute
