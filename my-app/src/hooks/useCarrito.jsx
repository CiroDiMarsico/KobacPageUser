// Carrito con expiración automática de 2 horas sin actividad

import { useState, useEffect } from "react"

const EXPIRATION_MS = 2 * 60 * 60 * 1000 // 2 horas

const carritoExpirado = (key) => {
    const tsRaw = localStorage.getItem(`${key}_ts`)
    if (!tsRaw) return true
    return Date.now() - Number(tsRaw) > EXPIRATION_MS
}

const leerCarrito = (key) => {
    if (carritoExpirado(key)) {
        localStorage.removeItem(key)
        localStorage.removeItem(`${key}_ts`)
        return []
    }
    try {
        return JSON.parse(localStorage.getItem(key) ?? "[]")
    } catch {
        return []
    }
}

const guardarCarrito = (key, carrito) => {
    localStorage.setItem(key, JSON.stringify(carrito))
    localStorage.setItem(`${key}_ts`, String(Date.now()))
}

export const useCarrito = (key = "carrito") => {
    const [carrito, setCarritoRaw] = useState(() => leerCarrito(key))

    // Persiste y actualiza timestamp en cada cambio
    useEffect(() => {
        guardarCarrito(key, carrito)
    }, [carrito, key])

    // Verifica expiración cada 5 minutos mientras la página está abierta
    useEffect(() => {
        const interval = setInterval(() => {
            if (carritoExpirado(key)) {
                setCarritoRaw([])
            }
        }, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [key])

    return [carrito, setCarritoRaw]
}