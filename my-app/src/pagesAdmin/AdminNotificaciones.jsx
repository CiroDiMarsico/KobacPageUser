import { useEffect, useState } from "react"
import {
  pushSoportado, esIOS, esAppInstalada,
  activarNotificaciones, sincronizarNotificaciones, enviarPrueba,
} from "./pushNotificaciones"

// Botón del sidebar para que este celular reciba una notificación por cada venta.
const estadoInicial = () => {
  if (!pushSoportado()) return esIOS() && !esAppInstalada() ? "instalar" : "no-soportado"
  if (Notification.permission === "denied") return "bloqueado"
  return "inactivo"
}

const AdminNotificaciones = () => {
  const [estado, setEstado] = useState(estadoInicial)
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    sincronizarNotificaciones()
      .then((activo) => { if (activo) setEstado("activo") })
      .catch(() => {})
  }, [])

  const activar = async () => {
    setCargando(true)
    setMensaje("")
    try {
      const permiso = await activarNotificaciones()
      if (permiso === "granted") setEstado("activo")
      else if (permiso === "denied") setEstado("bloqueado")
    } catch (e) {
      console.error(e)
      setMensaje("No se pudieron activar. Probá de nuevo.")
    } finally {
      setCargando(false)
    }
  }

  const probar = async () => {
    setCargando(true)
    setMensaje("")
    try {
      const { data } = await enviarPrueba()
      setMensaje(`Prueba enviada a ${data.enviados} dispositivo${data.enviados === 1 ? "" : "s"}`)
    } catch {
      setMensaje("No se pudo enviar la prueba")
    } finally {
      setCargando(false)
    }
  }

  const boton = "font-['koulen'] text-[14px] tracking-wider rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50"

  return (
    <div className="w-full flex flex-col items-center gap-2 text-center px-2">
      {estado === "inactivo" && (
        <button onClick={activar} disabled={cargando}
          className={`${boton} text-[#C32CFF] border border-[#C32CFF]/40 hover:bg-[#C32CFF]/10`}>
          🔔 ACTIVAR NOTIFICACIONES DE VENTAS
        </button>
      )}

      {estado === "activo" && (
        <div className="flex items-center gap-2">
          <span className="font-['koulen'] text-[14px] tracking-wider text-[#4ADE80]">🔔 NOTIFICACIONES ACTIVAS</span>
          <button onClick={probar} disabled={cargando}
            className={`${boton} text-white/60 border border-white/20 hover:bg-white/5`}>
            PROBAR
          </button>
        </div>
      )}

      {estado === "instalar" && (
        <p className="text-[12px] text-white/50">
          Para recibir notificaciones de ventas, abrí esta página en Safari → Compartir →
          <b> Agregar a pantalla de inicio</b>, y activalas desde la app.
        </p>
      )}

      {estado === "bloqueado" && (
        <p className="text-[12px] text-white/50">
          Las notificaciones están bloqueadas. Habilitalas en Ajustes → Notificaciones → KOBAC Admin.
        </p>
      )}

      {estado === "no-soportado" && (
        <p className="text-[12px] text-white/40">Este navegador no soporta notificaciones.</p>
      )}

      {mensaje && <p className="text-[12px] text-white/60">{mensaje}</p>}
    </div>
  )
}

export default AdminNotificaciones
