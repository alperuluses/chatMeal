const express = require('express');
const jwt = require('jsonwebtoken');
const Server = require('../models/Server');
const { authenticateToken } = require('../middleware/authMiddleware');
const { create, getUsersSever, getAllServers } = require('../controllers/serverController');

const router = express.Router();


// Server oluşturma
router.post('/create', authenticateToken, create);



// Kullanıcıya ait serverları almak
router.get('/', authenticateToken, getUsersSever);


// Tüm serverları almak
router.get('/all',authenticateToken, getAllServers);

module.exports = router;
