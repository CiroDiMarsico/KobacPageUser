import { useState, useEffect } from "react"
import api from "../api/axios"
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from "recharts"
import Loading from "../components/Loading"

const token = () => localStorage.getItem("adminToken")
const authH = () => ({ headers: { Authorization: `Bearer ${token()}` } })
const fmt = (n) => `$${Number(n ?? 0).toLocaleString("es-AR")}`
const API_BASE = import.meta.env.VITE_LINK

const COLORS = ["#C32CFF", "#a020d9", "#8010bb", "#60009a", "#40007a",
    "#300060", "#250050", "#1a003a", "#100025", "#080015"]

// ─── Componentes base ─────────────────────────────────────────────────────────
const RubroTab = ({ value, active, onClick }) => (
    <button onClick={onClick}
        className={`font-['koulen'] text-[16px] tracking-wider px-5 py-2 rounded-xl transition-colors
        ${active ? "bg-[#C32CFF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
        {value.toUpperCase()}
    </button>
)

const PeriodBtn = ({ label, active, onClick }) => (
    <button onClick={onClick}
        className={`font-['koulen'] text-[13px] tracking-wider px-3 py-1.5 rounded-xl transition-colors
        ${active ? "bg-white/15 text-white border border-white/20" : "text-white/30 hover:text-white/60"}`}>
        {label}
    </button>
)

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-[#0A0A14] border border-white/10 rounded-xl px-4 py-3 flex flex-col gap-1 shadow-xl max-w-[240px]">
            <p className="font-['koulen'] text-[12px] text-white/40 mb-1 truncate">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="font-['koulen'] text-[13px] text-white/60">{p.name}:</span>
                    <span className="font-['koulen'] text-[14px] text-white">
                        {p.dataKey === "totalUnidades"
                            ? p.value
                            : fmt(p.value)}
                    </span>
                </div>
            ))}
        </div>
    )
}

// Barra de margen visual
const MargenBar = ({ pct }) => {
    const color = pct >= 40 ? "bg-green-400" : pct >= 20 ? "bg-yellow-400" : "bg-red-400"
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className={`font-['koulen'] text-[12px] shrink-0 ${color.replace("bg-", "text-")}`}>
                {pct}%
            </span>
        </div>
    )
}

// ─── Dashboard Productos ──────────────────────────────────────────────────────
const AdminDashboardProductos = () => {
    const [rubro, setRubro] = useState("bebidas")
    const [period, setPeriod] = useState("siempre")
    const [topProducts, setTop] = useState([])
    const [lowStock, setLow] = useState([])
    const [lastPrices, setPrices] = useState([])
    const [threshold, setThreshold] = useState(5)
    const [loading, setLoading] = useState(false)
    const [chartMetric, setMetric] = useState("totalUnidades")

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [topRes, lowRes, pricesRes] = await Promise.all([
                api.get(`/admin/dashboard/top-products?rubro=${rubro}&period=${period}`, authH()),
                api.get(`/admin/dashboard/low-stock?rubro=${rubro}&threshold=${threshold}`, authH()),
                api.get(`/admin/dashboard/last-prices?rubro=${rubro}`, authH()),
            ])
            setTop(topRes.data)
            setLow(lowRes.data)
            setPrices(pricesRes.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchAll() }, [rubro, period, threshold])

    // Ordenar y truncar por métrica activa
    const sortedProducts = [...topProducts].sort((a, b) => b[chartMetric] - a[chartMetric])
    const chartData = sortedProducts.map(p => ({
        ...p,
        shortName: p.productName.length > 14 ? p.productName.slice(0, 13) + "…" : p.productName,
    }))

    const metricLabel = {
        totalUnidades: "Unidades",
        totalVentas: "$ Ventas",
        totalGanancia: "$ Ganancia",
    }

    return (
        <div className="p-6 flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-['koulen'] text-[32px] tracking-widest">DASHBOARD PRODUCTOS</h1>
                    <p className="font-['koulen'] text-[13px] text-white/30 tracking-wider">
                        Mas vendidos · Stock bajo · Ultimos precios
                    </p>
                </div>
                <div className="flex gap-2">
                    <RubroTab value="bebidas" active={rubro === "bebidas"} onClick={() => setRubro("bebidas")} />
                    <RubroTab value="vapes" active={rubro === "vapes"} onClick={() => setRubro("vapes")} />
                </div>
            </div>

            {/* ── MÁS VENDIDOS ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="font-['koulen'] text-[20px] tracking-widest text-[#C32CFF]">MAS VENDIDOS</h2>
                    <div className="flex gap-2 flex-wrap">
                        <PeriodBtn label="SIEMPRE" active={period === "siempre"} onClick={() => setPeriod("siempre")} />
                        <PeriodBtn label="MES" active={period === "mes"} onClick={() => setPeriod("mes")} />
                        <PeriodBtn label="SEMANA" active={period === "semana"} onClick={() => setPeriod("semana")} />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-[463px]">
                        <Loading size="small" />
                    </div>
                ) : topProducts.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl">
                        <p className="font-['koulen'] text-white/20 tracking-widest">SIN DATOS</p>
                    </div>
                ) : (
                    <>
                        {/* Toggle métrica — ahora con 3 opciones */}
                        <div className="flex gap-2 flex-wrap">
                            <PeriodBtn label="UNIDADES" active={chartMetric === "totalUnidades"} onClick={() => setMetric("totalUnidades")} />
                            <PeriodBtn label="$ VENTAS" active={chartMetric === "totalVentas"} onClick={() => setMetric("totalVentas")} />
                            <PeriodBtn label="$ GANANCIA" active={chartMetric === "totalGanancia"} onClick={() => setMetric("totalGanancia")} />
                        </div>

                        {/* Gráfico horizontal */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                            <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 38)}>
                                <BarChart data={chartData} layout="vertical"
                                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number"
                                        tickFormatter={chartMetric !== "totalUnidades"
                                            ? (v) => `$${(v / 1000).toFixed(0)}K`
                                            : undefined}
                                        tick={{ fontFamily: "koulen", fontSize: 11, fill: "rgba(255,255,255,0.25)" }}
                                        axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="shortName" width={110}
                                        tick={{ fontFamily: "koulen", fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                                        axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey={chartMetric} name={metricLabel[chartMetric]}
                                        radius={[0, 4, 4, 0]}>
                                        {chartData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Tabla ranking — con columna ganancia y margen */}
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                            <div className="grid grid-cols-12 px-4 py-2 border-b border-white/10">
                                <span className="col-span-1 font-['koulen'] text-[11px] text-white/20">#</span>
                                <span className="col-span-3 font-['koulen'] text-[11px] text-white/30 tracking-wider">PRODUCTO</span>
                                <span className="col-span-1 font-['koulen'] text-[11px] text-white/30 tracking-wider text-right">UNID.</span>
                                <span className="col-span-2 font-['koulen'] text-[11px] text-white/30 tracking-wider text-right">VENTAS</span>
                                <span className="col-span-2 font-['koulen'] text-[11px] text-white/30 tracking-wider text-right">GANANCIA</span>
                                <span className="col-span-3 font-['koulen'] text-[11px] text-white/30 tracking-wider pl-2">MARGEN</span>
                            </div>
                            {sortedProducts.map((p, i) => (
                                <div key={p.id}
                                    className="grid grid-cols-12 px-4 py-3 border-b border-white/5 items-center hover:bg-white/[0.02] transition-colors">
                                    <span className="col-span-1 font-['koulen'] text-[14px]"
                                        style={{ color: COLORS[i % COLORS.length] }}>
                                        {i + 1}
                                    </span>
                                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                                        {p.image && (
                                            <img
                                                src={p.image.startsWith("http") ? p.image : `${API_BASE}${p.image}`}
                                                alt=""
                                                className="w-7 h-7 object-contain rounded-lg shrink-0 bg-white/5"
                                            />
                                        )}
                                        <span className="font-['koulen'] text-[14px] text-white truncate">{p.productName}</span>
                                    </div>
                                    <span className="col-span-1 font-['koulen'] text-[15px] text-white text-right">{p.totalUnidades}</span>
                                    <span className="col-span-2 font-['koulen'] text-[13px] text-[#C32CFF] text-right">{fmt(p.totalVentas)}</span>
                                    <span className={`col-span-2 font-['koulen'] text-[13px] text-right
                                        ${p.totalGanancia >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        {fmt(p.totalGanancia)}
                                    </span>
                                    <div className="col-span-3 pl-3">
                                        <MargenBar pct={p.margen} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="border-b border-white/10" />

            {/* ── STOCK BAJO ───────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <h2 className="font-['koulen'] text-[20px] tracking-widest text-[#C32CFF]">STOCK BAJO</h2>
                    <div className="flex items-center gap-2">
                        <span className="font-['koulen'] text-[12px] text-white/30">UMBRAL:</span>
                        {[3, 5, 10].map(t => (
                            <PeriodBtn key={t} label={`≤${t}`} active={threshold === t} onClick={() => setThreshold(t)} />
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-[463px]">
                        <Loading size="small" />
                    </div>
                ) : lowStock.length === 0 ? (
                    <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-4">
                        <span className="text-[20px]">✓</span>
                        <p className="font-['koulen'] text-[15px] text-green-400 tracking-wider">
                            TODO EL STOCK ESTA POR ENCIMA DEL UMBRAL
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {lowStock.map((v, i) => (
                            <div key={i}
                                className={`flex items-center justify-between px-5 py-3 border rounded-xl
                                    ${v.stock === 0 ? "bg-red-500/10 border-red-500/20" : "bg-yellow-500/5 border-yellow-500/15"}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${v.stock === 0 ? "bg-red-400" : "bg-yellow-400"}`} />
                                    <span className="font-['koulen'] text-[15px] truncate">
                                        {v.productName} — {v.variantName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 shrink-0">
                                    {v.lastPrice > 0 && (
                                        <div className="text-right hidden sm:block">
                                            <p className="font-['koulen'] text-[10px] text-white/20">ÚLT. PRECIO</p>
                                            <p className="font-['koulen'] text-[13px] text-white/40">{fmt(v.lastPrice)}</p>
                                        </div>
                                    )}
                                    <div className="text-right">
                                        <p className="font-['koulen'] text-[10px] text-white/20">STOCK</p>
                                        <p className={`font-['koulen'] text-[18px] ${v.stock === 0 ? "text-red-400" : "text-yellow-400"}`}>
                                            {v.stock}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-b border-white/10" />

            {/* ── ÚLTIMOS PRECIOS MAYORISTAS ────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <h2 className="font-['koulen'] text-[20px] tracking-widest text-[#C32CFF]">ULTIMOS PRECIOS MAYORISTAS</h2>
                {loading ? (
                    <div className="flex items-center justify-center h-[463px]">
                        <Loading size="small" />
                    </div>
                ) : lastPrices.length === 0 ? (
                    <p className="font-['koulen'] text-white/20 tracking-widest text-center py-8">SIN DATOS</p>
                ) : (
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="grid grid-cols-12 px-4 py-2 border-b border-white/10">
                            <span className="col-span-4 font-['koulen'] text-[11px] text-white/30 tracking-wider">PRODUCTO</span>
                            <span className="col-span-4 font-['koulen'] text-[11px] text-white/30 tracking-wider">VARIANTE</span>
                            <span className="col-span-2 font-['koulen'] text-[11px] text-white/30 tracking-wider text-right">PRECIO</span>
                            <span className="col-span-2 font-['koulen'] text-[11px] text-white/30 tracking-wider text-right">FECHA</span>
                        </div>
                        {lastPrices.map((p, i) => (
                            <div key={i}
                                className="grid grid-cols-12 px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center">
                                <span className="col-span-4 font-['koulen'] text-[14px] text-white truncate">{p.productName}</span>
                                <span className="col-span-4 font-['koulen'] text-[13px] text-white/50 truncate">{p.variantName}</span>
                                <span className="col-span-2 font-['koulen'] text-[14px] text-[#C32CFF] text-right">{fmt(p.purchasePrice)}</span>
                                <span className="col-span-2 font-['koulen'] text-[12px] text-white/30 text-right">
                                    {new Date(p.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminDashboardProductos
