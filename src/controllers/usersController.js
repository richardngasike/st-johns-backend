const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Get all users (Admin) ─────────────────────────────────────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  let p = 1;

  if (role) { conditions.push(`role = $${p++}`); params.push(role); }
  if (search) {
    conditions.push(`(first_name ILIKE $${p} OR last_name ILIKE $${p} OR email ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  const result = await query(`
    SELECT id, uuid, first_name, last_name, email, phone, role, is_active,
           created_at, last_login
    FROM users ${where}
    ORDER BY created_at DESC
    LIMIT $${p} OFFSET $${p+1}
  `, [...params, parseInt(limit), offset]);

  res.json({
    success: true,
    data: result.rows,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
  });
});

// ── Get user profile ──────────────────────────────────────────────────────────
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.params.id || req.user.id;
  if (req.user.role !== 'admin' && parseInt(userId) !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const result = await query(
    'SELECT id, uuid, first_name, last_name, email, phone, role, is_active, profile_photo, created_at, last_login FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({ success: true, data: result.rows[0] });
});

// ── Update user profile ───────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, phone } = req.body;
  const userId = req.user.id;

  const result = await query(`
    UPDATE users
    SET first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        phone      = COALESCE($3, phone),
        updated_at = NOW()
    WHERE id = $4
    RETURNING id, first_name, last_name, email, phone, role
  `, [first_name?.trim(), last_name?.trim(), phone, userId]);

  res.json({ success: true, message: 'Profile updated.', data: result.rows[0] });
});

// ── Toggle user active status (Admin) ────────────────────────────────────────
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query(`
    UPDATE users SET is_active = NOT is_active, updated_at = NOW()
    WHERE id = $1 AND role != 'admin'
    RETURNING id, first_name, last_name, email, is_active
  `, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'User not found or cannot modify admin.' });
  }

  const u = result.rows[0];
  res.json({ success: true, message: `${u.first_name} ${u.last_name} has been ${u.is_active ? 'activated' : 'deactivated'}.`, data: u });
});

// ── Get user notifications ────────────────────────────────────────────────────
const getNotifications = asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT * FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [req.user.id]);

  const unread = result.rows.filter(n => !n.is_read).length;
  res.json({ success: true, data: result.rows, unread_count: unread });
});

// ── Mark notification read ────────────────────────────────────────────────────
const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAll = id === 'all';

  if (isAll) {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
  } else {
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, req.user.id]);
  }

  res.json({ success: true, message: isAll ? 'All notifications marked as read.' : 'Notification marked as read.' });
});

module.exports = { getAllUsers, getUserProfile, updateProfile, toggleUserStatus, getNotifications, markNotificationRead };
