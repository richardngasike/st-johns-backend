const { query } = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

// ── Get all programs ──────────────────────────────────────────────────────────
const getAllPrograms = asyncHandler(async (req, res) => {
  const { level, search, featured } = req.query;
  const conditions = ['is_active = TRUE'];
  const params = [];
  let p = 1;

  if (level && level !== 'All') { conditions.push(`level = $${p++}`); params.push(level); }
  if (featured === 'true')      { conditions.push('is_featured = TRUE'); }
  if (search) {
    conditions.push(`(title ILIKE $${p} OR description ILIKE $${p} OR department ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const result = await query(`
    SELECT id, slug, title, level, department, description, duration,
           intake_months, study_modes, annual_fee, requirements,
           career_prospects, student_count, is_featured
    FROM programs
    WHERE ${conditions.join(' AND ')}
    ORDER BY is_featured DESC, level, title
  `, params);

  res.json({ success: true, data: result.rows, total: result.rows.length });
});

// ── Get single program ────────────────────────────────────────────────────────
const getProgram = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isId = !isNaN(idOrSlug);

  const result = await query(
    `SELECT * FROM programs WHERE ${isId ? 'id = $1' : 'slug = $1'} AND is_active = TRUE`,
    [idOrSlug]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Program not found.' });
  }

  res.json({ success: true, data: result.rows[0] });
});

// ── Create program (Admin) ────────────────────────────────────────────────────
const createProgram = asyncHandler(async (req, res) => {
  const { slug, title, level, department, description, duration, intake_months,
          study_modes, annual_fee, requirements, career_prospects, is_featured } = req.body;

  const result = await query(`
    INSERT INTO programs (slug, title, level, department, description, duration, intake_months,
                          study_modes, annual_fee, requirements, career_prospects, is_featured)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
  `, [slug, title, level, department, description, duration, intake_months,
      study_modes, annual_fee, requirements, career_prospects,
      is_featured === true || is_featured === 'true']);

  res.status(201).json({ success: true, message: 'Program created.', data: result.rows[0] });
});

// ── Update program (Admin) ────────────────────────────────────────────────────
const updateProgram = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fields = ['title','department','description','duration','intake_months',
                  'study_modes','annual_fee','requirements','career_prospects','is_featured','is_active'];
  const updates = [];
  const params = [];
  let p = 1;

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = $${p++}`);
      params.push(req.body[field]);
    }
  });

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No fields to update.' });
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE programs SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Program not found.' });
  }

  res.json({ success: true, message: 'Program updated.', data: result.rows[0] });
});

module.exports = { getAllPrograms, getProgram, createProgram, updateProgram };
