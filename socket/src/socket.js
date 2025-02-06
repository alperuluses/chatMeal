const http = require('http');
const { initializeSocket } = require('./services/socketService');

const server = http.createServer();
initializeSocket(server);

const SOCKET_PORT =  3000;
server.listen(SOCKET_PORT, () => {
    console.log(`Socket.io ${SOCKET_PORT} portunda çalışıyor`);
});


