-- 004_content_progress.sql
-- Content blocks and user progress tracking

-- Content blocks within modules (videos, text, etc.)
CREATE TABLE content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL, -- 'video', 'text', 'image', 'code', 'embed'
  content JSONB NOT NULL, -- flexible content storage
  sort_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_content_blocks_module ON content_blocks(module_id);
CREATE INDEX idx_content_blocks_order ON content_blocks(module_id, sort_order);

-- User progress on modules
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  completed_at TIMESTAMPTZ,
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  time_spent_seconds INT DEFAULT 0,
  last_position JSONB, -- for video resume position, etc.
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, module_id)
);

CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_progress_module ON progress(module_id);
CREATE INDEX idx_progress_completed ON progress(user_id, completed);

-- Quiz attempts
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  answers JSONB NOT NULL,
  passed BOOLEAN DEFAULT FALSE NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_module ON quiz_attempts(module_id);
CREATE INDEX idx_quiz_attempts_score ON quiz_attempts(user_id, score);

-- Code challenge attempts
CREATE TABLE code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  passed BOOLEAN DEFAULT FALSE NOT NULL,
  output TEXT,
  error_message TEXT,
  execution_time_ms INT,
  attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_code_attempts_user ON code_attempts(user_id);
CREATE INDEX idx_code_attempts_module ON code_attempts(module_id);

-- Milestone submissions (assignments, projects)
CREATE TABLE milestone_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  submission_url TEXT,
  submission_text TEXT,
  attachments JSONB,
  status submission_status DEFAULT 'pending' NOT NULL,
  feedback TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_milestone_submissions_user ON milestone_submissions(user_id);
CREATE INDEX idx_milestone_submissions_status ON milestone_submissions(status);

-- Enable RLS
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_submissions ENABLE ROW LEVEL SECURITY;

-- Content blocks follow module visibility
CREATE POLICY "Content blocks visible when module visible"
  ON content_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN sections ON sections.id = modules.section_id
      JOIN courses ON courses.id = sections.course_id
      WHERE modules.id = content_blocks.module_id
      AND (courses.status = 'published' OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins manage content blocks"
  ON content_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Progress: users can only see/manage their own
CREATE POLICY "Users view own progress"
  ON progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own progress"
  ON progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all progress"
  ON progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Quiz attempts: users see own, admins see all
CREATE POLICY "Users view own quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own quiz attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Code attempts: users see own, admins see all
CREATE POLICY "Users view own code attempts"
  ON code_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own code attempts"
  ON code_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all code attempts"
  ON code_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Milestone submissions: users manage own, admins can review all
CREATE POLICY "Users view own submissions"
  ON milestone_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own submissions"
  ON milestone_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending submissions"
  ON milestone_submissions FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage all submissions"
  ON milestone_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Triggers
CREATE TRIGGER update_content_blocks_updated_at
  BEFORE UPDATE ON content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_updated_at
  BEFORE UPDATE ON progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
