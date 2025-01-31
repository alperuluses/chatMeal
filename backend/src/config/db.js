const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chatAru'
});

connection.connect((err) => {
    if (err) throw err;
    console.log("MySQL bağlantısı başarılı!");
});

module.exports = connection;
