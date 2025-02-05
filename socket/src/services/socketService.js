const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const MessageModel = require('../models/Message');
let io;

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Kullanıcıların hangi odada olduğunu takip etmek için bir nesne kullanabilirsiniz.
    const usersInRooms = {};
    const users = {}; // Kullanıcı bilgilerini saklamak için global bir nesne
    io.on('connection', (socket) => {
        console.log('Kullanıcı katıldı:', socket.id);
        // JWT doğrulama
        socket.on('authenticate', (token) => {
            jwt.verify(token, process.env.JWT_SECRET || "chatAruSecret", (err, user) => {
                if (err) {
                    socket.emit('authError', "Geçersiz token");
                    socket.disconnect();
                } else {
                    socket.user = user; // Socket nesnesine kullanıcı bilgisini ekle
                    users[socket.id] = user; // Kullanıcıyı global nesnede sakla
                    socket.emit('authSuccess', "Kimlik doğrulandı");
                }
            });
        });

        // Odaya giriş
        socket.on('joinChannel', (roomId,previousChannelId) => {
            console.log('Odaya katılma isteği:', roomId);
            
            
            if (socket.user) {
                const rooms = Array.from(socket.rooms);
                rooms.forEach((room) => {
                    console.log('Odanın ayrılması:', room);
                    socket.leave(room);
                });

                if (!usersInRooms[roomId]) {
                    usersInRooms[roomId] = [];
                }
                console.log('Önceki odanın idsi:',previousChannelId);
                
                if(previousChannelId){
                    usersInRooms[previousChannelId] = usersInRooms[previousChannelId].filter(user => user !== socket.user.username);
                }

                usersInRooms[roomId].push(socket.user.username);
                usersInRooms[roomId] = Array.from(new Set(usersInRooms[roomId]));
                // Odadaki kullanıcı listesini güncelleyin ve herkese gönderin
                io.emit('updateUserList', usersInRooms);

                socket.join(roomId);
                console.log(`${socket.user.username} odasına katıldı: ${roomId}`);
                socket.emit('roomJoined', `Odaya katıldınız: ${roomId}`);
            }
        });

        socket.on('emitUserList', () => {
            console.log("emitUserList");
            
            io.emit('updateUserList', usersInRooms);
        })

        socket.on('sendMessage', async (messageData) => {
            console.log('Mesaj gönderildi:', messageData);
        
            if (socket.user && messageData.roomId) {
                const { roomId, message } = messageData;
                const userId = socket.user.id;
        
                try {
                    // Mesaj nesnesi oluştur
                    const newMessage = new MessageModel(roomId, userId, message);
                    const messageId = await newMessage.save((...args) => {
                        console.log('Mesaj veritabanına kaydedildi',args);
                    });
        
                    console.log('Mesaj veritabanına kaydedildi, ID:', messageId);
        
                    io.to(roomId).emit('receiveMessage', { 
                        username: socket.user.username, 
                        message 
                    });
                } catch (err) {
                    console.error('Mesaj kaydedilirken hata oluştu:', err);
                    socket.emit('error', 'Mesaj kaydedilemedi.');
                }
            } else {
                socket.emit('error', 'Odaya katılmadınız.');
            }
        });
        

        socket.on('disconnect', () => {
            const user = users[socket.id]; // Kullanıcı bilgisini al
    
            if (user) {
                console.log(`Kullanıcı ayrıldı: ${user.username}`);
    
                // Kullanıcının bulunduğu odayı bul
                for (const roomId in usersInRooms) {
                    if (usersInRooms[roomId].includes(user.username)) {
                        console.log(`Kullanıcı ${user.username}, ${roomId} odasından ayrıldı.`);
    
                        // Kullanıcıyı odadan çıkar
                        usersInRooms[roomId] = usersInRooms[roomId].filter(u => u !== user.username);
    
                        // Kullanıcı listesini güncelle
                        io.emit('updateUserList', usersInRooms);
                        break;
                    }
                }
    
                delete users[socket.id]; // Kullanıcıyı global nesneden kaldır
            } else {
                console.log(`Bilinmeyen kullanıcı ayrıldı: ${socket.id}`);
            }
        });
    });

    return io;
};

module.exports = { initializeSocket, io };
