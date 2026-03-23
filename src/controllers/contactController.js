const { query } = require('../db');
const { sendEmail } = require('../utils/email');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Submit Contact Message ────────────────────────────────────────────────────
const submitContact = asyncHandler(async (req, res) => {
  const { name, email, phone, department, subject, message } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'];

  const result = await query(`
    INSERT INTO contact_messages (name, email, phone, department, subject, message, ip_address)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING id, name, email, subject, created_at
  `, [name.trim(), email.toLowerCase(), phone || null, department || null, subject.trim(), message.trim(), ip]);

  // Send auto-reply to sender
  sendEmail({
    to: email,
    subject: `We received your message — St Johns Training College`,
    template: 'contactAutoReply',
    data: { name: name.split(' ')[0], subject, message },
  }).catch(() => {});

  // Notify admin
  sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@stjohnscollege.ac.ke',
    subject: `New Contact Message: ${subject}`,
    template: 'contactAdmin',
    data: { name, email, phone, department, subject, message },
  }).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Your message has been received. We will respond within 24 hours.',
    data: result.rows[0],
  });
});

// ── Get All Messages (Admin) ──────────────────────────────────────────────────
const getAllMessages = asyncHandler(async (req, res) => {
  const { is_read, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  let p = 1;

  if (is_read === 'true')  { conditions.push(`cm.is_read = TRUE`); }
  if (is_read === 'false') { conditions.push(`cm.is_read = FALSE`); }
  if (search) {
    conditions.push(`(cm.name ILIKE $${p} OR cm.email ILIKE $${p} OR cm.subject ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query(`SELECT COUNT(*) FROM contact_messages cm ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  const result = await query(`
    SELECT cm.*,
           u.first_name || ' ' || u.last_name AS replied_by_name
    FROM contact_messages cm
    LEFT JOIN users u ON u.id = cm.replied_by
    ${where}
    ORDER BY cm.created_at DESC
    LIMIT $${p} OFFSET $${p+1}
  `, [...params, parseInt(limit), offset]);

  const unreadCount = await query('SELECT COUNT(*) FROM contact_messages WHERE is_read = FALSE');

  res.json({
    success: true,
    data: result.rows,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    unread_count: parseInt(unreadCount.rows[0].count),
  });
});

// ── Mark message as read ──────────────────────────────────────────────────────
const markRead = asyncHandler(async (req, res) => {
  const result = await query(
    'UPDATE contact_messages SET is_read = TRUE WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }
  res.json({ success: true, message: 'Message marked as read.' });
});

// ── Reply to message ──────────────────────────────────────────────────────────
const replyMessage = asyncHandler(async (req, res) => {
  const { reply_text } = req.body;
  if (!reply_text) {
    return res.status(400).json({ success: false, message: 'Reply text is required.' });
  }

  const msgResult = await query('SELECT * FROM contact_messages WHERE id = $1', [req.params.id]);
  if (msgResult.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }

  const msg = msgResult.rows[0];

  await query(`
    UPDATE contact_messages
    SET is_replied = TRUE, replied_by = $1, replied_at = NOW(), is_read = TRUE
    WHERE id = $2
  `, [req.user.id, req.params.id]);

  // Send reply email
  await sendEmail({
    to: msg.email,
    subject: `Re: ${msg.subject} — St Johns Training College`,
    template: 'contactReply',
    data: { name: msg.name.split(' ')[0], originalSubject: msg.subject, replyText: reply_text },
  });

  res.json({ success: true, message: 'Reply sent successfully.' });
});

// ── Delete message ────────────────────────────────────────────────────────────
const deleteMessage = asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM contact_messages WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Message not found.' });
  }
  res.json({ success: true, message: 'Message deleted.' });
});

module.exports = { submitContact, getAllMessages, markRead, replyMessage, deleteMessage };
