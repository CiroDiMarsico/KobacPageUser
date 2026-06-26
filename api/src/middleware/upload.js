const multer = require('multer')
const path = require('path')
const fs = require('fs')

const createUpload = (folder) => {
    const uploadDir = path.join(__dirname, `../../public/${folder}`)
    
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir)
        },
        filename: (req, file, cb) => {
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

    return multer({
        storage,
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }
    })
}

module.exports = createUpload