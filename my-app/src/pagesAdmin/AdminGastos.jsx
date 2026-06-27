import { useState, useEffect, useRef } from "react"
import api from "../api/axios"
import Loading from "../components/Loading"
import { Navigate } from "react-router-dom"

const token = () => localStorage.getItem("adminToken")
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } })

const fmt = (n) => {
    const num = Number(n ?? 0)
    const abs = `$${Math.abs(num).toLocaleString("es-AR")}`
    return num < 0 ? `-${abs}` : abs
}
const fmtDate = (d) => d
    ? new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : "—"
const todayISO = () => new Date().toISOString().split("T")[0]

// ─── Componentes base ─────────────────────────────────────────────────────────
const Btn = ({ onClick, children, color = "purple", small = false, disabled = false }) => {
    const colors = {
        purple: "bg-[#C32CFF] hover:bg-[#d444ff] text-white",
        ghost: "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10",
        red: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
        green: "bg-green-600 hover:bg-green-500 text-white",
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

const Input = ({ label, value, onChange, type = "text", placeholder = "", min, step, list }) => (
    <div className="flex flex-col gap-1">
        {label && <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">{label}</label>}
        <input
            type={type} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} min={min} step={step} list={list}
            className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full"
        />
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

// ─── Formulario de gasto (crear / editar) ─────────────────────────────────────
const GastoForm = ({ rubro, gasto, categories, onClose, onSaved }) => {
    const isEdit = !!gasto

    const [category, setCategory] = useState(gasto?.category ?? "")
    const [description, setDescription] = useState(gasto?.description ?? "")
    const [unitPrice, setUnitPrice] = useState(gasto?.unitPrice != null ? String(gasto.unitPrice) : "")
    const [quantity, setQuantity] = useState(String(gasto?.quantity ?? 1))
    const [total, setTotal] = useState(gasto?.total != null ? String(gasto.total) : "")
    const [date, setDate] = useState(gasto?.date ? gasto.date.split("T")[0] : todayISO())
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Auto-calcular total cuando cambian unitPrice o quantity
    useEffect(() => {
        const p = parseFloat(unitPrice)
        const q = parseInt(quantity)
        if (!isNaN(p) && !isNaN(q) && q > 0) {
            setTotal(String(Math.round(p * q * 100) / 100))
        }
    }, [unitPrice, quantity])

    const handleSave = async () => {
        if (!category.trim()) { setError("La categoría es obligatoria"); return }
        if (total === "" || isNaN(Number(total))) { setError("El total es obligatorio"); return }
        setLoading(true); setError("")
        try {
            const body = {
                rubro,
                category: category.trim(),
                description: description.trim() || null,
                unitPrice: unitPrice !== "" ? Number(unitPrice) : null,
                quantity: Number(quantity) || 1,
                total: Number(total),
                date,
            }
            if (isEdit) await api.put(`/admin/gastos/${gasto.id}`, body, authHeaders())
            else await api.post("/admin/gastos", body, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al guardar")
        } finally { setLoading(false) }
    }

    return (
        <Modal title={isEdit ? "EDITAR GASTO" : "NUEVO GASTO"} onClose={onClose}>
            {/* Categoría con datalist para sugerencias */}
            <div className="flex flex-col gap-1">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">CATEGORÍA</label>
                <input
                    type="text" value={category}
                    onChange={e => setCategory(e.target.value)}
                    list="cat-list"
                    placeholder="Ej: bolsas, stickers, envío..."
                    className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full"
                />
                <datalist id="cat-list">
                    {categories.map(c => <option key={c} value={c} />)}
                </datalist>
            </div>

            <Input label="DESCRIPCIÓN (opcional)" value={description} onChange={setDescription}
                placeholder="Detalle adicional..." />

            <div className="flex gap-3">
                <Input label="PRECIO UNIT. (opcional)" value={unitPrice} onChange={setUnitPrice}
                    type="number" min="0" step="0.01" placeholder="0" />
                <Input label="CANTIDAD" value={quantity} onChange={setQuantity}
                    type="number" min="1" step="1" />
            </div>

            <div className="flex flex-col gap-1">
                <Input label="TOTAL ($)" value={total} onChange={setTotal}
                    type="number" step="0.01" placeholder="0" />
                <p className="font-['koulen'] text-[11px] text-white/25">
                    Puede ser negativo para descuentos o devoluciones
                </p>
            </div>

            <Input label="FECHA" value={date} onChange={setDate} type="date" />

            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}

            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn onClick={handleSave} disabled={loading}>
                    {loading ? "GUARDANDO..." : "GUARDAR"}
                </Btn>
            </div>
        </Modal>
    )
}

// ─── Fila de gasto ────────────────────────────────────────────────────────────
const GastoRow = ({ gasto, onEdit, onDelete }) => {
    const isNeg = gasto.total < 0

    return (
        <div className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 transition-colors
            ${isNeg ? "bg-green-500/5 border-green-500/15" : "bg-white/[0.03] border-white/10 hover:border-white/20"}`}>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-['koulen'] text-[15px] text-white capitalize">{gasto.category}</span>
                    {gasto.description && (
                        <span className="font-['koulen'] text-[12px] text-white/40 truncate max-w-[200px]">
                            — {gasto.description}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-['koulen'] text-[11px] text-white/25">{fmtDate(gasto.date)}</span>
                    {gasto.unitPrice != null && gasto.quantity > 1 && (
                        <span className="font-['koulen'] text-[11px] text-white/25">
                            {fmt(gasto.unitPrice)} × {gasto.quantity}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <span className={`font-['koulen'] text-[18px] ${isNeg ? "text-green-400" : "text-white"}`}>
                    {fmt(gasto.total)}
                </span>
                <Btn small color="ghost" onClick={() => onEdit(gasto)}>EDITAR</Btn>
                <button onClick={() => onDelete(gasto.id)}
                    className="font-['koulen'] text-[15px] text-red-400/50 hover:text-red-400 transition-colors px-1">
                    ✕
                </button>
            </div>
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const AdminGastos = () => {
    const [rubro, setRubro] = useState("bebidas")
    const [gastos, setGastos] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(false)
    const [weeks, setWeeks] = useState(1)
    const [filterDate, setFilterDate] = useState("")
    const [search, setSearch] = useState("")

    const [showNew, setShowNew] = useState(false)
    const [editing, setEditing] = useState(null)

    // ─── fetch ────────────────────────────────────────────────────────────────
    const fetchGastos = async () => {
        setLoading(true)
        try {
            const params = filterDate
                ? `rubro=${rubro}&date=${filterDate}`
                : `rubro=${rubro}&weeks=${weeks}`
            const [gastosRes, catRes] = await Promise.all([
                api.get(`/admin/gastos?${params}`, authHeaders()),
                api.get(`/admin/gastos/categories?rubro=${rubro}`, authHeaders()),
            ])
            setGastos(gastosRes.data)
            setCategories(catRes.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchGastos() }, [rubro, weeks, filterDate])

    // ─── eliminar ─────────────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar este gasto?")) return
        try {
            await api.delete(`/admin/gastos/${id}`, authHeaders())
            fetchGastos()
        } catch (e) { console.error(e) }
    }

    // ─── filtrado local ───────────────────────────────────────────────────────
    const filtered = gastos.filter(g => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return g.category.toLowerCase().includes(q) ||
            (g.description ?? "").toLowerCase().includes(q)
    })

    // ─── agrupar por semana ───────────────────────────────────────────────────
    const grouped = filtered.reduce((acc, g) => {
        const key = g.weekCode
        if (!acc[key]) acc[key] = []
        acc[key].push(g)
        return acc
    }, {})

    // resumen por grupo
    const groupTotals = (items) => {
        const positivo = items.filter(i => i.total >= 0).reduce((a, i) => a + i.total, 0)
        const negativo = items.filter(i => i.total < 0).reduce((a, i) => a + i.total, 0)
        return { positivo, negativo, neto: positivo + negativo }
    }

    // resumen global visible
    const totalGlobal = filtered.reduce((a, g) => a + g.total, 0)
    const totalPositivo = filtered.filter(g => g.total >= 0).reduce((a, g) => a + g.total, 0)
    const totalNegativo = filtered.filter(g => g.total < 0).reduce((a, g) => a + g.total, 0)

    // totales por categoría
    const byCategory = filtered.reduce((acc, g) => {
        acc[g.category] = (acc[g.category] ?? 0) + g.total
        return acc
    }, {})
    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

    return (
        <div className="p-6 flex flex-col gap-6">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-['koulen'] text-[32px] tracking-widest">GASTOS</h1>
                <Btn color="green" onClick={() => setShowNew(true)}>+ NUEVO GASTO</Btn>
            </div>

            {/* Selector de rubro */}
            <div className="flex gap-2">
                {["bebidas", "vapes"].map(r => (
                    <button key={r} onClick={() => setRubro(r)}
                        className={`font-['koulen'] text-[16px] tracking-wider px-5 py-2 rounded-xl transition-colors
                        ${rubro === r ? "bg-[#C32CFF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                        {r.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Filtros de período */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="font-['koulen'] text-[13px] text-white/40">PERÍODO:</span>
                {[1, 2, 4, 8].map(w => (
                    <button key={w} onClick={() => { setWeeks(w); setFilterDate("") }}
                        className={`font-['koulen'] text-[14px] px-3 py-1.5 rounded-xl transition-colors
                        ${weeks === w && !filterDate ? "bg-[#C32CFF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                        {w === 1 ? "1 SEM" : `${w} SEM`}
                    </button>
                ))}
                <input type="date" value={filterDate}
                    onChange={e => { setFilterDate(e.target.value); setWeeks(1) }}
                    max={todayISO()}
                    className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[36px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60" />
                {filterDate && (
                    <button onClick={() => setFilterDate("")}
                        className="font-['koulen'] text-[13px] text-white/40 hover:text-white">✕ limpiar</button>
                )}
            </div>

            {/* Búsqueda */}
            <input type="text" placeholder="BUSCAR GASTO..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[44px] px-5 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full max-w-[400px]" />

            {/* Resumen global */}
            {filtered.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col gap-1 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 flex-1 min-w-[130px]">
                        <p className="font-['koulen'] text-[11px] text-white/30 tracking-wider">GASTO TOTAL</p>
                        <p className={`font-['koulen'] text-[24px] ${totalGlobal <= 0 ? "text-green-400" : "text-white"}`}>
                            {fmt(totalGlobal)}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 flex-1 min-w-[130px]">
                        <p className="font-['koulen'] text-[11px] text-white/30 tracking-wider">EGRESOS</p>
                        <p className="font-['koulen'] text-[24px] text-white">{fmt(totalPositivo)}</p>
                    </div>
                    {totalNegativo < 0 && (
                        <div className="flex flex-col gap-1 bg-green-500/5 border border-green-500/20 rounded-2xl px-5 py-4 flex-1 min-w-[130px]">
                            <p className="font-['koulen'] text-[11px] text-white/30 tracking-wider">DEVOLUCIONES</p>
                            <p className="font-['koulen'] text-[24px] text-green-400">{fmt(totalNegativo)}</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-1 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 flex-1 min-w-[130px]">
                        <p className="font-['koulen'] text-[11px] text-white/30 tracking-wider">CANTIDAD</p>
                        <p className="font-['koulen'] text-[24px] text-white">{filtered.length}</p>
                    </div>
                </div>
            )}

            {/* Breakdown por categoría */}
            {sortedCats.length > 1 && (
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-3 px-4 py-2 border-b border-white/10">
                        <span className="font-['koulen'] text-[11px] text-white/30 tracking-wider">CATEGORÍA</span>
                        <span className="font-['koulen'] text-[11px] text-white/30 tracking-wider text-right">TOTAL</span>
                        <span className="font-['koulen'] text-[11px] text-white/30 tracking-wider text-right pr-1">%</span>
                    </div>
                    {sortedCats.map(([cat, tot]) => {
                        const pct = totalPositivo > 0 ? Math.round((Math.max(tot, 0) / totalPositivo) * 100) : 0
                        return (
                            <div key={cat} className="grid grid-cols-3 px-4 py-2.5 border-b border-white/5 items-center hover:bg-white/[0.02]">
                                <span className="font-['koulen'] text-[14px] text-white capitalize">{cat}</span>
                                <span className={`font-['koulen'] text-[14px] text-right ${tot < 0 ? "text-green-400" : "text-white/80"}`}>
                                    {fmt(tot)}
                                </span>
                                <div className="flex items-center gap-2 justify-end pr-1">
                                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#C32CFF] rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="font-['koulen'] text-[12px] text-white/30 w-7 text-right">{pct}%</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Lista agrupada por semana */}
            {loading ? (
                <div className="flex items-center justify-center h-[463px]">
                    <Loading size="small" />
                </div>
            ) : filtered.length === 0 ? (
                <p className="font-['koulen'] text-white/20 text-center py-10 tracking-widest">SIN GASTOS</p>
            ) : (
                <div className="flex flex-col gap-8">
                    {Object.entries(grouped)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([weekCode, items]) => {
                            const { positivo, negativo, neto } = groupTotals(items)
                            return (
                                <div key={weekCode} className="flex flex-col gap-3">
                                    {/* Header de semana */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <h2 className="font-['koulen'] text-[16px] text-[#C32CFF] tracking-wider">
                                                {weekCode}
                                            </h2>
                                            <div className="flex-1 border-b border-white/10 min-w-[40px]" />
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            {negativo < 0 && (
                                                <div className="text-right hidden sm:block">
                                                    <p className="font-['koulen'] text-[10px] text-white/20">DEVOL.</p>
                                                    <p className="font-['koulen'] text-[13px] text-green-400">{fmt(negativo)}</p>
                                                </div>
                                            )}
                                            <div className="text-right">
                                                <p className="font-['koulen'] text-[10px] text-white/20">EGRESO</p>
                                                <p className="font-['koulen'] text-[13px] text-white/60">{fmt(positivo)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-['koulen'] text-[10px] text-white/20">NETO</p>
                                                <p className={`font-['koulen'] text-[16px] ${neto <= 0 ? "text-green-400" : "text-white"}`}>
                                                    {fmt(neto)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filas */}
                                    <div className="flex flex-col gap-2">
                                        {items.map(g => (
                                            <GastoRow
                                                key={g.id}
                                                gasto={g}
                                                onEdit={setEditing}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                </div>
            )}

            {/* Modales */}
            {showNew && (
                <GastoForm
                    rubro={rubro}
                    categories={categories}
                    onClose={() => setShowNew(false)}
                    onSaved={() => { setShowNew(false); fetchGastos() }}
                />
            )}
            {editing && (
                <GastoForm
                    rubro={rubro}
                    gasto={editing}
                    categories={categories}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); fetchGastos() }}
                />
            )}
        </div>
    )
}

export default AdminGastos
