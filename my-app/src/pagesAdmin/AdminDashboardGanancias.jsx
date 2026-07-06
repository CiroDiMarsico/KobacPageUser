import { useState, useEffect } from "react"
import api from "../api/axios"
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from "recharts"
import Loading from "../components/Loading"

const token = () => localStorage.getItem("adminToken")
const authH = () => ({ headers: { Authorization: `Bearer ${token()}` } })
const fmt = (n) => `$${Number(n ?? 0).toLocaleString("es-AR")}`
const fmtK = (n) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
    return `$${Number(n ?? 0).toLocaleString("es-AR")}`
}

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

const KPICard = ({ label, value, sub, color = "text-white", accent = false }) => (
    <div className={`flex flex-col gap-1 bg-white/[0.03] border rounded-2xl px-5 py-4 flex-1 min-w-[140px]
        ${accent ? "border-[#C32CFF]/30" : "border-white/10"}`}>
        <p className="font-['koulen'] text-[11px] text-white/30 tracking-wider">{label}</p>
        <p className={`font-['koulen'] text-[24px] leading-tight ${color}`}>{value}</p>
        {sub && <p className="font-['koulen'] text-[12px] text-white/30">{sub}</p>}
    </div>
)

// Tooltip personalizado
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-[#0A0A14] border border-white/10 rounded-xl px-4 py-3 flex flex-col gap-1 shadow-xl">
            <p className="font-['koulen'] text-[13px] text-white/40 mb-1">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="font-['koulen'] text-[13px] text-white/60">{p.name}:</span>
                    <span className="font-['koulen'] text-[14px] text-white">{fmt(p.value)}</span>
                </div>
            ))}
        </div>
    )
}

// ─── Dashboard Ganancias ──────────────────────────────────────────────────────
const AdminDashboardGanancias = () => {
    const [rubro, setRubro] = useState("bebidas")
    const [period, setPeriod] = useState("dias")
    const [chartType, setChartType] = useState("ganancia") // ganancia | ventas
    const [chartData, setChartData] = useState([])
    const [kpis, setKpis] = useState(null)
    const [loading, setLoading] = useState(false)

    const fetchAll = async () => {
        setLoading(true)
        try {
            if (rubro === "ambas") {
                const [chartBebidas, chartVapes, kpisBebidas, kpisVapes] = await Promise.all([
                    api.get(`/admin/dashboard/sales-chart?rubro=bebidas&period=${period}`, authH()),
                    api.get(`/admin/dashboard/sales-chart?rubro=vapes&period=${period}`, authH()),
                    api.get(`/admin/dashboard/kpis?rubro=bebidas&period=${period}`, authH()),
                    api.get(`/admin/dashboard/kpis?rubro=vapes&period=${period}`, authH()),
                ])

                // mergear chart data por label
                const mergedMap = {}
                    ;[...chartBebidas.data, ...chartVapes.data].forEach(row => {
                        if (!mergedMap[row.label]) {
                            mergedMap[row.label] = { label: row.label, ventas: 0, costo: 0, ganancia: 0, cantidad: 0 }
                        }
                        mergedMap[row.label].ventas += row.ventas
                        mergedMap[row.label].costo += row.costo
                        mergedMap[row.label].ganancia += row.ganancia
                        mergedMap[row.label].cantidad += row.cantidad
                    })
                setChartData(Object.values(mergedMap).sort((a, b) => a.label.localeCompare(b.label)))

                // sumar kpis
                const b = kpisBebidas.data
                const v = kpisVapes.data
                setKpis({
                    totalGanancia: b.totalGanancia + v.totalGanancia,
                    totalVentas: b.totalVentas + v.totalVentas,
                    totalCosto: b.totalCosto + v.totalCosto,
                    cantidadVentas: b.cantidadVentas + v.cantidadVentas,
                    stockValorCompra: b.stockValorCompra + v.stockValorCompra,
                    stockValorVenta: b.stockValorVenta + v.stockValorVenta,
                })
            } else {
                const [chartRes, kpisRes] = await Promise.all([
                    api.get(`/admin/dashboard/sales-chart?rubro=${rubro}&period=${period}`, authH()),
                    api.get(`/admin/dashboard/kpis?rubro=${rubro}&period=${period}`, authH()),
                ])
                setChartData(chartRes.data)
                setKpis(kpisRes.data)
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchAll() }, [rubro, period])

    const periodLabel = { dias: "ultimos 30 dias", semanas: "ultimas 8 semanas", mes: "ultimos 6 meses" }

    return (
        <div className="p-6 flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-['koulen'] text-[32px] tracking-widest">DASHBOARD GANANCIAS</h1>
                    <p className="font-['koulen'] text-[13px] text-white/30 tracking-wider">
                        {periodLabel[period]}
                    </p>
                </div>
                <div className="flex gap-2">
                    <RubroTab value="bebidas" active={rubro === "bebidas"} onClick={() => setRubro("bebidas")} />
                    <RubroTab value="vapes" active={rubro === "vapes"} onClick={() => setRubro("vapes")} />
                    <RubroTab value="ambas" active={rubro === "ambas"} onClick={() => setRubro("ambas")} />
                </div>
            </div>

            {/* KPIs */}
            {loading ? (
                    <Loading size="small" />
            ) : kpis && (
                <div className="flex flex-wrap gap-3">
                    <KPICard label="GANANCIA" value={fmt(kpis.totalGanancia)}
                        color={kpis.totalGanancia >= 0 ? "text-green-400" : "text-red-400"} accent />
                    <KPICard label="VENTAS TOTALES" value={fmt(kpis.totalVentas)} color="text-[#C32CFF]" />
                    <KPICard label="COSTO TOTAL" value={fmt(kpis.totalCosto)} color="text-white/70" />
                    <KPICard label="CANT. VENTAS" value={kpis.cantidadVentas} color="text-white" />
                    <KPICard label="STOCK (COMPRA)" value={fmt(kpis.stockValorCompra)} color="text-white/60" />
                    <KPICard label="STOCK (VENTA)" value={fmt(kpis.stockValorVenta)} color="text-white/80" />
                </div>
            )}

            {/* Controles gráficos */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-2">
                        <PeriodBtn label="DIAS" active={period === "dias"} onClick={() => setPeriod("dias")} />
                        <PeriodBtn label="SEMANAS" active={period === "semanas"} onClick={() => setPeriod("semanas")} />
                        <PeriodBtn label="MESES" active={period === "mes"} onClick={() => setPeriod("mes")} />
                    </div>
                    <div className="flex gap-2">
                        <PeriodBtn label="GANANCIA" active={chartType === "ganancia"} onClick={() => setChartType("ganancia")} />
                        <PeriodBtn label="VENTAS" active={chartType === "ventas"} onClick={() => setChartType("ventas")} />
                    </div>
                </div>

                {/* Gráfico de área — ganancia */}
                {chartType === "ganancia" && (
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                        <p className="font-['koulen'] text-[14px] text-white/40 tracking-wider mb-4">GANANCIA</p>
                        {chartData.length === 0 ? (
                            <p className="font-['koulen'] text-white/20 text-center py-12 tracking-widest">SIN DATOS</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradGanancia" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00FF1E" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#00FF1E" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradCosto" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#C32CFF" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#C32CFF" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="label" tick={{ fontFamily: "koulen", fontSize: 12, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={fmtK} tick={{ fontFamily: "koulen", fontSize: 11, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} width={55} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontFamily: "koulen", fontSize: 12, paddingTop: 8 }} />
                                    <Area type="monotone" dataKey="ganancia" name="Ganancia" stroke="#00FF1E" strokeWidth={2} fill="url(#gradGanancia)" dot={false} />
                                    <Area type="monotone" dataKey="costo" name="Costo" stroke="#C32CFF" strokeWidth={1.5} fill="url(#gradCosto)" dot={false} strokeDasharray="4 2" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                )}

                {/* Gráfico de barras — ventas vs costo */}
                {chartType === "ventas" && (
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4">
                        <p className="font-['koulen'] text-[14px] text-white/40 tracking-wider mb-4">VENTAS VS COSTO</p>
                        {chartData.length === 0 ? (
                            <p className="font-['koulen'] text-white/20 text-center py-12 tracking-widest">SIN DATOS</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontFamily: "koulen", fontSize: 12, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={fmtK} tick={{ fontFamily: "koulen", fontSize: 11, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} width={55} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontFamily: "koulen", fontSize: 12, paddingTop: 8 }} />
                                    <Bar dataKey="ventas" name="Ventas" fill="#C32CFF" radius={[4, 4, 0, 0]} opacity={0.9} />
                                    <Bar dataKey="costo" name="Costo" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="ganancia" name="Ganancia" fill="#00FF1E" radius={[4, 4, 0, 0]} opacity={0.9} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                )}

                {/* Tabla resumen */}
                {chartData.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="grid grid-cols-5 px-5 py-2 border-b border-white/10">
                            {["PERÍODO", "VENTAS", "COSTO", "GANANCIA", "CANT."].map(h => (
                                <span key={h} className="font-['koulen'] text-[11px] text-white/30 tracking-wider">{h}</span>
                            ))}
                        </div>
                        {[...chartData].reverse().map((row, i) => (
                            <div key={i} className={`grid grid-cols-5 px-5 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors ${i === 0 ? "bg-white/[0.03]" : ""}`}>
                                <span className="font-['koulen'] text-[14px] text-white/60">{row.label}</span>
                                <span className="font-['koulen'] text-[14px] text-[#C32CFF]">{fmt(row.ventas)}</span>
                                <span className="font-['koulen'] text-[14px] text-white/40">{fmt(row.costo)}</span>
                                <span className={`font-['koulen'] text-[14px] ${row.ganancia >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    {fmt(row.ganancia)}
                                </span>
                                <span className="font-['koulen'] text-[14px] text-white/60">{row.cantidad}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminDashboardGanancias
