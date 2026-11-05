import { useState, useEffect, useCallback } from "react"
import api from "../api/axios"
import Loading from "../components/Loading"
import AdminNotificaciones from "../pagesAdmin/AdminNotificaciones"
import { pushDelivery } from "../pagesAdmin/pushNotificaciones"

// Panel del cadete: pedidos confirmados y en camino, con los botones
// EN CAMINO y ENTREGADO. Al marcar ENTREGADO se abre WhatsApp con el
// cliente y el mensaje "afuera!".

const TOKEN_KEY = "deliveryToken"
const ACTUALIZAR_CADA_MS = 20000
const MENSAJE_LLEGADA = "afuera!"

const getToken = () => localStorage.getItem(TOKEN_KEY)
// El token va explícito para que no lo pise el del admin (si el dueño entra
// desde su celular, el interceptor manda el del admin, que también sirve).
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } })

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""

// Teléfono argentino → formato internacional para WhatsApp (549 + área + número)
const telefonoWsp = (tel) => {
    let n = String(tel || "").replace(/\D/g, "")
    if (!n) return ""
    if (n.startsWith("54")) {
        n = n.slice(2)
        if (n.startsWith("9")) n = n.slice(1)
    }
    if (n.startsWith("0")) n = n.slice(1)
    // 011 15 xxxx xxxx → 11 xxxx xxxx (se saca el 15 después del código de área)
    n = n.replace(/^(\d{2,4})15(\d{6,8})$/, (m, area, num) => (area.length + num.length === 10 ? area + num : m))
    return `549${n}`
}

const linkWsp = (tel, texto) =>
    `https://api.whatsapp.com/send?phone=${telefonoWsp(tel)}&text=${encodeURIComponent(texto)}`

// La dirección se guarda como "calle numero - barrio (descripcion)": para el
// mapa se saca la descripción (piso, timbre, etc.)
const linkMapa = (location) => {
    const direccion = String(location).replace(/\s*\(.*\)\s*$/, "")
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
}

// Promos agrupadas: "🎁 Promo X" con sus productos abajo
const agruparItems = (items) => {
    const grupos = []
    const promos = {}
    for (const it of items) {
        if (it.promoId) {
            if (!promos[it.promoId]) {
                promos[it.promoId] = { key: `p${it.promoId}`, promo: it.promoName, items: [] }
                grupos.push(promos[it.promoId])
            }
            promos[it.promoId].items.push(it)
        } else {
            grupos.push({ key: `i${it.id}`, item: it })
        }
    }
    return grupos
}

const nombreItem = (it) =>
    it.variantName && it.variantName !== it.productName ? `${it.productName} ${it.variantName}` : it.productName

// ─── Login ────────────────────────────────────────────────────────────────────
const Login = ({ onLogin }) => {
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const entrar = async (e) => {
        e.preventDefault()
        setError("")
        setLoading(true)
        try {
            const res = await api.post("/delivery/login", { password })
            localStorage.setItem(TOKEN_KEY, res.data.token)
            onLogin()
        } catch (err) {
            setError(err.response?.data?.error || "No se pudo ingresar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="bg-[#11111F] min-h-dvh flex items-center justify-center font-['prompt'] text-white px-4">
            <form onSubmit={entrar} className="w-full max-w-[380px] flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="font-['koulen'] text-[52px] leading-none tracking-widest" style={{ textShadow: "0 0 30px #C32CFF88" }}>
                        KOBAC
                    </h1>
                    <span className="text-[16px] text-white/40 tracking-[0.3em]">DELIVERY</span>
                </div>
                <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-7 flex flex-col gap-4">
                    <label className="text-[14px] text-white/50 tracking-widest">CONTRASEÑA</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="bg-[#1E1E2E] border border-white/10 rounded-2xl h-[52px] px-5 font-['koulen'] text-[18px] outline-none focus:border-[#C32CFF]/60"
                    />
                    {error && <p className="font-['koulen'] text-[14px] text-[#FF4444] text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="h-[52px] rounded-2xl bg-[#C32CFF] font-['koulen'] text-[22px] tracking-widest disabled:opacity-40 active:scale-[0.98] transition-all"
                    >
                        {loading ? "INGRESANDO..." : "INGRESAR"}
                    </button>
                </div>
            </form>
        </main>
    )
}

// ─── Tarjeta de pedido ────────────────────────────────────────────────────────
const Pedido = ({ pedido, onCambio, onSalir }) => {
    const [cargando, setCargando] = useState(null)
    const [error, setError] = useState("")

    const enCamino = pedido.status === "shipping"
    const efectivo = pedido.payments.filter(p => p.method === "cash").reduce((a, p) => a + p.amount, 0)
    const transferencia = pedido.payments.filter(p => p.method !== "cash").reduce((a, p) => a + p.amount, 0)
    const totalConEnvio = pedido.total + pedido.shippingPrice

    const cambiarEstado = async (status) => {
        setError("")
        // La ventana de WhatsApp se abre en el click (si no, el navegador la
        // bloquea) y se le pone la dirección cuando el pedido quedó guardado.
        const ventana = status === "delivered" && pedido.clientPhone ? window.open("", "_blank") : null
        setCargando(status)
        try {
            await api.patch(`/delivery/orders/${pedido.id}/status`, { status }, authHeaders())
            if (status === "delivered" && pedido.clientPhone) {
                const url = linkWsp(pedido.clientPhone, MENSAJE_LLEGADA)
                if (ventana) ventana.location.href = url
                else window.location.href = url
            }
            onCambio()
        } catch (err) {
            ventana?.close()
            const estado = err.response?.status
            if (estado === 401 || estado === 403) return onSalir()
            setError(err.response?.data?.error || "No se pudo actualizar, probá de nuevo")
            if (estado === 409) onCambio()
        } finally {
            setCargando(null)
        }
    }

    return (
        <article className={`rounded-2xl border overflow-hidden ${enCamino ? "bg-[#C32CFF]/10 border-[#C32CFF]/30" : "bg-[#FFC83D]/5 border-[#FFC83D]/25"}`}>
            {/* Encabezado */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/10 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-['koulen'] text-[13px] px-3 py-1 rounded-full border ${enCamino
                        ? "bg-[#C32CFF]/15 border-[#C32CFF]/30 text-[#d98cff]"
                        : "bg-[#FFC83D]/10 border-[#FFC83D]/30 text-[#FFC83D]"}`}>
                        {enCamino ? "EN CAMINO" : "CONFIRMADO"}
                    </span>
                    {pedido.scheduledFor && (
                        <span className="font-['koulen'] text-[13px] px-3 py-1 rounded-full border bg-sky-400/15 border-sky-400/30 text-sky-300">
                            🕐 RESERVADO {fmtTime(pedido.scheduledFor)} HS
                        </span>
                    )}
                    <span className="font-['koulen'] text-[13px] text-white/40 uppercase">{pedido.rubro}</span>
                </div>
                <span className="font-['koulen'] text-[13px] text-white/40">
                    #{pedido.id} · {fmtTime(pedido.createdAt)}
                    {enCamino && pedido.departureAt && ` · salió ${fmtTime(pedido.departureAt)}`}
                </span>
            </div>

            {/* Cliente y dirección */}
            <div className="px-4 py-3 flex flex-col gap-2">
                <p className="font-['koulen'] text-[22px] leading-tight">{pedido.clientName || "Sin nombre"}</p>
                {pedido.location ? (
                    <a href={linkMapa(pedido.location)} target="_blank" rel="noreferrer"
                        className="flex items-start gap-2 text-[16px] text-white/90 underline decoration-white/30 underline-offset-4">
                        <span>📍</span><span>{pedido.location}</span>
                    </a>
                ) : (
                    <p className="text-[15px] text-white/40">📍 Sin dirección</p>
                )}
                {pedido.clientPhone && (
                    <div className="flex gap-2 flex-wrap">
                        <a href={`tel:${pedido.clientPhone}`}
                            className="font-['koulen'] text-[15px] px-4 py-2 rounded-xl bg-white/10 border border-white/10">
                            📞 {pedido.clientPhone}
                        </a>
                        <a href={linkWsp(pedido.clientPhone, "")} target="_blank" rel="noreferrer"
                            className="font-['koulen'] text-[15px] px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400">
                            WHATSAPP
                        </a>
                    </div>
                )}
            </div>

            {/* Productos */}
            <div className="px-4 pb-3">
                <p className="font-['koulen'] text-[12px] text-white/40 tracking-wider mb-1">LLEVAR</p>
                <ul className="flex flex-col gap-1 text-[15px]">
                    {agruparItems(pedido.items).map(g => g.item ? (
                        <li key={g.key}><span className="font-['koulen'] text-[#FFC83D] mr-2">x{g.item.quantity}</span>{nombreItem(g.item)}</li>
                    ) : (
                        <li key={g.key}>
                            <span>🎁 {g.promo}</span>
                            <ul className="pl-6 text-white/70">
                                {g.items.map(it => (
                                    <li key={it.id}><span className="font-['koulen'] text-[#FFC83D] mr-2">x{it.quantity}</span>{nombreItem(it)}</li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Cobro */}
            <div className="mx-4 mb-3 rounded-xl bg-black/25 border border-white/10 px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-[14px] text-white/50">Pedido</span>
                <span className="text-[14px] text-right">{fmt(pedido.total)}</span>
                <span className="text-[14px] text-white/50">Envío</span>
                <span className="text-[14px] text-right">{pedido.shippingPrice > 0 ? fmt(pedido.shippingPrice) : "—"}</span>
                <span className="font-['koulen'] text-[18px]">TOTAL</span>
                <span className="font-['koulen'] text-[18px] text-right text-[#00FF1E]">{fmt(totalConEnvio)}</span>
                {efectivo > 0 && <>
                    <span className="font-['koulen'] text-[15px] text-[#FFC83D]">💵 EFECTIVO</span>
                    <span className="font-['koulen'] text-[15px] text-right text-[#FFC83D]">{fmt(efectivo)}</span>
                </>}
                {transferencia > 0 && <>
                    <span className="font-['koulen'] text-[15px] text-sky-300">🏦 TRANSFERENCIA</span>
                    <span className="font-['koulen'] text-[15px] text-right text-sky-300">{fmt(transferencia)}</span>
                </>}
            </div>

            {error && <p className="px-4 pb-2 font-['koulen'] text-[14px] text-[#FF4444]">{error}</p>}

            {/* Acciones */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                <button
                    onClick={() => cambiarEstado("shipping")}
                    disabled={enCamino || cargando !== null}
                    className="h-[54px] rounded-2xl bg-[#C32CFF] font-['koulen'] text-[20px] tracking-wider disabled:opacity-30 active:scale-[0.98] transition-all">
                    {cargando === "shipping" ? "..." : "🛵 EN CAMINO"}
                </button>
                <button
                    onClick={() => cambiarEstado("delivered")}
                    disabled={cargando !== null}
                    className="h-[54px] rounded-2xl bg-[#00C21A] font-['koulen'] text-[20px] tracking-wider disabled:opacity-30 active:scale-[0.98] transition-all">
                    {cargando === "delivered" ? "..." : "✅ ENTREGADO"}
                </button>
            </div>
        </article>
    )
}

// ─── Resumen de la semana ─────────────────────────────────────────────────────
const nombreDia = (dia) => {
    const d = new Date(`${dia}T12:00:00`)
    const txt = d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" })
    return txt.replace(".", "").toUpperCase()
}

const ResumenSemana = ({ resumen }) => {
    const [abierto, setAbierto] = useState(false)
    return (
        <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <button onClick={() => setAbierto(a => !a)} className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left">
                <div>
                    <p className="font-['koulen'] text-[12px] text-white/40 tracking-wider">ESTA SEMANA (DESDE EL LUNES)</p>
                    <p className="font-['koulen'] text-[22px] leading-tight">
                        {resumen.pedidos} {resumen.pedidos === 1 ? "PEDIDO" : "PEDIDOS"}
                        <span className="text-white/30"> · </span>
                        <span className="text-[#00FF1E]">{fmt(resumen.envios)}</span>
                        <span className="text-[14px] text-white/40"> EN ENVÍOS</span>
                    </p>
                </div>
                {resumen.porDia.length > 0 && <span className="font-['koulen'] text-[18px] text-white/40">{abierto ? "▲" : "▼"}</span>}
            </button>
            {abierto && resumen.porDia.length > 0 && (
                <ul className="px-4 pb-3 flex flex-col gap-1 border-t border-white/10 pt-2">
                    {resumen.porDia.map(d => (
                        <li key={d.dia} className="flex justify-between font-['koulen'] text-[15px]">
                            <span className="text-white/60">{nombreDia(d.dia)}</span>
                            <span>{d.pedidos} · <span className="text-[#00FF1E]">{fmt(d.envios)}</span></span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

const Seccion = ({ titulo, lista, onCambio, onSalir }) => lista.length > 0 && (
    <section className="flex flex-col gap-3">
        <h2 className="font-['koulen'] text-[18px] text-white/50 tracking-widest">{titulo} ({lista.length})</h2>
        {lista.map(p => <Pedido key={p.id} pedido={p} onCambio={onCambio} onSalir={onSalir} />)}
    </section>
)

// ─── Página ───────────────────────────────────────────────────────────────────
const Delivery = () => {
    const [logueado, setLogueado] = useState(() => !!getToken())
    const [pedidos, setPedidos] = useState(null)
    const [error, setError] = useState("")
    const [resumen, setResumen] = useState(null)

    const salir = useCallback(() => {
        pushDelivery.desactivarNotificaciones().catch(() => {})
        localStorage.removeItem(TOKEN_KEY)
        setLogueado(false)
        setPedidos(null)
    }, [])

    const cargar = useCallback(async () => {
        try {
            const [res, resumenRes] = await Promise.all([
                api.get("/delivery/orders", authHeaders()),
                // Si falla el resumen, los pedidos se muestran igual
                api.get("/delivery/week-summary", authHeaders()).catch(() => null),
            ])
            setPedidos(res.data)
            if (resumenRes) setResumen(resumenRes.data)
            setError("")
        } catch (err) {
            const estado = err.response?.status
            if (estado === 401 || estado === 403) return salir()
            setError("No se pudieron cargar los pedidos")
        }
    }, [salir])

    // Sesión deslizante: al abrir la app se renueva el token (30 días más).
    // Solo se cierra si el servidor lo rechaza, no por un corte de red.
    useEffect(() => {
        if (!logueado) return
        api.get("/delivery/me", authHeaders())
            .then(res => { if (res.data?.token) localStorage.setItem(TOKEN_KEY, res.data.token) })
            .catch(err => {
                const estado = err.response?.status
                if (estado === 401 || estado === 403) salir()
            })
    }, [logueado, salir])

    useEffect(() => {
        if (!logueado) return
        cargar()
        const intervalo = setInterval(cargar, ACTUALIZAR_CADA_MS)
        const alVolver = () => document.visibilityState === "visible" && cargar()
        document.addEventListener("visibilitychange", alVolver)
        return () => {
            clearInterval(intervalo)
            document.removeEventListener("visibilitychange", alVolver)
        }
    }, [logueado, cargar])

    if (!logueado) return <Login onLogin={() => setLogueado(true)} />
    if (pedidos === null && !error) return <Loading />

    const enCamino = (pedidos ?? []).filter(p => p.status === "shipping")
    const confirmados = (pedidos ?? []).filter(p => p.status === "paid")

    return (
        <main className="bg-[#11111F] min-h-dvh text-white font-['prompt']">
            <header className="sticky top-0 z-10 bg-[#11111F]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <h1 className="font-['koulen'] text-[26px] tracking-widest leading-none">KOBAC <span className="text-[#C32CFF]">DELIVERY</span></h1>
                <div className="flex gap-2 items-center">
                    <AdminNotificaciones push={pushDelivery} nombreApp="KOBAC Delivery" que="pedidos" />
                    <button onClick={cargar} className="font-['koulen'] text-[14px] px-3 py-2 rounded-xl bg-white/10">↻</button>
                    <button onClick={salir} className="font-['koulen'] text-[14px] px-3 py-2 rounded-xl bg-white/5 text-white/50">SALIR</button>
                </div>
            </header>

            <div className="max-w-[640px] mx-auto px-4 py-4 flex flex-col gap-6">
                {error && <p className="font-['koulen'] text-[15px] text-[#FF4444] text-center">{error}</p>}
                {resumen && <ResumenSemana resumen={resumen} />}
                <Seccion titulo="EN CAMINO" lista={enCamino} onCambio={cargar} onSalir={salir} />
                <Seccion titulo="CONFIRMADOS" lista={confirmados} onCambio={cargar} onSalir={salir} />
                {pedidos?.length === 0 && (
                    <p className="font-['koulen'] text-[20px] text-white/30 text-center py-16">NO HAY PEDIDOS PARA ENTREGAR</p>
                )}
            </div>
        </main>
    )
}

export default Delivery
