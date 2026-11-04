import { useEffect } from "react"
import { useLocation } from "react-router-dom"

// Mientras se navega por /admin, apunta el manifest y los meta de iOS a la
// versión "KOBAC Admin". Así, al hacer "Agregar a pantalla de inicio" desde
// Safari, el ícono abre /admin en modo app (sin barra del navegador).
const ADMIN_META = {
  "apple-mobile-web-app-capable": "yes",
  "mobile-web-app-capable": "yes",
  "apple-mobile-web-app-title": "KOBAC Admin",
  "apple-mobile-web-app-status-bar-style": "black",
}

const useAdminPwa = () => {
  const { pathname } = useLocation()
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/")

  useEffect(() => {
    if (!isAdmin) return

    const manifest = document.querySelector('link[rel="manifest"]')
    const prevHref = manifest?.getAttribute("href")
    manifest?.setAttribute("href", "/admin.webmanifest")

    const added = Object.entries(ADMIN_META).map(([name, content]) => {
      const meta = document.createElement("meta")
      meta.name = name
      meta.content = content
      document.head.appendChild(meta)
      return meta
    })

    return () => {
      if (manifest && prevHref) manifest.setAttribute("href", prevHref)
      added.forEach((m) => m.remove())
    }
  }, [isAdmin])
}

export default useAdminPwa
