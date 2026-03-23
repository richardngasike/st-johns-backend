const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { sendEmail } = require('../utils/email');
const { asyncHandler } = require('../middleware/errorHandler');

// Generate JWT
function generateToken(userId, role, expiresIn) {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── Register ──────────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { first_name, last_name, email, phone, password } = req.body;

  // Check existing
  const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (exists.rows.length > 0) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const result = await query(`
    INSERT INTO users (uuid, first_name, last_name, email, phone, password_hash, role)
    VALUES ($1, $2, $3, $4, $5, $6, 'student')
    RETURNING id, uuid, first_name, last_name, email, phone, role, created_at
  `, [uuidv4(), first_name.trim(), last_name.trim(), email.toLowerCase(), phone || null, password_hash]);

  const user = result.rows[0];

  // Send welcome email (non-blocking)
  sendEmail({
    to: user.email,
    subject: 'Welcome to St Johns Training College',
    template: 'welcome',
    data: { firstName: user.first_name, loginUrl: `${process.env.FRONTEND_URL}/portal` },
  }).catch(() => {});

  const token = generateToken(user.id, user.role);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    token,
    user: { id: user.id, uuid: user.uuid, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role },
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    'SELECT id, uuid, first_name, last_name, email, phone, password_hash, role, is_active FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const user = result.rows[0];
  if (!user.is_active) {
    return res.status(401).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // Update last login
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  const token = generateToken(user.id, user.role);

  res.json({
    success: true,
    message: `Welcome back, ${user.first_name}!`,
    token,
    user: { id: user.id, uuid: user.uuid, first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, role: user.role },
  });
});

// ── Admin Login ───────────────────────────────────────────────────────────────
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    `SELECT id, uuid, first_name, last_name, email, password_hash, role, is_active
     FROM users WHERE email = $1 AND role IN ('admin','staff')`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
  }

  const user = result.rows[0];
  if (!user.is_active) {
    return res.status(401).json({ success: false, message: 'Account deactivated.' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
  }

  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  const token = generateToken(user.id, user.role, process.env.JWT_ADMIN_EXPIRES_IN || '1d');

  res.json({
    success: true,
    message: 'Admin login successful.',
    token,
    user: { id: user.id, uuid: user.uuid, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role },
  });
});

// ── Get Current User (me) ─────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, uuid, first_name, last_name, email, phone, role, created_at, last_login FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ success: true, user: result.rows[0] });
});

// ── Change Password ───────────────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
  }

  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const isMatch = await bcrypt.compare(current_password, result.rows[0].password_hash);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  const newHash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

  res.json({ success: true, message: 'Password changed successfully.' });
});

// ── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  const result = await query('SELECT id, first_name, email FROM users WHERE email = $1', [email.toLowerCase()]);

  // Always return 200 to avoid email enumeration
  if (result.rows.length === 0) {
    return res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  }

  const user = result.rows[0];
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query(`
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
  `, [user.id, token, expiresAt]);

  const resetUrl = `${process.env.FRONTEND_URL}/portal/reset-password?token=${token}`;
  sendEmail({
    to: user.email,
    subject: 'Password Reset — St Johns Training College',
    template: 'passwordReset',
    data: { firstName: user.first_name, resetUrl, expiresIn: '1 hour' },
  }).catch(() => {});

  res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
});

// ── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({ success: false, message: 'Token and new password are required.' });
  }

  const result = await query(`
    SELECT prt.*, u.email FROM password_reset_tokens prt
    JOIN users u ON u.id = prt.user_id
    WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()
  `, [token]);

  if (result.rows.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
  }

  const { user_id } = result.rows[0];
  const hash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, user_id]);
  await query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
});

module.exports = { register, login, adminLogin, getMe, changePassword, forgotPassword, resetPassword };
