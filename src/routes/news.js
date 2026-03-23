const express = require('express');
const router = express.Router();
const { getAllNews, getNews, createNews, updateNews, deleteNews, getCategories } = require('../controllers/newsController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public
router.get('/',                 getAllNews);
router.get('/categories',       getCategories);
router.get('/:idOrSlug',        getNews);

// Admin
router.post('/',                authenticate, requireAdmin, upload.single('cover_image'), createNews);
router.put('/:id',              authenticate, requireAdmin, upload.single('cover_image'), updateNews);
router.delete('/:id',           authenticate, requireAdmin, deleteNews);

module.exports = router;
