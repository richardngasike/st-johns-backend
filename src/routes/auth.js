const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  register, login, adminLogin, getMe,
  changePassword, forgotPassword, resetPassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../middleware/validators');

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.post('/register',        authLimiter, registerValidator, register);
router.post('/login',           authLimiter, loginValidator, login);
router.post('/admin-login',     authLimiter, loginValidator, adminLogin);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password',  authLimiter, resetPassword);

// Protected routes
router.get('/me',               authenticate, getMe);
router.put('/change-password',  authenticate, changePassword);

module.exports = router;
