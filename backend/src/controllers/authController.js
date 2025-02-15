const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const bcrypt = require("bcryptjs");

const SECRET_KEY = process.env.JWT_SECRET || "chatAruSecret";
// Kullanıcı kaydı
exports.register = (req, res) => {
  const { username, email, password } = req.body;
  User.findByUsername(email, (err, user) => {
    if (user) return res.status(400).json({ message: "Kullanıcı zaten var" });

    User.register(username, email, password, (err, result) => {
      if (err) return res.status(500).json({ message: "Kayıt hatası" });
      res.status(201).json({ message: "Kayıt başarılı" });
    });
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  User.findByUsername(email, (err, user) => {
    if (err) {
      console.error("Veritabanı hatası:", err);
      return res.status(500).json({ message: "Bir hata oluştu." });
    }

    if (!user) {
      return res.status(400).json({ message: "Kullanıcı bulunamadı" });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (!isMatch) return res.status(400).json({ message: "Şifre yanlış" });

      const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET_KEY,
        { expiresIn: "24h" }
      );
      res.json({ token, username: user.username });
    });
  });
};
