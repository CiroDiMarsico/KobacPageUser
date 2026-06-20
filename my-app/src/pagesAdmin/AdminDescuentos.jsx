import { useState, useEffect } from "react"
import api from "../api/axios"

const token = () => localStorage.getItem("adminToken")
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } })

const fmt = (n) => `$${Number(n ?? 0).toLocaleString("es-AR")}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit"
}) : "Sin vencimiento"

const todayISO = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
}

// ─── Componentes base ─────────────────────────────────────────────────────────
const Btn = ({ onClick, children, color = "purple", small = false, disabled = false }) => {
    const colors = {
        purple: "bg-[#C32CFF] hover:bg-[#d444ff] text-white",
        ghost:  "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10",
        green:  "bg-green-600 hover:bg-green-500 text-white",
        red:    "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
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

const Input = ({ label, value, onChange, type = "text", placeholder = "", min, max }) => (
    <div className="flex flex-col gap-1">
        {label && <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">{label}</label>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} min={min} max={max}
            className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full" />
    </div>
)

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
        <div className="bg-[#0A0A14] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-[480px] max-h-[90vh] overflow-y-auto flex flex-col gap-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
                <h2 className="font-['koulen'] text-[22px] tracking-wider">{title}</h2>
                <button onClick={onClose} className="font-['koulen'] text-[20px] text-[#C32CFF]">✕</button>
            </div>
            {children}
        </div>
    </div>
)

// ─── Generador de código aleatorio ───────────────────────────────────────────
const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

// ─── Modal crear código ───────────────────────────────────────────────────────
const NuevoCodigoModal = ({ onClose, onSaved }) => {
    const [code,          setCode]          = useState(generateCode())
    const [discountType,  setDiscountType]  = useState("percentage")
    const [discountValue, setDiscountValue] = useState("")
    const [expiresAt,     setExpiresAt]     = useState("")
    const [loading,       setLoading]       = useState(false)
    const [error,         setError]         = useState("")

    const preview = discountValue
        ? discountType === "percentage"
            ? `${discountValue}% de descuento`
            : `${fmt(discountValue)} de descuento`
        : null

    const handleSave = async () => {
        if (!code.trim())         { setError("El codigo es obligatorio"); return }
        if (!discountValue || Number(discountValue) <= 0) { setError("El valor debe ser mayor a 0"); return }
        if (discountType === "percentage" && Number(discountValue) > 100) { setError("El porcentaje no puede superar 100"); return }
        setLoading(true); setError("")
        try {
            await api.post("/admin/discounts", {
                code:          code.trim().toUpperCase(),
                discountType,
                discountValue: Number(discountValue),
                expiresAt:     expiresAt || null,
            }, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al crear código")
        } finally { setLoading(false) }
    }

    return (
        <Modal title="NUEVO CODIGO" onClose={onClose}>
            {/* Código */}
            <div className="flex flex-col gap-1">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">CODIGO</label>
                <div className="flex gap-2">
                    <input
                        type="text" value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                        placeholder="Ej: KOBAC10"
                        className="flex-1 bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[18px] text-[#C32CFF] tracking-widest outline-none focus:border-[#C32CFF]/60 transition-colors uppercase" />
                    <Btn small color="ghost" onClick={() => setCode(generateCode())}>
                        ↺ GENERAR
                    </Btn>
                </div>
            </div>

            {/* Tipo de descuento */}
            <div className="flex flex-col gap-2">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">TIPO DE DESCUENTO</label>
                <div className="flex gap-2">
                    {[
                        { value: "percentage", label: "PORCENTAJE %" },
                        { value: "fixed",      label: "MONTO FIJO $" },
                    ].map(opt => (
                        <button key={opt.value} onClick={() => setDiscountType(opt.value)}
                            className={`flex-1 font-['koulen'] text-[14px] tracking-wider px-4 py-2.5 rounded-xl transition-colors
                            ${discountType === opt.value ? "bg-[#C32CFF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Valor */}
            <div className="flex flex-col gap-1">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">
                    {discountType === "percentage" ? "PORCENTAJE (1-100)" : "MONTO EN PESOS"}
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-['koulen'] text-[16px] text-white/30">
                        {discountType === "percentage" ? "%" : "$"}
                    </span>
                    <input type="number" min="1" max={discountType === "percentage" ? "100" : undefined}
                        step={discountType === "percentage" ? "1" : "100"}
                        value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                        className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] pl-7 pr-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full" />
                </div>
                {preview && (
                    <p className="font-['koulen'] text-[14px] text-[#C32CFF]">→ {preview}</p>
                )}
            </div>

            {/* Vencimiento */}
            <div className="flex flex-col gap-1">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">
                    VENCIMIENTO (opcional)
                </label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                    min={todayISO()}
                    className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full" />
            </div>

            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn onClick={handleSave} disabled={loading}>
                    {loading ? "CREANDO..." : "CREAR CODIGO"}
                </Btn>
            </div>
        </Modal>
    )
}

// ─── Fila de código ───────────────────────────────────────────────────────────
const CodigoRow = ({ discount, onToggle, onDelete }) => {
    const isExpired = discount.expires_at && new Date(discount.expires_at) < new Date()
    const isActive  = discount.is_active && !isExpired

    return (
        <div className={`flex items-center justify-between gap-3 border rounded-2xl px-5 py-3 transition-colors
            ${isActive ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.01] opacity-60"}`}>

            <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Código */}
                    <span className="font-['koulen'] text-[20px] text-[#C32CFF] tracking-widest">
                        {discount.code}
                    </span>
                    {/* Badge estado */}
                    <span className={`font-['koulen'] text-[11px] px-2 py-0.5 rounded-full
                        ${isExpired       ? "bg-red-500/20 text-red-400"
                        : isActive        ? "bg-green-500/20 text-green-400"
                        :                   "bg-white/10 text-white/30"}`}>
                        {isExpired ? "EXPIRADO" : isActive ? "ACTIVO" : "INACTIVO"}
                    </span>
                </div>

                {/* Valor */}
                <span className="font-['koulen'] text-[15px] text-white/70">
                    {discount.discount_type === "percentage"
                        ? `${discount.discount_value}% de descuento`
                        : `${fmt(discount.discount_value)} de descuento`}
                </span>

                {/* Vencimiento */}
                <span className="font-['koulen'] text-[11px] text-white/25">
                    {discount.expires_at ? `Vence: ${fmtDate(discount.expires_at)}` : "Sin vencimiento"}
                </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {/* Copiar código */}
                <button
                    onClick={() => navigator.clipboard.writeText(`CODIGO: ${discount.code} \nDESCUENTO: ${discount.discount_type === "percentage"
                        ? `${discount.discount_value}%`
                        : `${fmt(discount.discount_value)}`}` )}
                    className="font-['koulen'] text-[12px] text-white/30 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                    title="Copiar código">
                    COPIAR
                </button>

                {/* Toggle activo/inactivo */}
                {!isExpired && (
                    <button onClick={() => onToggle(discount)}
                        className={`w-11 h-6 rounded-full transition-colors shrink-0 ${isActive ? "bg-[#C32CFF]" : "bg-white/20"}`}>
                        <span className={`block w-5 h-5 rounded-full bg-white transition-transform mx-0.5 ${isActive ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                )}

                {/* Eliminar */}
                <button onClick={() => onDelete(discount.id)}
                    className="font-['koulen'] text-[16px] text-red-400/40 hover:text-red-400 transition-colors px-1">
                    ✕
                </button>
            </div>
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const AdminDescuentos = () => {
    const [discounts, setDiscounts] = useState([])
    const [loading,   setLoading]   = useState(false)
    const [showNew,   setShowNew]   = useState(false)
    const [filter,    setFilter]    = useState("todos") // todos | activos | inactivos

    const fetchDiscounts = async () => {
        setLoading(true)
        try {
            const res = await api.get("/admin/discounts", authHeaders())
            setDiscounts(res.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchDiscounts() }, [])

    const handleToggle = async (discount) => {
        try {
            await api.patch(`/admin/discounts/${discount.id}`, {
                isActive: !discount.is_active
            }, authHeaders())
            fetchDiscounts()
        } catch (e) { console.error(e) }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar este código?")) return
        try {
            await api.delete(`/admin/discounts/${id}`, authHeaders())
            fetchDiscounts()
        } catch (e) { console.error(e) }
    }

    const filtered = discounts.filter(d => {
        const isExpired = d.expires_at && new Date(d.expires_at) < new Date()
        const isActive  = d.is_active && !isExpired
        if (filter === "activos")   return isActive
        if (filter === "inactivos") return !isActive
        return true
    })

    const totalActivos = discounts.filter(d => {
        const isExpired = d.expires_at && new Date(d.expires_at) < new Date()
        return d.is_active && !isExpired
    }).length

    return (
        <div className="p-6 flex flex-col gap-6">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="font-['koulen'] text-[32px] tracking-widest">DESCUENTOS</h1>
                    <p className="font-['koulen'] text-[13px] text-white/30 tracking-wider">
                        {totalActivos} codigo{totalActivos !== 1 ? "s" : ""} activo{totalActivos !== 1 ? "s" : ""}
                    </p>
                </div>
                <Btn onClick={() => setShowNew(true)}>+ NUEVO CODIGO</Btn>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
                {[
                    { value: "todos",     label: `TODOS (${discounts.length})` },
                    { value: "activos",   label: "ACTIVOS" },
                    { value: "inactivos", label: "INACTIVOS" },
                ].map(f => (
                    <button key={f.value} onClick={() => setFilter(f.value)}
                        className={`font-['koulen'] text-[14px] tracking-wider px-4 py-2 rounded-xl transition-colors
                        ${filter === f.value ? "bg-[#C32CFF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Lista */}
            {loading ? (
                <p className="font-['koulen'] text-white/30 tracking-widest text-center py-10">CARGANDO...</p>
            ) : filtered.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center">
                    <p className="font-['koulen'] text-white/20 tracking-widest">SIN CÓDIGOS</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtered.map(d => (
                        <CodigoRow
                            key={d.id}
                            discount={d}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {showNew && (
                <NuevoCodigoModal
                    onClose={() => setShowNew(false)}
                    onSaved={() => { setShowNew(false); fetchDiscounts() }}
                />
            )}
        </div>
    )
}

export default AdminDescuentos
