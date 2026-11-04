import { useEffect, useState } from "react"
import {
  pushSoportado, esIOS, esAppInstalada,
  activarNotificaciones, sincronizarNotificaciones,
} from "./pushNotificaciones"

// Campanita al lado de la calculadora: activa las notificaciones de ventas en
// este dispositivo. Contorno verde = activas, violeta = no.
const estadoInicial = () => {
  if (!pushSoportado()) return esIOS() && !esAppInstalada() ? "instalar" : "no-soportado"
  if (Notification.permission === "denied") return "bloqueado"
  return "inactivo"
}

const AYUDA = {
  instalar: "Para recibir notificaciones de ventas, abrí esta página en Safari → Compartir → Agregar a pantalla de inicio, y activalas desde la app.",
  bloqueado: "Las notificaciones están bloqueadas. Habilitalas en Ajustes → Notificaciones → KOBAC Admin.",
  "no-soportado": "Este navegador no soporta notificaciones.",
}

const AdminNotificaciones = () => {
  const [estado, setEstado] = useState(estadoInicial)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    sincronizarNotificaciones()
      .then((activo) => { if (activo) setEstado("activo") })
      .catch(() => {})
  }, [])

  const activa = estado === "activo"

  const onClick = async () => {
    if (activa || cargando) return
    if (AYUDA[estado]) { alert(AYUDA[estado]); return }
    setCargando(true)
    try {
      const permiso = await activarNotificaciones()
      if (permiso === "granted") setEstado("activo")
      else if (permiso === "denied") { setEstado("bloqueado"); alert(AYUDA.bloqueado) }
    } catch (e) {
      console.error(e)
      alert("No se pudieron activar las notificaciones. Probá de nuevo.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <button
      onClick={onClick}
      title={activa ? "Notificaciones de ventas activas" : "Activar notificaciones de ventas"}
      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all
        ${activa
          ? "border-green-400 text-green-400"
          : "border-[#C32CFF] text-[#C32CFF] hover:bg-[#C32CFF]/10"}
        ${cargando ? "opacity-50" : ""}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    </button>
  )
}

export default AdminNotificaciones
