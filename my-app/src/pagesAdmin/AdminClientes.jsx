import { useState, useEffect } from "react"
import api from "../api/axios"

const token    = () => localStorage.getItem("adminToken")
const authH    = () => ({ headers: { Authorization: `Bearer ${token()}` } })
const fmt      = (n) => `$${Number(n ?? 0).toLocaleString("es-AR")}`
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"
const diasDesde = (d) => {
    if (!d) return null
    const diff = Math.floor((Date.now() - new Date(d)) / 86400000)
    if (diff === 0) return "hoy"
    if (diff === 1) return "ayer"
    return `hace ${diff}d`
}

const STATUS_LABEL = {
    pending:   { label: "PENDIENTE",  color: "text-yellow-400" },
    paid:      { label: "PAGADO",     color: "text-blue-400" },
    shipping:  { label: "EN CAMINO",  color: "text-purple-400" },
    delivered: { label: "ENTREGADO",  color: "text-green-400" },
    cancelled: { label: "CANCELADO",  color: "text-red-400" },
}

// ─── Componentes base ─────────────────────────────────────────────────────────
const RubroTab = ({ value, label, active, onClick }) => (
    <button onClick={onClick}
        className={`font-['koulen'] text-[14px] tracking-wider px-4 py-1.5 rounded-xl transition-colors
        ${active ? "bg-[#C32CFF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
        {label}
    </button>
)

const PeriodBtn = ({ label, active, onClick }) => (
    <button onClick={onClick}
        className={`font-['koulen'] text-[13px] tracking-wider px-3 py-1.5 rounded-xl transition-colors
        ${active ? "bg-white/15 text-white border border-white/20" : "text-white/30 hover:text-white/60"}`}>
        {label}
    </button>
)

const StatCard = ({ label, value, sub, color = "text-white", accent = false }) => (
    <div className={`flex flex-col gap-1 bg-white/[0.03] border rounded-2xl px-5 py-4 flex-1 min-w-[130px]
        ${accent ? "border-[#C32CFF]/30" : "border-white/10"}`}>
        <p className="font-['koulen'] text-[11px] text-white/30 tracking-wider">{label}</p>
        <p className={`font-['koulen'] text-[24px] leading-tight ${color}`}>{value}</p>
        {sub && <p className="font-['koulen'] text-[11px] text-white/30">{sub}</p>}
    </div>
)

// ─── Panel detalle cliente ────────────────────────────────────────────────────
const ClienteDetalle = ({ clienteId, onClose }) => {
    const [data, setData]     = useState(null)
    const [loading, setLoad]  = useState(false)

    useEffect(() => {
        if (!clienteId) return
        setLoad(true)
        api.get(`/admin/clientes/${clienteId}`, authH())
            .then(r => setData(r.data))
            .catch(console.error)
            .finally(() => setLoad(false))
    }, [clienteId])

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60" onClick={onClose}>
            <div
                className="h-full w-full max-w-[500px] bg-[#0A0A14] border-l border-white/10 overflow-y-auto flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 sticky top-0 bg-[#0A0A14] z-10">
                    <h2 className="font-['koulen'] text-[20px] tracking-widest text-[#C32CFF]">
                        {loading ? "CARGANDO..." : data?.nombre ?? "CLIENTE"}
                    </h2>
                    <button onClick={onClose} className="font-['koulen'] text-[20px] text-white/40 hover:text-white transition-colors">✕</button>
                </div>

                {loading && (
                    <div className="flex flex-col gap-3 p-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                )}

                {!loading && data && (
                    <div className="flex flex-col gap-6 p-6">
                        {/* Contacto */}
                        <div className="flex flex-col gap-2">
                            {data.telefono && (
                                <a href={`https://wa.me/${data.telefono.replace(/\D/g, '')}`}
                                    target="_blank" rel="noreferrer"
                                    className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 hover:bg-green-500/15 transition-colors">
                                    <span className="text-[18px]">📱</span>
                                    <span className="font-['koulen'] text-[15px] text-green-400">{data.telefono}</span>
                                    <span className="font-['koulen'] text-[11px] text-green-400/50 ml-auto">WHATSAPP →</span>
                                </a>
                            )}
                            <p className="font-['koulen'] text-[12px] text-white/20">
                                CLIENTE DESDE {fmtDate(data.createdAt)}
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <StatCard label="TOTAL GASTADO"  value={fmt(data.totalGastado)}   color="text-[#C32CFF]" accent />
                            <StatCard label="PEDIDOS"        value={data.totalPedidos}         color="text-white" />
                            <StatCard label="TICKET PROM."  value={fmt(data.ticketPromedio)}  color="text-white/70" />
                            <StatCard label="CANCELADOS"     value={data.cancelados}
                                color={data.cancelados > 0 ? "text-red-400" : "text-white/30"} />
                        </div>

                        {/* Rubros */}
                        <div className="flex gap-2">
                            {data.pedidosBebidas > 0 && (
                                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
                                    <p className="font-['koulen'] text-[11px] text-white/30">BEBIDAS</p>
                                    <p className="font-['koulen'] text-[20px] text-white">{data.pedidosBebidas}</p>
                                </div>
                            )}
                            {data.pedidosVapes > 0 && (
                                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
                                    <p className="font-['koulen'] text-[11px] text-white/30">VAPES</p>
                                    <p className="font-['koulen'] text-[20px] text-white">{data.pedidosVapes}</p>
                                </div>
                            )}
                        </div>

                        {/* Productos favoritos */}
                        {data.topProductos.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <p className="font-['koulen'] text-[13px] text-white/30 tracking-wider">PRODUCTOS FAVORITOS</p>
                                {data.topProductos.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-['koulen'] text-[13px] text-[#C32CFF]">#{i + 1}</span>
                                            <span className="font-['koulen'] text-[14px] text-white">{p.productName}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-['koulen'] text-[13px] text-white/60">{p.totalUnidades} ud</p>
                                            <p className="font-['koulen'] text-[12px] text-[#C32CFF]">{fmt(p.totalGastado)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Historial de ventas */}
                        <div className="flex flex-col gap-2">
                            <p className="font-['koulen'] text-[13px] text-white/30 tracking-wider">ÚLTIMAS COMPRAS</p>
                            {data.ventas.length === 0 ? (
                                <p className="font-['koulen'] text-[13px] text-white/20">SIN VENTAS</p>
                            ) : data.ventas.map((v) => {
                                const st = STATUS_LABEL[v.status] ?? { label: v.status, color: "text-white/40" }
                                return (
                                    <div key={v.id} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className={`font-['koulen'] text-[12px] tracking-wider ${st.color}`}>{st.label}</span>
                                            <span className="font-['koulen'] text-[12px] text-white/30">{fmtDate(v.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-['koulen'] text-[13px] text-white/50 truncate max-w-[280px]">{v.productos}</span>
                                            <span className="font-['koulen'] text-[15px] text-white shrink-0 ml-2">{fmt(v.total)}</span>
                                        </div>
                                        {v.location && (
                                            <span className="font-['koulen'] text-[11px] text-white/20">{v.location}</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const AdminClientes = () => {
    const [rubro, setRubro]       = useState("todos")
    const [period, setPeriod]     = useState("siempre")
    const [orderBy, setOrderBy]   = useState("totalGastado")
    const [clientes, setClientes] = useState([])
    const [stats, setStats]       = useState(null)
    const [loading, setLoading]   = useState(false)
    const [selected, setSelected] = useState(null)
    const [search, setSearch]     = useState("")

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [topRes, statsRes] = await Promise.all([
                api.get(`/admin/clientes/top?rubro=${rubro}&period=${period}&orderBy=${orderBy}`, authH()),
                api.get(`/admin/clientes/stats`, authH()),
            ])
            setClientes(topRes.data)
            setStats(statsRes.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchAll() }, [rubro, period, orderBy])

    const filtered = clientes.filter(c =>
        !search.trim() ||
        c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        c.telefono?.includes(search)
    )

    const maxGastado = Math.max(...filtered.map(c => c.totalGastado), 1)

    return (
        <div className="p-6 flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-['koulen'] text-[32px] tracking-widest">CLIENTES</h1>
                    <p className="font-['koulen'] text-[13px] text-white/30 tracking-wider">
                        Ranking · Historial · Analisis
                    </p>
                </div>
            </div>

            {/* Stats generales */}
            {stats && (
                <div className="flex flex-wrap gap-3">
                    <StatCard label="TOTAL CLIENTES"    value={stats.totalClientes}          color="text-white" />
                    <StatCard label="CON COMPRAS"       value={stats.clientesActivos}         color="text-[#C32CFF]" accent />
                    <StatCard label="GASTO PROMEDIO"    value={fmt(stats.gastoPromedioPorCliente)}  color="text-white/80" />
                    <StatCard label="PEDIDOS PROM."     value={Number(stats.pedidosPromedioPorCliente).toFixed(1)} color="text-white/70" />
                    <StatCard
                        label="RETENCIÓN"
                        value={`${stats.tasaRetencion}%`}
                        sub={`${stats.recurrentes} clientes recurrentes`}
                        color={stats.tasaRetencion >= 40 ? "text-green-400" : "text-yellow-400"}
                    />
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                    <RubroTab value="todos"   label="TODOS"   active={rubro === "todos"}   onClick={() => setRubro("todos")} />
                    <RubroTab value="bebidas" label="BEBIDAS" active={rubro === "bebidas"} onClick={() => setRubro("bebidas")} />
                    <RubroTab value="vapes"   label="VAPES"   active={rubro === "vapes"}   onClick={() => setRubro("vapes")} />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <PeriodBtn label="SIEMPRE" active={period === "siempre"} onClick={() => setPeriod("siempre")} />
                    <PeriodBtn label="MES"     active={period === "mes"}     onClick={() => setPeriod("mes")} />
                    <PeriodBtn label="SEMANA"  active={period === "semana"}  onClick={() => setPeriod("semana")} />
                </div>
            </div>

            {/* Orden + búsqueda */}
            <div className="flex gap-3 items-center flex-wrap">
                <div className="flex gap-2 flex-wrap">
                    <PeriodBtn label="$ GASTADO"  active={orderBy === "totalGastado"}    onClick={() => setOrderBy("totalGastado")} />
                    <PeriodBtn label="PEDIDOS"    active={orderBy === "cantidadPedidos"} onClick={() => setOrderBy("cantidadPedidos")} />
                    <PeriodBtn label="TICKET PROM." active={orderBy === "ticketPromedio"} onClick={() => setOrderBy("ticketPromedio")} />
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o teléfono..."
                    className="flex-1 min-w-[200px] bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-4 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors"
                />
            </div>

            {/* Tabla ranking */}
            {loading ? (
                <div className="flex flex-col gap-2">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-[72px] bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center border border-dashed border-white/10 rounded-2xl p-12">
                    <p className="font-['koulen'] text-white/20 tracking-widest">SIN CLIENTES</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((c, i) => {
                        const barPct = Math.round((c.totalGastado / maxGastado) * 100)
                        const diasUltima = diasDesde(c.ultimaCompra)
                        return (
                            <button
                                key={c.id}
                                onClick={() => setSelected(c.id)}
                                className="flex items-center gap-4 bg-white/[0.03] border border-white/10 hover:border-[#C32CFF]/40 rounded-2xl px-5 py-3 transition-all text-left group w-full"
                            >
                                {/* Posición */}
                                <span className="font-['koulen'] text-[20px] w-7 text-center shrink-0"
                                    style={{ color: i < 3 ? ["#FFD700","#C0C0C0","#CD7F32"][i] : "rgba(255,255,255,0.2)" }}>
                                    {i + 1}
                                </span>

                                {/* Avatar inicial */}
                                <div className="w-9 h-9 rounded-xl bg-[#C32CFF]/20 border border-[#C32CFF]/30 flex items-center justify-center shrink-0">
                                    <span className="font-['koulen'] text-[15px] text-[#C32CFF]">
                                        {(c.nombre || "?")[0].toUpperCase()}
                                    </span>
                                </div>

                                {/* Nombre + barra */}
                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-['koulen'] text-[15px] text-white truncate">{c.nombre || "Sin nombre"}</span>
                                        {c.rubros?.map(r => (
                                            <span key={r} className="font-['koulen'] text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-lg">
                                                {r}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#C32CFF] rounded-full" style={{ width: `${barPct}%` }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex gap-6 shrink-0 items-center">
                                    <div className="text-right hidden sm:block">
                                        <p className="font-['koulen'] text-[10px] text-white/20">PEDIDOS</p>
                                        <p className="font-['koulen'] text-[16px] text-white">{c.cantidadPedidos}</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <p className="font-['koulen'] text-[10px] text-white/20">TICKET PROM.</p>
                                        <p className="font-['koulen'] text-[14px] text-white/60">{fmt(c.ticketPromedio)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-['koulen'] text-[10px] text-white/20">TOTAL</p>
                                        <p className="font-['koulen'] text-[18px] text-[#C32CFF]">{fmt(c.totalGastado)}</p>
                                    </div>
                                    <div className="text-right hidden sm:block w-14">
                                        <p className="font-['koulen'] text-[10px] text-white/20">ÚLTIMA</p>
                                        <p className="font-['koulen'] text-[12px] text-white/40">{diasUltima}</p>
                                    </div>
                                    <span className="font-['koulen'] text-[18px] text-white/20 group-hover:text-[#C32CFF] transition-colors">→</span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Panel detalle */}
            {selected && (
                <ClienteDetalle clienteId={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    )
}

export default AdminClientes
