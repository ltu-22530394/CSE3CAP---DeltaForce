CREATE TABLE IF NOT EXISTS portal_settings (
  id TEXT PRIMARY KEY CHECK (id = 'main'),
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS application_edit_permissions (
  application_id TEXT PRIMARY KEY REFERENCES foster_applications(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL REFERENCES users(id),
  granted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS greyhound_extra (
  greyhound_id TEXT PRIMARY KEY REFERENCES greyhounds(id) ON DELETE CASCADE,
  feeding_information TEXT,
  photo_url TEXT
);
CREATE TABLE IF NOT EXISTS maintenance_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  run_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE TABLE IF NOT EXISTS portal_notification_attachments (
  notification_id TEXT PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_staff ON foster_applications(assigned_staff_user_id);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON application_notes(application_id, visible_to_applicant);
