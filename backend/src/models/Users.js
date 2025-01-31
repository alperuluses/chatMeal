const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    static register(username,email, password, callback) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return callback(err);
            const query = "INSERT INTO users (username,email, password) VALUES (?, ?, ?)";
            db.query(query, [username,email, hash], callback);
        });
    }

    static findByUsername(email, callback) {
        const query = "SELECT * FROM users WHERE email = ?";
        console.log(email);
        
        db.query(query, [email], (err, results) => {
            if (err) return callback(err);
            callback(null, results.length ? results[0] : null);
        });
    }
}

module.exports = User;
