import { useState, useEffect, useRef } from "react"
import api from "../api/axios"

const token = () => localStorage.getItem("adminToken")
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } })
const fmt = (n) => n != null ? `$${Number(n).toLocaleString("es-AR")}` : "—"
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—"
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : null
const fmtDateTime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : "—"
const todayISO = () => new Date().toISOString().split("T")[0]

const STATUS_LABELS = {
    pending:   { label: "PENDIENTE",  color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
    paid:      { label: "PAGADO",     color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20" },
    shipping:  { label: "EN CAMINO",  color: "text-[#C32CFF]",  bg: "bg-[#C32CFF]/10 border-[#C32CFF]/20" },
    delivered: { label: "ENTREGADO",  color: "text-green-400",  bg: "bg-green-400/10 border-green-400/20" },
    cancelled: { label: "CANCELADO",  color: "text-red-400",    bg: "bg-red-400/10 border-red-400/20" },
}

const NEXT_STATUS = {
    pending:  ["paid", "shipping", "delivered", "cancelled"],
    paid:     ["shipping", "delivered", "cancelled"],
    shipping: ["delivered", "cancelled"],
}

// ─── Componentes base ─────────────────────────────────────────────────────────
const Btn = ({ onClick, children, color = "purple", small = false, disabled = false }) => {
    const colors = {
        purple: "bg-[#C32CFF] hover:bg-[#d444ff] text-white",
        green:  "bg-green-600 hover:bg-green-500 text-white",
        ghost:  "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10",
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

const Input = ({ label, value, onChange, type = "text", placeholder = "", min }) => (
    <div className="flex flex-col gap-1">
        {label && <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">{label}</label>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} min={min}
            className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full" />
    </div>
)

const Modal = ({ title, onClose, children, wide = false }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
        <div className={`bg-[#0A0A14] border border-white/10 rounded-3xl p-6 w-[90vw] ${wide ? "max-w-[680px]" : "max-w-[480px]"} max-h-[90vh] overflow-y-auto flex flex-col gap-5`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
                <h2 className="font-['koulen'] text-[22px] tracking-wider">{title}</h2>
                <button onClick={onClose} className="font-['koulen'] text-[20px] text-[#C32CFF]">✕</button>
            </div>
            {children}
        </div>
    </div>
)

// ─── Editor de pagos ──────────────────────────────────────────────────────────
const PaymentsEditor = ({ payments, onChange, totalRef }) => {
    const addPayment = () => onChange([...payments, { method: "cash", amount: "" }])
    const remove = (i) => onChange(payments.filter((_, idx) => idx !== i))
    const update = (i, field, value) =>
        onChange(payments.map((p, idx) => idx === i ? { ...p, [field]: value } : p))

    return (
        <div className="flex flex-col gap-2">
            <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">MÉTODO DE PAGO</label>
            {payments.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                    <select value={p.method} onChange={e => update(i, 'method', e.target.value)}
                        className="flex-1 bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-3 font-['koulen'] text-[15px] text-white outline-none focus:border-[#C32CFF]/60">
                        <option value="cash">EFECTIVO</option>
                        <option value="transfer">TRANSFERENCIA</option>
                    </select>
                    <input type="number" min="0" value={p.amount} onChange={e => update(i, 'amount', e.target.value)}
                        placeholder="Monto"
                        className="flex-1 bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-3 font-['koulen'] text-[15px] text-white outline-none focus:border-[#C32CFF]/60" />
                    {payments.length > 1 && (
                        <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300 font-['koulen'] text-[16px] px-1">✕</button>
                    )}
                </div>
            ))}
            {payments.length < 2 && (
                <Btn small color="ghost" onClick={addPayment}>+ PAGO MIXTO</Btn>
            )}
        </div>
    )
}

// ─── Modal cancelar ───────────────────────────────────────────────────────────
const CancelModal = ({ saleId, onClose, onSaved }) => {
    const [reason, setReason] = useState("")
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await api.patch(`/admin/sales/${saleId}/status`, { status: "cancelled", cancelReason: reason || null }, authHeaders())
            onSaved()
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    return (
        <Modal title="CANCELAR VENTA" onClose={onClose}>
            <Input label="MOTIVO (opcional)" value={reason} onChange={setReason} />
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>VOLVER</Btn>
                <Btn color="red" onClick={handleConfirm} disabled={loading}>{loading ? "CANCELANDO..." : "CONFIRMAR"}</Btn>
            </div>
        </Modal>
    )
}

// ─── Modal envío ──────────────────────────────────────────────────────────────
const ShippingModal = ({ sale, onClose, onSaved }) => {
    const [price, setPrice] = useState(String(sale.shippingPrice || ""))
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        setLoading(true)
        try {
            await api.patch(`/admin/sales/${sale.id}/shipping`, { shippingPrice: Number(price) }, authHeaders())
            onSaved()
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    return (
        <Modal title="PRECIO DE ENVÍO" onClose={onClose}>
            <Input label="PRECIO ENVÍO" value={price} onChange={setPrice} type="number" min="0" />
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn onClick={handleSave} disabled={loading}>{loading ? "GUARDANDO..." : "GUARDAR"}</Btn>
            </div>
        </Modal>
    )
}

// ─── Modal editar venta (total + pagos) ───────────────────────────────────────
const EditSaleModal = ({ sale, onClose, onSaved }) => {
    const [total, setTotal] = useState(String(sale.total))
    const [payments, setPayments] = useState(
        sale.payments.length > 0
            ? sale.payments.map(p => ({ method: p.method, amount: String(p.amount) }))
            : [{ method: "cash", amount: "" }]
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const totalConEnvio = Number(total || 0) + sale.shippingPrice
    const paymentsTotal = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const diff = totalConEnvio - paymentsTotal

    const handleSave = async () => {
        if (!total || Number(total) <= 0) { setError("Ingresá un total válido"); return }
        if (payments.some(p => !p.amount || Number(p.amount) <= 0)) { setError("Completá los montos de pago"); return }
        setLoading(true); setError("")
        try {
            await api.put(`/admin/sales/${sale.id}`, {
                payments: payments.map(p => ({ method: p.method, amount: Number(p.amount) })),
                total: Number(total)
            }, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al guardar")
        } finally { setLoading(false) }
    }

    return (
        <Modal title="EDITAR VENTA" onClose={onClose}>
            <div className="flex flex-col gap-1">
                <Input label="TOTAL VENTA (sin envío)" value={total} onChange={setTotal} type="number" min="0" />
                {sale.shippingPrice > 0 && (
                    <p className="font-['koulen'] text-[12px] text-white/30">
                        + envío {fmt(sale.shippingPrice)} = total {fmt(totalConEnvio)}
                    </p>
                )}
            </div>

            <PaymentsEditor payments={payments} onChange={setPayments} />

            {Math.abs(diff) > 0.5 && (
                <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2">
                    <span className="font-['koulen'] text-[13px] text-white/50">DIFERENCIA PAGO / TOTAL</span>
                    <span className="font-['koulen'] text-[15px] text-yellow-400">{fmt(Math.abs(diff))}</span>
                </div>
            )}

            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn onClick={handleSave} disabled={loading}>{loading ? "GUARDANDO..." : "GUARDAR"}</Btn>
            </div>
        </Modal>
    )
}

// ─── Modal nueva venta ────────────────────────────────────────────────────────
const NuevaVentaModal = ({ rubro, products, onClose, onSaved }) => {
    const [clientName, setClientName] = useState("")
    const [clientPhone, setClientPhone] = useState("")
    const [location, setLocation] = useState("")
    const [shippingPrice, setShippingPrice] = useState("")
    const [items, setItems] = useState([])
    const [payments, setPayments] = useState([{ method: "cash", amount: "" }])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const addItem = () => setItems(prev => [...prev, { variantId: "", quantity: 1, unitPrice: "", stock: null }])
    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))

    const updateVariant = (i, variantId) => {
        let salePrice = ""
        let stock = null
        for (const p of products) {
            const v = p.variants.find(v => v.id === Number(variantId))
            if (v) { salePrice = String(p.salePrice); stock = v.stock; break }
        }
        setItems(prev => prev.map((item, idx) => idx !== i ? item : {
            ...item, variantId: Number(variantId), unitPrice: salePrice, stock
        }))
    }

    const updateItem = (i, field, value) =>
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

    const subtotal = items.reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
    const total = subtotal + Number(shippingPrice || 0)
    const paymentsTotal = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const paymentsDiff = total - paymentsTotal

    const handleSave = async () => {
        if (items.length === 0) { setError("Agregá al menos un producto"); return }
        if (items.some(i => !i.variantId || !i.quantity || !i.unitPrice)) { setError("Completá todos los items"); return }
        if (payments.some(p => !p.amount || Number(p.amount) <= 0)) { setError("Completá los montos de pago"); return }
        setLoading(true); setError("")
        try {
            await api.post('/admin/sales', {
                clientName: clientName || null,
                clientPhone: clientPhone || null,
                location: location || null,
                rubro,
                shippingPrice: Number(shippingPrice || 0),
                discountAmount: 0,
                items: items.map(i => ({
                    variantId: i.variantId,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    promoId: null
                })),
                payments: payments.map(p => ({ method: p.method, amount: Number(p.amount) }))
            }, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al crear venta")
        } finally { setLoading(false) }
    }

    return (
        <Modal title="NUEVA VENTA" onClose={onClose} wide>
            <div className="flex flex-col gap-2">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">CLIENTE (opcional)</label>
                <div className="flex gap-3">
                    <Input placeholder="Nombre" value={clientName} onChange={setClientName} />
                    <Input placeholder="Teléfono" value={clientPhone} onChange={setClientPhone} />
                </div>
                <Input placeholder="Dirección" value={location} onChange={setLocation} />
            </div>

            <div className="flex flex-col gap-3">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">PRODUCTOS</label>
                {items.map((item, i) => (
                    <div key={i} className="flex flex-col gap-2 bg-white/[0.03] border border-white/10 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                            <select value={item.variantId} onChange={e => updateVariant(i, e.target.value)}
                                className="flex-1 bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60">
                                <option value="">— elegir producto/variante —</option>
                                {products.map(p => (
                                    <optgroup key={p.id} label={p.name}>
                                        {p.variants.filter(v => v.isActive).map(v => (
                                            <option key={v.id} value={v.id}>{p.name} — {v.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            {item.stock != null && (
                                <span className={`font-['koulen'] text-[13px] shrink-0 ${item.stock === 0 ? "text-red-400" : item.stock <= 5 ? "text-yellow-400" : "text-green-400"}`}>
                                    stock: {item.stock}
                                </span>
                            )}
                            <button onClick={() => removeItem(i)}
                                className="font-['koulen'] text-[16px] text-red-400 hover:text-red-300 px-1 shrink-0">✕</button>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="font-['koulen'] text-[11px] text-white/30">CANTIDAD</label>
                                <input type="number" min="1" value={item.quantity}
                                    onChange={e => updateItem(i, 'quantity', e.target.value)}
                                    className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 w-full" />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="font-['koulen'] text-[11px] text-white/30">PRECIO UNIT.</label>
                                <input type="number" min="0" value={item.unitPrice}
                                    onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                                    className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 w-full" />
                            </div>
                            <div className="flex flex-col gap-1 items-end justify-end shrink-0">
                                <label className="font-['koulen'] text-[11px] text-white/30">SUBTOTAL</label>
                                <span className="font-['koulen'] text-[15px] text-white/70 h-[38px] flex items-center">
                                    {item.quantity && item.unitPrice ? fmt(Number(item.quantity) * Number(item.unitPrice)) : "—"}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                <Btn small color="ghost" onClick={addItem}>+ AGREGAR ITEM</Btn>
            </div>

            <Input label="ENVÍO" value={shippingPrice} onChange={setShippingPrice} type="number" min="0" placeholder="0" />
            <PaymentsEditor payments={payments} onChange={setPayments} />

            {items.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2">
                        <span className="font-['koulen'] text-[14px] text-white/50">TOTAL</span>
                        <span className="font-['koulen'] text-[20px] text-[#00FF1E]">{fmt(total)}</span>
                    </div>
                    {Math.abs(paymentsDiff) > 0.5 && (
                        <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2">
                            <span className="font-['koulen'] text-[13px] text-white/50">DIFERENCIA PAGO / TOTAL</span>
                            <span className="font-['koulen'] text-[15px] text-yellow-400">{fmt(Math.abs(paymentsDiff))}</span>
                        </div>
                    )}
                </div>
            )}

            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn color="green" onClick={handleSave} disabled={loading}>
                    {loading ? "GUARDANDO..." : "CONFIRMAR VENTA"}
                </Btn>
            </div>
        </Modal>
    )
}

// ─── Card venta en proceso ────────────────────────────────────────────────────
const SaleCard = ({ sale, onRefresh }) => {
    const [showCancel, setShowCancel] = useState(false)
    const [showShipping, setShowShipping] = useState(false)
    const [showEdit, setShowEdit] = useState(false)
    const [loadingStatus, setLoadingStatus] = useState(null)

    const statusInfo = STATUS_LABELS[sale.status]
    const nextStatuses = NEXT_STATUS[sale.status] ?? []

    const handleStatus = async (status) => {
        if (status === "cancelled") { setShowCancel(true); return }
        setLoadingStatus(status)
        try {
            await api.patch(`/admin/sales/${sale.id}/status`, { status }, authHeaders())
            onRefresh()
        } catch (e) { console.error(e) }
        finally { setLoadingStatus(null) }
    }

    const paymentText = sale.payments.map(p =>
        `${p.method === 'cash' ? 'Efectivo' : 'Transf.'} ${fmt(p.amount)}`
    ).join(" + ")

    return (
        <div className={`border rounded-2xl overflow-hidden ${statusInfo.bg}`}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className={`font-['koulen'] text-[13px] px-3 py-1 rounded-full border ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>
                    <span className="font-['koulen'] text-[13px] text-white/30">#{sale.id}</span>
                    <span className="font-['koulen'] text-[13px] text-white/30">{fmtDateTime(sale.createdAt)}</span>
                </div>
                <span className="font-['koulen'] text-[20px] text-[#00FF1E]">{fmt(sale.total)}</span>
            </div>

            {/* Cliente + dirección */}
            <div className="px-5 py-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-['koulen'] text-[16px]">{sale.clientName ?? "Sin cliente"}</span>
                    {sale.clientPhone && (
                        <a href={`https://wa.me/${sale.clientPhone}`} target="_blank" rel="noreferrer"
                            className="font-['koulen'] text-[13px] text-green-400 hover:underline">
                            📱 {sale.clientPhone}
                        </a>
                    )}
                </div>
                {sale.location && (
                    <span className="font-['koulen'] text-[14px] text-white/60">📍 {sale.location}</span>
                )}
            </div>

            {/* Items */}
            <div className="px-5 pb-2 flex flex-col gap-1">
                {sale.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                        <span className="font-['koulen'] text-[14px] text-white/70">
                            {item.promoName
                                ? `🎁 ${item.promoName} — ${item.productName} ${item.variantName}`
                                : `${item.productName} — ${item.variantName}`
                            } x{item.quantity}
                        </span>
                        <span className="font-['koulen'] text-[14px] text-white/50">
                            {fmt(item.unitPrice * item.quantity)}
                        </span>
                    </div>
                ))}
                {sale.shippingPrice > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="font-['koulen'] text-[13px] text-white/30">Envio</span>
                        <span className="font-['koulen'] text-[13px] text-white/30">{fmt(sale.shippingPrice)}</span>
                    </div>
                )}
            </div>

            {/* Métricas */}
            <div className="px-5 pb-3 flex gap-4 flex-wrap">
                <div>
                    <p className="font-['koulen'] text-[10px] text-white/30">COSTO</p>
                    <p className="font-['koulen'] text-[14px] text-white/60">{fmt(sale.costTotal)}</p>
                </div>
                <div>
                    <p className="font-['koulen'] text-[10px] text-white/30">GANANCIA</p>
                    <p className={`font-['koulen'] text-[14px] ${sale.gainTotal > 0 ? "text-green-400" : "text-red-400"}`}>
                        {fmt(sale.gainTotal)}
                    </p>
                </div>
                <div>
                    <p className="font-['koulen'] text-[10px] text-white/30">PAGO</p>
                    <p className="font-['koulen'] text-[13px] text-white/60">{paymentText || "—"}</p>
                </div>
                {sale.departureAt && (
                    <div>
                        <p className="font-['koulen'] text-[10px] text-white/30">SALIDA</p>
                        <p className="font-['koulen'] text-[13px] text-[#C32CFF]">{fmtTime(sale.departureAt)}</p>
                    </div>
                )}
            </div>

            {nextStatuses.length > 0 && (
                <div className="px-5 pb-4 flex gap-2 flex-wrap border-t border-white/5 pt-3">
                    <Btn small color="ghost" onClick={() => setShowShipping(true)}>
                        {sale.shippingPrice > 0 ? `ENVÍO: ${fmt(sale.shippingPrice)}` : "+ ENVÍO"}
                    </Btn>
                    <Btn small color="ghost" onClick={() => setShowEdit(true)}>EDITAR</Btn>
                    {nextStatuses.map(s => (
                        <Btn key={s} small
                            color={s === "cancelled" ? "red" : s === "delivered" ? "green" : "purple"}
                            onClick={() => handleStatus(s)}
                            disabled={loadingStatus === s}>
                            {loadingStatus === s ? "..." : STATUS_LABELS[s].label}
                        </Btn>
                    ))}
                </div>
            )}

            {showCancel && <CancelModal saleId={sale.id} onClose={() => setShowCancel(false)}
                onSaved={() => { setShowCancel(false); onRefresh() }} />}
            {showShipping && <ShippingModal sale={sale} onClose={() => setShowShipping(false)}
                onSaved={() => { setShowShipping(false); onRefresh() }} />}
            {showEdit && <EditSaleModal sale={sale} onClose={() => setShowEdit(false)}
                onSaved={() => { setShowEdit(false); onRefresh() }} />}
        </div>
    )
}

// ─── Fila historial ───────────────────────────────────────────────────────────
const HistoryRow = ({ sale }) => {
    const [open, setOpen] = useState(false)
    const statusInfo = STATUS_LABELS[sale.status]
    const isCancelled = sale.status === 'cancelled'

    return (
        <div className={`border rounded-2xl overflow-hidden ${isCancelled ? "opacity-60 border-white/5" : "border-white/10"}`}>
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setOpen(o => !o)}>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-['koulen'] text-[13px] text-white/30">#{sale.id}</span>
                    <span className={`font-['koulen'] text-[13px] ${statusInfo.color}`}>{statusInfo.label}</span>
                    <span className="font-['koulen'] text-[14px]">{sale.clientName ?? "Sin cliente"}</span>
                    <span className="font-['koulen'] text-[13px] text-white/40">{fmtDate(sale.createdAt)}</span>
                </div>
                <div className="flex items-center gap-4">
                    {!isCancelled && (
                        <div className="hidden sm:block text-right">
                            <p className="font-['koulen'] text-[10px] text-white/30">GANANCIA</p>
                            <p className={`font-['koulen'] text-[14px] ${sale.gainTotal > 0 ? "text-green-400" : "text-red-400"}`}>
                                {fmt(sale.gainTotal)}
                            </p>
                        </div>
                    )}
                    <div className="text-right">
                        <p className="font-['koulen'] text-[10px] text-white/30">TOTAL</p>
                        <p className={`font-['koulen'] text-[16px] ${isCancelled ? "text-white/30 line-through" : "text-[#00FF1E]"}`}>
                            {fmt(sale.total)}
                        </p>
                    </div>
                    <span className="font-['koulen'] text-white/30">{open ? "▼" : "▶"}</span>
                </div>
            </div>

            {open && (
                <div className="px-5 pb-4 border-t border-white/5 pt-3 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-4">
                        {sale.clientPhone && (
                            <div>
                                <p className="font-['koulen'] text-[10px] text-white/30">TELÉFONO</p>
                                <a href={`https://wa.me/${sale.clientPhone}`} target="_blank" rel="noreferrer"
                                    className="font-['koulen'] text-[13px] text-green-400 hover:underline">
                                    {sale.clientPhone}
                                </a>
                            </div>
                        )}
                        {sale.location && (
                            <div>
                                <p className="font-['koulen'] text-[10px] text-white/30">DIRECCIÓN</p>
                                <p className="font-['koulen'] text-[13px] text-white/70">{sale.location}</p>
                            </div>
                        )}
                        {sale.departureAt && (
                            <div>
                                <p className="font-['koulen'] text-[10px] text-white/30">SALIDA</p>
                                <p className="font-['koulen'] text-[13px] text-[#C32CFF]">{fmtTime(sale.departureAt)}</p>
                            </div>
                        )}
                        {sale.arrivedAt && (
                            <div>
                                <p className="font-['koulen'] text-[10px] text-white/30">LLEGADA</p>
                                <p className="font-['koulen'] text-[13px] text-green-400">{fmtTime(sale.arrivedAt)}</p>
                            </div>
                        )}
                        {sale.cancelReason && (
                            <div>
                                <p className="font-['koulen'] text-[10px] text-white/30">MOTIVO CANCEL.</p>
                                <p className="font-['koulen'] text-[13px] text-red-400">{sale.cancelReason}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        {sale.items.map(item => (
                            <div key={item.id} className="flex justify-between">
                                <span className="font-['koulen'] text-[13px] text-white/60">
                                    {item.promoName
                                        ? `🎁 ${item.promoName} — ${item.productName} ${item.variantName}`
                                        : `${item.productName} — ${item.variantName}`
                                    } x{item.quantity}
                                </span>
                                <span className="font-['koulen'] text-[13px] text-white/40">
                                    {fmt(item.unitPrice * item.quantity)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4 flex-wrap pt-1 border-t border-white/5">
                        <div>
                            <p className="font-['koulen'] text-[10px] text-white/30">COSTO</p>
                            <p className="font-['koulen'] text-[14px] text-white/60">{fmt(sale.costTotal)}</p>
                        </div>
                        {sale.shippingPrice > 0 && (
                            <div>
                                <p className="font-['koulen'] text-[10px] text-white/30">ENVÍO</p>
                                <p className="font-['koulen'] text-[14px] text-white/60">{fmt(sale.shippingPrice)}</p>
                            </div>
                        )}
                        {sale.discountAmount > 0 && (
                            <div>
                                <p className="font-['koulen'] text-[10px] text-white/30">DESCUENTO</p>
                                <p className="font-['koulen'] text-[14px] text-white/60">{fmt(sale.discountAmount)}</p>
                            </div>
                        )}
                        {!isCancelled && (
                            <div>
                                <p className="font-['koulen'] text-[10px] text-white/30">GANANCIA</p>
                                <p className={`font-['koulen'] text-[14px] ${sale.gainTotal > 0 ? "text-green-400" : "text-red-400"}`}>
                                    {fmt(sale.gainTotal)}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="font-['koulen'] text-[10px] text-white/30">PAGO</p>
                            <p className="font-['koulen'] text-[13px] text-white/60">
                                {sale.payments.map(p =>
                                    `${p.method === 'cash' ? 'Efectivo' : 'Transf.'} ${fmt(p.amount)}`
                                ).join(" + ")}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const AdminVentas = () => {
    const [rubro, setRubro] = useState("bebidas")
    const [tab, setTab] = useState("proceso")
    const [inProcess, setInProcess] = useState([])
    const [history, setHistory] = useState([])
    const [products, setProducts] = useState([])
    const [weeks, setWeeks] = useState(1)
    const [filterDate, setFilterDate] = useState("")
    const [loading, setLoading] = useState(false)
    const [showNueva, setShowNueva] = useState(false)

    // polling — ref para no re-crear el intervalo en cada render
    const pollingRef = useRef(null)
    const rubroRef = useRef(rubro)
    rubroRef.current = rubro

    const fetchInProcess = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const res = await api.get(`/admin/sales/inprocess?rubro=${rubroRef.current}`, authHeaders())
            setInProcess(res.data)
        } catch (e) { console.error(e) }
        finally { if (!silent) setLoading(false) }
    }

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const params = filterDate
                ? `rubro=${rubro}&date=${filterDate}`
                : `rubro=${rubro}&weeks=${weeks}`
            const res = await api.get(`/admin/sales/history?${params}`, authHeaders())
            setHistory(res.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    // arrancar polling al montar, parar al desmontar
    useEffect(() => {
        api.get(`/admin/products?rubro=${rubro}`, authHeaders()).then(r => setProducts(r.data))
        fetchInProcess()

        // polling cada 20 segundos, silencioso (no muestra "CARGANDO")
        pollingRef.current = setInterval(() => {
            fetchInProcess(true)
        }, 20000)

        return () => clearInterval(pollingRef.current)
    }, [rubro])

    useEffect(() => {
        if (tab === "historial") fetchHistory()
    }, [tab, weeks, filterDate, rubro])

    const totalEnProceso = inProcess.reduce((acc, s) => acc + s.total, 0)
    const gananciaEnProceso = inProcess.reduce((acc, s) => acc + s.gainTotal, 0)

    const historialEntregadas = history.filter(s => s.status === 'delivered')
    const totalHistorial = historialEntregadas.reduce((acc, s) => acc + s.total, 0)
    const gananciaHistorial = historialEntregadas.reduce((acc, s) => acc + s.gainTotal, 0)

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-['koulen'] text-[32px] tracking-widest">VENTAS</h1>
                <Btn color="green" onClick={() => setShowNueva(true)}>+ VENTA</Btn>
            </div>

            <div className="flex gap-2">
                {["bebidas", "vapes"].map(r => (
                    <button key={r} onClick={() => setRubro(r)}
                        className={`font-['koulen'] text-[16px] tracking-wider px-5 py-2 rounded-xl transition-colors
                        ${rubro === r ? "bg-[#C32CFF] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                        {r.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 border-b border-white/10">
                {["proceso", "historial"].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`font-['koulen'] text-[16px] tracking-wider px-5 py-2 rounded-t-xl transition-colors
                        ${tab === t ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
                        {t === "proceso" ? `EN PROCESO (${inProcess.length})` : "HISTORIAL"}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="font-['koulen'] text-white/30 tracking-widest text-center py-10">CARGANDO...</p>
            ) : tab === "proceso" ? (
                <div className="flex flex-col gap-4">
                    {inProcess.length > 0 && (
                        <div className="flex gap-4 bg-white/5 rounded-2xl px-5 py-3 flex-wrap">
                            <div>
                                <p className="font-['koulen'] text-[11px] text-white/30">TOTAL EN PROCESO</p>
                                <p className="font-['koulen'] text-[20px] text-[#00FF1E]">{fmt(totalEnProceso)}</p>
                            </div>
                            <div>
                                <p className="font-['koulen'] text-[11px] text-white/30">GANANCIA EST.</p>
                                <p className={`font-['koulen'] text-[20px] ${gananciaEnProceso > 0 ? "text-green-400" : "text-red-400"}`}>
                                    {fmt(gananciaEnProceso)}
                                </p>
                            </div>
                        </div>
                    )}
                    {inProcess.length === 0
                        ? <p className="font-['koulen'] text-white/20 text-center py-10 tracking-widest">SIN VENTAS EN PROCESO</p>
                        : inProcess.map(s => <SaleCard key={s.id} sale={s} onRefresh={() => fetchInProcess()} />)
                    }
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-['koulen'] text-[14px] text-white/50">FILTRAR POR</span>
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

                    {historialEntregadas.length > 0 && (
                        <div className="flex gap-4 bg-white/5 rounded-2xl px-5 py-3 flex-wrap">
                            <div>
                                <p className="font-['koulen'] text-[11px] text-white/30">TOTAL ENTREGADAS</p>
                                <p className="font-['koulen'] text-[20px] text-[#00FF1E]">{fmt(totalHistorial)}</p>
                            </div>
                            <div>
                                <p className="font-['koulen'] text-[11px] text-white/30">GANANCIA</p>
                                <p className={`font-['koulen'] text-[20px] ${gananciaHistorial > 0 ? "text-green-400" : "text-red-400"}`}>
                                    {fmt(gananciaHistorial)}
                                </p>
                            </div>
                            <div>
                                <p className="font-['koulen'] text-[11px] text-white/30">ENTREGADAS</p>
                                <p className="font-['koulen'] text-[20px] text-white">{historialEntregadas.length}</p>
                            </div>
                            {history.length > historialEntregadas.length && (
                                <div>
                                    <p className="font-['koulen'] text-[11px] text-white/30">CANCELADAS</p>
                                    <p className="font-['koulen'] text-[20px] text-red-400">
                                        {history.length - historialEntregadas.length}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {history.length === 0
                        ? <p className="font-['koulen'] text-white/20 text-center py-10 tracking-widest">SIN HISTORIAL</p>
                        : history.map(s => <HistoryRow key={s.id} sale={s} />)
                    }
                </div>
            )}

            {showNueva && (
                <NuevaVentaModal rubro={rubro} products={products}
                    onClose={() => setShowNueva(false)}
                    onSaved={() => { setShowNueva(false); fetchInProcess() }} />
            )}
        </div>
    )
}

export default AdminVentas
