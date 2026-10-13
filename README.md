# Edo State University Contractor Registration & Verification System

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Svelte](https://img.shields.io/badge/Svelte-4.x-orange.svg)](https://svelte.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-blue.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

A modern, secure, and end-to-end web portal built for **Edo State University Uzairue (EDSU)** to streamline contractor registration, statutory document verification, categorized registration fee processing via Remita, real-time administrative auditing, and vendor management.

---

## Table of Contents

1. [System Overview & Architecture](#system-overview--architecture)
2. [Project Directory Layout](#project-directory-layout)
3. [Prerequisites](#prerequisites)
4. [Database Setup & Master Initialization](#database-setup--master-initialization)
5. [Environment Variables Configuration](#environment-variables-configuration)
6. [Running Locally in Development Mode](#running-locally-in-development-mode)
7. [Production Deployment & Release Guide](#production-deployment--release-guide)
   - [Automated Deployment Script](#automated-deployment-script)
   - [Process Management with PM2](#process-management-with-pm2)
   - [Apache 2.4 Reverse Proxy Setup (`/contractor`)](#apache-24-reverse-proxy-setup-contractor)
8. [Comprehensive User Guide & Workflows](#comprehensive-user-guide--workflows)
   - [Contractor Workflow](#contractor-workflow)
   - [Administrative & Super Admin Workflow](#administrative--super-admin-workflow)
9. [Default Credentials & Initial Access](#default-credentials--initial-access)
10. [REST API Endpoints Reference](#rest-api-endpoints-reference)
11. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## System Overview & Architecture

The application is structured as a decoupled client-server architecture:

```
┌──────────────────────────────────────────────────────────────┐
│                    Web Browser (Client)                      │
│            Svelte 4 + Vite + Bootstrap 5 Theme               │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTPS / WSS
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                  Apache Web Server (Port 80/443)             │
│   • Subpath Proxy: /contractor/ ──► Node.js Port 3000        │
│   • WebSocket Proxy: /socket.io ──► Socket.io Server         │
│   • Primary App:    /           ──► ASP.NET Core MVC (5000)  │
└───────────────────────────────┬──────────────────────────────┘
                                │ ProxyPass
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               Node.js & Express API Backend (Port 3000)      │
│   • JWT Authentication & Role-Based Access (Admin / User)    │
│   • Multer Document & Profile Picture Uploads                │
│   • Remita Payment Gateway Integration (RRR & Verification)  │
│   • Socket.io Real-Time Messaging & Notifications            │
└───────────────────────────────┬──────────────────────────────┘
                                │ Connection Pool
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                   MySQL Relational Database                  │
│       Tables: users, contractors, categories, payments,      │
│       documents, verifications, messages, notices, settings  │
└──────────────────────────────────────────────────────────────┘
```

- **Frontend:** Svelte 4, Vite 5, TypeScript, Bootstrap 5, Dreams LMS Theme, SweetAlert2, Socket.io-client.
- **Backend:** Node.js, Express.js, MySQL (via `mysql2/promise` connection pool), JWT, bcryptjs, Multer, Helmet, Winston logger.
- **Payment Gateway:** Remita Inline Payment integration with backend SHA-512 transaction verification.

---

## Project Directory Layout

```text
contractorsystem/
├── backend/                        # Node.js Express API & Database services
│   ├── config/                     # Database connection pool configuration
│   ├── controllers/                # Business logic handlers
│   ├── middleware/                 # Auth verification, rate limiting, error handlers
│   ├── routes/                     # Modular route handlers (auth, admin, contractor, payment)
│   ├── uploads/                    # Physical document and profile picture upload storage
│   ├── .env.example                # Backend environment configuration template
│   ├── ecosystem.config.js         # PM2 production process configuration
│   ├── init-db.js                  # Master idempotent database migration & seeding script
│   ├── package.json                # Backend dependencies and scripts
│   └── server.js                   # Main application entry point & Socket.io server
├── frontend/                       # Svelte Single Page Application (SPA)
│   ├── public/                     # Static assets, themes, vendor CSS/JS, and logos
│   │   ├── assets/                 # Bootstrap, iconsax, plugins (css, fonts, js)
│   │   └── images/                 # Official Edo State University crest logo and icons
│   ├── src/                        # Svelte components and state management
│   │   ├── lib/                    # Subpath-aware router wrapper
│   │   ├── utils/                  # Remita inline payment and alert utilities
│   │   ├── App.svelte              # Main application router
│   │   ├── Login.svelte            # Contractor and administrator login portal
│   │   ├── Registration.svelte     # Step-by-step contractor onboarding and payment
│   │   ├── ContractorLayout.svelte # Contractor portal layout with header & sidebar
│   │   ├── AdminDashboard.svelte   # Administrative metrics and overview
│   │   ├── VerificationCenter.svelte# Document approval and rejection center
│   │   ├── constants.ts            # Global application URLs and subpath constants
│   │   └── main.ts                 # Frontend entry point
│   ├── .env.example                # Frontend environment configuration template
│   ├── .env.production             # Production environment overrides (/contractor)
│   ├── package.json                # Frontend dependencies and build scripts
│   └── vite.config.ts              # Vite configuration with subpath base and aliases
├── apache-contractor.conf          # Pre-configured Apache 2.4 Reverse Proxy block
├── deploy.sh                       # One-command production build and deployment script
├── package.json                    # Root task runner scripts
└── README.md                       # Comprehensive system guide (this document)
```

---

## Prerequisites

Ensure the following tools and software are installed on your workstation or production server:

1. **Node.js:** v18.x or v20.x LTS ([Download Node.js](https://nodejs.org/))
2. **NPM:** v9.x or v10.x (bundled with Node.js)
3. **MySQL Server:** v5.7+ or v8.0+ ([Download MySQL](https://dev.mysql.com/downloads/mysql/))
4. **Git:** v2.30+
5. **(Optional for Production):** PM2 (`npm install -g pm2`) and Apache HTTP Server (`apache2`).

---

## Database Setup & Master Initialization

The system includes an idempotent database setup script located at [`backend/init-db.js`](file:///home/edsu-dev/Documents/dev/contractorsystem/backend/init-db.js).

This script performs the following automatically:
1. Connects to MySQL using your `.env` credentials.
2. Creates the database `contractor_registration` (or your configured `DB_NAME`) if it does not already exist.
3. Creates all 11 relational tables with foreign keys and `utf8mb4` encoding:
   - `users`: Administrator and staff credentials.
   - `categories`: Contractor business categories and registration fee tiers.
   - `contractors`: Registered contractor profiles, CAC numbers, addresses, and statuses.
   - `documents`: Uploaded CAC certificates, tax clearance, and company profiles.
   - `payments`: Remita payment logs, RRR numbers, amounts, and transaction statuses.
   - `verifications`: Audit trails of approvals, rejections, and review comments.
   - `messages`: Real-time chat messages between contractors and admins.
   - `notifications`: In-app status alerts.
   - `settings`: System-wide settings and registration fee defaults.
   - `notices`: Official public notices displayed on the portal.
   - `system_logs`: Administrative actions and audit logging.
4. Pre-seeds the 6 official contractor categories:
   - *Works & Civil Construction* (₦50,000)
   - *ICT & Telecommunications Services* (₦35,000)
   - *Goods & General Supplies* (₦25,000)
   - *Consultancy & Professional Services* (₦30,000)
   - *Facility Management & Maintenance* (₦20,000)
   - *Electrical & Mechanical Engineering* (₦40,000)
5. Pre-seeds the default Super Administrator account.

### How to Run the Database Setup

From the project root:
```bash
npm run init-db
```
Or directly inside the `backend` folder:
```bash
cd backend
npm run init-db
```

---

## Environment Variables Configuration

Both the frontend and backend require configuration files. Template examples are provided.

### 1. Backend Configuration (`backend/.env`)

Copy the template:
```bash
cp backend/.env.example backend/.env
```

Edit [`backend/.env`](file:///home/edsu-dev/Documents/dev/contractorsystem/backend/.env):
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=contractor_registration

# JWT Authentication Secret
JWT_SECRET=super_secret_jwt_key_please_change_for_production

# Remita Payment Gateway (Live or Demo Credentials)
REMITA_MERCHANT_ID=your_remita_merchant_id
REMITA_API_KEY=your_remita_api_key
REMITA_BASE_URL=https://login.remita.net
REMITA_TEST_BASE_URL=https://remitademo.net

# Optional: Allowed CORS Origins
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
SOCKET_PATH=/socket.io
```

### 2. Frontend Configuration (`frontend/.env`)

Copy the template:
```bash
cp frontend/.env.example frontend/.env
```

Edit [`frontend/.env`](file:///home/edsu-dev/Documents/dev/contractorsystem/frontend/.env):
```env
# Backend API Base URL
VITE_API_URL=http://localhost:3000

# Base Path (defaults to / in development mode)
VITE_BASE_PATH=/

# Remita Public Key & Inline Javascript
VITE_REMITA_PUBLIC_KEY=your_remita_public_key
VITE_REMITA_SCRIPT_URL=https://login.remita.net/payment/v1/remita-pay-inline.bundle.js
```

---

## Running Locally in Development Mode

Follow these steps to run the application on your development machine:

### Step 1: Install Dependencies

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Initialize Database

Ensure your MySQL service is running, then execute:
```bash
cd backend
npm run init-db
```

### Step 3: Start the Backend API Server

```bash
cd backend
npm run dev
```
*The backend API will start on **http://localhost:3000** with live file-watching via Nodemon.*

### Step 4: Start the Frontend Dev Server

Open a second terminal window:
```bash
cd frontend
npm run dev
```
*The frontend Vite dev server will start on **http://localhost:5173**.*

### Step 5: Access the Application

Open your browser and navigate to:
- **Contractor Portal / Login:** `http://localhost:5173/` (or `http://localhost:5173/contractor/`)
- **New Contractor Registration:** `http://localhost:5173/registration`
- **Backend Health Check:** `http://localhost:3000/api/settings`

---

## Production Deployment & Release Guide

The application is engineered to be deployed seamlessly under the subpath `/contractor` alongside other applications (such as an ASP.NET Core MVC application running on `/`).

### Automated Deployment Script

We have provided an automated deployment script [`deploy.sh`](file:///home/edsu-dev/Documents/dev/contractorsystem/deploy.sh):

```bash
chmod +x deploy.sh
./deploy.sh
```

This script:
1. Validates your Node.js and NPM environments.
2. Installs backend production packages and runs database migrations.
3. Builds the frontend using the production configuration (`base: /contractor/`).
4. Generates the optimized static distribution in `frontend/dist/`.

---

### Process Management with PM2

Run and maintain the backend Node.js process using PM2:

1. **Install PM2 globally** (if not already installed):
   ```bash
   sudo npm install -g pm2
   ```

2. **Start the application using the included ecosystem file:**
   ```bash
   cd backend
   pm2 start ecosystem.config.js --env production
   ```

3. **Useful PM2 management commands:**
   ```bash
   pm2 status                          # View process status
   pm2 logs contractor-api             # Stream live application logs
   pm2 restart contractor-api          # Restart the server
   pm2 reload contractor-api           # Zero-downtime reload
   pm2 save                            # Save current list across reboots
   sudo pm2 startup                    # Configure PM2 to start on system boot
   ```

---

### Apache 2.4 Reverse Proxy Setup (`/contractor`)

When hosting the Node.js application under the `/contractor` URL on an Apache server where the root `/` is used by another application (e.g., ASP.NET Core on port 5000), place the reverse proxy directives **before** the root catch-all rule.

A ready-to-use configuration file is provided in [`apache-contractor.conf`](file:///home/edsu-dev/Documents/dev/contractorsystem/apache-contractor.conf).

#### 1. Enable Required Apache Modules
```bash
sudo a2enmod proxy proxy_http proxy_wstunnel headers rewrite
```

#### 2. Configure VirtualHost Directive

Add the following block inside your existing `/etc/apache2/sites-available/your-site.conf`:

```apache
<VirtualHost *:80>
    ServerName portal.edsu.edu.ng

    # ====================================================================
    # 1. Contractor Portal (Node.js + Svelte on Port 3000)
    # ====================================================================

    # Forward WebSocket connections for Socket.io real-time chat
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/contractor/socket.io/(.*) ws://127.0.0.1:3000/socket.io/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/socket.io/(.*) ws://127.0.0.1:3000/socket.io/$1 [P,L]

    # Proxy all /contractor traffic to Node.js backend
    ProxyPass /contractor/ http://127.0.0.1:3000/contractor/
    ProxyPassReverse /contractor/ http://127.0.0.1:3000/contractor/

    # Allow uploaded documents/images
    ProxyPass /uploads/ http://127.0.0.1:3000/uploads/
    ProxyPassReverse /uploads/ http://127.0.0.1:3000/uploads/

    # Allow standard socket.io HTTP polling
    ProxyPass /socket.io/ http://127.0.0.1:3000/socket.io/
    ProxyPassReverse /socket.io/ http://127.0.0.1:3000/socket.io/

    # ====================================================================
    # 2. Existing ASP.NET Core MVC Application (Port 5000)
    # ====================================================================
    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/

    # Error and Access logs
    ErrorLog ${APACHE_LOG_DIR}/contractor_error.log
    CustomLog ${APACHE_LOG_DIR}/contractor_access.log combined
</VirtualHost>
```

#### 3. Test & Reload Apache
```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## Comprehensive User Guide & Workflows

### Contractor Workflow

#### 1. Registration & Payment
- Navigate to `/contractor/registration`.
- Enter company details: Company Name, Corporate Email, Phone Number, CAC Registration Number, Tax Identification Number (TIN), Physical Address, and desired Password.
- Select your **Company Category** (e.g. *Works & Civil Construction*). The application will calculate the dynamic registration fee.
- Click **Proceed to Payment**. Remita's secure inline modal opens with a unique Remita Retrieval Reference (RRR).
- Complete payment via Card, Bank Transfer, USSD, or Remita Wallet.
- Upon successful payment verification, the account is activated and the contractor is automatically redirected to the dashboard.

#### 2. Document Submission
- After logging in, the contractor visits the **Documents** section.
- Mandatory statutory documents must be uploaded in PDF format:
  - CAC Certificate of Incorporation
  - Form CAC 1.1 / Status Report
  - 3-Year Tax Clearance Certificate (TCC)
  - PENCOM Compliance Certificate
  - Industrial Training Fund (ITF) Certificate
  - NSITF Clearance Certificate
  - Company Profile & Executed Job Evidence
- Document status starts as `Pending Review`.

#### 3. Tracking Verification Status
- The contractor's profile display badge reflects real-time status:
  - `Pending`: Incomplete profile or unsubmitted documents.
  - `Under Review`: Documents submitted and under administrative assessment.
  - `Verified / Approved`: Fully approved by the University Procurement Board. An official certificate of registration becomes available for download.
  - `Action Required / Rejected`: Admin remarks indicate which document must be re-uploaded.

#### 4. Support & Direct Messaging
- Contractors can use the **Messages** module to chat directly with university procurement officers regarding queries or document clarifications.

---

### Administrative & Super Admin Workflow

#### 1. Admin Login
- Access the login page at `/contractor/login`.
- Enter your Admin username and password.

#### 2. Dashboard Analytics
- View total registered contractors, active verifications, pending approvals, and total fee revenue collected via Remita.

#### 3. Verification Center (`/contractor/admin/verification`)
- Review new contractor submissions.
- Click on any contractor to view their CAC details, tax clearance, and preview uploaded PDF certificates in an embedded viewer.
- Choose **Approve Contractor**, **Reject**, or **Request Document Amendment** with mandatory review notes.
- Status updates immediately notify the contractor via in-app alerts and Socket.io.

#### 4. Pricing & Category CMS (`/contractor/admin/categories`)
- Edit contractor business categories.
- Update the registration fee schedule (changes immediately apply to new registrations).

#### 5. Official Notice Board CMS (`/contractor/admin/notices`)
- Publish bulletins, bids, and general announcements.
- Flag critical news as **URGENT** to display high-visibility badges on the contractor login and registration pages.

#### 6. Staff & Role Management (`Super Admin Only`)
- Create procurement officer and auditor accounts.
- Assign roles (`admin` or `super_admin`).
- Deactivate staff accounts when necessary.

---

## Default Credentials & Initial Access

When the database is initialized with `npm run init-db`, the following Super Administrator account is seeded:

| Field | Value |
| :--- | :--- |
| **Username** | `admin` |
| **Email** | `admin@edsu.edu.ng` |
| **Password** | `password123` |
| **Role** | `super_admin` |

> [!WARNING]
> **Production Security Mandate:** Immediately log into the portal as `admin` and change your password under **Profile Settings**, and update `JWT_SECRET` in `backend/.env`.

---

## REST API Endpoints Reference

### Public & Authentication
- `POST /api/register` - New contractor onboarding and registration
- `POST /api/login` - Dual authentication for contractors (email) and administrators (username)
- `POST /api/logout` - Invalidate session & clear HTTP-Only cookies
- `GET /api/settings` - Public portal configuration & registration fee schedules
- `GET /api/categories` - Active contractor categories & tier amounts
- `GET /api/notices` - Public notice board announcements

### Payments (Remita)
- `POST /api/payment/initialize` - Generate Remita RRR for contractor registration
- `POST /api/payment/verify` - Verify transaction status via Remita API and activate account

### Contractor Endpoints (JWT Required)
- `GET /api/contractors/me` - Current contractor profile details
- `PUT /api/contractors/profile` - Update contractor address, phone, and metadata
- `POST /api/contractors/profile-pic` - Upload company profile avatar
- `GET /api/contractors/documents` - List uploaded verification documents
- `POST /api/contractors/documents` - Upload statutory document (PDF)

### Admin & Verification Endpoints (Admin JWT Required)
- `GET /api/admin/dashboard` - High-level metrics & counts
- `GET /api/admin/contractors` - Paginated contractor directory with filtering
- `GET /api/admin/contractors/:id` - Full contractor dossier and documents
- `POST /api/admin/verify` - Approve, reject, or request document changes
- `POST /api/admin/notices` - Create official notice board announcement
- `DELETE /api/admin/notices/:id` - Remove announcement

### Super Admin Endpoints (Super Admin JWT Required)
- `GET /api/super-admin/staff` - List all administrative staff accounts
- `POST /api/super-admin/staff` - Create new admin user
- `PUT /api/super-admin/staff/:id` - Edit user role or status
- `PUT /api/settings` - Update university fees and configuration

---

## Troubleshooting & FAQs

### 1. Styles appear broken or CSS does not load
- Ensure the base path in `frontend/vite.config.ts` matches your hosting environment:
  - Local development: uses `/`
  - Production subpath: uses `/contractor/`
- Run `npm run build` in `frontend/` to recompile assets with the correct base paths.

### 2. Remita modal does not open on checkout
- Verify that `VITE_REMITA_SCRIPT_URL` is accessible from the client machine.
- Verify that `VITE_REMITA_PUBLIC_KEY` in `frontend/.env` matches your Merchant ID in `backend/.env`.

### 3. File upload fails with `413 Payload Too Large` or `File format not supported`
- By default, documents must be uploaded in **PDF format** and profile photos in **JPEG/PNG format**.
- Ensure Apache `LimitRequestBody` and Express Multer limits allow uploads up to 15MB.

### 4. WebSocket chat fails to connect behind Apache
- Verify that `mod_proxy_wstunnel` is enabled in Apache (`sudo a2enmod proxy_wstunnel`).
- Confirm that the `RewriteCond %{HTTP:Upgrade} =websocket` rule is placed before the standard HTTP `ProxyPass` rules.

---

## Support & Ownership

- **Institution:** Edo State University Uzairue, Edo State, Nigeria
- **System:** Contractor Registration and Verification Portal
- **Maintained By:** Information & Communication Technology (ICT) Directorate
