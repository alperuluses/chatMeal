const http = require('http');
const { initializeSocket } = require('./services/socketService');
const dotenv = require('dotenv');

dotenv.config();

// Create HTTP server
const server = http.createServer();
initializeSocket(server);

// Get port from environment variable for Railway deployment
const SOCKET_PORT = process.env.PORT || 3001;

// Start the server on the designated port
server.listen(SOCKET_PORT, () => {
    console.log(`Socket.io running on port ${SOCKET_PORT}`);
});
