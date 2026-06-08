const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Crear carpeta si no existe
const uploadDir = path.join(__dirname, '../../public/product-images')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        // nombre único: timestamp + nombre original sin espacios
        const ext = path.extname(file.originalname)
        const base = path.basename(file.originalname, ext)
            .replace(/\s+/g, '-')
            .toLowerCase()
        cb(null, `${Date.now()}-${base}${ext}`)
    }
})

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB máximo
})

module.exports = upload
