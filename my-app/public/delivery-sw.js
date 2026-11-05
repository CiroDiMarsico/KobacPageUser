// Service worker del cadete: recibe las notificaciones push de pedidos confirmados.
// Solo se registra desde /delivery (scope "/delivery"), no afecta la página pública.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data?.text() }
  }

  const title = data.title || 'Pedido confirmado'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/favicon-192.png',
      badge: '/favicon-192.png',
      tag: data.tag,
      data: { url: data.url || '/delivery' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/delivery'

  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const ventana of ventanas) {
      if (new URL(ventana.url).pathname.startsWith('/delivery')) {
        await ventana.focus()
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})
