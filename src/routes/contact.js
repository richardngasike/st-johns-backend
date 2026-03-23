const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { submitContact, getAllMessages, markRead, replyMessage, deleteMessage } = require('../controllers/contactController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { contactValidator } = require('../middleware/validators');

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many messages sent. Please wait an hour before trying again.' },
});

// Public
router.post('/', contactLimiter, contactValidator, submitContact);

// Admin
router.get('/',                 authenticate, requireAdmin, getAllMessages);
router.patch('/:id/read',       authenticate, requireAdmin, markRead);
router.post('/:id/reply',       authenticate, requireAdmin, replyMessage);
router.delete('/:id',           authenticate, requireAdmin, deleteMessage);

module.exports = router;
