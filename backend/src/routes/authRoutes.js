const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/Users');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || "chatAruSecret";

// Kayıt Ol
router.post('/register', (req, res) => {
    const { username,email, password } = req.body;
    User.findByUsername(email, (err, user) => {
        if (user) return res.status(400).json({ message: "Kullanıcı zaten var" });

        User.register(username,email, password, (err, result) => {
            if (err) return res.status(500).json({ message: "Kayıt hatası" });
            res.status(201).json({ message: "Kayıt başarılı" });
        });
    });
});

// Giriş Yap
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log(req.body);
    
    User.findByUsername(email, (err, user) => {
        if (!user) return res.status(400).json({ message: "Kullanıcı bulunamadı" });

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (!isMatch) return res.status(400).json({ message: "Şifre yanlış" });

            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ token, username: user.username });
        });
    });
});

module.exports = router;
