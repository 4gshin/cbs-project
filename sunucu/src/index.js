// Sunucunun giriş noktası
const express = require('express');
const cors = require('cors');
const nesnelerRotasi = require('./rotalar/nesneler');
require('dotenv').config();

const uygulama = express();
const PORT = process.env.PORT || 5000;

uygulama.use(cors());
uygulama.use(express.json());

// Test amaçlı basit bir uç nokta
uygulama.get('/api/durum', (istek, yanit) => {
  yanit.json({ mesaj: 'Sunucu çalışıyor', zaman: new Date() });
});

// Nesneler (Nokta, Cizgi, Poligon) CRUD rotalari
uygulama.use('/api/nesneler', nesnelerRotasi);

uygulama.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});