import { useState, useEffect, useRef } from "react"
import api from "../api/axios"

const token = () => localStorage.getItem("adminToken")
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token()}` } })
const API_BASE = "http://localhost:3000"

// ─── Componentes base ─────────────────────────────────────────────────────────
const Btn = ({ onClick, children, color = "purple", small = false, disabled = false }) => {
    const colors = {
        purple: "bg-[#C32CFF] hover:bg-[#d444ff] text-white",
        ghost: "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10",
        green: "bg-green-600 hover:bg-green-500 text-white",
    }
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`font-['koulen'] tracking-wider rounded-xl transition-all active:scale-95
            ${small ? "text-[13px] px-3 py-1.5" : "text-[15px] px-4 py-2"}
            ${colors[color]} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
            {children}
        </button>
    )
}

const Toggle = ({ value, onChange }) => (
    <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-[#C32CFF]" : "bg-white/20"}`}
    >
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform mx-0.5 ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
)

// ─── SECCIÓN CARRUSEL ─────────────────────────────────────────────────────────
const CarouselSection = () => {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [dragging, setDragging] = useState(null)
    const fileRef = useRef()

    const fetchItems = async () => {
        setLoading(true)
        try {
            const res = await api.get("/admin/page-user/carousel", authHeaders())
            setItems(res.data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchItems() }, [])

    // Subir imagen → se guarda en /product-images/ y se registra en BD
    const handleFileUpload = async (file) => {
        if (!file) return
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("image", file)
            await api.post("/admin/page-user/carousel", formData, {
                headers: { Authorization: `Bearer ${token()}`, "Content-Type": "multipart/form-data" }
            })
            await fetchItems()
        } catch (e) { console.error(e) }
        finally {
            setUploading(false)
            // Reset input para permitir subir el mismo archivo de nuevo
            if (fileRef.current) fileRef.current.value = ""
        }
    }

    // Toggle activo/inactivo
    const handleToggle = async (item) => {
        try {
            await api.put(`/admin/page-user/carousel/${item.id}`, {
                url: item.url, sortOrder: item.sortOrder, isActive: !item.isActive
            }, authHeaders())
            await fetchItems()
        } catch (e) { console.error(e) }
    }

    // Eliminar: borra de BD Y archivo físico del servidor
    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar esta imagen? Se borrará del servidor.")) return
        try {
            await api.delete(`/admin/page-user/carousel/${id}`, authHeaders())
            await fetchItems()
        } catch (e) { console.error(e) }
    }

    // Drag & Drop para reordenar
    const handleDragStart = (id) => setDragging(id)
    const handleDragOver = (e) => e.preventDefault()

    const handleDrop = async (targetId) => {
        if (dragging === null || dragging === targetId) { setDragging(null); return }
        const ordered = [...items]
        const fromIdx = ordered.findIndex(i => i.id === dragging)
        const toIdx = ordered.findIndex(i => i.id === targetId)
        const [moved] = ordered.splice(fromIdx, 1)
        ordered.splice(toIdx, 0, moved)
        setItems(ordered)
        setDragging(null)
        try {
            await api.post("/admin/page-user/carousel/reorder", {
                orderedIds: ordered.map(i => i.id)
            }, authHeaders())
        } catch (e) { console.error(e); fetchItems() }
    }

    const imgSrc = (url) => url ? (url.startsWith("http") ? url : `${API_BASE}${url}`) : null

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-['koulen'] text-[22px] tracking-widest text-[#C32CFF]">CARRUSEL</h2>
                    <p className="font-['koulen'] text-[12px] text-white/30 tracking-wider">
                        Arrastra para reordenar · {items.filter(i => i.isActive).length} activas
                    </p>
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileUpload(e.target.files[0])}
                />
                <Btn small color="green" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? "SUBIENDO..." : "+ SUBIR IMAGEN"}
                </Btn>
            </div>

            {loading ? (
                <p className="font-['koulen'] text-white/30 text-center py-8 tracking-widest">CARGANDO...</p>
            ) : items.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
                    <p className="font-['koulen'] text-[14px] text-white/20 tracking-widest">SIN IMAGENES</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStart(item.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(item.id)}
                            className={`flex items-center gap-3 bg-white/[0.03] border rounded-2xl p-3 transition-all cursor-grab active:cursor-grabbing
                                ${dragging === item.id ? "border-[#C32CFF]/50 opacity-50" : "border-white/10 hover:border-white/20"}
                                ${!item.isActive ? "opacity-50" : ""}
                            `}
                        >
                            {/* Drag handle */}
                            <div className="flex flex-col gap-0.5 shrink-0 px-1 opacity-30">
                                <div className="w-4 h-0.5 bg-white rounded" />
                                <div className="w-4 h-0.5 bg-white rounded" />
                                <div className="w-4 h-0.5 bg-white rounded" />
                            </div>

                            {/* Número de orden */}
                            <span className="font-['koulen'] text-[13px] text-white/30 w-4 text-center shrink-0">
                                {item.sortOrder}
                            </span>

                            {/* Preview */}
                            <div className="w-20 rounded-xl bg-white/5 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                                {imgSrc(item.url) ? (
                                    <img src={imgSrc(item.url)} alt="preview" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="font-['koulen'] text-[10px] text-white/20">SIN IMG</span>
                                )}
                            </div>

                            {/* Nombre del archivo */}
                            <span className="flex-1 font-['koulen'] text-[13px] text-white/40 truncate min-w-0">
                                {item.url ? item.url.split('/').pop() : '—'}
                            </span>

                            {/* Toggle activo */}
                            <Toggle value={item.isActive} onChange={() => handleToggle(item)} />

                            {/* Eliminar */}
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="font-['koulen'] text-[16px] text-red-400/50 hover:text-red-400 transition-colors shrink-0 px-1"
                                title="Eliminar imagen del servidor"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── SECCIÓN MARQUEE ──────────────────────────────────────────────────────────
const MarqueeSection = () => {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [newText, setNewText] = useState("")
    const [editTexts, setEditTexts] = useState({})
    const [saving, setSaving] = useState(null)
    const [dragging, setDragging] = useState(null)

    const fetchItems = async () => {
        setLoading(true)
        try {
            const res = await api.get("/admin/page-user/marquee", authHeaders())
            setItems(res.data)
            const texts = {}
            res.data.forEach(i => { texts[i.id] = i.text })
            setEditTexts(texts)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchItems() }, [])

    const handleAdd = async () => {
        if (!newText.trim()) return
        try {
            await api.post("/admin/page-user/marquee", { text: newText.trim() }, authHeaders())
            setNewText("")
            await fetchItems()
        } catch (e) { console.error(e) }
    }

    const handleSaveText = async (item) => {
        const text = editTexts[item.id]
        if (!text || text === item.text) return
        setSaving(item.id)
        try {
            await api.put(`/admin/page-user/marquee/${item.id}`, {
                text, sortOrder: item.sortOrder, isActive: item.isActive
            }, authHeaders())
            await fetchItems()
        } catch (e) { console.error(e) }
        finally { setSaving(null) }
    }

    const handleToggle = async (item) => {
        try {
            await api.put(`/admin/page-user/marquee/${item.id}`, {
                text: item.text, sortOrder: item.sortOrder, isActive: !item.isActive
            }, authHeaders())
            await fetchItems()
        } catch (e) { console.error(e) }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar este texto?")) return
        try {
            await api.delete(`/admin/page-user/marquee/${id}`, authHeaders())
            await fetchItems()
        } catch (e) { console.error(e) }
    }

    const handleDragStart = (id) => setDragging(id)
    const handleDragOver = (e) => e.preventDefault()

    const handleDrop = async (targetId) => {
        if (dragging === null || dragging === targetId) { setDragging(null); return }
        const ordered = [...items]
        const fromIdx = ordered.findIndex(i => i.id === dragging)
        const toIdx = ordered.findIndex(i => i.id === targetId)
        const [moved] = ordered.splice(fromIdx, 1)
        ordered.splice(toIdx, 0, moved)
        setItems(ordered)
        setDragging(null)
        try {
            await api.post("/admin/page-user/marquee/reorder", {
                orderedIds: ordered.map(i => i.id)
            }, authHeaders())
        } catch (e) { console.error(e); fetchItems() }
    }

    const activeItems = items.filter(i => i.isActive)

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="font-['koulen'] text-[22px] tracking-widest text-[#C32CFF]">MARQUEE</h2>
                <p className="font-['koulen'] text-[12px] text-white/30 tracking-wider">
                    Arrastra para reordenar · {activeItems.length} activos
                </p>
            </div>

            {/* Preview animado */}
            {activeItems.length > 0 && (
                <div className="bg-[#4E486E] h-[50px] overflow-hidden flex items-center justify-center font-[koulen] text-[20px]">
                    <div className="flex whitespace-nowrap animate-marquee">
                        <div className="flex gap-[80px] px-[80px] md:gap-[300px] md:px-[300px]">
                            {activeItems.map(item => (
                                <span key={item.id}>
                                    {item.text}
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-[80px] md:gap-[300px]">
                            {activeItems.map(item => (
                                <span key={item.id + "_dup"}>
                                    {item.text}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Agregar nuevo */}
            <div className="flex gap-2 items-end">
                <div className="flex flex-col gap-1 flex-1">
                    <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">NUEVO TEXTO</label>
                    <input
                        type="text"
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAdd()}
                        placeholder="Ej: ENVIOS TODOS LOS DÍAS"
                        className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[42px] px-4 font-['koulen'] text-[16px] text-white outline-none focus:border-[#C32CFF]/60 transition-colors w-full"
                    />
                </div>
                <Btn small onClick={handleAdd} disabled={!newText.trim()}>AGREGAR</Btn>
            </div>

            {loading ? (
                <p className="font-['koulen'] text-white/30 text-center py-8 tracking-widest">CARGANDO...</p>
            ) : items.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
                    <p className="font-['koulen'] text-[14px] text-white/20 tracking-widest">SIN TEXTOS</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleDragStart(item.id)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(item.id)}
                            className={`flex items-center gap-3 bg-white/[0.03] border rounded-2xl px-4 py-3 transition-all cursor-grab active:cursor-grabbing
                                ${dragging === item.id ? "border-[#C32CFF]/50 opacity-50" : "border-white/10 hover:border-white/20"}
                                ${!item.isActive ? "opacity-50" : ""}
                            `}
                        >
                            {/* Drag handle */}
                            <div className="flex flex-col gap-0.5 shrink-0 opacity-30">
                                <div className="w-4 h-0.5 bg-white rounded" />
                                <div className="w-4 h-0.5 bg-white rounded" />
                                <div className="w-4 h-0.5 bg-white rounded" />
                            </div>

                            {/* Número de orden */}
                            <span className="font-['koulen'] text-[13px] text-white/30 w-4 text-center shrink-0">
                                {item.sortOrder}
                            </span>

                            {/* Texto editable inline */}
                            <input
                                type="text"
                                value={editTexts[item.id] ?? item.text}
                                onChange={e => setEditTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onBlur={() => handleSaveText(item)}
                                onKeyDown={e => e.key === "Enter" && handleSaveText(item)}
                                className="flex-1 bg-transparent border-b border-white/10 focus:border-[#C32CFF]/60 outline-none font-['koulen'] text-[16px] text-white transition-colors py-0.5"
                            />

                            {/* Botón guardar, aparece solo si el texto cambió */}
                            {editTexts[item.id] !== item.text && (
                                <Btn small color="green" onClick={() => handleSaveText(item)} disabled={saving === item.id}>
                                    {saving === item.id ? "..." : "GUARDAR"}
                                </Btn>
                            )}

                            <Toggle value={item.isActive} onChange={() => handleToggle(item)} />

                            <button
                                onClick={() => handleDelete(item.id)}
                                className="font-['koulen'] text-[16px] text-red-400/50 hover:text-red-400 transition-colors shrink-0 px-1"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────
const AdminPageUser = () => (
    <div className="p-6 flex flex-col gap-10">
        <div>
            <h1 className="font-['koulen'] text-[32px] tracking-widest">PAGINA USUARIO</h1>
        </div>
        <div className="border-b border-white/10" />
        <CarouselSection />
        <br />
        <div className="border-b border-white/10" />
        <MarqueeSection />
    </div>
)

export default AdminPageUser
