-- Migration: Profile and Dashboard Schema Enhancement
-- Target: MySQL 8.0+ / MariaDB / SQLite
-- Adds columns for comprehensive institutional user profiles, preferences, and role details

ALTER TABLE users ADD COLUMN display_name VARCHAR(120) NULL;
ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN timezone VARCHAR(100) DEFAULT 'Asia/Kolkata';
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(20) DEFAULT 'en';
ALTER TABLE users ADD COLUMN notification_preferences_json TEXT NULL;
ALTER TABLE users ADD COLUMN security_settings_json TEXT NULL;
ALTER TABLE users ADD COLUMN authorized_roles_json TEXT NULL;

ALTER TABLE student_profiles ADD COLUMN skills TEXT NULL;
ALTER TABLE student_profiles ADD COLUMN career_interests TEXT NULL;
ALTER TABLE student_profiles ADD COLUMN resume_url VARCHAR(500) NULL;
ALTER TABLE student_profiles ADD COLUMN portfolio_url VARCHAR(500) NULL;
ALTER TABLE student_profiles ADD COLUMN github_url VARCHAR(500) NULL;
ALTER TABLE student_profiles ADD COLUMN work_experience TEXT NULL;

ALTER TABLE faculty_profiles ADD COLUMN bio TEXT NULL;
ALTER TABLE faculty_profiles ADD COLUMN qualifications TEXT NULL;
ALTER TABLE faculty_profiles ADD COLUMN experience_years VARCHAR(50) NULL;
ALTER TABLE faculty_profiles ADD COLUMN professional_links_json TEXT NULL;

