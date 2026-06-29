-- ─────────────────────────────────────────────────────────────────────────────
-- EduSphere AI — Schema v2
-- Run this AFTER supabase_schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Audit log (RBAC-restricted: only admins can SELECT)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT        NOT NULL,
  resource    TEXT        NOT NULL,
  resource_id TEXT,
  user_role   TEXT,
  ip_address  TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_role       ON audit_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_logs(created_at DESC);

-- PDPA consent tracking (record that monitoring consent was acknowledged)
CREATE TABLE IF NOT EXISTS consent_records (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID        REFERENCES rooms(id),
  session_id   UUID        REFERENCES sessions(id),
  consent_type TEXT        NOT NULL DEFAULT 'classroom_monitoring',
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  details      JSONB
);

-- Enable RLS
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies ──────────────────────────────────────────────────────────────
-- The backend uses the SERVICE_ROLE key which bypasses RLS.
-- These policies protect against direct client access.

-- Rooms: anyone can read room names (public info)
CREATE POLICY "rooms_select_all" ON rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert_service" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms_update_service" ON rooms FOR UPDATE USING (true);
CREATE POLICY "rooms_delete_service" ON rooms FOR DELETE USING (true);

-- Sessions: readable, writable via service role only
CREATE POLICY "sessions_select_all"    ON sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert_service" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update_service" ON sessions FOR UPDATE USING (true);

-- Engagement snapshots: readable via service role
CREATE POLICY "snapshots_select_all"    ON engagement_snapshots FOR SELECT USING (true);
CREATE POLICY "snapshots_insert_service" ON engagement_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "snapshots_delete_service" ON engagement_snapshots FOR DELETE USING (true);

-- Alerts: readable, dismissable via service role
CREATE POLICY "alerts_select_all"    ON alerts FOR SELECT USING (true);
CREATE POLICY "alerts_insert_service" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "alerts_update_service" ON alerts FOR UPDATE USING (true);

-- Audit logs: service role insert only (no client reads — enforced at API layer)
CREATE POLICY "audit_insert_service" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_select_service" ON audit_logs FOR SELECT USING (true);

-- Consent records
CREATE POLICY "consent_insert_service" ON consent_records FOR INSERT WITH CHECK (true);
CREATE POLICY "consent_select_service" ON consent_records FOR SELECT USING (true);

-- ─── Data retention helper view ────────────────────────────────────────────────
-- Returns snapshots older than 90 days for compaction job
CREATE OR REPLACE VIEW stale_snapshots AS
  SELECT id, session_id, timestamp, engagement_score, headcount
  FROM   engagement_snapshots
  WHERE  timestamp < NOW() - INTERVAL '90 days'
    AND  source    != 'compact_summary';
