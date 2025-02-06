const db = require('../config/db');

class Server {
    // Server oluşturma
    static create(name, owner_id, callback) {
        const createdAt = new Date();
        const query = "INSERT INTO servers (name, owner_id, created_at) VALUES (?, ?, ?)";
        
        db.query(query, [name, owner_id, createdAt], (err, result) => {
            if (err) return callback(err);
            callback(null, {
                id: result.insertId,
                name,
                owner_id,
                created_at: createdAt
            });
        });
    }

    // Server'ı ID'ye göre bulma
    static findById(id, callback) {
        const query = "SELECT * FROM servers WHERE id = ?";
        db.query(query, [id], (err, results) => {
            if (err) return callback(err);
            callback(null, results.length ? results[0] : null);
        });
    }

    // Tüm serverları almak
    static getAll(callback) {
        const query = "SELECT * FROM servers";
        db.query(query, (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        });
    }

    // Kullanıcıya ait serverları almak
    static getByUserId(userId, callback) {
        const query = "SELECT * FROM servers WHERE owner_id = ?";
        db.query(query, [userId], (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        });
    }
}

module.exports = Server;
