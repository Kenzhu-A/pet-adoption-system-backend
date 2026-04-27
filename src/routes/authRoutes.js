const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

// --- NEW: FORGOT PASSWORD ROUTES ---
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.get('/google', authController.getGoogleAuthUrl);

module.exports = router;