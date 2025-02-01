const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const serverRoutes = require('./routes/serverRoutes');
const channelRoutes = require('./routes/channelRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Kullanıcı API
app.use('/api/auth', authRoutes);

// Server API

app.use('/api/server', serverRoutes);

// Kanal API
app.use('/api/channels',channelRoutes); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Express API ${PORT} portunda çalışıyor`);
});
