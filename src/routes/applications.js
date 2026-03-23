const express = require('express');
const router = express.Router();
const {
  submitApplication, getAllApplications, getUserApplications,
  getApplication, updateStatus, getStats, deleteApplication,
} = require('../controllers/applicationController');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { applicationValidator } = require('../middleware/validators');
const upload = require('../middleware/upload');

// Public — submit application (optional auth to link account)
router.post('/',
  optionalAuth,
  upload.fields([
    { name: 'kcseResult', maxCount: 1 },
    { name: 'nationalId', maxCount: 1 },
    { name: 'photo',      maxCount: 1 },
    { name: 'other',      maxCount: 1 },
  ]),
  applicationValidator,
  submitApplication
);

// Admin — stats & list
router.get('/stats',            authenticate, requireAdmin, getStats);
router.get('/',                 authenticate, requireAdmin, getAllApplications);

// Student — get own applications
router.get('/user/:userId',     authenticate, getUserApplications);

// Admin or owner — get single
router.get('/:id',              authenticate, getApplication);

// Admin — update status
router.patch('/:id/status',     authenticate, requireAdmin, updateStatus);

// Admin — delete
router.delete('/:id',           authenticate, requireAdmin, deleteApplication);

module.exports = router;
