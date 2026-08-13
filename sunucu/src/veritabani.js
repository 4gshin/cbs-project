// Bu dosya PostgreSQL veritabanına bağlantıyı yönetir
const { Pool } = require('pg');
require('dotenv').config();

const havuz = new Pool({
  connectionString: process.env.VERITABANI_URL,
  // Render'da (production) SSL zorunlu, yerelde gerek yok
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

havuz.on('connect', () => {
  console.log('Veritabanına bağlanıldı');
});

module.exports = havuz;