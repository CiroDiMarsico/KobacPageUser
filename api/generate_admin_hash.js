// Correr con: node generate_admin_hash.js

const bcrypt = require('bcryptjs')

const username = 'a'
const password = 'a'

bcrypt.hash(password, 10).then(hash => {
    console.log('\n✅ Ejecutá este INSERT en tu base de datos:\n')
    console.log(`INSERT INTO admins (username, password_hash) VALUES ('${username}', '${hash}');\n`)
})
