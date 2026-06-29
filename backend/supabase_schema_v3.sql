-- EduSphere AI — Schema v3
-- Run in Supabase SQL editor AFTER supabase_schema_v2.sql
-- Adds emotion_breakdown JSONB and pedagogical_note TEXT to engagement_snapshots

ALTER TABLE engagement_snapshots
  ADD COLUMN IF NOT EXISTS emotion_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS pedagogical_note  TEXT;
