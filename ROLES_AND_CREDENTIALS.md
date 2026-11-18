# Aaroha LMS — Roles, Permissions & Default Credentials Reference

This document provides a comprehensive reference of all user roles, permission boundaries, and default credentials configured in Aaroha LMS across both local development environments and the live production platform.

---

## 1. System Roles & Default Credentials

All default seed accounts in development and testing environments are configured with the baseline development password `password123`.

> **Security Note:** In production, any newly onboarded student or faculty member sets their own private password via an expiring (24-hour), single-use activation setup link. Default passwords are never auto-assigned to newly registered users.

| Role Identifier | Role Name | Primary Account Email | Default Password | Workspace Dashboard View | Assigned Modules & Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `super_admin` | Platform Super Administrator | `admin@aaroha-inc.com` | `password123` | Admin Console (`/?view=admin`) | Full platform access (All 18 management modules, audit logs, system settings) |
| `admin` | Institutional Administrator | `admin@aaroha-inc.com` | `password123` | Admin Console (`/?view=admin`) | Full platform access (People, Learning, Engagement, Outcomes, Administration) |
| `coordinator` | Senior Academic Coordinator | `priya.sharma@aaroha-inc.com` | `password123` | Admin Console (`/?view=admin`) | Student onboarding, cohort allocations, schedule, faculty roster, follow-ups |
| `faculty` / `instructor` | Lead Systems & AI Faculty | `elena.rostova@enterprise.io` | `password123` | Admin Console (`/?view=admin`) | Assigned batches, class scheduling, attendance tracking, lesson materials, assessments |
| `faculty` (Senior Faculty) | Cyber Defense Architect | `marcus.vance@aaroha-inc.com` | `password123` | Admin Console (`/?view=admin`) | Assigned cohorts, technical reviews, project evaluations |
| `placement_officer` | Head of Corporate Relations | `placement@aaroha-inc.com` | `password123` | Admin Console (`/?view=admin`) | Placement drive management, student readiness tracking, corporate interviews |
| `accounts` | Finance & Bursar Officer | `accounts@aaroha-inc.com` | `password123` | Admin Console (`/?view=admin`) | Student fee tracking, payment plans, billing status |
| `student` | Enrolled Fellow (Active) | `elena.rostova@enterprise.io` | `password123` | Student Workspace (`/?view=student`) | Enrolled courses, video classroom, RFC submissions, certificates, leaderboard |
| `student` | Enrolled Fellow (Cloud Architecture) | `aarav.patel@student.aaroha-inc.com` | `password123` | Student Workspace (`/?view=student`) | Interactive learning environment, enrolled cohort sessions |
| `student` | Enrolled Fellow (Systems Analyst) | `sneha.reddy@student.aaroha-inc.com` | `password123` | Student Workspace (`/?view=student`) | Interactive learning environment, assignments, assessments |
| `student` | Unenrolled / General Learner | `learner@enterprise.io` | `password123` | Student Workspace (`/?view=student`) | Catalog browsing, self-enrollment preview, public RFC artifacts |

---

## 2. Role-Based Module Access Matrix

The administrative console dynamically mounts modules based on the authenticated user's role:

| Module Identifier | Module Name | Super Admin | Admin | Coordinator | Placement Officer | Faculty | Student |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `dashboard` | Executive Overview & KPI Stats | Yes | Yes | Yes | Yes | Yes | Learner View |
| `students` | Student Roster & Onboarding | Yes | Yes | Yes | Yes | Assigned Cohorts | No |
| `faculty` | Faculty Directory & Workload | Yes | Yes | Yes | No | Peer View | No |
| `courses` | Curriculum & Course Editor | Yes | Yes | Yes | No | No | No |
| `batches` | Cohort Batches Management | Yes | Yes | Yes | No | Assigned Batches | No |
| `schedule` | Class Scheduling & Live Links | Yes | Yes | Yes | No | Assigned Sessions | Enrolled View |
| `attendance` | Session Attendance Verification | Yes | Yes | Yes | No | Mark & View | View Personal |
| `materials` | Content Publishing & Videos | Yes | Yes | Yes | No | Author & Upload | View Enrolled |
| `assessments` | Task Reviews & Grading | Yes | Yes | Yes | No | Review & Grade | Submit Tasks |
| `announcements` | Institutional Broadcasts | Yes | Yes | Yes | No | No | View Only |
| `reports` | Analytics & Completion Reports | Yes | Yes | Yes | Yes | No | No |
| `certificates` | Digital Credential Issuance | Yes | Yes | Yes | No | No | View Issued |
| `placement` | Placement Drives & Job Tracker | Yes | Yes | No | Yes | No | View Opportunities |
| `support` | Help Desk Tickets & Feedback | Yes | Yes | Yes | No | Assigned Tickets | Open Tickets |
| `followups` | At-Risk Student Interventions | Yes | Yes | Yes | No | No | No |
| `users` | Role & Access Permissions | Yes | Yes | No | No | No | No |
| `settings` | Platform Branding & System Config | Yes | Yes | No | No | No | No |
| `audit` | Cryptographic Security Audit Log | Yes | Yes | No | No | No | No |

---

## 3. Account Lifecycle & Activation Workflow

### Onboarding Flow (Student or Faculty)
1. An authorised **Admin** or **Academic Coordinator** navigates to the **Students** or **Faculty** tab in the Admin Console (`/?view=admin`).
2. The administrator inputs the recipient's name, email address, optional contact details, and assigns relevant courses and cohort batches.
3. The platform creates the profile and generates a private, single-use, cryptographically secure invitation token.
4. The invitation token is valid for **24 hours**. In the database, only a **SHA-256 hash** of the token is stored (`invitation_token`), with the account status marked as `invited`.
5. The administrator copies the generated link (e.g., `https://lms.aaroha-inc.com/activate?token=<hex_token>`) and shares it directly with the recipient via private channel (e.g., WhatsApp).

### Recipient Activation Flow
1. The recipient opens the link in their browser.
2. The institutional activation modal verifies the token against the cryptographic hash and displays the recipient's verified roster information.
3. The recipient enters their chosen password (minimum 8 characters).
4. Upon confirmation:
   - The password is encrypted with Bcrypt (cost factor 12).
   - The token is transitioned to a consumed state marker (`used:<token_hash>`), strictly preventing link replay attacks.
   - The account status transitions to `active`.
   - Any course or cohort enrollments are unlocked and activated immediately.
   - A signed JWT token is issued, redirecting the user to their authorised dashboard view.

### Token Renewal, Invalidation & Reset Links
- **Resend Invitation / Generate Setup Link**: Authorised administrators can generate a fresh setup link at any time from the student or faculty roster. Generating a replacement link automatically invalidates all previous links.
- **Revoke Invitation**: An administrator can revoke a pending setup link, setting the account status to `deactivated` and blocking access.
- **Generate Password Reset Link**: For active accounts, administrators can generate a private single-use 24-hour password reset link without exposing credentials.

