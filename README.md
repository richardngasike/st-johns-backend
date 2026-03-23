# St Johns Training College — Backend API

Express.js + PostgreSQL REST API for the St Johns Training College web platform.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `.env` and fill in your values:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stjohns_college
DB_USER=postgres
DB_PASSWORD=your_password_here

JWT_SECRET=change_this_to_a_long_random_string

EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 3. Set Up Database
Make sure PostgreSQL is running, then:
```bash
npm run db:setup
```
This will:
- Create the `stjohns_college` database
- Apply the full schema (tables, indexes, triggers)
- Seed admin user, demo student, programs, news, and sample applications

### 4. Start Server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server runs at: **http://localhost:5000**

---

## Default Credentials (after seeding)

| Role    | Email                              | Password      |
|---------|------------------------------------|---------------|
| Admin   | admin@stjohnscollege.ac.ke         | Admin@2024    |
| Student | grace@example.com                  | Student@2024  |

> **Change these immediately in production!**

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| POST   | /register             | Public  | Create student account   |
| POST   | /login                | Public  | Student/staff login      |
| POST   | /admin-login          | Public  | Admin login              |
| GET    | /me                   | Auth    | Get current user         |
| PUT    | /change-password      | Auth    | Change password          |
| POST   | /forgot-password      | Public  | Request password reset   |
| POST   | /reset-password       | Public  | Reset with token         |

### Applications (`/api/applications`)
| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| POST   | /                     | Public  | Submit application       |
| GET    | /                     | Admin   | Get all applications     |
| GET    | /stats                | Admin   | Application statistics   |
| GET    | /user/:userId         | Auth    | Get user's applications  |
| GET    | /:id                  | Auth    | Get single application   |
| PATCH  | /:id/status           | Admin   | Update status            |
| DELETE | /:id                  | Admin   | Delete application       |

### News (`/api/news`)
| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| GET    | /                     | Public  | List published articles  |
| GET    | /categories           | Public  | News categories + counts |
| GET    | /:idOrSlug            | Public  | Get single article       |
| POST   | /                     | Admin   | Create article           |
| PUT    | /:id                  | Admin   | Update article           |
| DELETE | /:id                  | Admin   | Delete article           |

### Programs (`/api/programs`)
| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| GET    | /                     | Public  | List all programs        |
| GET    | /:idOrSlug            | Public  | Get single program       |
| POST   | /                     | Admin   | Create program           |
| PUT    | /:id                  | Admin   | Update program           |

### Contact (`/api/contact`)
| Method | Endpoint              | Access  | Description              |
|--------|-----------------------|---------|--------------------------|
| POST   | /                     | Public  | Submit contact message   |
| GET    | /                     | Admin   | Get all messages         |
| PATCH  | /:id/read             | Admin   | Mark as read             |
| POST   | /:id/reply            | Admin   | Reply to message         |
| DELETE | /:id                  | Admin   | Delete message           |

### Users (`/api/users`)
| Method | Endpoint                    | Access  | Description              |
|--------|-----------------------------|---------|--------------------------|
| GET    | /                           | Admin   | List all users           |
| GET    | /profile                    | Auth    | Get own profile          |
| PUT    | /profile                    | Auth    | Update own profile       |
| GET    | /notifications              | Auth    | Get notifications        |
| PATCH  | /notifications/:id/read     | Auth    | Mark notification read   |
| PATCH  | /:id/toggle-status          | Admin   | Activate/deactivate user |

---

## File Uploads

Files uploaded via the application form are stored in `uploads/`:
```
uploads/
  documents/   — KCSE certificates, national IDs
  photos/      — Passport photos
  news/        — News cover images
```

Accessible at: `http://localhost:5000/uploads/documents/filename.pdf`

---

## Email Setup

The system uses Nodemailer. For Gmail:
1. Enable 2FA on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use that password in `EMAIL_PASSWORD`

If `EMAIL_USER` / `EMAIL_PASSWORD` are not set, emails are logged to console in development mode (no crash).

---

## Project Structure

```
backend/
├── server.js              — Express app entry point
├── package.json
├── .env                   — Environment variables (edit this!)
├── src/
│   ├── db/
│   │   ├── index.js       — PostgreSQL pool + query helpers
│   │   ├── schema.sql     — Full database schema
│   │   ├── setup.js       — DB setup script (creates DB + applies schema + seeds)
│   │   └── seed.js        — Seed data (admin, programs, news, demo apps)
│   ├── routes/            — Express route definitions
│   │   ├── auth.js
│   │   ├── applications.js
│   │   ├── news.js
│   │   ├── contact.js
│   │   ├── users.js
│   │   └── programs.js
│   ├── controllers/       — Business logic
│   │   ├── authController.js
│   │   ├── applicationController.js
│   │   ├── newsController.js
│   │   ├── contactController.js
│   │   ├── usersController.js
│   │   └── programsController.js
│   ├── middleware/
│   │   ├── auth.js        — JWT authentication + role guards
│   │   ├── errorHandler.js — Global error handler + 404
│   │   ├── validators.js  — express-validator rules
│   │   └── upload.js      — Multer file upload config
│   └── utils/
│       └── email.js       — Nodemailer + HTML email templates
└── uploads/               — Auto-created on first file upload
```

---

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use `DATABASE_URL` instead of individual DB params
3. Set `CORS_ORIGIN` to your frontend domain
4. Set a strong `JWT_SECRET` (32+ random characters)
5. Use a process manager: `pm2 start server.js --name stjohns-api`
6. Put behind Nginx reverse proxy with SSL

```nginx
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```
# st-johns-backend
