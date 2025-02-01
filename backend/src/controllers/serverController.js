const Server = require("../models/Server");

exports.create = (req, res) => {
    const { name } = req.body;
    const userId = req.user.id; // Middleware sayesinde token doğrulandı ve kullanıcı bilgisi burada!

    Server.create(name, userId, (err, newServer) => {
        if (err) return res.status(500).json({ message: "Server oluşturulamadı" });

        res.status(201).json({
            message: "Server başarıyla oluşturuldu",
            server: newServer
        });
    });
}


exports.getUsersSever = (req, res) => {
    const userId = req.user.id; // Middleware sayesinde token doğrulandı ve kullanıcı bilgisi burada!

    Server.getByUserId(userId, (err, servers) => {
        if (err) return res.status(500).json({ message: "Serverlar alınamadı" });

        res.status(200).json({
            servers
        });
    });
}

exports.getAllServers = (req, res) => {
    Server.getAll((err, servers) => {
        if (err) return res.status(500).json({ message: "Serverlar alınamadı" });

        res.status(200).json({
            servers
        });
    });
}
