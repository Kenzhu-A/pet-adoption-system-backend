const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');

// Configure multer to store the file in memory temporarily
const upload = multer({ storage: multer.memoryStorage() });

router.get('/:id', userController.getUserProfile);
// The 'avatar' string matches the formData.append('avatar', ...) from React Native
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
// ... existing imports ...
router.put('/update-profile', userController.updateProfile);
router.post('/update-password', userController.updatePassword);

module.exports = router;