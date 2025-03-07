const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const MessageModel = require("../models/Message");
let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      pingTimeout: 90000, // 20 saniye içinde cevap almazsa bağlantıyı koparır
      pingInterval: 10000, // Her 10 saniyede bir ping gönderir
    },
  });

  io.of(/^\/server\d+$/).on("connection", (socket) => {
    const nameSpaceName = socket.nsp.name; // Bağlanan namespace (örn: /server1)
    const namespace = socket.nsp; // Namespace nesnesi
    if (!namespace.hasOwnProperty("initialized") || !namespace.initialized) {
      namespace.initialized = true;
      namespace.usersInRooms = {};
      namespace.users = {}; // Kullanıcı bilgilerini saklamak için global bir nesne
      namespace.rooms = {}; // Odaları saklamak için obje
      console.log("Namespace oluşturuldu:", nameSpaceName);
    }
    console.log(`[${nameSpaceName}] Kullanıcı bağlandı:`, socket.id);
    console.log("Kullanıcı katıldı:", socket.id);

    // JWT doğrulama
    socket.on("authenticate", (token) => {
      jwt.verify(
        token,
        process.env.JWT_SECRET || "chatAruSecret",
        (err, user) => {
          if (err) {
            socket.emit("authError", "Geçersiz token");
            socket.disconnect();
          } else {
            console.log("Kimlik doğrulandı:", user.username);

            socket.user = user; // Socket nesnesine kullanıcı bilgisini ekle
            namespace.users[socket.id] = user; // Kullanıcıyı global nesnede sakla
            socket.emit("authSuccess", "Kimlik doğrulandı");
          }
        }
      );
    });

    socket.on("heartbeat", (user) => {
      console.log(`Heartbeat alındı: ${socket.id}-${user.username}`);
    });

    function leavePreviousChannel(previousChannelId) {
      if (previousChannelId) {
        socket.leave(previousChannelId);
      }
    }

    function updateActiveUserWithRoom(roomId, previousChannelId,peerId) {
      if (!namespace.usersInRooms[roomId]) {
        namespace.usersInRooms[roomId] = [];
      }

      console.log("Önceki odanın idsi:", previousChannelId);
      console.log("Update user:", namespace.usersInRooms[previousChannelId], peerId);

      if (previousChannelId && namespace.usersInRooms[previousChannelId]) {
        namespace.usersInRooms[previousChannelId] = namespace.usersInRooms[
          previousChannelId
        ].filter((user) => user.name !== socket.user.username);
      }

      //Kullanıyı gireceği odaya ekleme
      namespace.usersInRooms[roomId].push({name:socket.user.username,peerId:peerId});
      namespace.usersInRooms[roomId] = Array.from(new Set(namespace.usersInRooms[roomId]));

      // Odadaki kullanıcı listesini güncelleyin ve herkese gönderin
      socket.nsp.emit("updateUserList", namespace.usersInRooms);
    }

    // Odaya giriş
    socket.on("joinChannel", (roomId, previousChannelId, userId) => {
      console.log("Odaya katılma isteği:", roomId);

      if (socket.user) {
        //Leave previous channel if its exist
        leavePreviousChannel(previousChannelId);

        updateActiveUserWithRoom(roomId, previousChannelId);

        socket.join(roomId);
        console.log(
          `${
            socket.user.username
          } odasına katıldı: ${roomId} - ${typeof roomId}`
        );
        socket.emit("roomJoined", `Odaya katıldınız: ${roomId}`);
        if (userId) {
          socket.to(roomId).emit("user-connected", userId);
        }
      }
    });

    // Ses odasına giriş
    socket.on("joinVoiceChannel", (roomId, previousChannelId, userId) => {
      console.log("Ses Odasına katılma isteği:", roomId);

      if (socket.user.username && userId) {
        //Leave previous channel if its exist
        leavePreviousChannel(previousChannelId);

        updateActiveUserWithRoom(roomId, previousChannelId,userId);

        socket.join(roomId);
        console.log(
          `${
            socket.user.username
          } odasına katıldı: ${roomId} - ${typeof roomId}`
        );
        socket.to(roomId).emit("user-connected", userId, socket.user.username);
      } else {
        console.error("Socket user veya userId yok:", [
          socket.user.username,
          userId,
        ]);
      }
    });

    socket.on("emitUserList", () => {
      console.log("emitUserList",namespace.usersInRooms);

      socket.nsp.emit("updateUserList", namespace.usersInRooms);
    });

    socket.on("sendMessage", async (messageData) => {
      console.log("Mesaj gönderildi:", messageData);

      if (socket.user && messageData.roomId) {
        const { roomId, message } = messageData;
        const userId = socket.user.id;

        try {
          // Mesaj nesnesi oluştur
          const newMessage = new MessageModel(roomId, userId, message);
          const messageId = await newMessage.save((...args) => {
            console.log("Mesaj veritabanına kaydedildi", args);
          });

          console.log("Mesaj veritabanına kaydedildi, ID:", messageId);

          socket.nsp.to(roomId).emit("receiveMessage", {
            username: socket.user.username,
            message,
          });
        } catch (err) {
          console.error("Mesaj kaydedilirken hata oluştu:", err);
          socket.emit("error", "Mesaj kaydedilemedi.");
        }
      } else {
        socket.emit("error", "Odaya katılmadınız.");
      }
    });

    socket.on("user-speaking", (data) => {
      // Örneğin: { userId: "123", channelId: "abc", isSpeaking: true }
      console.log("user-speak:", data);

      socket.nsp.to(data.channelId).emit("update-speaking-status", data);
    });

    socket.on("user-destroyed", (roomId, peerId) => {
      socket.nsp.to(roomId).emit("user-destroyed", peerId);
      console.log("user-destroyed", `${peerId} - ${roomId}`);
    });

    socket.on("disconnect", (reason) => {
      const user = namespace.users[socket.id]; // Kullanıcı bilgisini al
      let disconnectReason = "";
      if (reason === "io client disconnect") {
        disconnectReason = "Kullanıcı kendi isteğiyle çıktı.";
      } else if (reason === "ping timeout") {
        disconnectReason = "Kullanıcı bağlantı sorunu yaşadı.";
      } else if (reason === "transport close") {
        disconnectReason = "Tarayıcı kapandı veya ağ bağlantısı kesildi.";
      }

      if (user) {
        console.log(`Kullanıcı ayrıldı: ${user.username}`);

        // Kullanıcının bulunduğu odayı bul
        for (const roomId in namespace.usersInRooms) {
          console.log("Kullanıcı odalarda aranıyor:", namespace.usersInRooms, user.username);
          if (namespace.usersInRooms[roomId].some(room => room.name === user.username)) {
            console.log(
              `Kullanıcı ${user.username}, ${roomId} odasından ayrıldı. Sebep: ${disconnectReason}`
            );

            // Kullanıcıyı odadan çıkar
            namespace.usersInRooms[roomId] = namespace.usersInRooms[roomId].filter(
              (u) => u.name !== user.username
            );

            // Kullanıcı listesini güncelle
            socket.nsp.emit("updateUserList", namespace.usersInRooms);
          }
        }

        delete namespace.users[socket.id]; // Kullanıcıyı global nesneden kaldır
      } else {
        console.log(`Bilinmeyen kullanıcı ayrıldı: ${socket.id}`);
      }
    });
  });

  return io;
};

module.exports = { initializeSocket, io };
