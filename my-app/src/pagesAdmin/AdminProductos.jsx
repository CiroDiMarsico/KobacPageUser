import { useState, useEffect } from "react"
import api from "../api/axios"

const token = () => localStorage.getItem("adminToken")
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } })

const fmt = (n) => n != null ? `$${Number(n).toLocaleString("es-AR")}` : "—"
const fmtPct = (n) => n != null ? `${n}%` : "—"
const API_BASE = 'http://localhost:3000'

const Tag = ({ active }) => (
    <span className={`font-['koulen'] text-[11px] px-2 py-0.5 rounded-full ${active
        ? "bg-green-500/20 text-green-400"
        : "bg-red-500/20 text-red-400"}`}>
        {active ? "ACTIVO" : "INACTIVO"}
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

const Select = ({ label, value, onChange, options }) => (
    <div className="flex flex-col gap-1">
        {label && <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">{label}</label>}
        <select value={value} onChange={e => onChange(e.target.value)}
            className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full">
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
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

const ProductModal = ({ product, categories, onClose, onSaved }) => {
    const isEdit = !!product

    const catOptions = categories
        .filter(c => c.parent_id !== null)
        .map(c => ({ value: c.id, label: c.name }))

    const [name, setName] = useState(product?.name ?? "")
    const [categoryId, setCategoryId] = useState(product?.categoryId ?? catOptions[0]?.value ?? "")
    const [salePrice, setSalePrice] = useState(product?.salePrice ?? "")
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState("")
    const [imageFile, setImageFile] = useState(null)
    const [preview, setPreview] = useState(
        product?.image
            ? product.image.startsWith('http') ? product.image : `${API_BASE}${product.image}`
            : null
    )

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setImageFile(file)
        setPreview(URL.createObjectURL(file))
    }

    const handleSave = async () => {
        if (!name || !salePrice) { setError("Nombre y precio son obligatorios"); return }
        setLoading(true); setError("")
        try {
            let imageUrl = product?.image ?? null
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
                const res = await api.post('/admin/upload-image/product-images', formData, {
                    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'multipart/form-data' }
                })
                imageUrl = res.data.url
                setUploading(false)
            }
            const body = { name, categoryId: categoryId || null, image: imageUrl, salePrice: Number(salePrice) }
            if (isEdit) await api.put(`/admin/products/${product.id}`, body, authHeaders())
            else await api.post("/admin/products", body, authHeaders())
            onSaved()
        } catch (e) {
            setUploading(false)
            setError(e.response?.data?.error || "Error al guardar")
        } finally { setLoading(false) }
    }

    return (
        <Modal title={isEdit ? "EDITAR PRODUCTO" : "NUEVO PRODUCTO"} onClose={onClose}>
            <Input label="NOMBRE" value={name} onChange={setName} />
            <Select label="CATEGORÍA" value={categoryId} onChange={setCategoryId} options={catOptions} />
            <Input label="PRECIO VENTA" value={salePrice} onChange={setSalePrice} type="number" />
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

// ─── VariantModal — ahora con campo descripción ───────────────────────────────
const VariantModal = ({ variant, productId, rubro, onClose, onSaved }) => {
    const isEdit = !!variant
    const isVapes = rubro === 'vapes'
    const [name, setName] = useState(variant?.name ?? "")
    const [description, setDescription] = useState(variant?.description ?? "")
    const [isActive, setIsActive] = useState(variant?.isActive ?? true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSave = async () => {
        if (!name) { setError("Nombre obligatorio"); return }
        setLoading(true); setError("")
        try {
            if (isEdit) await api.put(`/admin/variants/${variant.id}`, { name, isActive, description: description || null }, authHeaders())
            else await api.post(`/admin/products/${productId}/variants`, { name, description: description || null }, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al guardar")
        } finally { setLoading(false) }
    }

    return (
        <Modal title={isEdit ? "EDITAR VARIANTE" : "NUEVA VARIANTE"} onClose={onClose}>
            <Input label="NOMBRE" value={name} onChange={setName} placeholder="Nombre..." />

            {isVapes &&
                <div className="flex flex-col gap-1">
                    <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">
                        DESCRIPCION (sabor / detalle)
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder={"Descripcion..."}
                        rows={2}
                        className="bg-[#1E1E2E] border border-white/10 rounded-xl px-4 py-2.5 font-['koulen'] text-[15px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full resize-none"
                    />
                </div>}

            {isEdit && <Toggle label="ACTIVA" value={isActive} onChange={setIsActive} />}
            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn onClick={handleSave} disabled={loading}>{loading ? "GUARDANDO..." : "GUARDAR"}</Btn>
            </div>
        </Modal>
    )
}

const CategoryModal = ({ rubro, categories, onClose, onSaved }) => {
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const rubroRoot = categories.find(c => c.name === rubro && c.parent_id === null)

    const handleSave = async () => {
        if (!name) { setError("Nombre obligatorio"); return }
        setLoading(true); setError("")
        try {
            await api.post("/admin/categories", { name, parentId: rubroRoot?.id || null }, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al guardar")
        } finally { setLoading(false) }
    }

    return (
        <Modal title="NUEVA CATEGORÍA" onClose={onClose}>
            <Input label="NOMBRE" value={name} onChange={setName} placeholder="Ej: Energizantes..." />
            <p className="font-['koulen'] text-[13px] text-white/30">
                Se creará dentro de <span className="text-white/60">{rubro}</span>
            </p>
            {error && <p className="font-['koulen'] text-[13px] text-red-400">{error}</p>}
            <div className="flex gap-3 justify-end">
                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                <Btn onClick={handleSave} disabled={loading}>{loading ? "GUARDANDO..." : "GUARDAR"}</Btn>
            </div>
        </Modal>
    )
}

// ─── VariantRow — muestra descripción ────────────────────────────────────────
const VariantRow = ({ variant, onEdit }) => (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] rounded-xl">
        <div className="flex items-center gap-3 min-w-0">
            <Tag active={variant.isActive} />
            <div className="flex flex-col min-w-0">
                <span className="font-['koulen'] text-[16px]">{variant.name}</span>
                {variant.description && (
                    <span className="font-['koulen'] text-[11px] text-white/35 italic truncate max-w-[220px]">
                        {variant.description}
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-5 text-right shrink-0">
            <div className="flex flex-col items-end">
                <span className="font-['koulen'] text-[11px] text-white/30">COMPRA</span>
                <span className="font-['koulen'] text-[14px] text-white/60">{fmt(variant.lastPurchasePrice)}</span>
            </div>
            {variant.lastPriceUsd && (
                <div className="flex flex-col items-end">
                    <span className="font-['koulen'] text-[11px] text-white/30">USD</span>
                    <span className="font-['koulen'] text-[14px] text-green-400">
                        U${variant.lastPriceUsd}
                    </span>
                </div>
            )}
            {variant.lastExchangeRate && (
                <div className="hidden sm:flex flex-col items-end">
                    <span className="font-['koulen'] text-[11px] text-white/30">TC</span>
                    <span className="font-['koulen'] text-[13px] text-white/40">
                        ${Number(variant.lastExchangeRate).toLocaleString("es-AR")}
                    </span>
                </div>
            )}
            <div className="flex flex-col items-end">
                <span className="font-['koulen'] text-[11px] text-white/30">GANANCIA</span>
                <span className={`font-['koulen'] text-[14px] ${variant.ganancia > 0 ? "text-green-400" : "text-white/40"}`}>
                    {fmt(variant.ganancia)}
                </span>
            </div>
            <div className="hidden sm:flex flex-col items-end">
                <span className="font-['koulen'] text-[11px] text-white/30">MARKUP</span>
                <span className={`font-['koulen'] text-[14px] ${variant.markup > 0 ? "text-[#C32CFF]" : "text-white/40"}`}>
                    {fmtPct(variant.markup)}
                </span>
            </div>
            <div className="hidden sm:flex flex-col items-end">
                <span className="font-['koulen'] text-[11px] text-white/30">MARGEN</span>
                <span className={`font-['koulen'] text-[14px] ${variant.margen > 0 ? "text-blue-400" : "text-white/40"}`}>
                    {fmtPct(variant.margen)}
                </span>
            </div>
            <Btn small color="ghost" onClick={() => onEdit(variant)}>EDITAR</Btn>
        </div>
    </div>
)

const ProductRow = ({ product, categories, rubro, onRefresh }) => {
    const [open, setOpen] = useState(false)
    const [editProduct, setEditProduct] = useState(false)
    const [editVariant, setEditVariant] = useState(null)
    const [newVariant, setNewVariant] = useState(false)

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
                        <div className="flex items-center gap-2">
                            <span className="font-['koulen'] text-[18px]">{product.name}</span>
                            <Tag active={product.isActive} />
                        </div>
                        <span className="font-['koulen'] text-[12px] text-white/30">{product.category}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-['koulen'] text-[11px] text-white/30">VENTA</p>
                        <p className="font-['koulen'] text-[16px] text-[#00FF1E]">{fmt(product.salePrice)}</p>
                    </div>
                    <Btn small color="ghost" onClick={e => { e.stopPropagation(); setEditProduct(true) }}>EDITAR</Btn>
                </div>
            </div>

            {open && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t border-white/5 pt-3">
                    {product.variants.length === 0 && (
                        <p className="font-['koulen'] text-[14px] text-white/30 text-center py-2">Sin variantes</p>
                    )}
                    {product.variants.map(v => (
                        <VariantRow key={v.id} variant={v} onEdit={setEditVariant} />
                    ))}
                    <div className="flex justify-end mt-1">
                        <Btn small onClick={() => setNewVariant(true)}>+ VARIANTE</Btn>
                    </div>
                </div>
            )}

            {editProduct && <ProductModal product={product} categories={categories}
                onClose={() => setEditProduct(false)} onSaved={() => { setEditProduct(false); onRefresh() }} />}
            {editVariant && <VariantModal variant={editVariant} productId={product.id} rubro={rubro}
                onClose={() => setEditVariant(null)} onSaved={() => { setEditVariant(null); onRefresh() }} />}
            {newVariant && <VariantModal productId={product.id} rubro={rubro}
                onClose={() => setNewVariant(false)} onSaved={() => { setNewVariant(false); onRefresh() }} />}
        </div>
    )
}

const AdminProductos = () => {
    const [rubro, setRubro] = useState("bebidas")
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState("")
    const [showNewProduct, setShowNewProduct] = useState(false)
    const [showNewCategory, setShowNewCategory] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [pRes, cRes] = await Promise.all([
                api.get(`/admin/products?rubro=${rubro}`, authHeaders()),
                api.get(`/admin/categories?rubro=${rubro}`, authHeaders()),
            ])
            setProducts(pRes.data)
            setCategories(cRes.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [rubro])

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    const grouped = filtered.reduce((acc, p) => {
        const cat = p.category ?? "Sin categoría"
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(p)
        return acc
    }, {})

    return (
        <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="font-['koulen'] text-[32px] tracking-widest">PRODUCTOS</h1>
                <div className="flex gap-2">
                    <Btn small color="ghost" onClick={() => setShowNewCategory(true)}>+ CATEGORÍA</Btn>
                    <Btn small onClick={() => setShowNewProduct(true)}>+ PRODUCTO</Btn>
                </div>
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
                                <span className="font-['koulen'] text-[12px] text-white/30">{prods.length}</span>
                            </div>
                            {prods.map(p => (
                                <ProductRow key={p.id} product={p} categories={categories} rubro={rubro} onRefresh={fetchData} />
                            ))}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <p className="font-['koulen'] text-white/20 text-center py-10 tracking-widest">SIN PRODUCTOS</p>
                    )}
                </div>
            )}

            {showNewProduct && <ProductModal categories={categories}
                onClose={() => setShowNewProduct(false)} onSaved={() => { setShowNewProduct(false); fetchData() }} />}
            {showNewCategory && <CategoryModal rubro={rubro} categories={categories}
                onClose={() => setShowNewCategory(false)} onSaved={() => { setShowNewCategory(false); fetchData() }} />}
        </div>
    )
}

export default AdminProductos
