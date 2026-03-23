const { query } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

// slug generator
function toSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Get all published news ────────────────────────────────────────────────────
const getAllNews = asyncHandler(async (req, res) => {
  const { category, search, featured, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = ['n.is_published = TRUE'];
  const params = [];
  let p = 1;

  if (category && category !== 'All') { conditions.push(`n.category = $${p++}`); params.push(category); }
  if (featured === 'true')            { conditions.push(`n.is_featured = TRUE`); }
  if (search) {
    conditions.push(`(n.title ILIKE $${p} OR n.excerpt ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const countRes = await query(`SELECT COUNT(*) FROM news n ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const result = await query(`
    SELECT n.id, n.slug, n.title, n.excerpt, n.category, n.tag,
           n.is_featured, n.cover_image, n.read_time, n.views,
           n.published_at, n.created_at,
           u.first_name || ' ' || u.last_name AS author_name
    FROM news n
    LEFT JOIN users u ON u.id = n.author_id
    ${where}
    ORDER BY n.is_featured DESC, n.published_at DESC
    LIMIT $${p} OFFSET $${p+1}
  `, [...params, parseInt(limit), offset]);

  res.json({
    success: true,
    data: result.rows,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// ── Get single news article ───────────────────────────────────────────────────
const getNews = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isId = !isNaN(idOrSlug);

  const result = await query(`
    SELECT n.*, u.first_name || ' ' || u.last_name AS author_name
    FROM news n
    LEFT JOIN users u ON u.id = n.author_id
    WHERE ${isId ? 'n.id = $1' : 'n.slug = $1'} AND n.is_published = TRUE
  `, [idOrSlug]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Article not found.' });
  }

  // Increment views (non-blocking)
  query('UPDATE news SET views = views + 1 WHERE id = $1', [result.rows[0].id]).catch(() => {});

  res.json({ success: true, data: result.rows[0] });
});

// ── Create news article (Admin) ───────────────────────────────────────────────
const createNews = asyncHandler(async (req, res) => {
  const { title, excerpt, content, category, tag, is_featured, is_published } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required.' });
  }

  let slug = toSlug(title);
  // Ensure unique slug
  const existing = await query('SELECT id FROM news WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) slug = `${slug}-${Date.now()}`;

  const coverImage = req.file ? `/uploads/news/${req.file.filename}` : null;
  const readTime = Math.max(1, Math.ceil(content.split(' ').length / 200)) + ' min';

  const result = await query(`
    INSERT INTO news (slug, title, excerpt, content, category, tag, is_featured, is_published, author_id, cover_image, read_time)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
  `, [slug, title, excerpt, content, category || 'Announcements', tag,
      is_featured === true || is_featured === 'true',
      is_published !== false && is_published !== 'false',
      req.user.id, coverImage, readTime]);

  res.status(201).json({ success: true, message: 'Article created.', data: result.rows[0] });
});

// ── Update news article (Admin) ───────────────────────────────────────────────
const updateNews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, excerpt, content, category, tag, is_featured, is_published } = req.body;

  const existing = await query('SELECT * FROM news WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Article not found.' });
  }

  const coverImage = req.file ? `/uploads/news/${req.file.filename}` : existing.rows[0].cover_image;
  const readTime = content ? Math.max(1, Math.ceil(content.split(' ').length / 200)) + ' min' : existing.rows[0].read_time;

  const result = await query(`
    UPDATE news SET
      title = COALESCE($1, title),
      excerpt = COALESCE($2, excerpt),
      content = COALESCE($3, content),
      category = COALESCE($4, category),
      tag = COALESCE($5, tag),
      is_featured = COALESCE($6, is_featured),
      is_published = COALESCE($7, is_published),
      cover_image = $8,
      read_time = $9,
      updated_at = NOW()
    WHERE id = $10
    RETURNING *
  `, [title, excerpt, content, category, tag,
      is_featured != null ? (is_featured === true || is_featured === 'true') : null,
      is_published != null ? (is_published === true || is_published === 'true') : null,
      coverImage, readTime, id]);

  res.json({ success: true, message: 'Article updated.', data: result.rows[0] });
});

// ── Delete news article (Admin) ───────────────────────────────────────────────
const deleteNews = asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM news WHERE id = $1 RETURNING id, title', [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Article not found.' });
  }
  res.json({ success: true, message: `Article "${result.rows[0].title}" deleted.` });
});

// ── Get categories (with counts) ─────────────────────────────────────────────
const getCategories = asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT category, COUNT(*) as count
    FROM news
    WHERE is_published = TRUE
    GROUP BY category
    ORDER BY count DESC
  `);
  res.json({ success: true, data: result.rows });
});

module.exports = { getAllNews, getNews, createNews, updateNews, deleteNews, getCategories };
