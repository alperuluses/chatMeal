const express = require('express');
const jwt = require('jsonwebtoken');
const Server = require('../models/Server');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || "chatAruSecret";

// Server oluşturma
router.post('/create', (req, res) => {
    const { name } = req.body;
    const authHeader = req.headers['authorization'];
    console.log(authHeader);
    
    if (!authHeader) return res.status(401).json({ message: "Token bulunamadı" });

    const token = authHeader.split(' ')[1]; // "Bearer <token>"'i ayır

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error("Token doğrulama hatası:", err);
            return res.status(401).json({ message: "Geçersiz token" });
        }

        const userId = decoded.id;

        Server.create(name, userId, (err, newServer) => {
            if (err) return res.status(500).json({ message: "Server oluşturulamadı" });

            res.status(201).json({
                message: "Server başarıyla oluşturuldu",
                server: newServer
            });
        });
    });
});


// Kullanıcıya ait serverları almak
router.get('/', (req, res) => {
    const token = req.headers['authorization'];

    if (!token) return res.status(401).json({ message: "Token bulunamadı" });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Geçersiz token" });

        // Kullanıcı ID'si
        const userId = decoded.id;

        // Kullanıcının serverlarını al
        Server.getByUserId(userId, (err, servers) => {
            if (err) return res.status(500).json({ message: "Serverlar alınamadı" });

            res.status(200).json({
                servers
            });
        });
    });
});

// Tüm serverları almak
router.get('/all', (req, res) => {
    Server.getAll((err, servers) => {
        if (err) return res.status(500).json({ message: "Serverlar alınamadı" });

        res.status(200).json({
            servers
        });
    });
});

module.exports = router;
