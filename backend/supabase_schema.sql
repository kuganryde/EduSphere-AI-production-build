-- rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  expected_capacity INTEGER DEFAULT 30,
  camera_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  lecturer_name TEXT NOT NULL,
  course_code TEXT NOT NULL,
  expected_capacity INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended'))
);

-- engagement_snapshots table (time-series data)
CREATE TABLE engagement_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  room_id UUID REFERENCES rooms(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  engagement_score INTEGER,
  headcount INTEGER,
  lecturer_present BOOLEAN,
  classroom_sentiment TEXT,
  attention_rate NUMERIC,
  dominant_emotion TEXT,
  gestures JSONB,
  alert_level INTEGER,
  source TEXT DEFAULT 'gemini'
);

-- alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  room_id UUID REFERENCES rooms(id),
  level INTEGER CHECK (level IN (1, 2, 3)),
  message TEXT,
  alert_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_snapshots_session ON engagement_snapshots(session_id);
CREATE INDEX idx_snapshots_timestamp ON engagement_snapshots(timestamp DESC);
CREATE INDEX idx_alerts_session ON alerts(session_id);
CREATE INDEX idx_sessions_status ON sessions(status);
