const express = require("express");
const router = express.Router();
const MessagesController = require("../controllers/messagesController");

router.get("/:channelId", MessagesController.getMessagesByChannel);
router.post("/", MessagesController.addMessage);

module.exports = router;
