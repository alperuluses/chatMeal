const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {

        // JWT doğrulama
        socket.on('authenticate', (token) => {
            jwt.verify(token, process.env.JWT_SECRET || "chatAruSecret", (err, user) => {
                if (err) {
                    socket.emit('authError', "Geçersiz token");
                    socket.disconnect();
                } else {
                    socket.user = user;
                    socket.emit('authSuccess', "Kimlik doğrulandı");
                }
            });
        });

        socket.on('sendMessage', (message) => {
            if (socket.user) {
                io.emit('receiveMessage', { username: socket.user.username, message });
            }
        });

        socket.on('disconnect', () => {
            console.log('Kullanıcı ayrıldı:', socket.id);
        });
    });

    return io;
};

module.exports = { initializeSocket, io };
