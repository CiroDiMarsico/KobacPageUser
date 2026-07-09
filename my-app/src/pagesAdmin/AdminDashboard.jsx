import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import menuIcon from "/assets/menu.webp"
import LiAdmin from "../components/LiAdmin"
import AdminProductos from "./AdminProductos"
import AdminPromos from "./AdminPromos"
import AdminStock from "./AdminStock"
import AdminVentas from "./AdminVentas"
import AdminPageUser from "./AdminPageUser"
import AdminDashboardGanancias from "./AdminDashboardGanancias"
import AdminDashboardProductos from "./AdminDashboardProductos"
import AdminClientes from "./AdminClientes"
import AdminGastos from "./AdminGastos"
import AdminCierreCaja from "./AdminCierreCaja"
import AdminDescuentos from "./AdminDescuentos"
import AdminCalculadora from "./AdminCalculadora"

const SECCIONES = {
  "PRODUCTOS": <AdminProductos />,
  "PROMOS": <AdminPromos />,
  "STOCK": <AdminStock />,
  "VENTAS": <AdminVentas />,
  "ADMIN PAGE USER": <AdminPageUser />,
  "DASHBOARD GANANCIAS": <AdminDashboardGanancias />,
  "DASHBOARD PRODUCTOS": <AdminDashboardProductos />,
  "DASHBOARD CLIENTES": <AdminClientes />,
  "GASTOS": <AdminGastos />,
  "CIERRE DE CAJA": <AdminCierreCaja />,
  "DESCUENTOS": <AdminDescuentos />,
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const username = localStorage.getItem("adminUsername") ?? "admin"
  const [page, setPage] = useState("VENTAS")
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminUsername")
    navigate("/admin")
  }

  const handleNav = (seccion) => {
    setPage(seccion)
    setOpen(false)
  }

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <main className="bg-[#11111F] h-screen w-screen text-white font-['prompt'] flex overflow-hidden">

      {/* Navbar mobile */}
      <nav className="fixed top-0 left-0 bg-[#0A0A14] border-b border-white/10 w-screen h-[60px] min-[1600px]:hidden flex z-30 justify-between items-center px-4">
        <button className="w-[35px]" onClick={() => setOpen(!open)}>
          <img src={menuIcon} alt="menu" />
        </button>
        <h1 className="text-white/70 font-['koulen'] text-[20px]">{page}</h1>
        <div className="w-[35px]" />
      </nav>

      {/* Overlay mobile */}
      <div className={`fixed inset-0 min-[1600px]:hidden z-40 bg-black/50 transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)} />

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bg-[#0A0A14] border-r border-white/10 h-full w-[300px] flex flex-col items-center justify-between py-6 px-2 z-50 shrink-0 transition-transform duration-300 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
        ${open ? "translate-x-0" : "max-[1599px]:-translate-x-full"}`}>

        <div className="w-full flex flex-col items-center gap-6">
          <span className="font-['koulen'] text-[28px] tracking-widest text-[#C32CFF]">KOBAC ADMIN</span>
          <div className="w-full">
            <h2 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-2 px-1 text-center">Análisis</h2>
            <hr className="border-white/20 mb-1" />
            <ul className="w-full flex flex-col gap-1 mb-6">
              <LiAdmin text="DASHBOARD GANANCIAS" active={page === "DASHBOARD GANANCIAS"} onClick={() => handleNav("DASHBOARD GANANCIAS")} />
              <LiAdmin text="DASHBOARD PRODUCTOS" active={page === "DASHBOARD PRODUCTOS"} onClick={() => handleNav("DASHBOARD PRODUCTOS")} />
              <LiAdmin text="DASHBOARD CLIENTES" active={page === "DASHBOARD CLIENTES"} onClick={() => handleNav("DASHBOARD CLIENTES")} />
            </ul>
            <h2 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-2 px-1 text-center">Gestión Comercial</h2>
            <hr className="border-white/20 mb-1" />
            <ul className="w-full flex flex-col gap-1 mb-6">
              <LiAdmin text="PRODUCTOS" active={page === "PRODUCTOS"} onClick={() => handleNav("PRODUCTOS")} />
              <LiAdmin text="PROMOS" active={page === "PROMOS"} onClick={() => handleNav("PROMOS")} />
              <LiAdmin text="STOCK" active={page === "STOCK"} onClick={() => handleNav("STOCK")} />
              <LiAdmin text="VENTAS" active={page === "VENTAS"} onClick={() => handleNav("VENTAS")} />
              <LiAdmin text="GASTOS" active={page === "GASTOS"} onClick={() => handleNav("GASTOS")} />
            </ul>
            <h2 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-2 px-1 text-center">Finanzas</h2>
            <hr className="border-white/20 mb-1" />
            <ul className="w-full flex flex-col gap-1 mb-6">
              <LiAdmin text="CIERRE DE CAJA" active={page === "CIERRE DE CAJA"} onClick={() => handleNav("CIERRE DE CAJA")} />
            </ul>
            <h2 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-2 px-1 text-center">Configuración</h2>
            <hr className="border-white/20 mb-1" />
            <ul className="w-full flex flex-col gap-1">
              <LiAdmin text="ADMIN PAGE USER" active={page === "ADMIN PAGE USER"} onClick={() => handleNav("ADMIN PAGE USER")} />
              <LiAdmin text="DESCUENTOS" active={page === "DESCUENTOS"} onClick={() => handleNav("DESCUENTOS")} />
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AdminCalculadora />
          <span className="font-['koulen'] text-[14px] text-white/40 tracking-wider">{username.toUpperCase()}</span>
          <button onClick={handleLogout}
            className="font-['koulen'] text-[14px] text-[#FF4444] border border-[#FF4444]/30 rounded-xl px-4 py-1.5 hover:bg-[#FF4444]/10 transition-colors">
            SALIR
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto min-[1600px]:pl-[300px] mt-[60px] min-[1600px]:mt-0 pb-[80px]">
        {SECCIONES[page] ?? (
          <div className="flex flex-col items-center justify-center min-h-full text-center gap-3 p-6">
            <h1 className="font-['koulen'] text-[42px] text-white/20 tracking-widest">{page}</h1>
            <p className="font-['koulen'] text-[16px] text-white/20 tracking-wider">EN CONSTRUCCIÓN</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default AdminDashboard
