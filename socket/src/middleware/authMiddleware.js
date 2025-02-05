const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || "chatAruSecret";

const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Yetkisiz erişim" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Geçersiz token" });
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };
