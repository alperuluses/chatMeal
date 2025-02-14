const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const serverRoutes = require('./routes/serverRoutes');
const channelRoutes = require('./routes/channelRoutes');
const messagesRoutes = require('./routes/messagesRoutes');


dotenv.config();

const app = express();

const corsOptions = {
    origin: ['https://chatmeal.netlify.app', 'http://localhost:8080',"http://192.168.1.21:8080","https://chat-meal.vercel.app"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  };
  
app.use(cors(corsOptions));

app.use(express.json());

// Healthcheck Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Kullanıcı API
app.use('/api/auth', authRoutes);

// Server API

app.use('/api/server', serverRoutes);

// Kanal API
app.use('/api/channels',channelRoutes); 

// Mesaj API
app.use('/api/messages', messagesRoutes);

const PORT =  3000;
app.listen(PORT, () => {
    console.log(`Express API ${PORT} portunda çalışıyor`);
});
