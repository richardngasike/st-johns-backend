const express = require('express');
const router = express.Router();
const { getAllPrograms, getProgram, createProgram, updateProgram } = require('../controllers/programsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Public
router.get('/',             getAllPrograms);
router.get('/:idOrSlug',    getProgram);

// Admin
router.post('/',            authenticate, requireAdmin, createProgram);
router.put('/:id',          authenticate, requireAdmin, updateProgram);

module.exports = router;
