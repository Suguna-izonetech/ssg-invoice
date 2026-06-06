# SSG Invoice Management System

A production-ready Invoice Management System built with FastAPI + React.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, React Query, Recharts
- **Backend**: FastAPI, SQLAlchemy Async, Alembic, PostgreSQL
- **Auth**: JWT Access + Refresh tokens, bcrypt, device restriction (max 2 devices)
- **Storage**: Files stored as BYTEA in PostgreSQL
- **Deployment**: Docker + Docker Compose

## Quick Start

```bash
git clone <repo>
cd invoice-system
docker-compose up --build
```

Open **http://localhost:3000**

## Default Credentials

| Field    | Value          |
|----------|----------------|
| Username | `admin`        |
| Password | `Admin@123456` |

Change these in `backend/.env` before production deployment.

## Features

- 🔐 Secure JWT auth with refresh token rotation
- 📱 Max 2 active device sessions
- 📊 Dashboard with 7 stat cards, 4 charts
- 🧾 Full invoice CRUD with auto-generated invoice numbers (SSG/YY-YY/NNNNN)
- 🏦 10 bank options (SBI, HDFC, ICICI, AXIS, PNB, BOB, CANARA, UNION, IOB, IDBI)
- 📎 File upload/view/download/replace (PDF, JPG, JPEG, PNG stored in PostgreSQL)
- 🔍 Search, filter, sort, paginate invoices
- 📤 Export to CSV and Excel
- 🛡️ Rate limiting, security headers, audit logs, SQL injection protection
- 📱 Fully responsive (mobile, tablet, desktop)

## Environment Variables

Edit `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://invoiceuser:invoicepass@db:5432/invoicedb
JWT_SECRET_KEY=<change-this-64-char-secret>
SECRET_KEY=<change-this-64-char-secret>
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
MAX_ACTIVE_SESSIONS=2
```

## Invoice Number Format

Auto-generated based on financial year:
```
SSG/26-27/00001
SSG/26-27/00002
```
Financial year starts April 1.

## API Documentation

Available at http://localhost:8000/api/docs (only in DEBUG=true mode).

## Project Structure

```
invoice-system/
├── backend/
│   ├── app/
│   │   ├── core/          # Config, database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── repositories/  # DB queries
│   │   ├── services/      # Business logic
│   │   ├── routers/       # API endpoints
│   │   ├── security/      # JWT, dependencies
│   │   └── middleware/    # Rate limit, headers
│   ├── alembic/           # Migrations
│   ├── seed.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # UI, forms, layout
│   │   ├── pages/         # Dashboard, Invoices, Sessions
│   │   ├── services/      # API calls
│   │   ├── contexts/      # Auth context
│   │   └── types/         # TypeScript types
│   └── package.json
└── docker-compose.yml
```

## Security

- JWT access tokens expire in 15 minutes
- Refresh token rotation on every use
- Refresh tokens revoked on logout
- Passwords hashed with bcrypt (12 rounds)
- Max 2 concurrent device sessions
- Rate limiting: 60 req/min per IP
- Security headers (CSP, X-Frame-Options, etc.)
- All inputs validated via Pydantic
- Parameterized queries via SQLAlchemy (SQL injection safe)
- Audit logs for all auth and invoice operations
