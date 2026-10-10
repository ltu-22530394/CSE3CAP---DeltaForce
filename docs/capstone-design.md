# Capstone Design

## Architecture

The active React/TypeScript/Router portal uses an Express API and SQLite on Node.js 24+. Applicant, staff and administrator actions use one durable database. Legacy localStorage factories remain unit-test/demo helpers, not the default runtime. The older applicant CRUD endpoint now synchronizes portal snapshots and requires full canonical submission validation; startup backfills older applications into staff-visible records.

Public: application, fostering information, privacy, login/registration and account recovery. Applicant: dashboard, profile, application and information responses. Staff: dashboard, applications/review, greyhounds, reports and integrations/resources. Administrator: accounts, templates, settings, audit and maintenance.

Portal routes own foster workflow, import and resources; management routes own profiles, case actions, administration, reports and maintenance. Repositories validate and persist domain changes. The provider module owns optional read-only Salesforce transport. Notification content is stored locally without an email transport. Backend authorization is authoritative even when UI navigation is manipulated.

## System Context

~~~mermaid
flowchart LR
  Visitor[Public visitor] --> Portal[GAP Foster Portal]
  Applicant[Applicant or approved carer] --> Portal
  Staff[GAP staff] --> Portal
  Admin[Administrator] --> Portal
  Portal --> DB[(SQLite persistent database)]
  Salesforce[Client Salesforce export or REST API] --> Portal
  Portal --> Resources[Approved external resource links]
  Portal --> Backup[Protected backup storage]
~~~

## Use Cases

~~~mermaid
flowchart LR
  Visitor[Visitor] --> Apply((Apply with consent))
  Visitor --> Public((Read public information))
  Applicant[Applicant] --> Login((Register and sign in with a password))
  Applicant --> Draft((Save and submit a draft))
  Applicant --> Contact((Correct contact information))
  Applicant --> Respond((Respond, permitted correction or withdraw))
  Carer[Approved carer] --> Care((View own placement and resources))
  Staff[Staff] --> Review((Search, review and decide))
  Staff --> Case((Assign staff and record notes))
  Staff --> Import((Preview and confirm imports))
  Staff --> Placement((Allocate, update, end and view history))
  Staff --> Report((Filter and export reports))
  Admin[Administrator] --> Accounts((Provision, role and disable accounts))
  Admin --> Content((Manage templates, resources and notices))
  Admin --> Audit((Inspect audit and maintenance))
  Admin --> Recovery((Manage backups and export reports))
~~~

## Database Design

~~~mermaid
erDiagram
  USERS ||--o| APPLICANTS : applicant_profile
  USERS ||--o| STAFF_PROFILES : staff_identity
  USERS ||--o{ AUTH_SESSIONS : sessions
  USERS ||--o{ ACCOUNT_TOKENS : verification_and_reset
  APPLICANTS ||--o{ FOSTER_APPLICATIONS : submits
  FOSTER_APPLICATIONS ||--|| PORTAL_APPLICATION_STATE : protected_snapshot
  FOSTER_APPLICATIONS ||--o{ APPLICATION_NOTES : case_notes
  FOSTER_APPLICATIONS ||--o| APPLICATION_EDIT_PERMISSIONS : correction_grant
  APPLICANTS ||--o{ GREYHOUND_ALLOCATIONS : fosters
  GREYHOUNDS ||--o{ GREYHOUND_ALLOCATIONS : placements
  GREYHOUNDS ||--o| GREYHOUND_EXTRA : feeding_and_photo
  GREYHOUND_ALLOCATIONS ||--|| PORTAL_ALLOCATION_APPLICATIONS : source_application
  FOSTER_APPLICATIONS ||--o{ PORTAL_ALLOCATION_APPLICATIONS : history
  GREYHOUND_IMPORT_BATCHES ||--o{ GREYHOUND_IMPORT_ERRORS : failures
  NOTIFICATIONS ||--|| PORTAL_NOTIFICATION_CONTENT : message
  NOTIFICATIONS ||--o| PORTAL_NOTIFICATION_ATTACHMENTS : weekly_report
  USERS ||--o{ AUDIT_LOGS : actor
~~~

Definitions: server/database/schema.sql, integration.sql and completion.sql. Additional tables hold roles, templates, training resources, settings, maintenance runs and legacy Microsoft flow/handoff state retained for compatibility; Microsoft state and account-token tables are no longer used for login/recovery. Foreign keys are enabled; cross-table changes use immediate transactions/savepoints. A partial unique index prevents overlapping active allocations per greyhound. The repository also prevents overlapping active placements per carer. Import identifiers, Salesforce IDs and registration numbers are collision-checked.

The application JSON snapshot protects submitted answers. Current contact corrections live in the applicant profile and are shown in staff reports. Staff may grant one complete correction to an undecided case; resubmission consumes the permission and preserves the original submission date. Legacy detail columns remain for compatibility.

## Workflows

Application: Draft -> Submitted -> Under Review / Information Required -> Approved or Rejected. Responses return an information request to Under Review. Applicants may withdraw before decision. Staff may make an approved application Inactive after its placement ends. Approval validates mandatory information and updates the account role.

Greyhound: Imported, Available, Pending Allocation, Allocated, Returned, Adopted, Unavailable or Inactive. Only Available records can be allocated. Allocated care details can be edited without changing availability. Ended placements release the record to Available for reassessment; staff can choose Returned/Unavailable according to policy. Adoption processing is out of scope.

Placement: Active -> Completed / Cancelled / Returned Early. Dates and private notes can be updated. Changing dogs means ending the old allocation and creating another; historical rows remain.

## Security Design

Applicant and staff email/password login, bcrypt hashes and byte-length protection, login lockout and rate limits. Email verification and email-based recovery are removed. JWT sessions are stored server-side for revocation and 30-minute idle expiry. Administrator-managed password reset invalidates outstanding legacy recovery tokens and sessions. Disabled accounts cannot retain sessions or receive new placements.

Private environment settings initialise the first administrator or the exact active passwordless administrator migrating from SSO. Existing passwords, applicant roles and disabled status are not overwritten. Only administrators provision staff and reset passwords; public registration cannot grant staff access. Microsoft SSO/MFA is not implemented in this revision. Client approval of this deviation and removed email features is required.

Parameterized SQL, whitelist import mapping, React escaping, production Helmet/CSP/HTTPS enforcement and mutation Origin checks reduce common web risks. CSV export neutralizes formula-leading cells; XLSX export emits strings. Imports allow only bounded CSV/XLSX, with ZIP expansion checks and worker limits; formulas, non-plain cells, macros and legacy XLS are rejected.

Carer projections omit internal placement notes, assigned staff identity and regulatory IDs. Client classification is required for medical/behaviour content before import. Restricted links are hidden by the portal, but confidential external documents need access controls at their host.

Residual production risks: localStorage bearer tokens need focused XSS/session review; SQLite/backups require encrypted protected volumes; audit contains authorized personal information; external content, live password-only deployment and client acceptance remain unverified. Email ownership is not verified; account recovery depends on administrator identity checks. Free Render local SQLite cannot persist client data reliably.

## Wireframes

These map to implemented screens. Browser screenshots are rendered prototype evidence.

~~~text
Application
[GAP / applicant access]
[Personal] -> [Home] -> [Experience] -> [Review]
Labeled fields / inline errors / consent           [Back] [Next/Submit]

Applicant
[GAP]                                                    [Account]
Status / submission date / next action
Own application / information response
Own greyhound care / approved resources / GAP contact
[Profile] [Privacy and terms]

Staff
[Navigation] | Heading / search / filters
             | Applicant | assigned staff | submitted | status
             | Pagination
Review       | Protected answers / decision / activity
             | Case assignment / private or shared notes
             | Correction permission / placements / history

Administration
[Accounts] [Templates] [Settings] [Audit] [Maintenance]
Editable forms or paginated read-only tables

Reports
Date / status / location / staff / allocation / format [Export]
Summary counts / review metrics / trends
Complete status table / pagination
~~~

## Future Salesforce Integration

CSV/XLSX is the main proof-of-concept integration. Optional OAuth REST reads support configurable mapping, pagination and validated preview/confirm without Salesforce writes. Production synchronization needs client authorization, source-of-truth/conflict decisions, incremental checkpoints, updated timestamps, retries, monitoring and a schedule. Consider Bulk API for much larger data. No scheduled synchronization or GRNSW approval is claimed.
