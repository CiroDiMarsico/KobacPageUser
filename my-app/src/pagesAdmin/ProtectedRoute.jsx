import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import api from "../api/axios"
import Loading from "../components/Loading"

// Verifica que el token en localStorage siga siendo válido en el servidor
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
      .then(() => setStatus("ok"))
      .catch(() => {
        localStorage.removeItem("adminToken")
        localStorage.removeItem("adminUsername")
        setStatus("fail")
      })
  }, [])

  if (status === "checking") return <Loading />
  if (status === "fail") return <Navigate to="/admin" replace />
  return children
}

export default ProtectedRoute
