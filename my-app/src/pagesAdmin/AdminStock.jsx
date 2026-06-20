import { useState, useEffect } from "react"
import api from "../api/axios"

const token = () => localStorage.getItem("adminToken")
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } })
const fmt = (n) => n != null ? `$${Number(n).toLocaleString("es-AR")}` : "—"
const fmtDate = (d) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
const API_BASE = 'http://localhost:3000'

// ─── Componentes base ─────────────────────────────────────────────────────────
const Btn = ({ onClick, children, color = "purple", small = false, disabled = false }) => {
    const colors = {
        purple: "bg-[#C32CFF] hover:bg-[#d444ff] text-white",
        green: "bg-green-600 hover:bg-green-500 text-white",
        ghost: "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10",
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
        <div className={`bg-[#0A0A14] border border-white/10 rounded-3xl p-6 w-[90vw] ${wide ? "max-w-[700px]" : "max-w-[480px]"} max-h-[90vh] overflow-y-auto flex flex-col gap-5`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
                <h2 className="font-['koulen'] text-[22px] tracking-wider">{title}</h2>
                <button onClick={onClose} className="font-['koulen'] text-[20px] text-[#C32CFF]">✕</button>
            </div>
            {children}
        </div>
    </div>
)

// ─── Modal ajuste de stock ────────────────────────────────────────────────────
const AjusteModal = ({ variant, productName, onClose, onSaved }) => {
    const [stockReal, setStockReal] = useState(String(variant.stock))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const diff = Number(stockReal) - variant.stock

    const handleSave = async () => {
        if (stockReal === "" || Number(stockReal) < 0) { setError("Ingresá un stock válido"); return }
        if (diff === 0) { onClose(); return }
        setLoading(true)
        try {
            await api.patch(`/admin/variants/${variant.id}/adjust`, { stockReal: Number(stockReal) }, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al ajustar")
        } finally { setLoading(false) }
    }

    return (
        <Modal title="AJUSTE DE STOCK" onClose={onClose}>
            <div className="flex flex-col gap-1">
                <p className="font-['koulen'] text-[16px] text-white/70">{productName}</p>
                <p className="font-['koulen'] text-[14px] text-white/40">{variant.name}</p>
                {variant.description && (
                    <p className="font-['koulen'] text-[12px] text-white/30 italic">{variant.description}</p>
                )}
            </div>
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <span className="font-['koulen'] text-[14px] text-white/50">STOCK ACTUAL</span>
                <span className="font-['koulen'] text-[20px]">{variant.stock}</span>
            </div>
            <Input label="STOCK REAL" value={stockReal} onChange={setStockReal} type="number" min="0" />
            {stockReal !== "" && diff !== 0 && (
                <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${diff > 0 ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                    <span className="font-['koulen'] text-[14px] text-white/50">DIFERENCIA</span>
                    <span className={`font-['koulen'] text-[20px] ${diff > 0 ? "text-green-400" : "text-red-400"}`}>
                        {diff > 0 ? `+${diff}` : diff}
                    </span>
                </div>
            )}
            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn onClick={handleSave} disabled={loading || diff === 0}>
                    {loading ? "GUARDANDO..." : "CONFIRMAR"}
                </Btn>
            </div>
        </Modal>
    )
}

// ─── Modal nueva compra ───────────────────────────────────────────────────────
const NuevaCompraModal = ({ rubro, products, suppliers, onClose, onSaved, onNewSupplier }) => {
    const [supplierId, setSupplierId] = useState("")
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // tipo de cambio global para vapes (se aplica a todos los items)
    const [exchangeRate, setExchangeRate] = useState("")

    const [showNewSupplier, setShowNewSupplier] = useState(false)
    const [newSupplierName, setNewSupplierName] = useState("")
    const [newSupplierPhone, setNewSupplierPhone] = useState("")
    const [savingSupplier, setSavingSupplier] = useState(false)

    const isVapes = rubro === 'vapes'

    const allVariants = products.flatMap(p =>
        p.variants.filter(v => v.isActive).map(v => ({
            variantId: v.id,
            productName: p.name,
            variantName: v.name,
            lastPrice: v.lastPurchasePrice,
            // para vapes guardamos también el último precio USD si existe
            lastPriceUsd: v.lastPriceUsd ?? null,
        }))
    )

    const addItem = () => {
        setItems(prev => [...prev, {
            variantId: "", productName: "", variantName: "",
            quantity: 1, unitPrice: "", priceUsd: ""
        }])
    }

    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))

    const updateVariant = (i, variantId) => {
        const found = allVariants.find(v => v.variantId === Number(variantId))
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item
            const priceUsd = found?.lastPriceUsd != null ? String(found.lastPriceUsd) : ""
            const tc = Number(exchangeRate) || 0
            const unitPrice = isVapes && priceUsd && tc
                ? String(Math.round(Number(priceUsd) * tc * 100) / 100)
                : (found?.lastPrice != null ? String(found.lastPrice) : "")
            return {
                ...item,
                variantId: Number(variantId),
                productName: found?.productName ?? "",
                variantName: found?.variantName ?? "",
                priceUsd,
                unitPrice,
            }
        }))
    }

    const updateItem = (i, field, value) =>
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item
            const updated = { ...item, [field]: value }
            // si cambia priceUsd y hay TC, recalcular unitPrice automáticamente
            if (isVapes && (field === 'priceUsd') && exchangeRate) {
                const tc = Number(exchangeRate) || 0
                const usd = Number(value) || 0
                updated.unitPrice = tc > 0 && usd > 0 ? String(Math.round(usd * tc * 100) / 100) : updated.unitPrice
            }
            return updated
        }))

    // cuando cambia el TC global, recalcular todos los items que tienen priceUsd
    const handleExchangeRateChange = (val) => {
        setExchangeRate(val)
        const tc = Number(val) || 0
        if (!isVapes || tc === 0) return
        setItems(prev => prev.map(item => {
            const usd = Number(item.priceUsd) || 0
            if (usd === 0) return item
            return { ...item, unitPrice: String(Math.round(usd * tc * 100) / 100) }
        }))
    }

    const total = items.reduce((acc, i) => {
        const q = Number(i.quantity) || 0
        const p = Number(i.unitPrice) || 0
        return acc + q * p
    }, 0)

    const totalUsd = isVapes ? items.reduce((acc, i) => {
        const q = Number(i.quantity) || 0
        const u = Number(i.priceUsd) || 0
        return acc + q * u
    }, 0) : 0

    const handleSaveSupplier = async () => {
        if (!newSupplierName) return
        setSavingSupplier(true)
        try {
            const res = await api.post('/admin/suppliers', { name: newSupplierName, phone: newSupplierPhone }, authHeaders())
            await onNewSupplier()
            setSupplierId(String(res.data.id))
            setShowNewSupplier(false)
            setNewSupplierName(""); setNewSupplierPhone("")
        } catch (e) {
            setError("Error al crear proveedor")
        } finally { setSavingSupplier(false) }
    }

    const handleSave = async () => {
        if (items.length === 0) { setError("Agregá al menos un item"); return }
        if (items.some(i => !i.variantId || !i.quantity || !i.unitPrice)) { setError("Completá todos los campos de cada item"); return }
        if (isVapes && !exchangeRate) { setError("Ingresá el tipo de cambio"); return }
        setLoading(true); setError("")
        try {
            await api.post('/admin/purchases', {
                supplierId: supplierId || null,
                rubro,
                exchangeRate: isVapes ? Number(exchangeRate) : null,
                items: items.map(i => ({
                    variantId: i.variantId,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    priceUsd: isVapes && i.priceUsd ? Number(i.priceUsd) : null,
                    exchangeRate: isVapes ? Number(exchangeRate) : null,
                }))
            }, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al registrar compra")
        } finally { setLoading(false) }
    }

    return (
        <Modal title="NUEVA COMPRA" onClose={onClose} wide>
            {/* Proveedor */}
            <div className="flex flex-col gap-2">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">PROVEEDOR (opcional)</label>
                {!showNewSupplier ? (
                    <div className="flex gap-2">
                        <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                            className="flex-1 bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60">
                            <option value="">— sin proveedor —</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <Btn small color="ghost" onClick={() => setShowNewSupplier(true)}>+ NUEVO</Btn>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 bg-white/5 rounded-xl p-3">
                        <Input placeholder="Nombre del proveedor" value={newSupplierName} onChange={setNewSupplierName} />
                        <Input placeholder="Teléfono (opcional)" value={newSupplierPhone} onChange={setNewSupplierPhone} />
                        <div className="flex gap-2 justify-end">
                            <Btn small color="ghost" onClick={() => setShowNewSupplier(false)}>CANCELAR</Btn>
                            <Btn small onClick={handleSaveSupplier} disabled={savingSupplier || !newSupplierName}>
                                {savingSupplier ? "..." : "GUARDAR"}
                            </Btn>
                        </div>
                    </div>
                )}
            </div>

            {/* Tipo de cambio — solo vapes */}
            {isVapes && (
                <div className="flex flex-col gap-1">
                    <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">
                        TIPO DE CAMBIO (USD → ARS)
                    </label>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-['koulen'] text-[14px] text-white/30">$</span>
                            <input type="number" min="0" step="1" value={exchangeRate}
                                onChange={e => handleExchangeRateChange(e.target.value)}
                                placeholder="Ej: 1500"
                                className="bg-[#1E1E2E] border border-[#C32CFF]/40 rounded-xl h-[42px] pl-7 pr-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/80 transition-colors w-full" />
                        </div>
                        {exchangeRate && (
                            <span className="font-['koulen'] text-[13px] text-white/40">
                                1 USD = {fmt(Number(exchangeRate))}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Items */}
            <div className="flex flex-col gap-3">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">PRODUCTOS</label>

                {items.length === 0 && (
                    <p className="font-['koulen'] text-[14px] text-white/20 text-center py-3">Agregar compra</p>
                )}

                {items.map((item, i) => (
                    <div key={i} className="flex flex-col gap-2 bg-white/[0.03] border border-white/10 rounded-xl p-3">
                        <select value={item.variantId} onChange={e => updateVariant(i, e.target.value)}
                            className="w-full bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60">
                            <option value="">— elegir producto/variante —</option>
                            {products.map(p => (
                                <optgroup key={p.id} label={p.name}>
                                    {p.variants.filter(v => v.isActive).map(v => (
                                        <option key={v.id} value={v.id}>{p.name} — {v.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>

                        <div className="flex gap-2 flex-wrap">
                            {/* Cantidad */}
                            <div className="flex flex-col gap-1 w-[80px]">
                                <label className="font-['koulen'] text-[11px] text-white/30">CANT.</label>
                                <input type="number" min="1" value={item.quantity}
                                    onChange={e => updateItem(i, 'quantity', e.target.value)}
                                    className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 w-full" />
                            </div>

                            {/* Precio USD — solo vapes */}
                            {isVapes && (
                                <div className="flex flex-col gap-1 flex-1 min-w-[90px]">
                                    <label className="font-['koulen'] text-[11px] text-white/30">USD</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-['koulen'] text-[12px] text-green-400/60">U$</span>
                                        <input type="number" min="0" step="0.5" value={item.priceUsd}
                                            onChange={e => updateItem(i, 'priceUsd', e.target.value)}
                                            className="bg-[#1E1E2E] border border-green-500/20 rounded-xl h-[38px] pl-7 pr-2 font-['koulen'] text-[14px] text-green-400 outline-none focus:border-green-500/50 w-full" />
                                    </div>
                                </div>
                            )}

                            {/* Precio en pesos */}
                            <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                                <label className="font-['koulen'] text-[11px] text-white/30">
                                    {isVapes ? "PESOS (auto)" : "PRECIO UNIT."}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 font-['koulen'] text-[12px] text-white/30">$</span>
                                    <input type="number" min="0" value={item.unitPrice}
                                        onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                                        className={`bg-[#1E1E2E] border rounded-xl h-[38px] pl-6 pr-2 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 w-full
                                            ${isVapes ? "border-white/5 text-white/60" : "border-white/10"}`} />
                                </div>
                            </div>

                            {/* Subtotal */}
                            <div className="flex flex-col gap-1 items-end justify-end shrink-0">
                                <label className="font-['koulen'] text-[11px] text-white/30">SUBTOTAL</label>
                                <span className="font-['koulen'] text-[15px] text-white/70 h-[38px] flex items-center">
                                    {item.quantity && item.unitPrice
                                        ? fmt(Number(item.quantity) * Number(item.unitPrice))
                                        : "—"}
                                </span>
                            </div>

                            {/* Eliminar */}
                            <button onClick={() => removeItem(i)}
                                className="font-['koulen'] text-[16px] text-red-400 hover:text-red-300 self-end h-[38px] px-1">✕</button>
                        </div>

                        {/* Subtotal en USD para vapes */}
                        {isVapes && item.priceUsd && item.quantity && (
                            <div className="flex justify-end">
                                <span className="font-['koulen'] text-[11px] text-green-400/60">
                                    = U${(Number(item.priceUsd) * Number(item.quantity)).toLocaleString("es-AR")}
                                </span>
                            </div>
                        )}
                    </div>
                ))}

                <Btn small color="ghost" onClick={addItem}>+ AGREGAR ITEM</Btn>
            </div>

            {/* Totales */}
            {items.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                        <span className="font-['koulen'] text-[16px] text-white/50">TOTAL COMPRA</span>
                        <div className="flex items-center gap-4">
                            {isVapes && totalUsd > 0 && (
                                <span className="font-['koulen'] text-[14px] text-green-400">
                                    U${totalUsd.toLocaleString("es-AR")}
                                </span>
                            )}
                            <span className="font-['koulen'] text-[22px] text-[#00FF1E]">{fmt(total)}</span>
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn color="green" onClick={handleSave} disabled={loading}>
                    {loading ? "GUARDANDO..." : "CONFIRMAR COMPRA"}
                </Btn>
            </div>
        </Modal>
    )
}

// ─── Fila de lote ─────────────────────────────────────────────────────────────
const LotRow = ({ lot }) => (
    <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] rounded-lg">
        <span className="font-['koulen'] text-[12px] text-white/30">{fmtDate(lot.createdAt)}</span>
        <div className="flex items-center gap-4">
            {lot.priceUsd != null && (
                <div className="text-right">
                    <p className="font-['koulen'] text-[10px] text-white/20">USD</p>
                    <p className="font-['koulen'] text-[13px] text-green-400">U${lot.priceUsd}</p>
                </div>
            )}
            {lot.exchangeRate != null && (
                <div className="text-right">
                    <p className="font-['koulen'] text-[10px] text-white/20">TC</p>
                    <p className="font-['koulen'] text-[13px] text-white/40">{fmt(lot.exchangeRate)}</p>
                </div>
            )}
            <div className="text-right">
                <p className="font-['koulen'] text-[10px] text-white/20">INICIAL</p>
                <p className="font-['koulen'] text-[13px] text-white/50">{lot.initialQuantity}</p>
            </div>
            <div className="text-right">
                <p className="font-['koulen'] text-[10px] text-white/20">RESTANTE</p>
                <p className="font-['koulen'] text-[13px] text-white">{lot.remainingQuantity}</p>
            </div>
            <div className="text-right">
                <p className="font-['koulen'] text-[10px] text-white/20">P. COMPRA</p>
                <p className="font-['koulen'] text-[13px] text-white/70">{fmt(lot.purchasePrice)}</p>
            </div>
        </div>
    </div>
)

// ─── Fila de variante ─────────────────────────────────────────────────────────
const VariantRow = ({ variant, productName, onAjuste }) => {
    const [showLots, setShowLots] = useState(false)

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] rounded-xl">
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowLots(o => !o)}
                        className="font-['koulen'] text-[13px] text-white/30 hover:text-white/60 transition-colors">
                        {showLots ? "▼" : "▶"} LOTES
                    </button>
                    <div className="flex flex-col">
                        <span className="font-['koulen'] text-[15px]">{variant.name}</span>
                        {variant.description && (
                            <span className="font-['koulen'] text-[11px] text-white/30 italic">{variant.description}</span>
                        )}
                    </div>
                    {!variant.isActive && (
                        <span className="font-['koulen'] text-[11px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">INACTIVA</span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-['koulen'] text-[10px] text-white/30">ÚLT. COMPRA</p>
                        <p className="font-['koulen'] text-[13px] text-white/60">{fmt(variant.lastPurchasePrice)}</p>
                    </div>
                    {variant.lastPriceUsd && (
                        <div className="text-right">
                            <p className="font-['koulen'] text-[10px] text-white/30">USD</p>
                            <p className="font-['koulen'] text-[13px] text-green-400">
                                U${variant.lastPriceUsd}
                            </p>
                        </div>
                    )}
                    <div className="text-right">
                        <p className="font-['koulen'] text-[10px] text-white/30">STOCK</p>
                        <p className={`font-['koulen'] text-[18px] ${variant.stock === 0 ? "text-red-400" : variant.stock <= 4 ? "text-yellow-400" : "text-white"}`}>
                            {variant.stock}
                        </p>
                    </div>
                    <Btn small color="ghost" onClick={() => onAjuste(variant)}>AJUSTAR</Btn>
                </div>
            </div>

            {showLots && (
                <div className="flex flex-col gap-1 pl-4">
                    {variant.lots.length === 0
                        ? <p className="font-['koulen'] text-[12px] text-white/20 text-center py-2">Sin lotes con stock</p>
                        : variant.lots.map(l => <LotRow key={l.id} lot={l} />)
                    }
                </div>
            )}
        </div>
    )
}

// ─── Fila de producto ─────────────────────────────────────────────────────────
const ProductRow = ({ product, onAjuste }) => {
    const [open, setOpen] = useState(false)
    const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0)

    return (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setOpen(o => !o)}>
                <div className="flex items-center gap-3">
                    <span className="font-['koulen'] text-[18px] leading-none text-white/40 hidden sm:block">{open ? "▼" : "▶"}</span>
                    {product.image && (
                        <img src={product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`}
                            alt={product.name} className="h-9 w-9 object-contain rounded-lg bg-white/5" />
                    )}
                    <div>
                        <span className="font-['koulen'] text-[18px]">{product.name}</span>
                        <p className="font-['koulen'] text-[12px] text-white/30">{product.category}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-['koulen'] text-[11px] text-white/30">STOCK TOTAL</p>
                    <p className={`font-['koulen'] text-[20px] ${totalStock === 0 ? "text-red-400" : totalStock <= 5 ? "text-yellow-400" : "text-white"}`}>
                        {totalStock}
                    </p>
                </div>
            </div>

            {open && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t border-white/5 pt-3">
                    {product.variants.map(v => (
                        <VariantRow key={v.id} variant={v} productName={product.name} onAjuste={onAjuste} />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const AdminStock = () => {
    const [rubro, setRubro] = useState("bebidas")
    const [products, setProducts] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")

    const [ajusteVariant, setAjusteVariant] = useState(null)
    const [ajusteProductName, setAjusteProductName] = useState("")
    const [showCompra, setShowCompra] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [stockRes, suppliersRes] = await Promise.all([
                api.get(`/admin/stock?rubro=${rubro}`, authHeaders()),
                api.get('/admin/suppliers', authHeaders()),
            ])
            setProducts(stockRes.data)
            setSuppliers(suppliersRes.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const fetchSuppliers = async () => {
        const res = await api.get('/admin/suppliers', authHeaders())
        setSuppliers(res.data)
    }

    useEffect(() => { fetchData() }, [rubro])

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    const grouped = filtered.reduce((acc, p) => {
        const cat = p.category ?? "Sin categoría"
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(p)
        return acc
    }, {})

    const handleAjuste = (variant, productName) => {
        setAjusteVariant(variant)
        setAjusteProductName(productName)
    }

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-['koulen'] text-[32px] tracking-widest">STOCK</h1>
                <Btn color="green" onClick={() => setShowCompra(true)}>+ NUEVA COMPRA</Btn>
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

            <input type="text" placeholder="BUSCAR PRODUCTO..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[44px] px-5 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full max-w-[400px]" />

            {loading ? (
                <p className="font-['koulen'] text-white/30 tracking-widest text-center py-10">CARGANDO...</p>
            ) : (
                <div className="flex flex-col gap-8">
                    {Object.entries(grouped).map(([cat, prods]) => (
                        <div key={cat} className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <h2 className="font-['koulen'] text-[18px] text-[#C32CFF] tracking-wider">{cat.toUpperCase()}</h2>
                                <div className="flex-1 border-b border-white/10" />
                            </div>
                            {prods.map(p => (
                                <ProductRow key={p.id} product={p} onAjuste={(v) => handleAjuste(v, p.name)} />
                            ))}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <p className="font-['koulen'] text-white/20 text-center py-10 tracking-widest">SIN PRODUCTOS</p>
                    )}
                </div>
            )}

            {ajusteVariant && (
                <AjusteModal variant={ajusteVariant} productName={ajusteProductName}
                    onClose={() => setAjusteVariant(null)}
                    onSaved={() => { setAjusteVariant(null); fetchData() }} />
            )}

            {showCompra && (
                <NuevaCompraModal rubro={rubro} products={products} suppliers={suppliers}
                    onNewSupplier={fetchSuppliers}
                    onClose={() => setShowCompra(false)}
                    onSaved={() => { setShowCompra(false); fetchData() }} />
            )}
        </div>
    )
}

export default AdminStock
