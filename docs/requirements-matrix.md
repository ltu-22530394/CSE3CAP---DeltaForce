# Requirements Traceability

Reviewed against the supplied client specification on 8 October 2026. This is a proof-of-concept completion review, not client acceptance or a production certification.

**Implemented** means a code path exists and has been reviewed; tests provide representative evidence, not exhaustive proof of every clause. **Client Pending** means implementation exists but needs approved client input or operational validation. **Optional** identifies explicitly optional/future features. **Operational Pending** needs deployment, manual accessibility or production workload validation.

| Requirement | Client Requirement | Status | Implementation / Evidence |
| --- | --- | --- | --- |
| FR-01 |  | Implemented | ApplicationFormPage; cleanPortalForm; businessIntegration API tests; public submission browser workflow. |
| FR-02 |  | Client Pending | Listed form questions implemented; exact parity needs the client's existing form and final mandatory-field decisions. |
| FR-03 |  | Implemented | ApplicationFormPage; cleanPortalForm; businessIntegration API tests; public submission browser workflow. |
| FR-04 |  | Implemented | ApplicationFormPage; cleanPortalForm; businessIntegration API tests; public submission browser workflow. |
| FR-05 |  | Implemented | ApplicationFormPage; cleanPortalForm; businessIntegration API tests; public submission browser workflow. |
| FR-06 |  | Implemented | ApplicationFormPage; cleanPortalForm; businessIntegration API tests; public submission browser workflow. |
| FR-07 |  | Implemented | ApplicationFormPage; cleanPortalForm; businessIntegration API tests; public submission browser workflow. |
| FR-08 |  | Implemented | ApplicationFormPage; cleanPortalForm; businessIntegration API tests; public submission browser workflow. |
| FR-09 |  | Implemented | Verified email/password accounts, duplicate protection, reset tokens and consent. Authentication/business integration tests. |
| FR-10 |  | Implemented | Verified email/password accounts, duplicate protection, reset tokens and consent. Authentication/business integration tests. |
| FR-11 |  | Implemented | Verified email/password accounts, duplicate protection, reset tokens and consent. Authentication/business integration tests. |
| FR-12 |  | Implemented | Verified email/password accounts, duplicate protection, reset tokens and consent. Authentication/business integration tests. |
| FR-13 |  | Optional | Google identity / video-completion tracking are explicitly optional and not implemented. |
| FR-14 |  | Implemented | Verified email/password accounts, duplicate protection, reset tokens and consent. Authentication/business integration tests. |
| FR-15 |  | Implemented | Verified email/password accounts, duplicate protection, reset tokens and consent. Authentication/business integration tests. |
| FR-16 |  | Implemented | Verified email/password accounts, duplicate protection, reset tokens and consent. Authentication/business integration tests. |
| FR-17 |  | Implemented | Applicant dashboard, profile API, staff-granted single correction, information response and withdrawal. completion API/browser tests. |
| FR-18 |  | Implemented | Applicant dashboard, profile API, staff-granted single correction, information response and withdrawal. completion API/browser tests. |
| FR-19 |  | Implemented | Applicant dashboard, profile API, staff-granted single correction, information response and withdrawal. completion API/browser tests. |
| FR-20 |  | Implemented | Applicant dashboard, profile API, staff-granted single correction, information response and withdrawal. completion API/browser tests. |
| FR-21 |  | Implemented | Applicant dashboard, profile API, staff-granted single correction, information response and withdrawal. completion API/browser tests. |
| FR-22 |  | Implemented | Applicant dashboard, profile API, staff-granted single correction, information response and withdrawal. completion API/browser tests. |
| FR-23 |  | Implemented | Applicant dashboard, profile API, staff-granted single correction, information response and withdrawal. completion API/browser tests. |
| FR-24 |  | Client Pending | Microsoft OIDC, signed tokens, tenant/object-ID authorization and roles implemented; externalIntegrations.node-test.js uses signed local fixtures. Live tenant credentials and approval needed. |
| FR-25 |  | Client Pending | Microsoft OIDC, signed tokens, tenant/object-ID authorization and roles implemented; externalIntegrations.node-test.js uses signed local fixtures. Live tenant credentials and approval needed. |
| FR-26 |  | Client Pending | Microsoft OIDC, signed tokens, tenant/object-ID authorization and roles implemented; externalIntegrations.node-test.js uses signed local fixtures. Live tenant credentials and approval needed. |
| FR-27 |  | Implemented | Backend requireStaff/requireRole and separate administrator functions; ownership and role regression tests. |
| FR-28 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-29 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-30 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-31 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-32 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-33 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-34 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-35 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-36 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-37 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-38 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-39 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-40 |  | Implemented | Staff list/filter/review/decision, assigned staff, dates, private/shareable notes, correction permissions. Application and management repositories; API/browser tests. |
| FR-41 |  | Implemented | Approval changes role and unlocks resources; add/edit/archive resources, public versus restricted links; no quizzes. |
| FR-42 |  | Implemented | Approval changes role and unlocks resources; add/edit/archive resources, public versus restricted links; no quizzes. |
| FR-43 |  | Client Pending | Resource links, filtered carer fields, editable mail templates and contact settings implemented and tested. Client must supply approved content, field classifications and sender/contact details; SMTP tested locally only. |
| FR-44 |  | Implemented | Approval changes role and unlocks resources; add/edit/archive resources, public versus restricted links; no quizzes. |
| FR-45 |  | Implemented | Approval changes role and unlocks resources; add/edit/archive resources, public versus restricted links; no quizzes. |
| FR-46 |  | Optional | Google identity / video-completion tracking are explicitly optional and not implemented. |
| FR-47 |  | Implemented | Approval changes role and unlocks resources; add/edit/archive resources, public versus restricted links; no quizzes. |
| FR-48 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-49 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-50 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-51 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-52 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-53 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-54 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-55 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-56 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-57 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-58 |  | Implemented | CSV and genuine XLSX preview/confirm, shared validation, duplicate skip/explicit overwrite, preserved omitted care fields, errors and durable history. completion API/browser tests. |
| FR-59 |  | Implemented | Complete greyhound metadata/statuses, registration/Salesforce search, availability/location/colour/age/compatibility filters and editing, including allocated care details. |
| FR-60 |  | Implemented | Complete greyhound metadata/statuses, registration/Salesforce search, availability/location/colour/age/compatibility filters and editing, including allocated care details. |
| FR-61 |  | Implemented | Complete greyhound metadata/statuses, registration/Salesforce search, availability/location/colour/age/compatibility filters and editing, including allocated care details. |
| FR-62 |  | Implemented | Complete greyhound metadata/statuses, registration/Salesforce search, availability/location/colour/age/compatibility filters and editing, including allocated care details. |
| FR-63 |  | Implemented | Complete greyhound metadata/statuses, registration/Salesforce search, availability/location/colour/age/compatibility filters and editing, including allocated care details. |
| FR-64 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-65 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-66 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-67 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-68 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-69 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-70 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-71 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-72 |  | Implemented | Revision-checked transactional allocation, unique active-dog constraint, dates/private notes, update/end/history and owner-only projection. API/browser tests. |
| FR-73 |  | Client Pending | Resource links, filtered carer fields, editable mail templates and contact settings implemented and tested. Client must supply approved content, field classifications and sender/contact details; SMTP tested locally only. |
| FR-74 |  | Client Pending | Resource links, filtered carer fields, editable mail templates and contact settings implemented and tested. Client must supply approved content, field classifications and sender/contact details; SMTP tested locally only. |
| FR-75 |  | Implemented | Salesforce export import and identifiers; sample CSV and configurable mapping. Approved real sample still required. |
| FR-76 |  | Implemented | Salesforce export import and identifiers; sample CSV and configurable mapping. Approved real sample still required. |
| FR-77 |  | Implemented | Salesforce export import and identifiers; sample CSV and configurable mapping. Approved real sample still required. |
| FR-78 |  | Implemented / Future | Read-only paginated Salesforce preview and explicit update-by-identifier import provided. No scheduled synchronization, Bulk API, write-back or webhooks. |
| FR-79 |  | Implemented / Future | Read-only paginated Salesforce preview and explicit update-by-identifier import provided. No scheduled synchronization, Bulk API, write-back or webhooks. |
| FR-80 |  | Implemented / Future | Read-only paginated Salesforce preview and explicit update-by-identifier import provided. No scheduled synchronization, Bulk API, write-back or webhooks. |
| FR-81 |  | Client Pending | Read-only OAuth Salesforce connector implemented; GRNSW must approve integration credentials and permissions. |
| FR-82 |  | Client Pending | Resource links, filtered carer fields, editable mail templates and contact settings implemented and tested. Client must supply approved content, field classifications and sender/contact details; SMTP tested locally only. |
| FR-83 |  | Implemented | Durable email outbox, verification notification, editable templates, SMTP success/failure and retry. Preview sends no email; local SMTP fixture tests delivery contract. |
| FR-84 |  | Client Pending | Resource links, filtered carer fields, editable mail templates and contact settings implemented and tested. Client must supply approved content, field classifications and sender/contact details; SMTP tested locally only. |
| FR-85 |  | Client Pending | Resource links, filtered carer fields, editable mail templates and contact settings implemented and tested. Client must supply approved content, field classifications and sender/contact details; SMTP tested locally only. |
| FR-86 |  | Implemented | Durable email outbox, verification notification, editable templates, SMTP success/failure and retry. Preview sends no email; local SMTP fixture tests delivery contract. |
| FR-87 |  | Client Pending | Resource links, filtered carer fields, editable mail templates and contact settings implemented and tested. Client must supply approved content, field classifications and sender/contact details; SMTP tested locally only. |
| FR-88 |  | Implemented | Durable email outbox, verification notification, editable templates, SMTP success/failure and retry. Preview sends no email; local SMTP fixture tests delivery contract. |
| FR-89 |  | Implemented | Durable email outbox, verification notification, editable templates, SMTP success/failure and retry. Preview sends no email; local SMTP fixture tests delivery contract. |
| FR-90 |  | Implemented | Durable email outbox, verification notification, editable templates, SMTP success/failure and retry. Preview sends no email; local SMTP fixture tests delivery contract. |
| FR-91 |  | Implemented | All required report columns visible in paginated table and CSV/XLSX, complete filters, summary statistics, on-demand and configurable Monday report attachments; completion tests. |
| FR-92 |  | Implemented | All required report columns visible in paginated table and CSV/XLSX, complete filters, summary statistics, on-demand and configurable Monday report attachments; completion tests. |
| FR-93 |  | Implemented | All required report columns visible in paginated table and CSV/XLSX, complete filters, summary statistics, on-demand and configurable Monday report attachments; completion tests. |
| FR-94 |  | Implemented | All required report columns visible in paginated table and CSV/XLSX, complete filters, summary statistics, on-demand and configurable Monday report attachments; completion tests. |
| FR-95 |  | Implemented | All required report columns visible in paginated table and CSV/XLSX, complete filters, summary statistics, on-demand and configurable Monday report attachments; completion tests. |
| FR-96 |  | Implemented | All required report columns visible in paginated table and CSV/XLSX, complete filters, summary statistics, on-demand and configurable Monday report attachments; completion tests. |
| FR-97 |  | Implemented | All required report columns visible in paginated table and CSV/XLSX, complete filters, summary statistics, on-demand and configurable Monday report attachments; completion tests. |
| FR-98 |  | Implemented | All required report columns visible in paginated table and CSV/XLSX, complete filters, summary statistics, on-demand and configurable Monday report attachments; completion tests. |
| SR-01 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-02 |  | Client Pending | Microsoft OIDC implemented and fixture-tested. MFA is enforced through the client's Entra Conditional Access policy; live tenant validation pending. |
| SR-03 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-04 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-05 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-06 |  | Client Pending | Microsoft OIDC implemented and fixture-tested. MFA is enforced through the client's Entra Conditional Access policy; live tenant validation pending. |
| SR-07 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-08 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-09 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-10 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-11 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-12 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-13 |  | Operational Pending | Production HTTPS requirement, Helmet and access controls implemented. TLS termination, encrypted database/backup volume, offsite protection and deployment verification are operator responsibilities. |
| SR-14 |  | Operational Pending | Production HTTPS requirement, Helmet and access controls implemented. TLS termination, encrypted database/backup volume, offsite protection and deployment verification are operator responsibilities. |
| SR-15 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-16 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-17 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-18 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-19 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| SR-20 |  | Implemented | Backend roles/ownership, bcrypt, hashed single-use reset tokens, revoked/idle sessions, origin checks, parameterized SQL, React escaping, restricted-size CSV/XLSX and bounded workbook workers. Security API regressions; residual penetration test pending. |
| PR-01 |  | Client Pending | Privacy/terms links and notices configurable; fields and correction implemented. Client must approve minimization, notices, URLs and retention/deletion policy; no retention period invented. |
| PR-02 |  | Client Pending | Privacy/terms links and notices configurable; fields and correction implemented. Client must approve minimization, notices, URLs and retention/deletion policy; no retention period invented. |
| PR-03 |  | Implemented | Consent, role/ownership protections, selected profile corrections, staff-authorized protected corrections and staff-only reports. completion/business integration tests. |
| PR-04 |  | Client Pending | Privacy/terms links and notices configurable; fields and correction implemented. Client must approve minimization, notices, URLs and retention/deletion policy; no retention period invented. |
| PR-05 |  | Implemented | Consent, role/ownership protections, selected profile corrections, staff-authorized protected corrections and staff-only reports. completion/business integration tests. |
| PR-06 |  | Implemented | Consent, role/ownership protections, selected profile corrections, staff-authorized protected corrections and staff-only reports. completion/business integration tests. |
| PR-07 |  | Client Pending | Privacy/terms links and notices configurable; fields and correction implemented. Client must approve minimization, notices, URLs and retention/deletion policy; no retention period invented. |
| PR-08 |  | Implemented | Consent, role/ownership protections, selected profile corrections, staff-authorized protected corrections and staff-only reports. completion/business integration tests. |
| FR-99 |  | Implemented | Audit records and searchable paginated admin viewer, IDs/times/appropriate changes; no edit/delete audit route. |
| FR-100 |  | Implemented | Audit records and searchable paginated admin viewer, IDs/times/appropriate changes; no edit/delete audit route. |
| FR-101 |  | Implemented | Audit records and searchable paginated admin viewer, IDs/times/appropriate changes; no edit/delete audit route. |
| NFR-01 |  | Operational Pending | Logical form sections, labels and operational screens implemented; target-user usability acceptance still needed. |
| NFR-02 |  | Operational Pending | Logical form sections, labels and operational screens implemented; target-user usability acceptance still needed. |
| NFR-03 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-04 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-05 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-06 |  | Operational Pending | Responsive layouts, native controls, labels, focusable dialogs and automated desktop/mobile accessibility checks. Manual keyboard, screen-reader and full WCAG AA review remain required. |
| NFR-07 |  | Operational Pending | Responsive layouts, native controls, labels, focusable dialogs and automated desktop/mobile accessibility checks. Manual keyboard, screen-reader and full WCAG AA review remain required. |
| NFR-08 |  | Operational Pending | Responsive layouts, native controls, labels, focusable dialogs and automated desktop/mobile accessibility checks. Manual keyboard, screen-reader and full WCAG AA review remain required. |
| NFR-09 |  | Operational Pending | Responsive layouts, native controls, labels, focusable dialogs and automated desktop/mobile accessibility checks. Manual keyboard, screen-reader and full WCAG AA review remain required. |
| NFR-10 |  | Operational Pending | Responsive layouts, native controls, labels, focusable dialogs and automated desktop/mobile accessibility checks. Manual keyboard, screen-reader and full WCAG AA review remain required. |
| NFR-11 |  | Client Pending | Client-supplied video links; choose captioned versions and accessible document content before publication. |
| NFR-12 |  | Operational Pending | Automated local 5,000-record list/search/CSV parsing benchmark added. Local timing is not deployed latency, concurrency or capacity certification. |
| NFR-13 |  | Operational Pending | Automated local 5,000-record list/search/CSV parsing benchmark added. Local timing is not deployed latency, concurrency or capacity certification. |
| NFR-14 |  | Operational Pending | Automated local 5,000-record list/search/CSV parsing benchmark added. Local timing is not deployed latency, concurrency or capacity certification. |
| NFR-15 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-16 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-17 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-18 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-19 |  | Implemented / Operations | Daily online SQLite backups, integrity checks, manual backup, maintenance history and non-overwriting restore CLI tested. Offsite copies, restore drills, retention, alerts and always-on scheduler deployment still need an operator. |
| NFR-20 |  | Implemented / Operations | Daily online SQLite backups, integrity checks, manual backup, maintenance history and non-overwriting restore CLI tested. Offsite copies, restore drills, retention, alerts and always-on scheduler deployment still need an operator. |
| NFR-21 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-22 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-23 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-24 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-25 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| NFR-26 |  | Operational Pending | Automated local 5,000-record list/search/CSV parsing benchmark added. Local timing is not deployed latency, concurrency or capacity certification. |
| NFR-27 |  | Operational Pending | Automated local 5,000-record list/search/CSV parsing benchmark added. Local timing is not deployed latency, concurrency or capacity certification. |
| NFR-28 |  | Implemented | Component/repository structure, configuration, processing states, validation/transactions, actionable provider errors and user/technical documentation. See capstone-design.md and deployment.md. |
| BR-01 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-02 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-03 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-04 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-05 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-06 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-07 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-08 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-09 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-10 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-11 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| BR-12 |  | Implemented | Server-side eligibility, identity/ownership, role permissions, mandatory form approval check, unique greyhound IDs, transaction/active-allocation constraint and persistent history. businessIntegration/completion API tests. |
| AC-01 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-02 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-03 |  | Client Pending | Emails queued and delivery contract tested using local SMTP fixture. Actual mailbox acceptance needs configured client SMTP and approved wording. |
| AC-04 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-05 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-06 |  | Client Pending | Emails queued and delivery contract tested using local SMTP fixture. Actual mailbox acceptance needs configured client SMTP and approved wording. |
| AC-07 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-08 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-09 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-10 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-11 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-12 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |
| AC-13 |  | Client Pending | Signed Microsoft token/provider fixtures pass; live authorized tenant login cannot be accepted without client configuration. |
| AC-14 |  | Implemented / Tested | Representative automated backend and browser acceptance workflows; formal client UAT/sign-off still required. |

## Client Decisions Required

Final foster form and required fields; approval/rejection rules; actual Salesforce sample/API fields; staff roles, tenant and MFA policy; SMTP sender and approved email copy; public/private and foster-visible resource/greyhound content; privacy/terms/retention policy; captioned media and branding; hosting, expected workload, backup recovery objectives and support owner.

## Explicitly Not Claimed

Live provider access, GRNSW integration approval, original-form parity, formal WCAG compliance, production encryption/hosting, delivered inbox mail, automated retention deletion, scheduled Salesforce synchronization, optional Google/video tracking/Power BI/e-signatures/SMS/mobile app/adoption workflows, or formal client sign-off.

