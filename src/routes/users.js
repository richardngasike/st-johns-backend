const express = require('express');
const router = express.Router();
const {
  getAllUsers, getUserProfile, updateProfile,
  toggleUserStatus, getNotifications, markNotificationRead,
} = require('../controllers/usersController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Admin — all users
router.get('/',                               authenticate, requireAdmin, getAllUsers);
router.patch('/:id/toggle-status',            authenticate, requireAdmin, toggleUserStatus);

// Authenticated user
router.get('/profile',                        authenticate, getUserProfile);
router.put('/profile',                        authenticate, updateProfile);
router.get('/notifications',                  authenticate, getNotifications);
router.patch('/notifications/:id/read',       authenticate, markNotificationRead);

// Admin — specific user
router.get('/:id',                            authenticate, requireAdmin, getUserProfile);

module.exports = router;
