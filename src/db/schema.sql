-- ============================================================
-- St Johns Training College — PostgreSQL Database Schema
-- Run:  psql -U postgres -d stjohns_college -f schema.sql
-- Or:   node src/db/setup.js
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS TABLE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  phone           VARCHAR(30),
  password_hash   VARCHAR(255) NOT NULL,
  role            VARCHAR(20) NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'admin', 'staff')),
  is_active       BOOLEAN DEFAULT TRUE,
  email_verified  BOOLEAN DEFAULT FALSE,
  profile_photo   VARCHAR(500),
  last_login      TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ─── APPLICATIONS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id                   SERIAL PRIMARY KEY,
  reference_number     VARCHAR(30) UNIQUE NOT NULL,
  user_id              INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Personal Information
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  email                VARCHAR(255) NOT NULL,
  phone                VARCHAR(30) NOT NULL,
  date_of_birth        DATE,
  gender               VARCHAR(20),
  id_number            VARCHAR(50),
  nationality          VARCHAR(80) DEFAULT 'Kenyan',
  county               VARCHAR(80),

  -- Academic Background
  school_name          VARCHAR(200),
  kcse_year            SMALLINT,
  kcse_grade           VARCHAR(5),
  other_qualification  TEXT,

  -- Program Selection
  program              VARCHAR(300) NOT NULL,
  intake               VARCHAR(100) NOT NULL,
  study_mode           VARCHAR(60),
  sponsorship          VARCHAR(100),

  -- Documents (file paths)
  doc_kcse_result      VARCHAR(500),
  doc_national_id      VARCHAR(500),
  doc_photo            VARCHAR(500),
  doc_other            VARCHAR(500),

  -- Status & Review
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','under_review','approved','rejected','enrolled','withdrawn')),
  review_notes         TEXT,
  reviewed_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at          TIMESTAMP WITH TIME ZONE,

  -- Offer Letter
  offer_sent           BOOLEAN DEFAULT FALSE,
  offer_sent_at        TIMESTAMP WITH TIME ZONE,

  -- Flags
  marketing_consent    BOOLEAN DEFAULT FALSE,
  declaration_accepted BOOLEAN DEFAULT FALSE NOT NULL,

  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status       ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email        ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_program      ON applications(program);
CREATE INDEX IF NOT EXISTS idx_applications_user_id      ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_intake       ON applications(intake);
CREATE INDEX IF NOT EXISTS idx_applications_ref          ON applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_applications_created      ON applications(created_at DESC);

-- ─── NEWS / EVENTS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(300) UNIQUE NOT NULL,
  title       VARCHAR(500) NOT NULL,
  excerpt     TEXT,
  content     TEXT NOT NULL,
  category    VARCHAR(100) NOT NULL DEFAULT 'Announcements',
  tag         VARCHAR(80),
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  cover_image VARCHAR(500),
  read_time   VARCHAR(20),
  views       INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_slug      ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_category  ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_featured  ON news(is_featured);

-- ─── PROGRAMS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programs (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(200) UNIQUE NOT NULL,
  title           VARCHAR(300) NOT NULL,
  level           VARCHAR(50) NOT NULL CHECK (level IN ('Certificate','Diploma','Short Course')),
  department      VARCHAR(200),
  description     TEXT,
  duration        VARCHAR(80),
  intake_months   VARCHAR(200),
  study_modes     VARCHAR(200),
  annual_fee      DECIMAL(10,2),
  requirements    TEXT,
  career_prospects TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,
  student_count   INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programs_level    ON programs(level);
CREATE INDEX IF NOT EXISTS idx_programs_active   ON programs(is_active);
CREATE INDEX IF NOT EXISTS idx_programs_featured ON programs(is_featured);

-- ─── CONTACT MESSAGES TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(30),
  department  VARCHAR(150),
  subject     VARCHAR(400) NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  is_replied  BOOLEAN DEFAULT FALSE,
  replied_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  replied_at  TIMESTAMP WITH TIME ZONE,
  ip_address  VARCHAR(60),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_read    ON contact_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_contact_email   ON contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at DESC);

-- ─── PASSWORD RESET TOKENS TABLE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reset_token   ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_user_id ON password_reset_tokens(user_id);

-- ─── NOTIFICATIONS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(300) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) DEFAULT 'info'
                CHECK (type IN ('info','success','warning','error','application')),
  is_read     BOOLEAN DEFAULT FALSE,
  link        VARCHAR(500),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);

-- ─── AUDIT LOG TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(100),
  entity_id   INTEGER,
  details     JSONB,
  ip_address  VARCHAR(60),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id  ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity   ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_log(created_at DESC);

-- ─── AUTO-UPDATE updated_at TRIGGER ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','applications','news','programs'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I;
      CREATE TRIGGER trigger_update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;
