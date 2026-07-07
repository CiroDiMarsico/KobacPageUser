import { useState, useEffect, useRef, useCallback } from "react"

const AdminCalculadora = () => {
    const [visible, setVisible] = useState(false)
    const [expression, setExpression] = useState("") // expresion completa q se va armando
    const [result, setResult] = useState(null)       // resultado al apretar =


    // Drag
    const [pos, setPos] = useState({ x: null, y: null })
    const [dragging, setDragging] = useState(false)
    const dragOffset = useRef({ x: 0, y: 0 })
    const calcRef = useRef()

    const handleOpen = () => {
        if (!visible) {
            setPos({
                x: window.innerWidth / 2 - 136,
                y: window.innerHeight / 2 - 210
            })
        }
        setVisible(v => !v)
    }

    // ─── Drag mouse ───────────────────────────────────────────────────────────
    const onMouseDown = (e) => {
        if (e.target.closest('button')) return
        setDragging(true)
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
        e.preventDefault()
    }

    useEffect(() => {
        if (!dragging) return
        const onMove = (e) => {
            const maxX = window.innerWidth - (calcRef.current?.offsetWidth || 280)
            const maxY = window.innerHeight - (calcRef.current?.offsetHeight || 400)
            setPos({
                x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, maxX)),
                y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, maxY))
            })
        }
        const onUp = () => setDragging(false)
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [dragging])

    // ─── Drag touch ───────────────────────────────────────────────────────────
    const onTouchStart = (e) => {
        if (e.target.closest('button')) return
        const t = e.touches[0]
        setDragging(true)
        dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y }
    }
    useEffect(() => {
        if (!dragging) return
        const onMove = (e) => {
            const t = e.touches[0]
            const maxX = window.innerWidth - (calcRef.current?.offsetWidth || 280)
            const maxY = window.innerHeight - (calcRef.current?.offsetHeight || 400)
            setPos({
                x: Math.max(0, Math.min(t.clientX - dragOffset.current.x, maxX)),
                y: Math.max(0, Math.min(t.clientY - dragOffset.current.y, maxY))
            })
        }
        const onUp = () => setDragging(false)
        window.addEventListener('touchmove', onMove, { passive: false })
        window.addEventListener('touchend', onUp)
        return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp) }
    }, [dragging])

    // ─── Lógica de expresión ──────────────────────────────────────────────────
    // Evalúa respetando precedencia (* / antes que + -)
    const evalExpression = (expr) => {
        try {
            // Solo permite números, operadores, punto y paréntesis
            const sanitized = expr.replace(/[^0-9+\-*/().]/g, '')
            if (!sanitized) return null
            // eslint-disable-next-line no-new-func
            const res = Function('"use strict"; return (' + sanitized + ')')()
            if (!isFinite(res)) return "Error"
            const rounded = Math.round(res * 1e10) / 1e10
            return rounded
        } catch {
            return null
        }
    }

    const appendToExpr = useCallback((char) => {
        setResult(null)
        setExpression(prev => {
            // Si hay resultado previo y se aprieta un operador, continúa desde el resultado
            if (result !== null && ['+', '-', '*', '/'].includes(char)) {
                return String(result) + char
            }
            // Si hay resultado previo y se aprieta un número, empieza de nuevo
            if (result !== null && !isNaN(char)) {
                return char
            }
            return prev + char
        })
    }, [result])

    const handleEquals = useCallback(() => {
        const exprToEval = result !== null ? String(result) : expression
        if (!exprToEval) return
        const res = evalExpression(exprToEval)
        if (res !== null) {
            setResult(res)
            setExpression(exprToEval + " =")
        }
    }, [expression, result])

    const handleClear = useCallback(() => {
        setExpression("")
        setResult(null)
    }, [])

    const handleBackspace = useCallback(() => {
        setResult(null)
        setExpression(prev => prev.length > 0 ? prev.slice(0, -1) : "")
    }, [])

    const handlePercent = useCallback(() => {
        // aplica % al último número en la expresión
        setExpression(prev => {
            const match = prev.match(/(.*[+\-*/])?(-?\d+\.?\d*)$/)
            if (!match) return prev
            const num = parseFloat(match[2]) / 100
            return (match[1] || '') + num
        })
        setResult(null)
    }, [])

    const handleToggleSign = useCallback(() => {
        setExpression(prev => {
            const match = prev.match(/(.*[+\-*/])?(-?\d+\.?\d*)$/)
            if (!match) return prev
            const num = parseFloat(match[2]) * -1
            return (match[1] || '') + num
        })
        setResult(null)
    }, [])

    // ─── Teclado — activo siempre que la calc esté visible, salvo si hay input enfocado ──
    useEffect(() => {
        if (!visible) return
        const handleKey = (e) => {
            // No interferir cuando hay un input/textarea/select enfocado
            const active = document.activeElement
            const tag = active?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
            // No interferir si hay un modal/popover encima (elemento con role dialog)
            if (active?.closest('[role="dialog"]')) return

            if (e.key >= '0' && e.key <= '9') { appendToExpr(e.key); return }
            if (e.key === '.') { appendToExpr('.'); return }
            if (e.key === '+') { appendToExpr('+'); return }
            if (e.key === '-') { appendToExpr('-'); return }
            if (e.key === '*') { appendToExpr('*'); return }
            if (e.key === '/') { e.preventDefault(); appendToExpr('/'); return }
            if (e.key === '(' ) { appendToExpr('('); return }
            if (e.key === ')' ) { appendToExpr(')'); return }
            if (e.key === 'Enter' || e.key === '=') { handleEquals(); return }
            if (e.key === 'Escape') { handleClear(); return }
            if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return }
            if (e.key === '%') { handlePercent(); return }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [visible, appendToExpr, handleEquals, handleClear, handleBackspace, handlePercent])

    // ─── Display ──────────────────────────────────────────────────────────────
    // Muestra el resultado si existe, si no la expresión que se está armando
    const displayValue = result !== null
        ? String(result)
        : expression || "0"

    const displayMain = result !== null
        ? Number(result).toLocaleString("es-AR", { maximumFractionDigits: 8 })
        : expression || "0"

    const displaySub = result !== null
        ? expression
        : (() => {
            const r = evalExpression(expression)
            return r !== null && expression ? `= ${Number(r).toLocaleString("es-AR", { maximumFractionDigits: 8 })}` : ""
        })()

    // ─── Botones ───────────────────────────────────────────────────────────────
    const CalcBtn = ({ label, onClick, type = "number", wide = false }) => {
        const styles = {
            number:   "bg-white/10 hover:bg-white/15 text-white",
            operator: "bg-[#C32CFF]/80 hover:bg-[#C32CFF] text-white",
            function: "bg-white/[0.06] hover:bg-white/10 text-white/60",
            equals:   "bg-[#00FF1E]/80 hover:bg-[#00FF1E] text-black",
        }
        return (
            <button
                onMouseDown={e => e.stopPropagation()}
                onClick={onClick}
                className={`${styles[type]} ${wide ? "col-span-2" : ""} rounded-2xl font-['koulen'] text-[20px] h-[52px] transition-all active:scale-95 select-none`}
            >
                {label}
            </button>
        )
    }

    return (
        <>
            {/* Ícono en el aside */}
            <button
                onClick={handleOpen}
                title="Calculadora (activa teclado al hacer click)"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                    ${visible
                        ? "bg-[#C32CFF]/20 text-[#C32CFF]"
                        : "text-white/30 hover:text-white/60 hover:bg-white/5"}`}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2"/>
                    <line x1="8" y1="6" x2="16" y2="6"/>
                    <circle cx="8" cy="11" r="0.8" fill="currentColor"/>
                    <circle cx="12" cy="11" r="0.8" fill="currentColor"/>
                    <circle cx="16" cy="11" r="0.8" fill="currentColor"/>
                    <circle cx="8" cy="15" r="0.8" fill="currentColor"/>
                    <circle cx="12" cy="15" r="0.8" fill="currentColor"/>
                    <circle cx="16" cy="15" r="0.8" fill="currentColor"/>
                    <circle cx="8" cy="19" r="0.8" fill="currentColor"/>
                    <circle cx="12" cy="19" r="0.8" fill="currentColor"/>
                    <circle cx="16" cy="19" r="0.8" fill="currentColor"/>
                </svg>
            </button>

            {/* Calculadora flotante */}
            {visible && (
                <div
                    ref={calcRef}
                    style={{
                        position: 'fixed',
                        left: pos.x,
                        top: pos.y,
                        zIndex: 9999,
                        cursor: dragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                    }}
                    onMouseDown={onMouseDown}
                    onTouchStart={onTouchStart}
                    className={`w-[272px] bg-[#0A0A14] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden select-none transition-all
                        border border-white/10`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <span className="font-['koulen'] text-[12px] text-white/20 tracking-widest">CALC</span>
                        <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => setVisible(false)}
                            className="font-['koulen'] text-[15px] text-white/30 hover:text-[#C32CFF] transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Display */}
                    <div className="px-4 pb-2">
                        {/* Preview resultado o expresión anterior */}
                        <div className="h-[18px] flex items-center justify-end">
                            <span className="font-['koulen'] text-[12px] text-white/25 truncate max-w-full">
                                {displaySub}
                            </span>
                        </div>
                        {/* Expresión principal */}
                        <div className="min-h-[48px] flex items-end justify-end overflow-hidden">
                            <span className={`font-['koulen'] text-right leading-none break-all
                                ${result !== null ? "text-[#00FF1E]" : "text-white"}
                                ${displayMain.length > 14 ? "text-[22px]" : displayMain.length > 10 ? "text-[28px]" : "text-[38px]"}`}>
                                {displayMain}
                            </span>
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="grid grid-cols-4 gap-1.5 px-3 pb-4">
                        <CalcBtn label="AC"  onClick={handleClear}                    type="function" />
                        <CalcBtn label="+/-" onClick={handleToggleSign}               type="function" />
                        <CalcBtn label="%"   onClick={handlePercent}                  type="function" />
                        <CalcBtn label="÷"   onClick={() => appendToExpr('/')}        type="operator" />

                        <CalcBtn label="7"   onClick={() => appendToExpr('7')} />
                        <CalcBtn label="8"   onClick={() => appendToExpr('8')} />
                        <CalcBtn label="9"   onClick={() => appendToExpr('9')} />
                        <CalcBtn label="×"   onClick={() => appendToExpr('*')}        type="operator" />

                        <CalcBtn label="4"   onClick={() => appendToExpr('4')} />
                        <CalcBtn label="5"   onClick={() => appendToExpr('5')} />
                        <CalcBtn label="6"   onClick={() => appendToExpr('6')} />
                        <CalcBtn label="−"   onClick={() => appendToExpr('-')}        type="operator" />

                        <CalcBtn label="1"   onClick={() => appendToExpr('1')} />
                        <CalcBtn label="2"   onClick={() => appendToExpr('2')} />
                        <CalcBtn label="3"   onClick={() => appendToExpr('3')} />
                        <CalcBtn label="+"   onClick={() => appendToExpr('+')}        type="operator" />

                        <CalcBtn label="⌫"   onClick={handleBackspace}               type="function" />
                        <CalcBtn label="0"   onClick={() => appendToExpr('0')} />
                        <CalcBtn label="."   onClick={() => appendToExpr('.')} />
                        <CalcBtn label="="   onClick={handleEquals}                   type="equals" />
                    </div>
                </div>
            )}
        </>
    )
}

export default AdminCalculadora