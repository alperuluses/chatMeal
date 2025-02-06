const db = require('../config/db');

class Channel {
    static create(name, serverId, type, callback) {
        const query = "INSERT INTO channels (name, server_id,type) VALUES (?, ?, ?)";
        db.query(query, [name, serverId, type], callback);
    }

    static getByServerId(serverId, callback) {
        const query = "SELECT * FROM channels WHERE server_id = ?";
        db.query(query, [serverId], callback);
    }

    static getAll(callback) {
        const query = "SELECT * FROM channels";
        db.query(query, callback);
    }
}

module.exports = Channel;
