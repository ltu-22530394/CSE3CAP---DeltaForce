CREATE TABLE IF NOT EXISTS portal_application_state (
  application_id TEXT PRIMARY KEY REFERENCES foster_applications(id) ON DELETE CASCADE,
  form_json TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS portal_allocation_applications (
  allocation_id TEXT PRIMARY KEY REFERENCES greyhound_allocations(id),
  application_id TEXT NOT NULL REFERENCES foster_applications(id)
);
CREATE TABLE IF NOT EXISTS portal_notification_content (
  notification_id TEXT PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
  body TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS microsoft_login_flows (
  state TEXT PRIMARY KEY,
  verifier TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS microsoft_login_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);
