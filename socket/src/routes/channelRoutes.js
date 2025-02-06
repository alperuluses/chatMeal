const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const ChannelController = require('../controllers/channelController');

// 🔹 Yeni kanal oluştur
router.post('/create', authenticateToken, ChannelController.create);


// 🔹 Tüm kanalları al
router.get('/all', authenticateToken, ChannelController.getAll);

// 🔹 Belirli bir serverın kanallarını al
router.get('/:serverId', authenticateToken, ChannelController.getByServer);


module.exports = router;
