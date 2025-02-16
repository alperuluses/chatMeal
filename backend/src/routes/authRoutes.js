const express = require("express");
const { register, login, me } = require("../controllers/authController");

const router = express.Router();

// Kayıt Ol
router.post("/register", register);

// Giriş Yap
router.post("/login", login);

router.get("/me", me);

module.exports = router;
