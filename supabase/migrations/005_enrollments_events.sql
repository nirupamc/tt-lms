-- 005_enrollments_events.sql
-- Course enrollments and calendar events

-- Course enrollments
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  certificate_url TEXT,
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_completed ON enrollments(completed_at) WHERE completed_at IS NOT NULL;

-- Calendar events (live sessions, webinars, deadlines)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- 'live_session', 'webinar', 'deadline', 'office_hours'
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  meeting_url TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- RRULE format
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_events_start ON events(start_time);
CREATE INDEX idx_events_course ON events(course_id);
CREATE INDEX idx_events_type ON events(event_type);

-- Skills earned by users
CREATE TABLE skills_earned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_tag TEXT NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, skill_tag)
);

CREATE INDEX idx_skills_user ON skills_earned(user_id);
CREATE INDEX idx_skills_tag ON skills_earned(skill_tag);

-- Enable RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_earned ENABLE ROW LEVEL SECURITY;

-- Enrollments: users manage own, admins see all
CREATE POLICY "Users view own enrollments"
  ON enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users enroll themselves"
  ON enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins manage enrollments"
  ON enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Events: all authenticated users can view, admins can manage
CREATE POLICY "Authenticated users view events"
  ON events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Skills earned: users see own, admins see all
CREATE POLICY "Users view own skills"
  ON skills_earned FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all skills"
  ON skills_earned FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins manage skills"
  ON skills_earned FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
