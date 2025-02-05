const http = require('http');
const { initializeSocket } = require('./services/socketService');

const server = http.createServer();
initializeSocket(server);

const SOCKET_PORT = process.env.SOCKET_PORT || 3001;
server.listen(SOCKET_PORT, () => {
    console.log(`Socket.io ${SOCKET_PORT} portunda çalışıyor`);
});


