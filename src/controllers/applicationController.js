const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../db');
const { sendEmail } = require('../utils/email');
const { asyncHandler } = require('../middleware/errorHandler');

// Generate unique reference number
async function generateReference() {
  const year = new Date().getFullYear().toString().slice(-2);
  const result = await query('SELECT COUNT(*) as count FROM applications WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())');
  const seq = (parseInt(result.rows[0].count) + 1).toString().padStart(4, '0');
  return `SJC-${year}${seq}`;
}

// ── Submit Application ────────────────────────────────────────────────────────
const submitApplication = asyncHandler(async (req, res) => {
  const {
    first_name, last_name, email, phone, date_of_birth, gender,
    id_number, nationality, county,
    school_name, kcse_year, kcse_grade, other_qualification,
    program, intake, study_mode, sponsorship,
    marketing_consent, declaration_accepted,
  } = req.body;

  // Link to user account if logged in
  const userId = req.user?.id || null;

  const reference_number = await generateReference();

  // Handle uploaded files
  const files = req.files || {};
  const doc_kcse_result = files.kcseResult?.[0]?.filename ? `/uploads/documents/${files.kcseResult[0].filename}` : null;
  const doc_national_id = files.nationalId?.[0]?.filename ? `/uploads/documents/${files.nationalId[0].filename}` : null;
  const doc_photo       = files.photo?.[0]?.filename       ? `/uploads/photos/${files.photo[0].filename}` : null;
  const doc_other       = files.other?.[0]?.filename       ? `/uploads/documents/${files.other[0].filename}` : null;

  const result = await query(`
    INSERT INTO applications (
      reference_number, user_id,
      first_name, last_name, email, phone, date_of_birth, gender,
      id_number, nationality, county,
      school_name, kcse_year, kcse_grade, other_qualification,
      program, intake, study_mode, sponsorship,
      doc_kcse_result, doc_national_id, doc_photo, doc_other,
      marketing_consent, declaration_accepted, status
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'pending'
    )
    RETURNING id, reference_number, first_name, last_name, email, program, intake, status, created_at
  `, [
    reference_number, userId,
    first_name?.trim(), last_name?.trim(), email?.toLowerCase(), phone,
    date_of_birth || null, gender, id_number, nationality || 'Kenyan', county,
    school_name, kcse_year ? parseInt(kcse_year) : null, kcse_grade, other_qualification,
    program, intake, study_mode, sponsorship,
    doc_kcse_result, doc_national_id, doc_photo, doc_other,
    marketing_consent === true || marketing_consent === 'true',
    declaration_accepted === true || declaration_accepted === 'true',
  ]);

  const application = result.rows[0];

  // Send confirmation email (non-blocking)
  sendEmail({
    to: application.email,
    subject: `Application Received — ${reference_number}`,
    template: 'applicationConfirmation',
    data: {
      firstName: application.first_name,
      referenceNumber: reference_number,
      program: application.program,
      intake: application.intake,
      portalUrl: `${process.env.FRONTEND_URL}/portal`,
    },
  }).catch(() => {});

  // Create notification if user is linked
  if (userId) {
    await query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, 'Application Submitted', $2, 'application', '/portal')
    `, [userId, `Your application for ${program} (${reference_number}) has been received and is under review.`]);
  }

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully.',
    reference_number,
    application,
  });
});

// ── Get All Applications (Admin) ──────────────────────────────────────────────
const getAllApplications = asyncHandler(async (req, res) => {
  const {
    status, program, intake, search,
    page = 1, limit = 20,
    sort = 'created_at', order = 'DESC'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];
  let p = 1;

  if (status && status !== 'all') { conditions.push(`a.status = $${p++}`); params.push(status); }
  if (program) { conditions.push(`a.program ILIKE $${p++}`); params.push(`%${program}%`); }
  if (intake)  { conditions.push(`a.intake = $${p++}`); params.push(intake); }
  if (search) {
    conditions.push(`(a.first_name ILIKE $${p} OR a.last_name ILIKE $${p} OR a.email ILIKE $${p} OR a.reference_number ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSorts = ['created_at','first_name','last_name','program','status','intake'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countResult = await query(`SELECT COUNT(*) FROM applications a ${where}`, params);
  const total = parseInt(countResult.rows[0].count);

  const dataResult = await query(`
    SELECT a.*, 
           u.first_name AS reviewed_by_name
    FROM applications a
    LEFT JOIN users u ON u.id = a.reviewed_by
    ${where}
    ORDER BY a.${safeSort} ${safeOrder}
    LIMIT $${p} OFFSET $${p+1}
  `, [...params, parseInt(limit), offset]);

  res.json({
    success: true,
    data: dataResult.rows,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
    stats: await getApplicationStats(),
  });
});

// ── Get User's Applications ───────────────────────────────────────────────────
const getUserApplications = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user.id;

  // Users can only see their own; admins can see anyone's
  if (req.user.role !== 'admin' && parseInt(userId) !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const result = await query(`
    SELECT id, reference_number, program, intake, study_mode, kcse_grade,
           status, review_notes, offer_sent, created_at, updated_at
    FROM applications
    WHERE user_id = $1
    ORDER BY created_at DESC
  `, [userId]);

  res.json({ success: true, data: result.rows });
});

// ── Get Single Application ────────────────────────────────────────────────────
const getApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(`
    SELECT a.*, u.first_name AS reviewed_by_name, u.last_name AS reviewed_by_last
    FROM applications a
    LEFT JOIN users u ON u.id = a.reviewed_by
    WHERE a.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }

  const app = result.rows[0];

  // Non-admin can only see their own application
  if (req.user.role !== 'admin' && app.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  res.json({ success: true, data: app });
});

// ── Update Application Status (Admin) ────────────────────────────────────────
const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, review_notes } = req.body;

  const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'enrolled', 'withdrawn'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const result = await query(`
    UPDATE applications
    SET status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
    WHERE id = $4
    RETURNING *, (SELECT first_name || ' ' || last_name FROM users WHERE id = user_id) AS applicant_name
  `, [status, review_notes || null, req.user.id, id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }

  const app = result.rows[0];

  // Log audit
  await query(`
    INSERT INTO audit_log (user_id, action, entity, entity_id, details)
    VALUES ($1, 'UPDATE_APPLICATION_STATUS', 'applications', $2, $3)
  `, [req.user.id, id, JSON.stringify({ status, review_notes })]);

  // Send status notification email
  const emailSubjects = {
    approved: 'Congratulations! Your Application Has Been Approved',
    rejected: 'Application Status Update — St Johns Training College',
    under_review: 'Your Application Is Under Review',
    enrolled: 'Welcome to St Johns Training College!',
  };

  if (emailSubjects[status]) {
    sendEmail({
      to: app.email,
      subject: emailSubjects[status],
      template: 'applicationStatus',
      data: {
        firstName: app.first_name,
        status,
        program: app.program,
        referenceNumber: app.reference_number,
        reviewNotes: review_notes,
        portalUrl: `${process.env.FRONTEND_URL}/portal`,
      },
    }).catch(() => {});
  }

  // Notify user if linked
  if (app.user_id) {
    const msgs = {
      approved: `Your application for ${app.program} has been approved! Welcome to St Johns!`,
      rejected: `Your application for ${app.program} was not successful at this time.`,
      under_review: `Your application for ${app.program} is now under review.`,
    };
    if (msgs[status]) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, 'Application Update', $2, $3, '/portal')
      `, [app.user_id, msgs[status], status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info']);
    }
  }

  res.json({ success: true, message: `Application status updated to "${status}".`, data: app });
});

// ── Application Statistics ────────────────────────────────────────────────────
async function getApplicationStats() {
  const result = await query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'pending')      AS pending,
      COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
      COUNT(*) FILTER (WHERE status = 'approved')     AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected')     AS rejected,
      COUNT(*) FILTER (WHERE status = 'enrolled')     AS enrolled,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS last_7_days,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS last_30_days
    FROM applications
  `);
  return result.rows[0];
}

const getStats = asyncHandler(async (req, res) => {
  const stats = await getApplicationStats();

  // Top programs
  const topPrograms = await query(`
    SELECT program, COUNT(*) as count, 
           COUNT(*) FILTER (WHERE status='approved') as approved
    FROM applications
    GROUP BY program
    ORDER BY count DESC
    LIMIT 5
  `);

  // Applications by date (last 30 days)
  const byDate = await query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM applications
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  res.json({
    success: true,
    stats,
    top_programs: topPrograms.rows,
    applications_by_date: byDate.rows,
  });
});

// ── Delete Application (Admin) ────────────────────────────────────────────────
const deleteApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query('DELETE FROM applications WHERE id = $1 RETURNING id, reference_number', [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Application not found.' });
  }
  res.json({ success: true, message: `Application ${result.rows[0].reference_number} deleted.` });
});

module.exports = {
  submitApplication, getAllApplications, getUserApplications,
  getApplication, updateStatus, getStats, deleteApplication,
};
