import { useState, useEffect } from "react"
import api from "../api/axios"
import Loading from "../components/Loading"

const token = () => localStorage.getItem("adminToken")
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } })
const fmt = (n) => n != null ? `$${Number(n).toLocaleString("es-AR")}` : "—"
const fmtPct = (n) => n != null ? `${n}%` : "—"
const API_BASE = import.meta.env.VITE_LINK

const Tag = ({ active }) => (
    <span className={`font-['koulen'] text-[11px] px-2 py-0.5 rounded-full ${active
        ? "bg-green-500/20 text-green-400"
        : "bg-red-500/20 text-red-400"}`}>
        {active ? "ACTIVA" : "INACTIVA"}
    </span>
)

const Btn = ({ onClick, children, color = "purple", small = false, disabled = false }) => {
    const colors = {
        purple: "bg-[#C32CFF] hover:bg-[#d444ff] text-white",
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

const Input = ({ label, value, onChange, type = "text", placeholder = "" }) => (
    <div className="flex flex-col gap-1">
        {label && <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">{label}</label>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full" />
    </div>
)

const Toggle = ({ label, value, onChange }) => (
    <div className="flex items-center gap-3">
        <label className="font-['koulen'] text-[14px] text-white/60">{label}</label>
        <button onClick={() => onChange(!value)}
            className={`w-12 h-6 rounded-full transition-colors ${value ? "bg-[#C32CFF]" : "bg-white/20"}`}>
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform mx-0.5 ${value ? "translate-x-6" : "translate-x-0"}`} />
        </button>
    </div>
)

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
        <div className="bg-[#0A0A14] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-[520px] max-h-[90vh] overflow-y-auto flex flex-col gap-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
                <h2 className="font-['koulen'] text-[22px] tracking-wider">{title}</h2>
                <button onClick={onClose} className="font-['koulen'] text-[20px] text-[#C32CFF]">✕</button>
            </div>
            {children}
        </div>
    </div>
)

// ─── Editor de items ──────────────────────────────────────────────────────────
const ItemsEditor = ({ items, onChange, products }) => {
    const addItem = () => onChange([...items, { productId: "", quantity: 1 }])
    const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))
    const updateItem = (i, field, value) =>
        onChange(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

    return (
        <div className="flex flex-col gap-3">
            <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">PRODUCTOS DE LA PROMO</label>
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/[0.03] rounded-xl p-3">
                    <select value={item.productId} onChange={e => updateItem(i, 'productId', Number(e.target.value))}
                        className="flex-1 bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60">
                        <option value="">— producto —</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateItem(i, 'quantity', Math.max(1, item.quantity - 1))}
                            className="bg-white/10 rounded-lg w-8 h-8 font-['koulen'] text-[18px] flex items-center justify-center hover:bg-white/20">−</button>
                        <span className="font-['koulen'] text-[16px] w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateItem(i, 'quantity', item.quantity + 1)}
                            className="bg-white/10 rounded-lg w-8 h-8 font-['koulen'] text-[18px] flex items-center justify-center hover:bg-white/20">+</button>
                    </div>
                    <button onClick={() => removeItem(i)}
                        className="font-['koulen'] text-[16px] text-red-400 hover:text-red-300 w-8 text-center shrink-0">✕</button>
                </div>
            ))}
            <Btn small color="ghost" onClick={addItem}>+ AGREGAR PRODUCTO</Btn>
        </div>
    )
}

// ─── Modal promo ──────────────────────────────────────────────────────────────
const PromoModal = ({ promo, rubro, products, onClose, onSaved }) => {
    const isEdit = !!promo
    const [name, setName] = useState(promo?.name ?? "")
    const [price, setPrice] = useState(promo?.price ?? "")
    const [isActive, setIsActive] = useState(promo?.isActive ?? true)
    const [items, setItems] = useState(
        promo?.items.map(i => ({ productId: i.productId, quantity: i.quantity })) ?? []
    )
    const [imageFile, setImageFile] = useState(null)
    const [preview, setPreview] = useState(
        promo?.image
            ? promo.image.startsWith('http') ? promo.image : `${API_BASE}${promo.image}`
            : null
    )
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setImageFile(file)
        setPreview(URL.createObjectURL(file))
    }

    const handleSave = async () => {
        if (!name || !price) { setError("Nombre y precio son obligatorios"); return }
        if (items.length === 0) { setError("Agregá al menos un producto"); return }
        if (items.some(i => !i.productId)) { setError("Seleccioná un producto en cada fila"); return }
        setLoading(true); setError("")
        try {
            let imageUrl = promo?.image ?? null
            if (imageFile) {
                // borrar imagen vieja si existe y es del servidor
                if (imageUrl && imageUrl.startsWith('/')) {
                    await api.delete('/admin/upload-image', {
                        ...authHeaders(),
                        data: { url: imageUrl }
                    })
                }
                setUploading(true)
                const formData = new FormData()
                formData.append('image', imageFile)
                const res = await api.post('/admin/upload-image/promo-images', formData, {
                    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'multipart/form-data' }
                })
                imageUrl = res.data.url
                setUploading(false)
            }
            const body = { name, image: imageUrl, price: Number(price), rubro, isActive, items }
            if (isEdit) await api.put(`/admin/promos/${promo.id}`, body, authHeaders())
            else await api.post("/admin/promos", body, authHeaders())
            onSaved()
        } catch (e) {
            setUploading(false)
            setError(e.response?.data?.error || "Error al guardar")
        } finally { setLoading(false) }
    }

    return (
        <Modal title={isEdit ? "EDITAR PROMO" : "NUEVA PROMO"} onClose={onClose}>
            <Input label="NOMBRE" value={name} onChange={setName} />
            <Input label="PRECIO" value={price} onChange={setPrice} type="number" />
            <div className="flex flex-col gap-2">
                <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">IMAGEN</label>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#C32CFF]/40 transition-colors">
                        {preview ? <img src={preview} alt="preview" className="w-full h-full object-contain" />
                            : <span className="font-['koulen'] text-[24px] text-white/20">+</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="font-['koulen'] text-[14px] text-white/60 group-hover:text-white transition-colors">
                            {imageFile ? imageFile.name : "Elegir imagen"}
                        </span>
                        <span className="font-['koulen'] text-[11px] text-white/30">JPG, PNG, WEBP — máx 5MB</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
            </div>
            <ItemsEditor items={items} onChange={setItems} products={products} />
            {isEdit && <Toggle label="ACTIVA" value={isActive} onChange={setIsActive} />}
            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn onClick={handleSave} disabled={loading || uploading}>
                    {uploading ? "SUBIENDO..." : loading ? "GUARDANDO..." : "GUARDAR"}
                </Btn>
            </div>
        </Modal>
    )
}

// ─── Fila de promo ────────────────────────────────────────────────────────────
const PromoRow = ({ promo, rubro, products, onRefresh }) => {
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState(false)

    return (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setOpen(o => !o)}>
                <div className="flex items-center gap-3">
                    <span className="font-['koulen'] text-[18px] leading-none text-white/40 hidden sm:block">{open ? "▼" : "▶"}</span>
                    {promo.image && (
                        <img src={promo.image.startsWith('http') ? promo.image : `${API_BASE}${promo.image}`}
                            alt={promo.name} className="h-9 w-9 object-contain rounded-lg bg-white/5" />
                    )}
                    <div className="flex items-center gap-2">
                        <span className="font-['koulen'] text-[18px]">{promo.name}</span>
                        <Tag active={promo.isActive} />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Métricas en el header */}
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="text-right">
                            <p className="font-['koulen'] text-[11px] text-white/30">COSTO</p>
                            <p className="font-['koulen'] text-[14px] text-white/60">{fmt(promo.costoTotal)}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-['koulen'] text-[11px] text-white/30">GANANCIA</p>
                            <p className={`font-['koulen'] text-[14px] ${promo.ganancia > 0 ? "text-green-400" : "text-white/40"}`}>
                                {fmt(promo.ganancia)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-['koulen'] text-[11px] text-white/30">MARKUP</p>
                            <p className={`font-['koulen'] text-[14px] ${promo.markup > 0 ? "text-[#C32CFF]" : "text-white/40"}`}>
                                {fmtPct(promo.markup)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="font-['koulen'] text-[11px] text-white/30">MARGEN</p>
                            <p className={`font-['koulen'] text-[14px] ${promo.margen > 0 ? "text-blue-400" : "text-white/40"}`}>
                                {fmtPct(promo.margen)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-['koulen'] text-[11px] text-white/30">PRECIO</p>
                        <p className="font-['koulen'] text-[16px] text-[#00FF1E]">{fmt(promo.price)}</p>
                    </div>
                    <Btn small color="ghost" onClick={e => { e.stopPropagation(); setEditing(true) }}>EDITAR</Btn>
                </div>
            </div>

            {/* Items desplegables — con costo por item */}
            {open && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t border-white/5 pt-3">
                    {/* métricas mobile */}
                    <div className="flex sm:hidden gap-4 px-1 pb-2">
                        <div>
                            <p className="font-['koulen'] text-[11px] text-white/30">COSTO</p>
                            <p className="font-['koulen'] text-[14px] text-white/60">{fmt(promo.costoTotal)}</p>
                        </div>
                        <div>
                            <p className="font-['koulen'] text-[11px] text-white/30">GANANCIA</p>
                            <p className={`font-['koulen'] text-[14px] ${promo.ganancia > 0 ? "text-green-400" : "text-white/40"}`}>
                                {fmt(promo.ganancia)}
                            </p>
                        </div>
                        <div>
                            <p className="font-['koulen'] text-[11px] text-white/30">MARKUP</p>
                            <p className={`font-['koulen'] text-[14px] ${promo.markup > 0 ? "text-[#C32CFF]" : "text-white/40"}`}>
                                {fmtPct(promo.markup)}
                            </p>
                        </div>
                        <div>
                            <p className="font-['koulen'] text-[11px] text-white/30">MARGEN</p>
                            <p className={`font-['koulen'] text-[14px] ${promo.margen > 0 ? "text-blue-400" : "text-white/40"}`}>
                                {fmtPct(promo.margen)}
                            </p>
                        </div>
                    </div>

                    {promo.items.length === 0
                        ? <p className="font-['koulen'] text-[14px] text-white/30 text-center py-2">Sin productos</p>
                        : promo.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between px-4 py-2 bg-white/[0.03] rounded-xl">
                                <div className="flex items-center gap-2">
                                    <span className="font-['koulen'] text-[15px]">{item.productName}</span>
                                    <span className="font-['koulen'] text-[13px] text-white/40">x{item.quantity}</span>
                                </div>
                                <span className="font-['koulen'] text-[13px] text-white/50">
                                    costo prom: {item.avgCost != null ? fmt(item.avgCost * item.quantity) : "—"}
                                </span>
                            </div>
                        ))
                    }
                </div>
            )}

            {editing && (
                <PromoModal promo={promo} rubro={rubro} products={products}
                    onClose={() => setEditing(false)}
                    onSaved={() => { setEditing(false); onRefresh() }} />
            )}
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const AdminPromos = () => {
    const [rubro, setRubro] = useState("bebidas")
    const [promos, setPromos] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [showNew, setShowNew] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [promosRes, productsRes] = await Promise.all([
                api.get(`/admin/promos?rubro=${rubro}`, authHeaders()),
                api.get(`/admin/products?rubro=${rubro}`, authHeaders()),
            ])
            setPromos(promosRes.data)
            setProducts(productsRes.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [rubro])

    const filtered = promos.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-['koulen'] text-[32px] tracking-widest">PROMOS</h1>
                <Btn small onClick={() => setShowNew(true)}>+ PROMO</Btn>
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

            <input type="text" placeholder="BUSCAR PROMO..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[44px] px-5 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full max-w-[400px]" />

            {loading ? (
                <div className="flex items-center justify-center h-[463px]">
                    <Loading size="small" />
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filtered.map(promo => (
                        <PromoRow key={promo.id} promo={promo} rubro={rubro} products={products} onRefresh={fetchData} />
                    ))}
                    {filtered.length === 0 && (
                        <p className="font-['koulen'] text-white/20 text-center py-10 tracking-widest">SIN PROMOS</p>
                    )}
                </div>
            )}

            {showNew && (
                <PromoModal rubro={rubro} products={products}
                    onClose={() => setShowNew(false)}
                    onSaved={() => { setShowNew(false); fetchData() }} />
            )}
        </div>
    )
}

export default AdminPromos
