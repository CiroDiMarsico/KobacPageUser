import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/axios"

const AdminLogin = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (localStorage.getItem("adminToken")) {
    navigate("/admin/dashboard")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await api.post("/auth/login", { username, password })
      localStorage.setItem("adminToken", res.data.token)
      localStorage.setItem("adminUsername", res.data.username)
      navigate("/admin/dashboard")
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="bg-[#11111F] min-h-dvh flex items-center justify-center font-['prompt']">
      {/* Fondo con gradiente sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#C32CFF]/5 blur-[120px]" />
        <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#6F3784]/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-[90vw] max-w-[400px] flex flex-col items-center gap-8">
        {/* Logo / título */}
        <div className="flex flex-col items-center gap-1">
          <h1
            className="font-['koulen'] text-[52px] leading-none tracking-widest text-white"
            style={{ textShadow: "0 0 30px #C32CFF88" }}
          >
            KOBAC
          </h1>
          <span className="font-['prompt'] text-[16px] text-white/40 tracking-[0.3em]">
            ADMINISTRACIÓN
          </span>
        </div>

        {/* Card del form */}
        <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-5 backdrop-blur-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-['prompt'] text-[14px] text-white/50 tracking-widest">
                USUARIO
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                autoComplete="username"
                className="bg-[#1E1E2E] border border-white/10 rounded-2xl h-[52px] px-5 font-['koulen'] text-[18px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-['prompt'] text-[14px] text-white/50 tracking-widest">
                CONTRASEÑA
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                autoComplete="current-password"
                className="bg-[#1E1E2E] border border-white/10 rounded-2xl h-[52px] px-5 font-['koulen'] text-[18px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="font-['koulen'] text-[14px] text-[#FF4444] text-center">
              {error}
            </p>
          )}

          {/* Botón */}
          <button
            onClick={handleLogin}
            disabled={loading || !username || !password}
            className="w-full h-[52px] rounded-2xl bg-[#C32CFF] font-['koulen'] text-[22px] text-white tracking-widest
              disabled:opacity-40 disabled:cursor-not-allowed
              hover:bg-[#d444ff] active:scale-[0.98] transition-all duration-150"
            style={{ boxShadow: "0 0 20px #C32CFF44" }}
          >
            {loading ? "INGRESANDO..." : "INGRESAR"}
          </button>
        </div>

        <p className="font-['koulen'] text-[12px] text-white/20 tracking-widest">
          ACCESO RESTRINGIDO
        </p>
      </div>
    </main>
  )
}

export default AdminLogin
