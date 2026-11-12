# Aaroha Academy - Enterprise LMS

Production-grade Learning Management System calibrated for Hostinger Shared Web Hosting (LAMP / LiteSpeed stack) with zero impact on the root domain `aaroha-inc.com`.

Target URL: `https://lms.aaroha-inc.com`

---

## 1. Architecture Overview

- `database/schema.sql`: Complete MySQL DDL schema ready to import into Hostinger phpMyAdmin.
- `backend/`: Lightweight, standalone PHP 8 REST API (native PDO, HMAC-SHA256 JWT, zero Composer dependencies, FastCGI `.htaccess` routing).
- `frontend/`: Reactive executive interface (React + Vite + Tailwind CSS), compiled to static assets (`dist/`).

---

## 2. Hostinger hPanel Deployment Guide (Zero Impact on Main Domain)

### Step 1: Create the Subdomain
1. Log in to Hostinger hPanel.
2. Go to **Websites** -> Manage `aaroha-inc.com`.
3. Under **Domains**, click **Subdomains**.
4. Enter `lms` as the subdomain name.
5. Check **Custom folder for subdomain** and set it to:
   `public_html/lms`
6. Click **Create**.
7. In **SSL** tab, ensure the free Let's Encrypt SSL certificate is active for `lms.aaroha-inc.com`.

### Step 2: Database Setup via phpMyAdmin
1. In hPanel, go to **Databases** -> **MySQL Databases**.
2. Create a new database (e.g. `u123456789_lms`).
3. Create a database user and record the generated password.
4. Click **Enter phpMyAdmin** next to the newly created database.
5. Click the **Import** tab at the top.
6. Choose `database/schema.sql` and click **Go**.

### Step 3: 1-Click Upload via hostinger_deploy.zip (Recommended)
1. In Hostinger File Manager, navigate to `public_html/lms/`.
2. Click **Upload** -> select the generated archive `aaroha_lms/hostinger_deploy.zip`.
3. Right-click `hostinger_deploy.zip` in File Manager and click **Extract**.
4. Inside `public_html/lms/api/config/`:
   - Copy `env.php.example` and rename it to `env.php`.
   - Update with your Hostinger database details:
     ```php
     return [
         'DB_HOST' => 'localhost',
         'DB_NAME' => 'u123456789_lms',
         'DB_USER' => 'u123456789_user',
         'DB_PASS' => 'your_database_password',
         'JWT_SECRET' => 'your_strong_jwt_secret_key',
     ];
     ```
5. Delete `hostinger_deploy.zip` from `public_html/lms/`.

Done! Your enterprise LMS is live at `https://lms.aaroha-inc.com`!

---

## 3. Two-Role Access Architecture

- **Guest (Unauthenticated)**:
  - Browse full curriculum directory and course outcomes.
  - Inspect syllabi and stream **Free Preview** lectures without an account.
  - Clicking **Enroll** prompts sign in or account registration.

- **Fellow / Student (Authenticated)**:
  - Access enrolled lectures and track personal progress percentages.
  - Submit technical project deliverables (RFC documents, repository links).
  - Review faculty evaluation scores and constructive remarks.

- **Faculty Director / Admin (Authenticated)**:
  - Full CRUD across Courses, Modules, and Lectures.
  - Author evaluated project deliverables with custom rubrics and passing thresholds.
  - Access the **Evaluation Queue** to grade student deliverables and return feedback.
