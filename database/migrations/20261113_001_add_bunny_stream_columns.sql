-- Migration: 20261113_001_add_bunny_stream_columns
-- Target: MySQL 8.0+ / MariaDB / Hostinger Shared Hosting
-- Description: Adds expires_at column to enrollments, is_published to lessons, and query performance indexes.

-- 1. Add expires_at to enrollments
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL DEFAULT NULL AFTER completed_at;

-- 2. Add is_published to lessons
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS is_published TINYINT(1) NOT NULL DEFAULT 1 AFTER is_free_preview;

-- 3. Composite index on enrollments for high-speed authorization lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_user_course_status 
ON enrollments (user_id, course_id, status);

-- 4. Index on lessons module and publication state
CREATE INDEX IF NOT EXISTS idx_lessons_module_published 
ON lessons (module_id, is_published);

