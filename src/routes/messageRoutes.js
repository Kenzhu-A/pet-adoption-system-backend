const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/users/:currentUserId', messageController.getUsers);
router.get('/history/:user1/:user2', messageController.getMessages);

module.exports = router;