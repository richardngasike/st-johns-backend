const { body, validationResult } = require('express-validator');

// Extract validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Auth validators ────────────────────────────────────────────────────────
const registerValidator = [
  body('first_name').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('last_name').trim().notEmpty().withMessage('Last name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must include uppercase, lowercase, and number'),
  body('phone').optional().trim().isLength({ max: 30 }),
  validate,
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

// ── Application validators ─────────────────────────────────────────────────
const applicationValidator = [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('program').trim().notEmpty().withMessage('Program selection is required'),
  body('intake').trim().notEmpty().withMessage('Intake is required'),
  validate,
];

// ── Contact validators ─────────────────────────────────────────────────────
const contactValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 400 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ min: 10, max: 5000 }),
  validate,
];

module.exports = { validate, registerValidator, loginValidator, applicationValidator, contactValidator };
