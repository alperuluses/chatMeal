const db = require('../config/db');

class Channel {
    static create(name, serverId, callback) {
        const query = "INSERT INTO channels (name, server_id) VALUES (?, ?)";
        db.query(query, [name, serverId], callback);
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
