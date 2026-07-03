import { useState, useEffect, useRef } from "react"
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
        amber: "bg-amber-600 hover:bg-amber-500 text-white",
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

// ─── Escáner de recibo con Gemini (via proxy backend) ─────────────────────────
const ReciboScanner = ({ products, onItemsDetected, onClose }) => {
    const fileRef = useRef()
    const [scanning, setScanning] = useState(false)
    const [error, setError] = useState("")
    const [preview, setPreview] = useState(null)
    const [fileName, setFileName] = useState("")
    const [selectedFile, setSelectedFile] = useState(null)
    const [rawResult, setRawResult] = useState(null)
    const [matchedItems, setMatchedItems] = useState([])
    const [unmatchedItems, setUnmatchedItems] = useState([])

    const allVariants = products.flatMap(p =>
        p.variants.filter(v => v.isActive).map(v => ({
            variantId: v.id,
            productName: p.name,
            variantName: v.name,
            lastPrice: v.lastPurchasePrice,
            searchKey: `${p.name} ${v.name}`.toLowerCase()
        }))
    )

    const toBase64 = (file) => new Promise((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result.split(",")[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
    })

    // Comprime imágenes grandes antes de mandarlas (máx 1600px, calidad 0.85)
    const compressImage = (file) => new Promise((res, rej) => {
        const isPDF = file.type === 'application/pdf'
        if (isPDF) { res(file); return }

        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(url)
            const MAX = 1600
            let { width, height } = img
            if (width > MAX || height > MAX) {
                const ratio = Math.min(MAX / width, MAX / height)
                width = Math.round(width * ratio)
                height = Math.round(height * ratio)
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            canvas.getContext('2d').drawImage(img, 0, 0, width, height)
            canvas.toBlob(
                blob => blob ? res(new File([blob], file.name, { type: 'image/jpeg' })) : rej(new Error('Error al comprimir')),
                'image/jpeg',
                0.85
            )
        }
        img.onerror = rej
        img.src = url
    })

    const handleFileSelect = (file) => {
        if (!file) return
        setError("")
        setRawResult(null)
        setMatchedItems([])
        setUnmatchedItems([])

        const isImage = file.type.startsWith("image/")
        const isPDF = file.type === "application/pdf"

        if (!isImage && !isPDF) {
            setError("Solo se aceptan imágenes (JPG, PNG, WEBP) o PDF.")
            return
        }

        setFileName(file.name)
        setSelectedFile(file)

        if (isImage) {
            setPreview(URL.createObjectURL(file))
        } else {
            setPreview(null)
        }
    }

    const handleScan = async () => {
        if (!selectedFile) return
        setScanning(true)
        setError("")

        try {
            const fileToSend = await compressImage(selectedFile)
            const base64 = await toBase64(fileToSend)
            const mimeType = fileToSend.type

            const productList = products.map(p =>
                `- ${p.name}: variantes [${p.variants.filter(v => v.isActive).map(v => v.name).join(", ")}]`
            ).join("\n")

            const res = await api.post(
                '/ai/scan-receipt',
                { base64, mimeType, productList },
                authHeaders()
            )

            const parsed = res.data
            setRawResult(parsed)

            // Cruzar resultados con variantes reales
            const matched = []
            const unmatched = []

            for (const item of parsed.items || []) {
                if (item.matchedProduct && item.matchedVariant) {
                    const found = allVariants.find(v =>
                        v.productName.toLowerCase() === item.matchedProduct.toLowerCase() &&
                        v.variantName.toLowerCase() === item.matchedVariant.toLowerCase()
                    ) || allVariants.find(v =>
                        v.searchKey.includes(item.matchedProduct.toLowerCase()) ||
                        v.searchKey.includes((item.matchedVariant || "").toLowerCase())
                    )

                    if (found) {
                        matched.push({
                            variantId: found.variantId,
                            productName: found.productName,
                            variantName: found.variantName,
                            quantity: item.quantity || 1,
                            unitPrice: item.unitPrice || found.lastPrice || "",
                            rawName: item.rawName,
                            confirmed: true
                        })
                    } else {
                        unmatched.push({ ...item, reason: "No encontrado en el sistema" })
                    }
                } else {
                    unmatched.push({ ...item, reason: "No se pudo identificar el producto" })
                }
            }

            setMatchedItems(matched)
            setUnmatchedItems(unmatched)

        } catch (e) {
            setError(e.response?.data?.error || e.message || "Error al procesar el recibo")
        } finally {
            setScanning(false)
        }
    }

    const handleConfirm = () => {
        const items = matchedItems
            .filter(i => i.confirmed)
            .map(i => ({
                variantId: i.variantId,
                productName: i.productName,
                variantName: i.variantName,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
            }))
        onItemsDetected(items)
        onClose()
    }

    const updateMatched = (idx, field, value) => {
        setMatchedItems(prev => prev.map((item, i) =>
            i === idx ? { ...item, [field]: value } : item
        ))
    }

    const toggleConfirmed = (idx) => {
        setMatchedItems(prev => prev.map((item, i) =>
            i === idx ? { ...item, confirmed: !item.confirmed } : item
        ))
    }

    const resetScanner = () => {
        setRawResult(null)
        setMatchedItems([])
        setUnmatchedItems([])
        setFileName("")
        setPreview(null)
        setSelectedFile(null)
        setError("")
        if (fileRef.current) fileRef.current.value = ""
    }

    const confirmedCount = matchedItems.filter(i => i.confirmed).length
    const confirmedTotal = matchedItems
        .filter(i => i.confirmed)
        .reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80" onClick={onClose}>
            <div
                className="bg-[#0A0A14] border border-amber-500/20 rounded-3xl p-6 w-[90vw] max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col gap-5"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <h2 className="font-['koulen'] text-[22px] tracking-wider text-amber-400">
                            ESCANEAR RECIBO
                        </h2>
                        <p className="font-['koulen'] text-[12px] text-white/30">
                            Subí una foto o PDF — Gemini extrae los productos automáticamente
                        </p>
                    </div>
                    <button onClick={onClose} className="font-['koulen'] text-[20px] text-white/40 hover:text-white transition-colors">✕</button>
                </div>

                {/* Estado: sin archivo */}
                {!selectedFile && !scanning && (
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-white/15 hover:border-amber-500/50 rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors text-[32px]">
                            📄
                        </div>
                        <div className="text-center">
                            <p className="font-['koulen'] text-[16px] text-white/60 group-hover:text-white transition-colors">
                                Tocar para subir recibo
                            </p>
                            <p className="font-['koulen'] text-[12px] text-white/25 mt-1">
                                JPG · PNG · WEBP · PDF — máx 10MB
                            </p>
                        </div>
                    </div>
                )}

                {/* Archivo seleccionado, todavía no escaneado */}
                {selectedFile && !rawResult && !scanning && (
                    <div className="flex flex-col gap-3">
                        {/* Preview imagen */}
                        {preview && (
                            <div className="relative">
                                <img
                                    src={preview}
                                    alt="Recibo"
                                    className="w-full rounded-xl border border-white/10 max-h-[220px] object-contain bg-white/5"
                                />
                            </div>
                        )}

                        {/* Nombre del archivo (PDF u otro) */}
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                            <span className="text-[22px]">{preview ? "🖼️" : "📋"}</span>
                            <span className="font-['koulen'] text-[14px] text-white flex-1 truncate">{fileName}</span>
                            <button
                                onClick={resetScanner}
                                className="font-['koulen'] text-[14px] text-white/30 hover:text-white transition-colors"
                            >✕</button>
                        </div>

                        <div className="flex gap-2">
                            <Btn color="ghost" small onClick={() => fileRef.current?.click()}>
                                CAMBIAR ARCHIVO
                            </Btn>
                            <Btn color="amber" onClick={handleScan}>
                                🔍 ANALIZAR CON GEMINI
                            </Btn>
                        </div>
                    </div>
                )}

                {/* Input file oculto */}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => handleFileSelect(e.target.files[0])}
                />

                {/* Cargando */}
                {scanning && (
                    <div className="flex flex-col items-center gap-5 py-10">
                        <div className="w-14 h-14 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                        <div className="text-center">
                            <p className="font-['koulen'] text-[16px] text-amber-400">ANALIZANDO RECIBO...</p>
                            <p className="font-['koulen'] text-[12px] text-white/30 mt-1">
                                Gemini está leyendo la imagen
                            </p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && !scanning && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex flex-col gap-2">
                        <p className="font-['koulen'] text-[14px] text-red-400">{error}</p>
                        <button
                            onClick={resetScanner}
                            className="font-['koulen'] text-[12px] text-white/40 hover:text-white text-left transition-colors"
                        >
                            ← Intentar de nuevo
                        </button>
                    </div>
                )}

                {/* Resultados */}
                {rawResult && !scanning && (
                    <div className="flex flex-col gap-4">

                        {/* Nota de Gemini */}
                        {rawResult.notes && (
                            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5">
                                <p className="font-['koulen'] text-[12px] text-white/40">📝 {rawResult.notes}</p>
                            </div>
                        )}

                        {/* Items matcheados */}
                        {matchedItems.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                                    <label className="font-['koulen'] text-[12px] text-white/30 tracking-wider">
                                        PRODUCTOS IDENTIFICADOS ({confirmedCount}/{matchedItems.length} seleccionados)
                                    </label>
                                </div>

                                {matchedItems.map((item, idx) => (
                                    <div key={idx} className={`flex flex-col gap-2.5 rounded-xl p-3 border transition-all
                                        ${item.confirmed
                                            ? "bg-green-500/5 border-green-500/20"
                                            : "bg-white/[0.02] border-white/8 opacity-50"}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => toggleConfirmed(idx)}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                                                    ${item.confirmed ? "bg-green-500 border-green-500" : "border-white/20"}`}
                                            >
                                                {item.confirmed && (
                                                    <span className="font-['koulen'] text-[11px] text-white leading-none">✓</span>
                                                )}
                                            </button>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="font-['koulen'] text-[14px] text-white">
                                                    {item.productName} — {item.variantName}
                                                </span>
                                                <span className="font-['koulen'] text-[11px] text-white/30 truncate">
                                                    En recibo: "{item.rawName}"
                                                </span>
                                            </div>
                                        </div>

                                        {item.confirmed && (
                                            <div className="flex gap-2 pl-7">
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <label className="font-['koulen'] text-[10px] text-white/30">CANTIDAD</label>
                                                    <input
                                                        type="number" min="1"
                                                        value={item.quantity}
                                                        onChange={e => updateMatched(idx, "quantity", Number(e.target.value))}
                                                        className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[36px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 w-full"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <label className="font-['koulen'] text-[10px] text-white/30">PRECIO UNIT.</label>
                                                    <input
                                                        type="number" min="0"
                                                        value={item.unitPrice}
                                                        onChange={e => updateMatched(idx, "unitPrice", Number(e.target.value))}
                                                        className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[36px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 w-full"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1 justify-end items-end shrink-0">
                                                    <label className="font-['koulen'] text-[10px] text-white/30">SUBTOTAL</label>
                                                    <span className="font-['koulen'] text-[14px] text-white/60 h-[36px] flex items-center">
                                                        {item.quantity && item.unitPrice
                                                            ? fmt(Number(item.quantity) * Number(item.unitPrice))
                                                            : "—"}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Items sin match */}
                        {unmatchedItems.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                    <label className="font-['koulen'] text-[12px] text-white/30 tracking-wider">
                                        NO IDENTIFICADOS — cargar manualmente ({unmatchedItems.length})
                                    </label>
                                </div>
                                {unmatchedItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-2.5">
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="font-['koulen'] text-[13px] text-amber-400/80 truncate">
                                                "{item.rawName}"
                                            </span>
                                            <span className="font-['koulen'] text-[11px] text-white/20">{item.reason}</span>
                                        </div>
                                        <div className="flex gap-3 shrink-0">
                                            {item.quantity > 0 && (
                                                <span className="font-['koulen'] text-[12px] text-white/30">x{item.quantity}</span>
                                            )}
                                            {item.unitPrice > 0 && (
                                                <span className="font-['koulen'] text-[12px] text-white/30">{fmt(item.unitPrice)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Sin resultados */}
                        {matchedItems.length === 0 && unmatchedItems.length === 0 && (
                            <div className="text-center py-6">
                                <p className="font-['koulen'] text-[15px] text-white/30">
                                    No se detectaron productos en el recibo.
                                </p>
                                <p className="font-['koulen'] text-[12px] text-white/20 mt-1">
                                    Intentá con una imagen más clara o con mejor iluminación.
                                </p>
                            </div>
                        )}

                        {/* Total a cargar */}
                        {confirmedCount > 0 && (
                            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                                <span className="font-['koulen'] text-[14px] text-white/50">
                                    {confirmedCount} ITEM{confirmedCount !== 1 ? "S" : ""} A CARGAR
                                </span>
                                <span className="font-['koulen'] text-[20px] text-[#00FF1E]">
                                    {fmt(confirmedTotal)}
                                </span>
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                            <button
                                onClick={resetScanner}
                                className="font-['koulen'] text-[13px] text-white/30 hover:text-white transition-colors"
                            >
                                ← Escanear otro recibo
                            </button>
                            <div className="flex gap-2">
                                <Btn color="ghost" onClick={onClose}>CANCELAR</Btn>
                                <Btn
                                    color="green"
                                    onClick={handleConfirm}
                                    disabled={confirmedCount === 0}
                                >
                                    CARGAR {confirmedCount > 0 ? `${confirmedCount} ITEM${confirmedCount !== 1 ? "S" : ""}` : ""}
                                </Btn>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Modal nueva compra ───────────────────────────────────────────────────────
const NuevaCompraModal = ({ rubro, products, suppliers, onClose, onSaved, onNewSupplier }) => {
    const [supplierId, setSupplierId] = useState("")
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showScanner, setShowScanner] = useState(false)

    // TC global para compras de vapes (por factura)
    const [exchangeRate, setExchangeRate] = useState("")

    const [showNewSupplier, setShowNewSupplier] = useState(false)
    const [newSupplierName, setNewSupplierName] = useState("")
    const [newSupplierPhone, setNewSupplierPhone] = useState("")
    const [savingSupplier, setSavingSupplier] = useState(false)

    const isVapes = rubro === "vapes"

    const allVariants = products.flatMap(p =>
        p.variants.filter(v => v.isActive).map(v => ({
            variantId: v.id,
            productName: p.name,
            variantName: v.name,
            lastPrice: v.lastPurchasePrice,
            lastPriceUsd: v.lastPriceUsd,
        }))
    )

    const addItem = () => {
        setItems(prev => [...prev, { variantId: "", productName: "", variantName: "", quantity: 1, unitPrice: "", priceUsd: "" }])
    }

    const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))

    const updateVariant = (i, variantId) => {
        const found = allVariants.find(v => v.variantId === Number(variantId))
        const tc = Number(exchangeRate) || 0
        const usd = found?.lastPriceUsd ?? ""
        const ars = usd && tc > 0 ? String(Math.round(Number(usd) * tc)) : (found?.lastPrice != null ? String(found.lastPrice) : "")
        setItems(prev => prev.map((item, idx) => idx !== i ? item : {
            ...item,
            variantId: Number(variantId),
            productName: found?.productName ?? "",
            variantName: found?.variantName ?? "",
            priceUsd: usd ? String(usd) : "",
            unitPrice: ars
        }))
    }

    const updateItem = (i, field, value) =>
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

    // Cuando cambia USD de un item, recalcula ARS si hay TC
    const updateItemUsd = (i, usdValue) => {
        const tc = Number(exchangeRate) || 0
        const ars = tc > 0 && usdValue !== "" ? String(Math.round(Number(usdValue) * tc)) : ""
        setItems(prev => prev.map((item, idx) => idx !== i ? item : {
            ...item,
            priceUsd: usdValue,
            unitPrice: ars || item.unitPrice
        }))
    }

    // Cuando cambia TC, recalcula ARS de todos los items con USD
    const handleExchangeRateChange = (val) => {
        setExchangeRate(val)
        const tc = Number(val) || 0
        if (tc > 0) {
            setItems(prev => prev.map(item =>
                item.priceUsd ? { ...item, unitPrice: String(Math.round(Number(item.priceUsd) * tc)) } : item
            ))
        }
    }

    const total = items.reduce((acc, i) => {
        const q = Number(i.quantity) || 0
        const p = Number(i.unitPrice) || 0
        return acc + q * p
    }, 0)

    const handleSaveSupplier = async () => {
        if (!newSupplierName) return
        setSavingSupplier(true)
        try {
            const res = await api.post('/admin/suppliers', { name: newSupplierName, phone: newSupplierPhone }, authHeaders())
            await onNewSupplier()
            setSupplierId(String(res.data.id))
            setShowNewSupplier(false)
            setNewSupplierName("")
            setNewSupplierPhone("")
        } catch (e) {
            setError("Error al crear proveedor")
        } finally { setSavingSupplier(false) }
    }

    const handleSave = async () => {
        if (items.length === 0) { setError("Agregá al menos un item"); return }
        if (items.some(i => !i.variantId || !i.quantity || !i.unitPrice))
            { setError("Completá todos los campos de cada item"); return }
        setLoading(true); setError("")
        try {
            await api.post('/admin/purchases', {
                supplierId: supplierId || null,
                rubro,
                items: items.map(i => ({
                    variantId: i.variantId,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    priceUsd: i.priceUsd ? Number(i.priceUsd) : null,
                    exchangeRate: isVapes && exchangeRate ? Number(exchangeRate) : null,
                }))
            }, authHeaders())
            onSaved()
        } catch (e) {
            setError(e.response?.data?.error || "Error al registrar compra")
        } finally { setLoading(false) }
    }

    const handleScannedItems = (scannedItems) => {
        const newItems = scannedItems.map(si => ({
            variantId: si.variantId,
            productName: si.productName,
            variantName: si.variantName,
            quantity: si.quantity,
            unitPrice: String(si.unitPrice || ""),
            priceUsd: "",
        }))
        setItems(prev => [...prev, ...newItems])
    }

    return (
        <>
            <Modal title="NUEVA COMPRA" onClose={onClose} wide>

                {/* Banner scanner */}
                <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl px-4 py-3">
                    <div className="flex flex-col flex-1 min-w-0">
                        <p className="font-['koulen'] text-[14px] text-amber-400">CARGA AUTOMÁTICA CON IA</p>
                        <p className="font-['koulen'] text-[11px] text-white/30">
                            Gemini lee el recibo y pre-carga los productos
                        </p>
                    </div>
                    <Btn small color="amber" onClick={() => setShowScanner(true)}>
                        📄 ESCANEAR RECIBO
                    </Btn>
                </div>

                {/* Tipo de cambio — solo vapes */}
                {isVapes && (
                    <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-2xl px-4 py-3">
                        <div className="flex flex-col flex-1 min-w-0">
                            <p className="font-['koulen'] text-[13px] text-green-400">TIPO DE CAMBIO (para esta factura)</p>
                            <p className="font-['koulen'] text-[11px] text-white/30">
                                Al cargar el TC, el precio ARS se calcula solo desde USD
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="font-['koulen'] text-[13px] text-white/40">$</span>
                            <input
                                type="number" min="0"
                                value={exchangeRate}
                                onChange={e => handleExchangeRateChange(e.target.value)}
                                placeholder="1200"
                                className="bg-[#1E1E2E] border border-green-500/30 rounded-xl h-[38px] px-3 font-['koulen'] text-[16px] text-white outline-none focus:border-green-500/60 w-[110px]"
                            />
                        </div>
                    </div>
                )}

                {/* Separador si ya hay items */}
                {items.length > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 border-b border-white/10" />
                        <span className="font-['koulen'] text-[11px] text-white/20 shrink-0">
                            {items.length} ITEM{items.length !== 1 ? "S" : ""}
                        </span>
                        <div className="flex-1 border-b border-white/10" />
                    </div>
                )}

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

                {/* Items */}
                <div className="flex flex-col gap-3">
                    <label className="font-['koulen'] text-[12px] text-white/40 tracking-wider">PRODUCTOS</label>

                    {items.length === 0 && (
                        <p className="font-['koulen'] text-[14px] text-white/20 text-center py-3">
                            Escaneá un recibo o agregá manualmente
                        </p>
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
                                <div className="flex flex-col gap-1" style={{minWidth:'70px', flex:1}}>
                                    <label className="font-['koulen'] text-[11px] text-white/30">CANTIDAD</label>
                                    <input type="number" min="1" value={item.quantity}
                                        onChange={e => updateItem(i, 'quantity', e.target.value)}
                                        className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 w-full" />
                                </div>
                                {isVapes && (
                                    <div className="flex flex-col gap-1" style={{minWidth:'80px', flex:1}}>
                                        <label className="font-['koulen'] text-[11px] text-green-400/70">USD</label>
                                        <input type="number" min="0" value={item.priceUsd}
                                            onChange={e => updateItemUsd(i, e.target.value)}
                                            placeholder="0"
                                            className="bg-[#1E1E2E] border border-green-500/30 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-green-400 outline-none focus:border-green-500/60 w-full" />
                                    </div>
                                )}
                                <div className="flex flex-col gap-1" style={{minWidth:'90px', flex:1}}>
                                    <label className="font-['koulen'] text-[11px] text-white/30">
                                        {isVapes ? "ARS (auto)" : "PRECIO UNIT."}
                                    </label>
                                    <input type="number" min="0" value={item.unitPrice}
                                        onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                                        className="bg-[#1E1E2E] border border-white/10 rounded-xl h-[38px] px-3 font-['koulen'] text-[14px] text-white outline-none focus:border-[#C32CFF]/60 w-full" />
                                </div>
                                <div className="flex flex-col gap-1 items-end justify-end shrink-0">
                                    <label className="font-['koulen'] text-[11px] text-white/30">SUBTOTAL</label>
                                    <span className="font-['koulen'] text-[15px] text-white/70 h-[38px] flex items-center">
                                        {item.quantity && item.unitPrice
                                            ? fmt(Number(item.quantity) * Number(item.unitPrice))
                                            : "—"}
                                    </span>
                                </div>
                                <button onClick={() => removeItem(i)}
                                    className="font-['koulen'] text-[16px] text-red-400 hover:text-red-300 self-end h-[38px] px-1">✕</button>
                            </div>
                        </div>
                    ))}

                    <Btn small color="ghost" onClick={addItem}>+ AGREGAR MANUALMENTE</Btn>
                </div>

                {/* Total */}
                {items.length > 0 && (
                    <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                        <span className="font-['koulen'] text-[16px] text-white/50">TOTAL COMPRA</span>
                        <span className="font-['koulen'] text-[22px] text-[#00FF1E]">{fmt(total)}</span>
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

            {showScanner && (
                <ReciboScanner
                    products={products}
                    onItemsDetected={handleScannedItems}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </>
    )
}

// ─── Fila de lote ─────────────────────────────────────────────────────────────
const LotRow = ({ lot }) => (
    <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] rounded-lg">
        <span className="font-['koulen'] text-[12px] text-white/30">{fmtDate(lot.createdAt)}</span>
        <div className="flex items-center gap-4">
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
                    <span className="font-['koulen'] text-[15px]">{variant.name}</span>
                    {!variant.isActive && (
                        <span className="font-['koulen'] text-[11px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">INACTIVA</span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-['koulen'] text-[10px] text-white/30">ÚLT. COMPRA</p>
                        <p className="font-['koulen'] text-[13px] text-white/60">{fmt(variant.lastPurchasePrice)}</p>
                    </div>
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
                                <ProductRow key={p.id} product={p}
                                    onAjuste={(v) => handleAjuste(v, p.name)} />
                            ))}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <p className="font-['koulen'] text-white/20 text-center py-10 tracking-widest">SIN PRODUCTOS</p>
                    )}
                </div>
            )}

            {ajusteVariant && (
                <AjusteModal
                    variant={ajusteVariant}
                    productName={ajusteProductName}
                    onClose={() => setAjusteVariant(null)}
                    onSaved={() => { setAjusteVariant(null); fetchData() }}
                />
            )}

            {showCompra && (
                <NuevaCompraModal
                    rubro={rubro}
                    products={products}
                    suppliers={suppliers}
                    onNewSupplier={fetchSuppliers}
                    onClose={() => setShowCompra(false)}
                    onSaved={() => { setShowCompra(false); fetchData() }}
                />
            )}
        </div>
    )
}

export default AdminStock