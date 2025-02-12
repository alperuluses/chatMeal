const db = require("../config/db");

class MessageModel {
    constructor(channelId, userId, content) {
        this.channelId = channelId;
        this.userId = userId;
        this.content = content;
    }

    // Yeni mesajı kaydet
    save(callback) {
        const sql = `INSERT INTO messages (channel_id, user_id, content, sent_at) VALUES (?, ?, ?, NOW())`;
        db.query(sql, [this.channelId, this.userId, this.content], (err, result) => {
            if (err) return callback(err, null);
            callback(null, result.insertId);
        });
    }

    // Belirli bir kanaldaki mesajları getir
    static getMessagesByChannel(channelId, callback) {
        const sql = `
            SELECT 
                messages.id, 
                messages.channel_id, 
                messages.user_id, 
                messages.content, 
                messages.sent_at, 
                users.username 
            FROM messages
            INNER JOIN users ON messages.user_id = users.id
            WHERE messages.channel_id = ?
            ORDER BY messages.sent_at ASC
            LIMIT 50
        `;

        db.query(sql, [channelId], (err, results) => {
            if (err) return callback(err, null);
            callback(null, results);
        });
    }
}

module.exports = MessageModel;
