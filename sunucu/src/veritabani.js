// Bu dosya PostgreSQL veritabanına bağlantıyı yönetir
const { Pool } = require('pg');
require('dotenv').config();

const havuz = new Pool({
  connectionString: process.env.VERITABANI_URL,
});

havuz.on('connect', () => {
  console.log('Veritabanına bağlanıldı');
});

module.exports = havuz;