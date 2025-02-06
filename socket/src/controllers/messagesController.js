const MessageModel = require("../models/Message");

// Belirli bir kanaldaki mesajları getir
exports.getMessagesByChannel = (req, res) => {
    const { channelId } = req.params;

    MessageModel.getMessagesByChannel(channelId, (err, messages) => {
        if (err) return res.status(500).json({ message: "Mesajlar alınamadı" });
        res.json(messages);
    });
};

// Yeni mesaj ekle
exports.addMessage = (req, res) => {
    const { channelId, userId, content } = req.body;

    if (!channelId || !userId || !content) {
        return res.status(400).json({ message: "Eksik veri gönderildi" });
    }

    const newMessage = new MessageModel(channelId, userId, content);
    newMessage.save((err, messageId) => {
        if (err) return res.status(500).json({ message: "Mesaj eklenemedi" });
        res.json({ success: true, messageId });
    });
};
