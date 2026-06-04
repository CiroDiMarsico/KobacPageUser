import { useNavigate } from "react-router-dom"

const AdminDashboard = () => {
  const navigate = useNavigate()
  const username = localStorage.getItem("adminUsername") ?? "admin"

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminUsername")
    navigate("/admin")
  }

  return (
    <main className="bg-[#11111F] min-h-dvh text-white font-['prompt']">
      {/* Navbar admin */}
      <nav className="bg-[#0A0A14] border-b border-white/10 h-[60px] flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50">
        <span className="font-['koulen'] text-[22px] tracking-widest text-[#C32CFF]">
          KOBAC ADMIN
        </span>
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

      {/* Contenido */}
      <div className="pt-[80px] flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-['koulen'] text-[42px] text-white/20 tracking-widest">
            DASHBOARD
          </h1>
          <p className="font-['koulen'] text-[16px] text-white/20 tracking-wider">
            EN CONSTRUCCIÓN
          </p>
        </div>
      </div>
    </main>
  )
}

export default AdminDashboard
