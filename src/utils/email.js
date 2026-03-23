const nodemailer = require('nodemailer');

// Create transporter
function createTransporter() {
  return nodemailer.createTransporter({
    host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });
}

// ── HTML Templates ──────────────────────────────────────────────────────────
function baseLayout(content, title = 'St Johns Training College') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f6f9; color: #333; }
    .wrapper { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header  { background: linear-gradient(135deg, #1f4d35, #2d7a52); padding: 32px 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 22px; font-weight: 700; }
    .header p  { color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 13px; }
    .body    { padding: 36px 40px; }
    .body p  { line-height: 1.75; color: #4a5568; font-size: 15px; margin: 0 0 16px; }
    .body h2 { color: #1f4d35; font-size: 18px; margin: 0 0 16px; }
    .info-box { background: #f0f9f4; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
    .info-row { display: flex; gap: 12px; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #d1fae5; }
    .info-row:last-child { border-bottom: none; }
    .info-row .label { font-weight: 700; color: #065f46; min-width: 130px; }
    .info-row .value { color: #374151; }
    .btn  { display: inline-block; background: #2d7a52; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 20px 0; }
    .btn:hover { background: #246040; }
    .ref-box { background: #ecfdf5; border: 2px solid #6ee7b7; border-radius: 8px; padding: 16px 20px; text-align: center; margin: 20px 0; }
    .ref-box .ref { font-size: 22px; font-weight: 800; color: #065f46; letter-spacing: 0.08em; font-family: monospace; }
    .ref-box .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .footer { background: #1a3a2a; padding: 24px 40px; text-align: center; }
    .footer p { color: rgba(255,255,255,0.5); font-size: 12px; margin: 4px 0; }
    .footer a { color: rgba(255,255,255,0.7); text-decoration: none; }
    .divider { height: 1px; background: #e5e7eb; margin: 20px 0; }
    .alert-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 14px 18px; font-size: 14px; color: #92400e; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>St Johns Training College</h1>
      <p>Excellence in Education Since 1994</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>St Johns Training College | 123 College Road, Nairobi, Kenya</p>
      <p>+254 700 000 000 | <a href="mailto:info@stjohnscollege.ac.ke">info@stjohnscollege.ac.ke</a></p>
      <p style="margin-top: 12px; font-size: 11px;">© ${new Date().getFullYear()} St Johns Training College. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

const templates = {
  welcome: ({ firstName, loginUrl }) => baseLayout(`
    <h2>Welcome, ${firstName}!</h2>
    <p>Thank you for creating an account with St Johns Training College. Your student portal is now ready.</p>
    <p>Through your portal you can:</p>
    <ul style="color: #4a5568; line-height: 2; font-size: 15px;">
      <li>Submit and track your applications</li>
      <li>View exam results and academic records</li>
      <li>Access fee statements and payment history</li>
      <li>Receive important college notifications</li>
    </ul>
    <a href="${loginUrl}" class="btn">Access Student Portal</a>
    <div class="divider"></div>
    <p style="font-size: 13px; color: #9ca3af;">If you did not create this account, please ignore this email or contact us at info@stjohnscollege.ac.ke</p>
  `, 'Welcome to St Johns Training College'),

  applicationConfirmation: ({ firstName, referenceNumber, program, intake, portalUrl }) => baseLayout(`
    <h2>Application Received!</h2>
    <p>Dear ${firstName},</p>
    <p>We have successfully received your application for admission to St Johns Training College. Our admissions team will review your application and respond within <strong>3–5 business days</strong>.</p>
    <div class="ref-box">
      <div class="ref">${referenceNumber}</div>
      <div class="label">Your Application Reference Number — Save this for tracking</div>
    </div>
    <div class="info-box">
      <div class="info-row"><span class="label">Program</span><span class="value">${program}</span></div>
      <div class="info-row"><span class="label">Intake</span><span class="value">${intake}</span></div>
      <div class="info-row"><span class="label">Status</span><span class="value">Pending Review</span></div>
    </div>
    <p>You can track your application status anytime through our student portal:</p>
    <a href="${portalUrl}" class="btn">Track Application</a>
    <p>If you have any questions, please contact our admissions office at <strong>+254 700 000 000</strong> or email <strong>admissions@stjohnscollege.ac.ke</strong></p>
  `, `Application Received — ${referenceNumber}`),

  applicationStatus: ({ firstName, status, program, referenceNumber, reviewNotes, portalUrl }) => {
    const statusMessages = {
      approved: { heading: 'Congratulations! You\'ve Been Admitted!', msg: `We are thrilled to inform you that your application for <strong>${program}</strong> has been <strong>approved</strong>. You are officially admitted to St Johns Training College!`, color: '#065f46', bg: '#d1fae5' },
      rejected: { heading: 'Application Update', msg: `We regret to inform you that your application for <strong>${program}</strong> was not successful at this time. We encourage you to reapply for the next intake or consider other programs we offer.`, color: '#991b1b', bg: '#fee2e2' },
      under_review: { heading: 'Application Under Review', msg: `Your application for <strong>${program}</strong> is currently being reviewed by our admissions panel. You will be notified of the outcome shortly.`, color: '#1e40af', bg: '#dbeafe' },
      enrolled: { heading: 'Welcome to St Johns!', msg: `Your enrollment for <strong>${program}</strong> has been confirmed. Welcome to the St Johns Training College family! Please visit the admissions office to complete your registration.`, color: '#065f46', bg: '#d1fae5' },
    };
    const sm = statusMessages[status] || statusMessages.under_review;
    return baseLayout(`
      <h2>${sm.heading}</h2>
      <p>Dear ${firstName},</p>
      <p>${sm.msg}</p>
      <div class="info-box">
        <div class="info-row"><span class="label">Reference</span><span class="value">${referenceNumber}</span></div>
        <div class="info-row"><span class="label">Program</span><span class="value">${program}</span></div>
        <div class="info-row"><span class="label">Status</span><span class="value" style="color:${sm.color};font-weight:700;">${status.replace('_',' ').toUpperCase()}</span></div>
      </div>
      ${reviewNotes ? `<div class="alert-box"><strong>Notes from Admissions:</strong><br>${reviewNotes}</div>` : ''}
      <a href="${portalUrl}" class="btn">View Application Portal</a>
    `, 'Application Status Update');
  },

  contactAutoReply: ({ name, subject }) => baseLayout(`
    <h2>Message Received</h2>
    <p>Dear ${name},</p>
    <p>Thank you for contacting St Johns Training College. We have received your message regarding: <strong>${subject}</strong></p>
    <p>Our team will review your enquiry and get back to you within <strong>24 business hours</strong>.</p>
    <div class="info-box">
      <p style="margin:0;font-size:14px;"><strong>Need urgent help?</strong><br>Call us: <strong>+254 700 000 000</strong><br>Mon–Fri: 8:00am – 5:00pm</p>
    </div>
  `, 'Message Received — St Johns Training College'),

  contactAdmin: ({ name, email, phone, department, subject, message }) => baseLayout(`
    <h2>New Contact Message</h2>
    <div class="info-box">
      <div class="info-row"><span class="label">From</span><span class="value">${name}</span></div>
      <div class="info-row"><span class="label">Email</span><span class="value">${email}</span></div>
      ${phone ? `<div class="info-row"><span class="label">Phone</span><span class="value">${phone}</span></div>` : ''}
      ${department ? `<div class="info-row"><span class="label">Department</span><span class="value">${department}</span></div>` : ''}
      <div class="info-row"><span class="label">Subject</span><span class="value">${subject}</span></div>
    </div>
    <p><strong>Message:</strong></p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:14px;line-height:1.75;white-space:pre-wrap;">${message}</div>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin" class="btn">View in Admin Panel</a>
  `, `New Message: ${subject}`),

  contactReply: ({ name, originalSubject, replyText }) => baseLayout(`
    <h2>Reply to Your Enquiry</h2>
    <p>Dear ${name},</p>
    <p>Our team has responded to your enquiry: <strong>${originalSubject}</strong></p>
    <div style="background:#f0f9f4;border-left:4px solid #2d7a52;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;font-size:15px;line-height:1.75;white-space:pre-wrap;">${replyText}</div>
    <p>If you need further assistance, feel free to reply to this email or contact us directly.</p>
  `, `Re: ${originalSubject}`),

  passwordReset: ({ firstName, resetUrl, expiresIn }) => baseLayout(`
    <h2>Password Reset Request</h2>
    <p>Dear ${firstName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <a href="${resetUrl}" class="btn">Reset My Password</a>
    <div class="alert-box"><strong>This link expires in ${expiresIn}.</strong> If you didn't request a password reset, please ignore this email — your account is safe.</div>
  `, 'Password Reset — St Johns Training College'),
};

// ── Send Email ─────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, template, data }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Email] Would send to ${to}: ${subject}`);
    }
    return;
  }

  try {
    const transporter = createTransporter();
    const html = templates[template] ? templates[template](data) : `<p>${JSON.stringify(data)}</p>`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"St Johns Training College" <noreply@stjohnscollege.ac.ke>',
      to,
      subject,
      html,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Email] ✅ Sent to ${to}: ${subject}`);
    }
  } catch (err) {
    console.error(`[Email] ❌ Failed to send to ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendEmail };
