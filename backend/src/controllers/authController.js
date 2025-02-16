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
      res.json({
        token,
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      });
    });
  });
};

exports.me = (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token bulunamadı" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Geçersiz token" });
    }

    User.findById(decoded.id, (err, user) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Veritabanı hatası", error: err });
      }

      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      });
    });
  });
};
