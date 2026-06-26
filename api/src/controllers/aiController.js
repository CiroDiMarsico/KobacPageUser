// api/src/controllers/aiController.js

const GEMINI_BASE = 'https://generativelanguage.googleapis.com'

// Sube el archivo a la Files API de Gemini y devuelve el fileUri
const uploadToGeminiFiles = async (base64, mimeType, apiKey) => {
    const buffer = Buffer.from(base64, 'base64')
    const numBytes = buffer.length

    // 1. Iniciar upload resumable
    const startRes = await fetch(
        `${GEMINI_BASE}/upload/v1beta/files?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': String(numBytes),
                'X-Goog-Upload-Header-Content-Type': mimeType,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file: { display_name: 'recibo' } })
        }
    )

    if (!startRes.ok) {
        const err = await startRes.text()
        throw new Error(`Error iniciando upload: ${err}`)
    }

    const uploadUrl = startRes.headers.get('x-goog-upload-url')
    if (!uploadUrl) throw new Error('No se recibió URL de upload de Gemini Files API')

    // 2. Subir el contenido
    const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Content-Length': String(numBytes),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize',
            'Content-Type': mimeType,
        },
        body: buffer
    })

    if (!uploadRes.ok) {
        const err = await uploadRes.text()
        throw new Error(`Error subiendo archivo: ${err}`)
    }

    const fileData = await uploadRes.json()
    const fileUri = fileData?.file?.uri
    if (!fileUri) throw new Error('Gemini Files API no devolvió URI del archivo')

    return { fileUri, mimeType }
}

// Extrae el primer bloque JSON del texto, aunque venga con markdown o texto extra
const extractJSON = (text) => {
    // Intentar parse directo primero
    try {
        return JSON.parse(text.trim())
    } catch {}

    // Sacar bloques ```json ... ``` o ``` ... ```
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
        try { return JSON.parse(fenceMatch[1].trim()) } catch {}
    }

    // Buscar el primer { ... } balanceado
    const start = text.indexOf('{')
    if (start === -1) return null

    let depth = 0
    for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++
        else if (text[i] === '}') {
            depth--
            if (depth === 0) {
                try { return JSON.parse(text.slice(start, i + 1)) } catch {}
            }
        }
    }

    return null
}

const scanReceipt = async (req, res) => {
    try {
        const { base64, mimeType, productList } = req.body

        if (!base64 || !mimeType) {
            return res.status(400).json({ error: 'Se requiere base64 y mimeType' })
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' })
        }

        const isPDF = mimeType === 'application/pdf'

        const prompt = `Sos un asistente de gestión de stock. Analizá este recibo/factura de compra mayorista y extraé los productos comprados.

Mis productos disponibles en el sistema son:
${productList || 'No se especificaron productos'}

Para cada producto que encuentres en el recibo:
1. Identificá el nombre del producto y su variante/sabor/presentación
2. Extraé la cantidad comprada
3. Extraé el precio unitario de compra (no el total de la línea)
4. Intentá hacer match con los productos de mi lista

Respondé ÚNICAMENTE con el siguiente JSON, sin ningún texto antes ni después, sin markdown, sin backticks:
{"items":[{"rawName":"nombre en el recibo","matchedProduct":"nombre de mi lista o null","matchedVariant":"variante o null","quantity":1,"unitPrice":0}],"notes":"observaciones"}`

        // Construir la parte del archivo según tipo
        let filePart
        if (isPDF) {
            // PDFs requieren Files API
            const { fileUri } = await uploadToGeminiFiles(base64, mimeType, apiKey)
            filePart = { file_data: { mime_type: mimeType, file_uri: fileUri } }
        } else {
            // Imágenes van directo como inline_data
            filePart = { inline_data: { mime_type: mimeType, data: base64 } }
        }

        const body = {
            contents: [{
                parts: [
                    filePart,
                    { text: prompt }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 4096,
                responseMimeType: 'application/json'  // fuerza respuesta JSON cuando es posible
            }
        }

        const geminiRes = await fetch(
            `${GEMINI_BASE}/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        )

        if (!geminiRes.ok) {
            const errData = await geminiRes.json().catch(() => ({}))
            console.error('Gemini error:', errData)
            return res.status(502).json({
                error: errData?.error?.message || `Error de Gemini: ${geminiRes.status}`
            })
        }

        const data = await geminiRes.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        console.log('Gemini raw response:', text.slice(0, 500))

        const parsed = extractJSON(text)

        if (!parsed || !Array.isArray(parsed.items)) {
            console.error('No se pudo parsear JSON. Respuesta completa:', text)
            return res.status(502).json({
                error: 'No se pudo interpretar la respuesta. Revisá que el PDF tenga texto seleccionable (no sea una foto escaneada borrosa).',
                raw: text.slice(0, 300)
            })
        }

        res.json(parsed)

    } catch (error) {
        console.error('Error en scanReceipt:', error)
        res.status(500).json({ error: error.message || 'Error al procesar el recibo' })
    }
}

module.exports = { scanReceipt }