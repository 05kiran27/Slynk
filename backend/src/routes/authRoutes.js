const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { signupLimiter, loginLimiter } = require('../middleware/rateLimit');
const {authenticate} = require('../middleware/auth')

router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);

// Login / Logout
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
