-- Technician experience schema addition for PostgreSQL deployments.
CREATE TABLE IF NOT EXISTS technician_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  skill VARCHAR(128) NOT NULL, proficiency VARCHAR(16) NOT NULL CHECK (proficiency IN ('BEGINNER','INTERMEDIATE','EXPERT')), years_experience NUMERIC(4,1)
);
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS shifts (
  technician_id UUID PRIMARY KEY REFERENCES technicians(id) ON DELETE CASCADE, start_time TIME NOT NULL, end_time TIME NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC', max_daily_jobs INT NOT NULL DEFAULT 4
);
CREATE TABLE IF NOT EXISTS technician_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE, status VARCHAR(16) NOT NULL DEFAULT 'PROPOSED',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), acknowledged_at TIMESTAMPTZ, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ,
  decline_reason TEXT, decline_note TEXT, distance_km NUMERIC(8,2)
);
CREATE TABLE IF NOT EXISTS technician_task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES technician_assignments(id) ON DELETE SET NULL, technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  type VARCHAR(24) NOT NULL CHECK (type IN ('WORK_NOTE','STATUS_UPDATE','ISSUE')), note TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS technician_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE, type VARCHAR(24) NOT NULL,
  url TEXT NOT NULL, mime_type VARCHAR(128) NOT NULL, size_bytes BIGINT NOT NULL CHECK (size_bytes <= 10485760), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS checklist_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE, label TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS request_checklists (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE, request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE, is_done BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS check_ins (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE, technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS badges (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(64) UNIQUE NOT NULL, name VARCHAR(128) NOT NULL, description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS technician_badges (technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE, badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE, awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (technician_id,badge_id));
