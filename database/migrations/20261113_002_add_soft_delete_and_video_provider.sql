-- Migration: Add soft deletion columns and video provider column
-- Version: 20261113_002_add_soft_delete_and_video_provider

ALTER TABLE courses ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_published;
ALTER TABLE courses ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER is_deleted;

ALTER TABLE modules ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER sequence_order;
ALTER TABLE modules ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER is_deleted;

ALTER TABLE lessons ADD COLUMN video_provider VARCHAR(50) NULL DEFAULT NULL AFTER content_type;
ALTER TABLE lessons ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_published;
ALTER TABLE lessons ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER is_deleted;

ALTER TABLE tasks ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_mandatory;
ALTER TABLE tasks ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER is_deleted;

UPDATE lessons SET video_provider = 'bunny_stream' WHERE content_type = 'video' AND (media_url REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR media_url LIKE '%mediadelivery.net%');
UPDATE lessons SET video_provider = 'youtube' WHERE content_type = 'video' AND media_url LIKE '%youtu%';
UPDATE lessons SET video_provider = 'vimeo' WHERE content_type = 'video' AND media_url LIKE '%vimeo%';
UPDATE lessons SET video_provider = 'direct' WHERE content_type = 'video' AND video_provider IS NULL AND media_url IS NOT NULL AND media_url != '';

