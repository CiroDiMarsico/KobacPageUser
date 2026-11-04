import api from "../api/axios"

// Notificaciones push de ventas nuevas para el admin instalado en el celular.
// En iPhone solo funcionan con la app agregada a la pantalla de inicio (iOS 16.4+).

const SW_URL = "/admin-sw.js"
const SW_SCOPE = "/admin"

export const pushSoportado = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

export const esIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

export const esAppInstalada = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true

const registrarSW = () => navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })

// La clave pública llega en base64url y PushManager la quiere en bytes.
const claveABytes = (base64) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const guardarEnServidor = (sub) => api.post("/admin/push/subscribe", sub.toJSON())

// Tiene que llamarse desde un toque del usuario (iOS lo exige para pedir permiso).
export const activarNotificaciones = async () => {
  const permiso = await Notification.requestPermission()
  if (permiso !== "granted") return permiso

  const reg = await registrarSW()
  await navigator.serviceWorker.ready
  const { data } = await api.get("/admin/push/public-key")

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveABytes(data.publicKey),
    })
  }
  await guardarEnServidor(sub)
  return "granted"
}

// Al abrir el panel: si ya estaba activado, re-sincroniza la suscripción con el
// servidor (el navegador puede rotarla). Devuelve true si está activa.
export const sincronizarNotificaciones = async () => {
  if (!pushSoportado() || Notification.permission !== "granted") return false
  const reg = await registrarSW()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return false
  await guardarEnServidor(sub)
  return true
}

// Al cerrar sesión: este celular deja de recibir ventas.
// Lee el token al empezar, porque el logout lo borra enseguida.
export const desactivarNotificaciones = async () => {
  if (!pushSoportado()) return
  const token = localStorage.getItem("adminToken")
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE)
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await api.post("/admin/push/unsubscribe", { endpoint: sub.endpoint }, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
  await sub.unsubscribe().catch(() => {})
}

export const enviarPrueba = () => api.post("/admin/push/test")
