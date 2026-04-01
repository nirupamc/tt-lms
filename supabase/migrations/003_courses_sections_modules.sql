-- 003_courses_sections_modules.sql
-- Course structure: courses → sections → modules

-- Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  skill_tag TEXT, -- e.g., 'communication', 'leadership', 'technical'
  status content_status DEFAULT 'draft' NOT NULL,
  duration_hours NUMERIC(5,2),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_skill_tag ON courses(skill_tag);

-- Sections within courses
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sections_course ON sections(course_id);
CREATE INDEX idx_sections_order ON sections(course_id, sort_order);

-- Modules within sections
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  module_type TEXT NOT NULL, -- 'video', 'reading', 'quiz', 'code_challenge', 'milestone'
  duration_minutes INT,
  sort_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_modules_section ON modules(section_id);
CREATE INDEX idx_modules_order ON modules(section_id, sort_order);
CREATE INDEX idx_modules_type ON modules(module_type);

-- Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Published courses are visible to all authenticated users
CREATE POLICY "Published courses visible to all"
  ON courses FOR SELECT
  USING (status = 'published' AND auth.role() = 'authenticated');

-- Admins can view all courses
CREATE POLICY "Admins view all courses"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can insert/update/delete courses
CREATE POLICY "Admins manage courses"
  ON courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Sections follow course visibility
CREATE POLICY "Sections visible when course published"
  ON sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = sections.course_id
      AND (courses.status = 'published' OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins manage sections"
  ON sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Modules follow section visibility
CREATE POLICY "Modules visible when course published"
  ON modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sections
      JOIN courses ON courses.id = sections.course_id
      WHERE sections.id = modules.section_id
      AND (courses.status = 'published' OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins manage modules"
  ON modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Update triggers
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
