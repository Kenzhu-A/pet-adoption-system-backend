const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/users/:currentUserId', messageController.getUsers);
router.get('/history/:user1/:user2', messageController.getMessages);
// Add these routes
router.delete('/conversation/:user1/:user2', messageController.deleteConversation);
router.delete('/message/:messageId', messageController.deleteMessage);

router.get('/conversations/:userId', messageController.getConversations);
router.put('/message/:messageId', messageController.editMessage);
module.exports = router;