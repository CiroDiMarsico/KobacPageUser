import { useRef } from "react"

const fmt = (n) => `$${Number(n ?? 0).toLocaleString("es-AR")}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit"
}) : "—"

const STATUS_LABELS = {
    pending:   "PENDIENTE",
    paid:      "PAGADO",
    shipping:  "EN CAMINO",
    delivered: "ENTREGADO",
    cancelled: "CANCELADO",
}

const TicketVenta = ({ sale, onClose }) => {
    const printRef = useRef()

    const handlePrint = () => {
        const content = printRef.current.innerHTML
        const win = window.open("", "_blank", "width=400,height=600")
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Ticket #${sale.id}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        color: #000;
                        background: #fff;
                        width: 80mm;
                        padding: 8px;
                    }
                    .center  { text-align: center; }
                    .right   { text-align: right; }
                    .bold    { font-weight: bold; }
                    .large   { font-size: 16px; }
                    .xlarge  { font-size: 20px; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .divider-solid { border-top: 1px solid #000; margin: 6px 0; }
                    .row     { display: flex; justify-content: space-between; margin: 2px 0; }
                    .row-item { display: flex; justify-content: space-between; margin: 3px 0; }
                    .indent  { padding-left: 8px; }
                    .small   { font-size: 10px; }
                    .tag     { font-size: 10px; border: 1px solid #000; padding: 1px 4px; display: inline-block; }
                    @media print {
                        body { width: 80mm; }
                        @page { margin: 0; size: 80mm auto; }
                    }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `)
        win.document.close()
        win.focus()
        setTimeout(() => { win.print(); win.close() }, 300)
    }

    const totalItems = sale.total - sale.shippingPrice - sale.discountAmount

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
            <div className="bg-[#0A0A14] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-[420px] flex flex-col gap-4"
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between">
                    <h2 className="font-['koulen'] text-[20px] tracking-wider">TICKET #{sale.id}</h2>
                    <button onClick={onClose} className="font-['koulen'] text-[20px] text-[#C32CFF]">✕</button>
                </div>

                {/* Preview del ticket */}
                <div className="bg-white text-black rounded-xl p-4 font-mono text-[11px] max-h-[60vh] overflow-y-auto">
                    <div ref={printRef}>
                        {/* Encabezado */}
                        <div className="center bold xlarge">KOBAC {sale.isWholesale && "MAYORISTA"}</div>
                        <div className="divider" />

                        <div className="center bold large">TICKET #{sale.id}</div>
                        <div className="divider" />

                        {/* Cliente */}
                        {(sale.clientName || sale.clientPhone || sale.location) && (
                            <>
                                <div className="bold small">CLIENTE</div>
                                {sale.clientName  && <div>{sale.clientName}</div>}
                                {sale.clientPhone && <div className="small">{sale.clientPhone}</div>}
                                {sale.location    && <div className="small">{sale.location}</div>}
                                <div className="divider" />
                            </>
                        )}

                        {/* Items */}
                        <div className="bold small">PRODUCTOS</div>
                        {sale.items.map((item, i) => (
                            <div key={i} style={{marginBottom:"4px"}}>
                                <div className="row-item">
                                    <span style={{maxWidth:"60%"}}>
                                        {item.promoName
                                            ? `${item.promoName} — ${item.productName}`
                                            : `${item.productName}`}
                                    </span>
                                    <span>{fmt(item.unitPrice * item.quantity)}</span>
                                </div>
                                <div className="indent small" style={{color:"#555"}}>
                                    {item.variantName} x{item.quantity} @ {fmt(item.unitPrice)} {sale.isWholesale && `- ${(item.unitPrice / sale.exchangeRate).toFixed(2)}USD`}
                                </div>
                            </div>
                        ))}

                        <div className="divider" />

                        {/* Subtotales */}
                        <div className="row"><span>SUBTOTAL</span><span>{fmt(totalItems)}</span></div>
                        {sale.shippingPrice > 0 && (
                            <div className="row"><span>ENVÍO</span><span>{fmt(sale.shippingPrice)}</span></div>
                        )}
                        {sale.discountAmount > 0 && (
                            <div className="row"><span>DESCUENTO</span><span>-{fmt(sale.discountAmount)}</span></div>
                        )}
                        {sale.exchangeRate && (
                            <div className="row small" style={{color:"#555"}}>
                                <span>TIPO DE CAMBIO</span>
                                <span>{fmt(sale.exchangeRate)}</span>
                            </div>
                        )}

                        <div className="divider-solid" />
                        <div className="row bold large">
                            <span>TOTAL</span>
                            <span>{fmt(sale.total)} {sale.isWholesale && `- ${fmt(sale.total / sale.exchangeRate)}USD`}</span>
                        </div>
                        <div className="divider" />

                        {/* Pagos */}
                        <div className="bold small">PAGO</div>
                        {sale.payments.map((p, i) => (
                            <div key={i} className="row">
                                <span>{p.method === 'cash' ? 'Efectivo' : 'Transferencia'}</span>
                                <span>{fmt(p.amount)}</span>
                            </div>
                        ))}

                        {/* Tiempos */}
                        {(sale.departureAt || sale.arrivedAt) && (
                            <>
                                <div className="divider" />
                                {sale.departureAt && (
                                    <div className="row small">
                                        <span>SALIDA</span>
                                        <span>{fmtDate(sale.departureAt)}</span>
                                    </div>
                                )}
                                {sale.arrivedAt && (
                                    <div className="row small">
                                        <span>ENTREGA</span>
                                        <span>{fmtDate(sale.arrivedAt)}</span>
                                    </div>
                                )}
                            </>
                        )}
                       
                        <div className="divider" />
                        <div className="center small" style={{color:"#555"}}>
                            ¡Gracias por tu compra!
                        </div>
                        <div className="center small" style={{color:"#555"}}>
                            @kobac.delivery
                        </div>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 justify-end">
                    <button onClick={onClose}
                        className="font-['koulen'] text-[14px] tracking-wider px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all active:scale-95">
                        CERRAR
                    </button>
                    <button onClick={handlePrint}
                        className="font-['koulen'] text-[15px] tracking-wider px-5 py-2 rounded-xl bg-[#C32CFF] hover:bg-[#d444ff] text-white transition-all active:scale-95">
                        🖨️ IMPRIMIR / PDF
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TicketVenta
