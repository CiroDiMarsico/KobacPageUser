import { useEffect } from "react"
import { useLocation } from "react-router-dom"

// Mientras se navega por /admin o /delivery, apunta el manifest y los meta de
// iOS a la app que corresponde ("KOBAC Admin" o "KOBAC Delivery"). Así, al hacer
// "Agregar a pantalla de inicio" desde Safari, el ícono abre esa sección en modo
// app (sin barra del navegador).
const APPS = [
  { prefijo: "/admin", manifest: "/admin.webmanifest", titulo: "KOBAC Admin" },
  { prefijo: "/delivery", manifest: "/delivery.webmanifest", titulo: "KOBAC Delivery" },
]

const appDe = (pathname) =>
  APPS.find(a => pathname === a.prefijo || pathname.startsWith(`${a.prefijo}/`))

const useAdminPwa = () => {
  const { pathname } = useLocation()
  const app = appDe(pathname)

  useEffect(() => {
    if (!app) return

    const manifest = document.querySelector('link[rel="manifest"]')
    const prevHref = manifest?.getAttribute("href")
    manifest?.setAttribute("href", app.manifest)

    const meta = {
      "apple-mobile-web-app-capable": "yes",
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": app.titulo,
      "apple-mobile-web-app-status-bar-style": "black",
    }
    const added = Object.entries(meta).map(([name, content]) => {
      const el = document.createElement("meta")
      el.name = name
      el.content = content
      document.head.appendChild(el)
      return el
    })

    return () => {
      if (manifest && prevHref) manifest.setAttribute("href", prevHref)
      added.forEach((m) => m.remove())
    }
  }, [app])
}

export default useAdminPwa
