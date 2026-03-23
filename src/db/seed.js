require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase(pool) {
  console.log('\n🌱 Seeding database...\n');

  // ── Admin User ─────────────────────────────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@stjohnscollege.ac.ke';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2024';
  const adminHash     = await bcrypt.hash(adminPassword, 12);

  await pool.query(`
    INSERT INTO users (uuid, first_name, last_name, email, phone, password_hash, role, is_active, email_verified)
    VALUES ($1, $2, $3, $4, $5, $6, 'admin', TRUE, TRUE)
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role          = 'admin',
      updated_at    = NOW()
  `, [uuidv4(), process.env.ADMIN_FIRST_NAME || 'System',
      process.env.ADMIN_LAST_NAME  || 'Administrator',
      adminEmail, '+254700000000', adminHash]);
  console.log(`  ✅ Admin user: ${adminEmail}`);

  // ── Demo Student User ──────────────────────────────────────────────────────
  const studentHash = await bcrypt.hash('Student@2024', 12);
  await pool.query(`
    INSERT INTO users (uuid, first_name, last_name, email, phone, password_hash, role, is_active, email_verified)
    VALUES ($1, 'Grace', 'Wanjiku', 'grace@example.com', '+254712000001', $2, 'student', TRUE, TRUE)
    ON CONFLICT (email) DO NOTHING
  `, [uuidv4(), studentHash]);
  console.log('  Demo student: grace@example.com / Student@2024');

  // ── Programs ───────────────────────────────────────────────────────────────
  const programs = [
    { slug: 'diploma-it', title: 'Diploma in Information Technology', level: 'Diploma', dept: 'ICT', duration: '2 Years', intake: 'September, January', modes: 'Full-time, Part-time', fee: 45000, desc: 'Master modern programming, networking, cybersecurity, database management and cloud computing for the digital economy.', req: 'KCSE Grade C+ or above. Credit or above in Mathematics and English.', careers: 'Software Developer, Network Engineer, IT Support, Systems Analyst, Cybersecurity Analyst' },
    { slug: 'diploma-business', title: 'Diploma in Business Administration', level: 'Diploma', dept: 'Business', duration: '2 Years', intake: 'September, January', modes: 'Full-time, Part-time, Evening', fee: 42000, desc: 'Develop comprehensive business management, entrepreneurship, and leadership competencies.', req: 'KCSE Grade C+ or above.', careers: 'Business Manager, Entrepreneur, Sales Manager, HR Officer, Operations Manager' },
    { slug: 'cert-community-health', title: 'Certificate in Community Health', level: 'Certificate', dept: 'Health Sciences', duration: '18 Months', intake: 'September', modes: 'Full-time', fee: 38000, desc: 'Train for impactful roles in public health, clinical care, and community wellness programs.', req: 'KCSE Grade C or above with a credit in Biology or Chemistry.', careers: 'Community Health Officer, Clinical Officer, Health Educator, NGO Health Worker' },
    { slug: 'diploma-electrical', title: 'Diploma in Electrical Engineering', level: 'Diploma', dept: 'Engineering', duration: '2 Years', intake: 'September', modes: 'Full-time', fee: 50000, desc: 'Build practical skills in electrical installation, renewable energy systems, and power distribution.', req: 'KCSE Grade C+ with credits in Mathematics and Physics.', careers: 'Electrical Technician, Renewable Energy Engineer, Electrical Contractor, Maintenance Engineer' },
    { slug: 'cert-accounting', title: 'Certificate in Accounting & Finance', level: 'Certificate', dept: 'Business', duration: '1 Year', intake: 'September, January', modes: 'Full-time, Evening', fee: 35000, desc: 'Gain expertise in bookkeeping, financial reporting, tax compliance, and accounting software.', req: 'KCSE Grade C- or above with a pass in Mathematics.', careers: 'Bookkeeper, Accounts Clerk, Finance Assistant, Payroll Officer' },
    { slug: 'cert-ece', title: 'Certificate in Early Childhood Education', level: 'Certificate', dept: 'Education', duration: '1 Year', intake: 'September', modes: 'Full-time', fee: 32000, desc: 'Prepare to nurture young minds with modern pedagogical techniques and child development knowledge.', req: 'KCSE Grade C- or above.', careers: 'Pre-school Teacher, ECD Centre Manager, Child Development Officer' },
    { slug: 'cert-agri', title: 'Certificate in Agriculture & Food Technology', level: 'Certificate', dept: 'Agriculture', duration: '1 Year', intake: 'September', modes: 'Full-time', fee: 30000, desc: 'Crop production, agribusiness, food processing and modern farming technologies.', req: 'KCSE Grade C- with Agriculture or Biology.', careers: 'Agronomist, Farm Manager, Agribusiness Entrepreneur, Food Quality Inspector' },
    { slug: 'diploma-building', title: 'Diploma in Building Technology', level: 'Diploma', dept: 'Engineering', duration: '2 Years', intake: 'September', modes: 'Full-time', fee: 48000, desc: 'Construction management, quantity surveying, architectural drafting and project management.', req: 'KCSE Grade C+ with Mathematics and Physics.', careers: 'Site Manager, Quantity Surveyor, Building Inspector, Construction Manager' },
    { slug: 'short-digital-marketing', title: 'Short Course: Digital Marketing', level: 'Short Course', dept: 'Business', duration: '3 Months', intake: 'Monthly', modes: 'Weekend, Evening', fee: 15000, desc: 'SEO, social media marketing, email campaigns, analytics and content strategy.', req: 'KCSE Certificate or equivalent. Basic computer skills.', careers: 'Digital Marketer, Social Media Manager, SEO Specialist, Content Creator' },
    { slug: 'short-entrepreneurship', title: 'Short Course: Entrepreneurship & Startup', level: 'Short Course', dept: 'Business', duration: '2 Months', intake: 'Monthly', modes: 'Weekend', fee: 12000, desc: 'Business planning, fundraising, market research and lean startup methodology.', req: 'Open to all with KCSE certificate or working experience.', careers: 'Entrepreneur, Business Development Officer, Startup Founder' },
    { slug: 'cert-pharmacy', title: 'Certificate in Pharmacy Technician', level: 'Certificate', dept: 'Health Sciences', duration: '2 Years', intake: 'September', modes: 'Full-time', fee: 55000, desc: 'Pharmaceutical dispensing, drug interactions, healthcare regulation and patient care.', req: 'KCSE Grade C+ with Chemistry and Biology.', careers: 'Pharmacy Technician, Pharmaceutical Sales Rep, Hospital Pharmacy Staff' },
    { slug: 'short-plumbing', title: 'Short Course: Plumbing & Water Technology', level: 'Short Course', dept: 'Engineering', duration: '6 Months', intake: 'September, January', modes: 'Full-time', fee: 22000, desc: 'Pipe fitting, water supply systems, sanitation and drainage technology.', req: 'KCSE Certificate or equivalent.', careers: 'Plumber, Water Systems Technician, Sanitation Officer' },
  ];

  for (const p of programs) {
    await pool.query(`
      INSERT INTO programs (slug, title, level, department, description, duration, intake_months, study_modes, annual_fee, requirements, career_prospects, is_active, is_featured)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,$12)
      ON CONFLICT (slug) DO UPDATE SET
        title=$2, level=$3, description=$5, duration=$6, annual_fee=$9, updated_at=NOW()
    `, [p.slug, p.title, p.level, p.dept, p.desc, p.duration, p.intake, p.modes, p.fee, p.req, p.careers,
        ['diploma-it','diploma-business','cert-community-health','cert-accounting'].includes(p.slug)]);
  }
  console.log(`   ${programs.length} programs seeded`);

  // ── News Articles ──────────────────────────────────────────────────────────
  const adminRes = await pool.query(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
  const adminId = adminRes.rows[0]?.id;

  const newsItems = [
    { slug: '2024-2025-applications-open', title: '2024/2025 Academic Year Applications Now Open', excerpt: 'The admissions portal is now open for the new academic year. Apply before August 30, 2024.', category: 'Admissions', tag: 'Important', featured: true, content: 'St Johns Training College is pleased to announce that applications for the 2024/2025 academic year are now officially open.\n\nProspective students can apply online through our student portal for all certificate, diploma, and short course programs.\n\nKey Dates:\n- Application Period: July 1 – August 30, 2024\n- Intake Date: September 2, 2024\n- Orientation Week: September 2–6, 2024\n\nApply early as spaces are limited across all programs. Our admissions team is available Monday to Friday, 8am to 5pm to assist with queries.\n\nVisit our application portal or call +254 700 000 000 for more information.' },
    { slug: 'graduation-ceremony-2025', title: 'Annual Graduation Ceremony: Class of 2024', excerpt: 'Join us as we celebrate the achievements of our graduating class on August 10, 2024.', category: 'Events', tag: 'Upcoming', featured: false, content: 'St Johns Training College will hold its Annual Graduation Ceremony for the Class of 2024 on August 10, 2024 at 10:00am.\n\nThe ceremony will be held at the College Main Auditorium.\n\nThis year\'s graduating class comprises over 600 students from all programs.\n\nThe ceremony will be presided over by the Principal, Dr. James Mwangi, with special guests from the Ministry of Education and industry partners.\n\nGuests must present their invitation letters at the gate. The ceremony will also be livestreamed on our official YouTube channel.' },
    { slug: 'mou-tech-companies-2025', title: 'St Johns Signs MOU with Three Leading Tech Companies', excerpt: 'New partnerships with Safaricom, Andela, and Cellulant for internships and curriculum development.', category: 'Partnerships', tag: 'New', featured: false, content: 'St Johns Training College has formalized Memoranda of Understanding with three leading technology companies: Safaricom PLC, Andela, and Cellulant.\n\nThese partnerships will provide:\n- Guaranteed internship placements for IT diploma students\n- Industry mentorship programs\n- Curriculum review and alignment with industry needs\n- Graduate fast-track recruitment programs\n\nThe Principal described the partnerships as a milestone in bridging the gap between academic training and industry requirements.' },
    { slug: 'best-tvet-2024', title: 'St Johns Ranked Best TVET Institution in Nairobi County', excerpt: 'Recognized by KNQA for outstanding academic quality, governance, and graduate employment rates.', category: 'Achievements', tag: 'Award', featured: false, content: 'St Johns Training College has been ranked the best Technical and Vocational Education and Training (TVET) institution in Nairobi County by the Kenya National Qualifications Authority (KNQA).\n\nThe award was based on:\n- Academic quality and examination results\n- Graduate employment rates (98% within 6 months)\n- Institutional governance and management\n- Student welfare programs\n- Industry partnership strength\n\nThe award was received by the Principal during the Annual TVET Excellence Awards in Nairobi.' },
    { slug: 'scholarship-fund-2024', title: 'New Scholarship Fund for Needy but Brilliant Students', excerpt: 'The St Johns Foundation launches a fund supporting talented students from disadvantaged backgrounds.', category: 'Admissions', tag: 'Scholarship', featured: false, content: 'The St Johns College Foundation has launched a new scholarship fund to support academically talented students from disadvantaged backgrounds.\n\nThe fund will:\n- Cover up to 100% of tuition fees for qualifying students\n- Provide monthly stipends for living expenses\n- Offer mentorship from alumni and industry professionals\n\nEligibility: Students must demonstrate financial need, academic excellence (KCSE B+ or above), and leadership potential.\n\nApplications open July 1, 2024. Contact admissions for application forms.' },
  ];

  for (const n of newsItems) {
    const readTime = Math.ceil(n.content.split(' ').length / 200) + ' min';
    await pool.query(`
      INSERT INTO news (slug, title, excerpt, content, category, tag, is_featured, is_published, author_id, read_time)
      VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,$9)
      ON CONFLICT (slug) DO UPDATE SET title=$2, updated_at=NOW()
    `, [n.slug, n.title, n.excerpt, n.content, n.category, n.tag, n.featured, adminId, readTime]);
  }
  console.log(`   ${newsItems.length} news articles seeded`);

  // ── Demo Applications ──────────────────────────────────────────────────────
  const demoApps = [
    { ref: 'SJC-001001', fn: 'Grace',  ln: 'Wanjiku', email: 'grace@example.com',   phone: '+254712000001', dob: '2002-03-15', gender: 'Female', id_num: '34500001', program: 'Diploma in Information Technology', intake: 'September 2024', mode: 'Full-time', grade: 'B+', school: 'Alliance Girls High School', year: 2022, status: 'approved' },
    { ref: 'SJC-001002', fn: 'Daniel', ln: 'Omondi',  email: 'daniel@example.com',  phone: '+254712000002', dob: '2001-07-22', gender: 'Male',   id_num: '34500002', program: 'Diploma in Business Administration', intake: 'September 2024', mode: 'Part-time', grade: 'B', school: 'Strathmore School', year: 2021, status: 'under_review' },
    { ref: 'SJC-001003', fn: 'Fatuma', ln: 'Hassan',  email: 'fatuma@example.com',  phone: '+254712000003', dob: '2003-11-05', gender: 'Female', id_num: '34500003', program: 'Certificate in Community Health', intake: 'September 2024', mode: 'Full-time', grade: 'C+', school: 'Eastleigh High School', year: 2023, status: 'pending' },
    { ref: 'SJC-001004', fn: 'Peter',  ln: 'Kimani',  email: 'peter@example.com',   phone: '+254712000004', dob: '2000-05-18', gender: 'Male',   id_num: '34500004', program: 'Diploma in Electrical Engineering', intake: 'September 2024', mode: 'Full-time', grade: 'B-', school: 'Kenya High School', year: 2020, status: 'pending' },
    { ref: 'SJC-001005', fn: 'Amina',  ln: 'Mwangi',  email: 'amina@example.com',   phone: '+254712000005', dob: '2002-09-30', gender: 'Female', id_num: '34500005', program: 'Certificate in Accounting & Finance', intake: 'January 2025', mode: 'Evening', grade: 'C+', school: 'Moi Girls High School', year: 2022, status: 'under_review' },
  ];

  for (const a of demoApps) {
    await pool.query(`
      INSERT INTO applications (
        reference_number, first_name, last_name, email, phone,
        date_of_birth, gender, id_number, school_name, kcse_year,
        kcse_grade, program, intake, study_mode, status, declaration_accepted
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE)
      ON CONFLICT (reference_number) DO NOTHING
    `, [a.ref, a.fn, a.ln, a.email, a.phone, a.dob, a.gender, a.id_num,
        a.school, a.year, a.grade, a.program, a.intake, a.mode, a.status]);
  }
  console.log(`   ${demoApps.length} demo applications seeded`);

  console.log('\n Seed complete!\n');
  console.log('  Admin login  : ' + (process.env.ADMIN_EMAIL || 'admin@stjohnscollege.ac.ke'));
  console.log('  Admin pass   : ' + (process.env.ADMIN_PASSWORD || 'Admin@2024'));
  console.log('  Student login: grace@example.com / Student@2024\n');
}

// Allow running standalone
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'stjohns_college',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });
  seedDatabase(pool).then(() => pool.end()).catch(console.error);
}

module.exports = { seedDatabase };
