import { useState, useEffect, useCallback, useRef } from "react"
import api from "../api/axios"
import Loading from "../components/Loading"

const token = () => localStorage.getItem("adminToken")
const authH = () => ({ headers: { Authorization: `Bearer ${token()}` } })

const fmt = (n) => {
    const num = Number(n ?? 0)
    return `$${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Componentes base ─────────────────────────────────────────────────────────
const Btn = ({ onClick, children, color = "purple", small = false, disabled = false }) => {
    const colors = {
        purple: "bg-[#C32CFF] hover:bg-[#d444ff] text-white",
        ghost: "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10",
        green: "bg-green-600 hover:bg-green-500 text-white",
        red: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
    }
    return (
        <button onClick={onClick} disabled={disabled}
            className={`font-['koulen'] tracking-wider rounded-xl transition-all active:scale-95
            ${small ? "text-[13px] px-3 py-1.5" : "text-[15px] px-4 py-2"}
            ${colors[color]} disabled:opacity-40 disabled:cursor-not-allowed`}>
            {children}
        </button>
    )
}

// Modal para editar una semana
const CierreNumInput = ({ label, defaultVal, onChange, hint }) => (
    <div className="flex flex-col gap-1">
        <label className="font-['koulen'] text-[11px] text-white/30 tracking-wider">{label}</label>
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-['koulen'] text-[14px] text-white/30">$</span>
            <input
                type="number"
                min="0"
                step="100"
                defaultValue={defaultVal}
                onChange={e => onChange(e.target.value)}
                onFocus={e => e.target.select()}
                className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[40px] pl-7 pr-3 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full"
            />
        </div>
        {hint && <p className="font-['koulen'] text-[10px] text-white/20">{hint}</p>}
    </div>
)

// ─── Modal para editar una semana ─────────────────────────────────────────────
const EditModal = ({ col, onClose, onSaved }) => {
    const dispRef = useRef(col.disponibilidad ?? 0)
    const salRef = useRef(col.salaries ?? 0)
    const svRef = useRef(col.savings ?? 0)

    const calcPreview = (disp, sal, sv) => {
        const subtotalEntradas = Number(disp) + col.ventas + col.mayorista - Number(sal) - Number(sv)
        return {
            subtotalEntradas,
            total: subtotalEntradas - col.subtotalSalidas,
        }
    }

    const [preview, setPreview] = useState(() =>
        calcPreview(col.disponibilidad ?? 0, col.salaries ?? 0, col.savings ?? 0)
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleChange = (ref, val) => {
        ref.current = val
        setPreview(calcPreview(dispRef.current, salRef.current, svRef.current))
    }

    const handleSave = async () => {
        setLoading(true); setError("")
        try {
            await api.post("/admin/cierre", {
                rubro: col.rubro,
                weekCode: col.weekCode,
                disponibilidad: Number(dispRef.current) || 0,
                savings: Number(svRef.current) || 0,
                salaries: Number(salRef.current) || 0,
            }, authH())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al guardar")
        } finally { setLoading(false) }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
            <div className="bg-[#0A0A14] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-[420px] flex flex-col gap-5"
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between">
                    <h2 className="font-['koulen'] text-[20px] tracking-wider">{col.weekCode}</h2>
                    <button onClick={onClose} className="font-['koulen'] text-[20px] text-[#C32CFF]">✕</button>
                </div>

                <CierreNumInput
                    label="DISPONIBILIDAD INICIAL"
                    defaultVal={col.disponibilidad ?? 0}
                    onChange={v => handleChange(dispRef, v)}
                    hint="Total de la semana anterior"
                />
                <CierreNumInput
                    label="SUELDOS"
                    defaultVal={col.salaries ?? 0}
                    onChange={v => handleChange(salRef, v)}
                    hint="Pagos a empleados esta semana"
                />
                <CierreNumInput
                    label="AHORROS / RETIROS"
                    defaultVal={col.savings ?? 0}
                    onChange={v => handleChange(svRef, v)}
                    hint="Plata reservada o retirada"
                />

                {/* Preview total */}
                <div className="bg-white/5 rounded-2xl px-4 py-3 flex flex-col gap-1">
                    <div className="flex justify-between">
                        <span className="font-['koulen'] text-[13px] text-white/40">SUBTOTAL +</span>
                        <span className="font-['koulen'] text-[14px] text-white">{fmt(preview.subtotalEntradas)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-['koulen'] text-[13px] text-white/40">SUBTOTAL −</span>
                        <span className="font-['koulen'] text-[14px] text-white">{fmt(col.subtotalSalidas)}</span>
                    </div>
                    <div className="border-t border-white/10 mt-1 pt-2 flex justify-between">
                        <span className="font-['koulen'] text-[15px] text-white">TOTAL</span>
                        <span className={`font-['koulen'] text-[18px] ${preview.total >= 0 ? "text-[#00FF1E]" : "text-red-400"}`}>
                            {fmt(preview.total)}
                        </span>
                    </div>
                </div>

                {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
                <div className="flex gap-3 justify-end">
                    <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                    <Btn color="green" onClick={handleSave} disabled={loading}>
                        {loading ? "GUARDANDO..." : "GUARDAR"}
                    </Btn>
                </div>
            </div>
        </div>
    )
}

// ─── Tabla comparativa ────────────────────────────────────────────────────────
const TablaComparativa = ({ cols, rubro, onEdit }) => {
    if (!cols.length) return null

    // filas que queremos mostrar
    const rows = [
        { key: "disponibilidad", label: "disponibilidad", bold: false, color: "" },
        { key: "ventas", label: "ventas", bold: false, color: "" },
        { key: "mayorista", label: "mayorista", bold: false, color: "" },
        { key: "salaries", label: "sueldos", bold: false, color: "text-white/50", hide0: true },
        { key: "savings", label: "ahorros", bold: false, color: "text-white/50", hide0: true },
        { key: "subtotalEntradas", label: "subtotal", bold: true, color: "text-white", separator: true },
        { key: null },  // spacer
        { key: "compras", label: "compras", bold: false, color: "" },
        { key: "gastos", label: "gastos", bold: false, color: "" },
        { key: "subtotalSalidas", label: "subtotal", bold: true, color: "text-white", separator: true },
        { key: null },  // spacer
        { key: "total", label: "TOTAL", bold: true, color: "", separator: true, isFinal: true },
    ]

    const cellVal = (col, key) => {
        const v = Number(col[key] ?? 0)
        if (v === 0) return <span className="text-white/25">$0,00</span>
        const color = key === "total"
            ? v >= 0 ? "text-[#00FF1E]" : "text-red-400"
            : key === "subtotalEntradas" ? "text-white"
                : key === "subtotalSalidas" ? "text-white"
                    : ""
        return <span className={color}>{fmt(v)}</span>
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[600px]">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="font-['koulen'] text-[12px] text-white/30 tracking-wider text-left px-4 py-3 w-[130px]">
                            semanas
                        </th>
                        {cols.map(col => (
                            <th key={col.weekCode}
                                className="font-['koulen'] text-[13px] text-[#C32CFF] tracking-wider text-right px-4 py-3">
                                <div className="flex flex-col items-end gap-1">
                                    <span>{col.weekCode.replace(/^\d{4}-M\d+-/, "")}</span>
                                    <button onClick={() => onEdit({ ...col, rubro })}
                                        className="font-['koulen'] text-[10px] text-white/20 hover:text-[#C32CFF] transition-colors">
                                        EDITAR ✎
                                    </button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        if (!row.key) {
                            // spacer
                            return (
                                <tr key={`spacer-${i}`}>
                                    <td colSpan={cols.length + 1} className="py-2" />
                                </tr>
                            )
                        }
                        return (
                            <tr key={row.key}
                                className={`
                                    ${row.separator ? "border-t border-white/10" : ""}
                                    ${row.isFinal ? "border-t-2 border-white/20 bg-white/[0.03]" : "hover:bg-white/[0.02]"}
                                `}>
                                <td className={`font-['koulen'] text-left px-4 py-2
                                    ${row.bold ? "text-[15px] text-white" : `text-[13px] ${row.color || "text-white/60"}`}`}>
                                    {row.label}
                                </td>
                                {cols.map(col => {
                                    const v = Number(col[row.key] ?? 0)
                                    const hide = row.hide0 && v === 0
                                    return (
                                        <td key={col.weekCode}
                                            className={`font-['koulen'] text-right px-4 py-2
                                            ${row.bold ? "text-[15px]" : "text-[13px]"}`}>
                                            {hide ? <span className="text-white/10">—</span> : cellVal(col, row.key)}
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const AdminCierreCaja = () => {
    const [rubro, setRubro] = useState("bebidas")
    const [availableWeeks, setAvailableWeeks] = useState([])
    const [selectedWeeks, setSelectedWeeks] = useState([])
    const [cols, setCols] = useState([])
    const [loading, setLoading] = useState(false)
    const [editingCol, setEditingCol] = useState(null)

    // ─── carga semanas disponibles ────────────────────────────────────────────
    const fetchWeeks = useCallback(async (r) => {
        try {
            const res = await api.get(`/admin/cierre/weeks?rubro=${r}&n=12`, authH())
            setAvailableWeeks(res.data)
            // por defecto seleccionar las últimas 4
            setSelectedWeeks(res.data.slice(0, 4))
        } catch (e) { console.error(e) }
    }, [])

    // ─── carga comparativa ────────────────────────────────────────────────────
    const fetchComparativa = useCallback(async (r, weeks) => {
        if (!weeks.length) return
        setLoading(true)
        try {
            const params = weeks.map(w => `weeks=${encodeURIComponent(w)}`).join("&")
            const res = await api.get(`/admin/cierre/comparativa?rubro=${r}&${params}`, authH())
            setCols(res.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchWeeks(rubro) }, [rubro])
    useEffect(() => { fetchComparativa(rubro, selectedWeeks) }, [rubro, selectedWeeks])

    const toggleWeek = (wc) => {
        setSelectedWeeks(prev =>
            prev.includes(wc)
                ? prev.filter(w => w !== wc)
                : [...prev, wc].sort().reverse().slice(0, 8)  // máx 8 columnas
        )
    }

    return (
        <div className="p-6 flex flex-col gap-6">

            {/* Header */}
            <h1 className="font-['koulen'] text-[32px] tracking-widest">CIERRE DE CAJA</h1>

            {/* Selector rubro */}
            <div className="flex gap-2">
                {["bebidas", "vapes"].map(r => (
                    <button key={r} onClick={() => setRubro(r)}
                        className={`font-['koulen'] text-[16px] tracking-wider px-5 py-2 rounded-xl transition-colors
                        ${rubro === r ? "bg-[#C32CFF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                        {r.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Selector de semanas */}
            <div className="flex flex-col gap-2">
                <p className="font-['koulen'] text-[12px] text-white/30 tracking-wider">
                    SEMANAS VISIBLES (max 8) — click para activar/desactivar
                </p>
                <div className="flex flex-wrap gap-2">
                    {availableWeeks.map(wc => {
                        const active = selectedWeeks.includes(wc)
                        return (
                            <button key={wc} onClick={() => toggleWeek(wc)}
                                className={`font-['koulen'] text-[13px] px-3 py-1.5 rounded-xl transition-colors
                                ${active
                                        ? "bg-[#C32CFF] text-white"
                                        : "bg-white/5 text-white/30 hover:bg-white/10"}`}>
                                {wc.replace(/^\d{4}-M\d+-/, "")}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="flex items-center justify-center h-[463px]">
                    <Loading size="small" />
                </div>
            ) : cols.length === 0 ? (
                <p className="font-['koulen'] text-white/20 tracking-widest text-center py-16">
                    SELECCIONA AL MENOS UNA SEMANA
                </p>
            ) : (
                <TablaComparativa cols={cols} rubro={rubro} onEdit={setEditingCol} />
            )}

            {/* Modal edición */}
            {editingCol && (
                <EditModal
                    col={editingCol}
                    onClose={() => setEditingCol(null)}
                    onSaved={() => {
                        setEditingCol(null)
                        fetchComparativa(rubro, selectedWeeks)
                    }}
                />
            )}
        </div>
    )
}

export default AdminCierreCaja
