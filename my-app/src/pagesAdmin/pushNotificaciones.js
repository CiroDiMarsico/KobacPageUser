import api from "../api/axios"

// Notificaciones push para las apps instaladas en el celular:
//   - admin: ventas nuevas
//   - delivery: pedidos confirmados para el cadete
// En iPhone solo funcionan con la app agregada a la pantalla de inicio (iOS 16.4+).

export const pushSoportado = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

export const esIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

export const esAppInstalada = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true

// La clave pública llega en base64url y PushManager la quiere en bytes.
const claveABytes = (base64) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

// swUrl / scope: service worker de esa app. apiBase: "/admin/push" o
// "/delivery/push". tokenKey: dónde guarda su sesión.
const crearPush = ({ swUrl, scope, apiBase, tokenKey }) => {
  const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey)}` } })
  const registrarSW = () => navigator.serviceWorker.register(swUrl, { scope })
  const guardarEnServidor = (sub) => api.post(`${apiBase}/subscribe`, sub.toJSON(), auth())

  // Tiene que llamarse desde un toque del usuario (iOS lo exige para pedir permiso).
  const activarNotificaciones = async () => {
    const permiso = await Notification.requestPermission()
    if (permiso !== "granted") return permiso

    const reg = await registrarSW()
    await navigator.serviceWorker.ready
    const { data } = await api.get(`${apiBase}/public-key`, auth())

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

  // Al abrir la app: si ya estaba activado, re-sincroniza la suscripción con el
  // servidor (el navegador puede rotarla). Devuelve true si está activa.
  const sincronizarNotificaciones = async () => {
    if (!pushSoportado() || Notification.permission !== "granted") return false
    const reg = await registrarSW()
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return false
    await guardarEnServidor(sub)
    return true
  }

  // Al cerrar sesión: este celular deja de recibir notificaciones.
  // Lee el token al empezar, porque el logout lo borra enseguida.
  const desactivarNotificaciones = async () => {
    if (!pushSoportado()) return
    const headers = auth()
    const reg = await navigator.serviceWorker.getRegistration(scope)
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await api.post(`${apiBase}/unsubscribe`, { endpoint: sub.endpoint }, headers).catch(() => {})
    await sub.unsubscribe().catch(() => {})
  }

  return { activarNotificaciones, sincronizarNotificaciones, desactivarNotificaciones }
}

export const pushAdmin = crearPush({
  swUrl: "/admin-sw.js", scope: "/admin", apiBase: "/admin/push", tokenKey: "adminToken",
})

export const pushDelivery = crearPush({
  swUrl: "/delivery-sw.js", scope: "/delivery", apiBase: "/delivery/push", tokenKey: "deliveryToken",
})

export const { activarNotificaciones, sincronizarNotificaciones, desactivarNotificaciones } = pushAdmin
