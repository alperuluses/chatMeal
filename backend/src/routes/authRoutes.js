const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

// Kayıt Ol
router.post('/register', register);

// Giriş Yap
router.post('/login', login);

module.exports = router;
