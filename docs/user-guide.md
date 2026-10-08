# User Guide and Demonstration

Use synthetic information until the client approves privacy, content, services and hosting.

## Applicant

1. Open / and choose Applicant. Sign in at /applicant/login or select Apply to become a foster carer. Complete Personal, Home and Experience, review the details and select consent. Direct /fostering and /apply links still work.
2. Submit once and keep the application ID. Verify the email before login. Development preview links do not send mail.
3. View status, original answers and submission date at /applicant. Registered users can save/resume drafts.
4. My Profile changes name, phone or address separately from protected answers. Login email stays unchanged.
5. Respond when staff request information. A staff correction grant allows one complete resubmission. Pending applications may be withdrawn.
6. Approved carers see only their current allocated dog, appropriate care/feeding information and approved links.
7. Forgotten password creates an expiring single-use link. Resetting revokes existing sessions.

## Staff

1. Open / and choose Staff, then use authorized Microsoft sign-in at /staff/login. Local demonstration only: jamie@gap.example / Greyhound2026!
2. Search applications by name/email/ID/phone and filter status/date/location/staff/allocation. Open a case for complete answers and activity.
3. Assign responsibility, add private notes or intentionally share a note. Permit corrections only before a decision.
4. Approve manually, reject with a reason or request information. Approval unlocks resources; no automatic approval/matching exists.
5. Greyhounds supports full identifiers, status, care and compatibility editing/filtering. Allocated care data is editable, but availability changes require ending the placement.
6. Import plain CSV or XLSX, with id/name/sex and age or dateOfBirth. Limits: 1 MB, 5,000 rows and one worksheet. No formulas/macros/legacy XLS.
7. Preview counts/errors before confirmation. Existing records are skipped unless explicitly updating matches. Missing optional columns retain care data; explicitly empty columns clear it. Inspect history/download row errors.
8. In an approved case choose Assign Greyhound, inspect both parties/compatibility, set expected dates/private notes and confirm.
9. Update placement dates/notes or end as completed/cancelled/returned early with actual return date. Changing dogs requires ending then creating a new placement; history remains.
10. Reports shows all required columns, counts and CSV/Excel downloads. Decision period controls performance/trends; date filters control records/exports. Inventory and approved-carer counts are overall totals.
11. Integrations & Resources shows configuration and email outbox. Preview is not delivery; sent is SMTP acceptance, not inbox receipt. Correct configuration before retrying failures.

## Administrator

- Accounts: provision exact Microsoft object UUIDs with staff/admin roles. Disable accounts or change allowed staff roles; changes revoke sessions. Self-removal/last-admin removal is blocked. Applicant roles follow approval.
- Templates: edit subject/body with supported {{name}}, {{applicationId}}, {{link}} placeholders. Verification/reset bodies must keep {{link}}. Client must approve wording.
- Settings: configure approved contacts, legal URLs/notices and fostering information. Enable Monday reporting and choose active staff recipients.
- Resources: add/edit HTTPS links, display order, public/restricted visibility and active status. Archive to remove links from views.
- Audit: search actions/record IDs and page through read-only history.
- Maintenance: create verified backups and queue weekly reports; inspect outbox for delivery. Recovery is a non-overwriting operator command.

## Demo Script

1. Show required-field errors, then submit synthetic data and verify email.
2. Show applicant status and locked answers; correct a contact phone separately.
3. As staff, find the same case, assign responsibility, add a private note and request information.
4. Respond as applicant; demonstrate permitted correction, approval and resource unlocking.
5. Preview/import an export with valid/invalid rows, download errors and demonstrate duplicate warning/history.
6. Inspect compatibility and allocate a dog with dates/notes. Show only suitable details in the carer account.
7. Update/end placement and show history and duplicate/eligibility safeguards.
8. Export Excel, edit a template and queue a weekly report in preview mode.
9. Create a backup and explain tested recovery and remaining client approvals.

The formal final demonstration and client acceptance still need to be conducted by the project team; this is the prepared demonstration deliverable.
