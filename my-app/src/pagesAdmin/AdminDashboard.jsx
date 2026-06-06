import { useNavigate } from "react-router-dom"
import LiAdmin from "../components/LiAdmin"

const AdminDashboard = () => {
  const navigate = useNavigate()
  const username = localStorage.getItem("adminUsername") ?? "admin"

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminUsername")
    navigate("/admin")
  }

  return (
    <main className="bg-[#11111F] h-screen w-screen text-white font-['prompt'] flex overflow-hidden">

      {/* Navbar admin: Ahora está verdaderamente bloqueado en su posición */}
      <nav className="fixed top-0 left-0 bg-[#0A0A14] border-r border-white/10 h-screen w-[300px] flex items-center justify-between py-6 px-2 z-50 flex-col shrink-0">
        <span className="font-['koulen'] text-[28px] tracking-widest text-[#C32CFF]">
          KOBAC ADMIN
        </span>

        <ul className="w-full flex flex-col gap-1">
          <LiAdmin route="dashboard" text="DASHBOARD" />
          <LiAdmin route="hola" text="HOLA" />
        </ul>

        <div className="flex items-center gap-4">
          <span className="font-['koulen'] text-[14px] text-white/40 tracking-wider">
            {username.toUpperCase()}
          </span>
          <button
            onClick={handleLogout}
            className="font-['koulen'] text-[14px] text-[#FF4444] border border-[#FF4444]/30 rounded-xl px-4 py-1.5 hover:bg-[#FF4444]/10 transition-colors"
          >
            SALIR
          </button>
        </div>
      </nav>

      {/* Contenido: Este contenedor es el ÚNICO que tiene permitido hacer scroll (overflow-y-auto) */}
      <div className="flex-1 h-full overflow-y-auto pl-0 md:pl-[300px]">
        <div className="flex flex-col items-center justify-center min-h-[150vh] text-center gap-3">
          <h1 className="font-['koulen'] text-[42px] text-white/20 tracking-widest">
            DASHBOARD
          </h1>
          <p className="font-['koulen'] text-[16px] text-white/20 tracking-wider">
            EN CONSTRUCCION
          </p>
        </div>
      </div>

    </main>
  )
}

export default AdminDashboard
