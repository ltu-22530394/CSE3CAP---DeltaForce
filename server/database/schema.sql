-- Greyhounds as Pets Foster Management System
-- Initial SQLite database schema for authentication and future sprint features.

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT OR IGNORE INTO roles (id, name, description) VALUES
  ('applicant', 'Applicant', 'Submitted or draft foster applicant account'),
  ('foster_carer', 'Approved Foster Carer', 'Approved applicant with foster carer access'),
  ('staff', 'GAP Staff', 'GAP staff member with administration access'),
  ('admin', 'System Administrator', 'Administrator with full system access');

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT,
  role_id TEXT NOT NULL DEFAULT 'applicant',
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'pending_verification', 'disabled', 'locked')),
  email_verified_at TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

CREATE TABLE IF NOT EXISTS staff_profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL UNIQUE,
  microsoft_identity_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  job_title TEXT,
  staff_status TEXT NOT NULL DEFAULT 'active'
    CHECK (staff_status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id
  ON auth_refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON email_verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  date_of_birth TEXT,
  applicant_status TEXT NOT NULL DEFAULT 'active'
    CHECK (applicant_status IN ('active', 'inactive', 'withdrawn')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applicants_user_id ON applicants(user_id);
CREATE INDEX IF NOT EXISTS idx_applicants_postcode ON applicants(postcode);

CREATE TABLE IF NOT EXISTS foster_applications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  applicant_id TEXT NOT NULL,
  application_type TEXT NOT NULL DEFAULT 'foster'
    CHECK (application_type IN ('adoption', 'foster')),
  application_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (
      application_status IN (
        'draft',
        'submitted',
        'under_review',
        'information_required',
        'approved',
        'rejected',
        'withdrawn',
        'inactive'
      )
    ),
  current_step INTEGER NOT NULL DEFAULT 1,
  assigned_staff_user_id TEXT,
  submitted_at TEXT,
  decision_at TEXT,
  decided_by_user_id TEXT,
  rejection_reason TEXT,
  staff_notes TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_staff_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (decided_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_foster_applications_applicant_id
  ON foster_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_foster_applications_status
  ON foster_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_foster_applications_submitted_at
  ON foster_applications(submitted_at);

CREATE TABLE IF NOT EXISTS foster_application_details (
  application_id TEXT PRIMARY KEY,
  household_type TEXT,
  housing_status TEXT,
  landlord_approval INTEGER NOT NULL DEFAULT 0 CHECK (landlord_approval IN (0, 1)),
  yard_or_outdoor_area TEXT,
  fence_information TEXT,
  adults_in_home INTEGER,
  children_in_home INTEGER,
  existing_pets TEXT,
  previous_dog_experience TEXT,
  previous_greyhound_experience TEXT,
  preferred_fostering_period TEXT,
  availability TEXT,
  transport_available INTEGER NOT NULL DEFAULT 0 CHECK (transport_available IN (0, 1)),
  preferred_greyhound_characteristics TEXT,
  reason_for_applying TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  terms_accepted INTEGER NOT NULL DEFAULT 0 CHECK (terms_accepted IN (0, 1)),
  privacy_consent INTEGER NOT NULL DEFAULT 0 CHECK (privacy_consent IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES foster_applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS application_notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  application_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  note_text TEXT NOT NULL,
  visible_to_applicant INTEGER NOT NULL DEFAULT 0 CHECK (visible_to_applicant IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES foster_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_application_notes_application_id
  ON application_notes(application_id);

CREATE TABLE IF NOT EXISTS greyhounds (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  salesforce_record_id TEXT UNIQUE,
  greyhound_identifier TEXT NOT NULL UNIQUE,
  registration_number TEXT UNIQUE,
  name TEXT NOT NULL,
  sex TEXT CHECK (sex IN ('male', 'female', 'unknown')),
  date_of_birth TEXT,
  age_years INTEGER,
  colour TEXT,
  current_location TEXT,
  availability_status TEXT NOT NULL DEFAULT 'imported'
    CHECK (
      availability_status IN (
        'imported',
        'available',
        'pending_allocation',
        'allocated',
        'returned',
        'adopted',
        'unavailable',
        'inactive'
      )
    ),
  behaviour_notes TEXT,
  care_instructions TEXT,
  medical_notes TEXT,
  compatible_with_children INTEGER CHECK (compatible_with_children IN (0, 1)),
  compatible_with_cats INTEGER CHECK (compatible_with_cats IN (0, 1)),
  compatible_with_small_dogs INTEGER CHECK (compatible_with_small_dogs IN (0, 1)),
  compatible_with_other_animals INTEGER CHECK (compatible_with_other_animals IN (0, 1)),
  special_requirements TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_greyhounds_name ON greyhounds(name);
CREATE INDEX IF NOT EXISTS idx_greyhounds_availability_status
  ON greyhounds(availability_status);
CREATE INDEX IF NOT EXISTS idx_greyhounds_location ON greyhounds(current_location);

CREATE TABLE IF NOT EXISTS greyhound_import_batches (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  imported_by_user_id TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  duplicate_records INTEGER NOT NULL DEFAULT 0,
  import_status TEXT NOT NULL DEFAULT 'completed'
    CHECK (import_status IN ('completed', 'completed_with_errors', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (imported_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS greyhound_import_errors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  import_batch_id TEXT NOT NULL,
  row_number INTEGER,
  field_name TEXT,
  error_message TEXT NOT NULL,
  raw_row_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (import_batch_id) REFERENCES greyhound_import_batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_greyhound_import_errors_batch_id
  ON greyhound_import_errors(import_batch_id);

CREATE TABLE IF NOT EXISTS greyhound_allocations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  foster_carer_applicant_id TEXT NOT NULL,
  greyhound_id TEXT NOT NULL,
  allocated_by_user_id TEXT NOT NULL,
  allocation_date TEXT NOT NULL DEFAULT (date('now')),
  expected_start_date TEXT,
  expected_end_date TEXT,
  actual_end_date TEXT,
  allocation_status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (
      allocation_status IN (
        'proposed',
        'confirmed',
        'active',
        'completed',
        'cancelled',
        'returned_early'
      )
    ),
  internal_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (foster_carer_applicant_id) REFERENCES applicants(id) ON DELETE RESTRICT,
  FOREIGN KEY (greyhound_id) REFERENCES greyhounds(id) ON DELETE RESTRICT,
  FOREIGN KEY (allocated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_greyhound_allocations_foster_carer
  ON greyhound_allocations(foster_carer_applicant_id);
CREATE INDEX IF NOT EXISTS idx_greyhound_allocations_greyhound
  ON greyhound_allocations(greyhound_id);
CREATE INDEX IF NOT EXISTS idx_greyhound_allocations_status
  ON greyhound_allocations(allocation_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_allocation_per_greyhound
  ON greyhound_allocations(greyhound_id)
  WHERE allocation_status IN ('proposed', 'confirmed', 'active');

CREATE TABLE IF NOT EXISTS training_resources (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL
    CHECK (resource_type IN ('youtube', 'vimeo', 'pdf', 'link', 'document')),
  resource_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  requires_approval INTEGER NOT NULL DEFAULT 1 CHECK (requires_approval IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_training_resources_active
  ON training_resources(active);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  template_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  recipient_user_id TEXT,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL
    CHECK (
      notification_type IN (
        'application_confirmation',
        'email_verification',
        'approval',
        'allocation',
        'information_required',
        'rejection',
        'password_reset'
      )
    ),
  subject TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  related_application_id TEXT,
  related_allocation_id TEXT,
  sent_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (related_application_id) REFERENCES foster_applications(id) ON DELETE SET NULL,
  FOREIGN KEY (related_allocation_id) REFERENCES greyhound_allocations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id
  ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status
  ON notifications(delivery_status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  previous_value_json TEXT,
  new_value_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id
  ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at);

COMMIT;
