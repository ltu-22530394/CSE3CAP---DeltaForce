# User Stories and Backlog

Implementation is not formal client acceptance. External dependencies are tracked in the requirements matrix.

| Story | User Need | Evidence | Status |
| --- | --- | --- | --- |
| US-01 | Visitor reviews fostering information and applies with consent. | FR-01..08, AC-01/02, public browser workflow | Implemented; original-form parity pending |
| US-02 | Applicant verifies email and recovers a secure account. | FR-09..16, auth/business tests | Implemented; client sender pending |
| US-03 | Applicant resumes drafts and views original answers/status. | FR-17..20, draft/locking tests | Implemented |
| US-04 | Applicant corrects contacts and responds or edits with staff permission. | FR-21..23, completion tests | Implemented |
| US-05 | Authorized staff signs in through Microsoft with role permissions. | FR-24..27, signed provider fixtures | Implemented; live tenant/MFA pending |
| US-06 | Staff searches, assigns, notes and decides cases with history. | FR-28..40, case tests | Implemented |
| US-07 | Approved carer views only own placement and approved resources. | FR-41..47, 71..74, ownership tests | Implemented; content classification pending |
| US-08 | Staff safely previews/confirms Salesforce CSV/Excel exports. | FR-48..58, 75..77, import tests | Implemented; actual sample pending |
| US-09 | Staff manages care/compatibility and finds available greyhounds. | FR-59..63, metadata/filter tests | Implemented |
| US-10 | Staff allocates, updates and ends placements without duplicates. | FR-64..70, BR-01/02/11, placement tests | Implemented |
| US-11 | Staff exports complete reports and receives a weekly attachment. | FR-91..98, report tests | Implemented; production delivery pending |
| US-12 | Administrator manages access, content, audit and backups. | FR-45/88/99..101, NFR-19/20/24 | Implemented |

## Release Backlog

| Priority | Task | Completion Condition |
| --- | --- | --- |
| P0 | Final form, mandatory fields, decision rules and staff permissions | Client artifact comparison and sign-off |
| P0 | Approved legal/retention/email wording, contacts and care resources | Client approval and configured content |
| P0 | Microsoft tenant/MFA and SMTP sender | Actual identity and mailbox acceptance tests |
| P0 | Salesforce sample/mapping and visible-field policy | Real import validation and classification |
| P0 | HTTPS hosting, encryption, offsite backups, recovery objectives and operator | Deployment checks and restore drill |
| P0 | Manual accessibility/usability/security review and UAT | Recorded evidence and signed acceptance |
| P1 | Production-like concurrency/performance and operational alerts | Agreed workload tests and monitoring |
| P1 | Retention automation after policy approval | Approved purge/anonymization including backups/audit |
| P1 | Authorized incremental Salesforce synchronization | Agreed source of truth, conflicts and schedule |
| P2 | Google login, video tracking, Power BI, reminders, e-signatures and calendars | Optional roadmap approval |
| Out of Scope | Mobile app, payments, adoption processing and full LMS quizzes | Separate scope |
