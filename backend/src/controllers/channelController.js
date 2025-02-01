const Channel = require('../models/Channels');

class ChannelController {
    static create(req, res) {
        let { name, serverId, type } = req.body;

        if (!name || !serverId) {
            return res.status(400).json({ message: "Kanal adı ve server ID gereklidir." });
        }

        if (!type) {
            type = "text";
        }

        Channel.create(name, serverId,type, (err, result) => {
            if (err) {
                console.error("Kanal oluşturma hatası:", err);
                return res.status(500).json({ message: "Kanal oluşturulamadı" });
            }

            res.status(201).json({
                message: "Kanal başarıyla oluşturuldu",
                channel: { id: result.insertId, name, serverId }
            });
        });
    }

    static getByServer(req, res) {
        const { serverId } = req.params;

        if (!serverId) {
            return res.status(400).json({ message: "Server ID gereklidir." });
        }
        
        Channel.getByServerId(serverId, (err, channels) => {
            if (err) {
                console.error("Kanallar alınamadı:", err);
                return res.status(500).json({ message: "Kanallar alınamadı" });
            }

            console.log("Kanallar getByServer:", channels);
            

            res.status(200).json({ channels });
        });
    }

    static getAll(req, res) {
        Channel.getAll((err, channels) => {
            if (err) {
                console.error("Tüm kanallar alınamadı:", err);
                return res.status(500).json({ message: "Tüm kanallar alınamadı" });
            }

            console.log("Kanallar getAll:", channels);
            

            res.status(200).json({ channels });
        });
    }
}

module.exports = ChannelController;
