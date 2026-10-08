# Greyhounds as Pets Foster Management System

## Detailed System Requirements

## 1. Project Overview

Greyhounds as Pets, operated by Greyhound Racing New South Wales, requires a web-based Foster Management System to improve the process of registering, approving and managing foster carers.

The system will allow members of the public to submit a foster application and create an account. Greyhounds as Pets staff will review and approve applications, allocate greyhounds to approved foster carers, provide access to training materials and generate reports.

The system must also support greyhound data imported from Salesforce, initially through Excel or CSV files, with the possibility of direct Salesforce integration in the future.

---

## 2. Project Objectives

The main objectives of the system are to:

1. Digitise the foster carer application process.
2. automatically create an applicant account after form submission.
3. Allow GAP staff to review and approve or reject applications.
4. Give approved foster carers access to training videos and information.
5. Allow staff to allocate a greyhound to an approved foster carer.
6. Import greyhound information from Salesforce.
7. Protect applicant and greyhound information using role-based security.
8. Send automatic email notifications at important stages.
9. Generate weekly and ad hoc reports about foster applications.
10. Provide a proof-of-concept system that can later be expanded.

---

# 3. Project Scope

## 3.1 In Scope

The first version of the system will include:

* Online foster application form
* Foster carer account creation
* Applicant login
* GAP staff login
* Application review and approval
* Application rejection or request for further information
* Foster carer profile management
* Access to approved training videos and resources
* Greyhound data import using CSV or Excel
* Greyhound allocation to foster carers
* Email notifications
* Application status tracking
* Basic reporting
* Role-based access control
* Audit records for important staff actions
* Future Salesforce integration planning

## 3.2 Out of Scope

The following items are not essential for the first proof of concept:

* Full Learning Management System
* Formal quizzes or examinations
* Mandatory tracking of video completion
* Automatic assessment of foster carers
* Online adoption processing
* Online payment processing
* Veterinary management
* Greyhound racing registration management
* Full Salesforce API integration
* Mobile application
* Real-time location tracking
* Automatic greyhound-to-carer matching using artificial intelligence

These features may be considered for future development.

---

# 4. System Users

## 4.1 Public Visitor

A public visitor is someone who has not yet applied to become a foster carer.

The visitor can:

* View information about fostering
* Read basic foster care requirements
* View public videos and resources
* Start a foster application
* Create an account through the application process
* Log in after registration

## 4.2 Foster Applicant

A foster applicant is a person who has submitted an application but has not yet been approved.

The applicant can:

* Log in using an email address and password
* View personal application details
* View application status
* Update permitted personal information
* Submit additional information if requested
* Receive application-related emails
* Access only information connected to their own account

## 4.3 Approved Foster Carer

An approved foster carer is an applicant whose application has been approved by GAP staff.

The foster carer can:

* Access approved training materials
* View links to YouTube or Vimeo videos
* View foster care instructions
* View the greyhound allocated to them
* View relevant greyhound information
* Update selected profile information
* Receive allocation notifications
* Access only their own profile and allocated greyhound

## 4.4 GAP Staff Member

A GAP staff member manages applicants and foster carers.

Staff can:

* Log in through Microsoft SSO or SAML
* View all applications
* Review application details
* Approve applications
* Reject applications
* Request additional information
* View approved foster carers
* Import greyhound records
* Allocate greyhounds
* Remove or change allocations
* View application and allocation statuses
* Generate reports

## 4.5 System Administrator

The system administrator has the highest level of access.

The administrator can:

* Manage staff accounts and roles
* Configure system settings
* Manage training resources
* Manage email templates
* Manage imported greyhound data
* View all system records
* Access audit logs
* Correct data errors
* Configure integrations
* Export reports
* Disable accounts when necessary

---

# 5. Functional Requirements

## 5.1 Foster Application Form

### FR-01

The system shall provide an online foster application form.

### FR-02

The application form shall replicate the important questions and fields contained in the existing Greyhounds as Pets foster form.

### FR-03

The form should collect relevant information such as:

* Applicant’s full name
* Email address
* Phone number
* Residential address
* Suburb
* State
* Postcode
* Date of birth, where required
* Household type
* Home ownership or rental status
* Landlord approval, where applicable
* Yard or outdoor area information
* Fence information
* Household member details
* Children living in the household
* Existing pets
* Previous experience with dogs
* Previous experience with greyhounds
* Preferred fostering period
* Availability
* Transport availability
* Preferred greyhound characteristics
* Reason for applying
* Emergency contact information
* Agreement to terms and conditions
* Privacy consent

### FR-04

Required fields shall be clearly identified.

### FR-05

The system shall validate information before submission.

Examples include:

* Valid email address
* Valid phone number
* Required fields completed
* Valid postcode format
* Password meeting security requirements
* Required consent checkboxes selected

### FR-06

The applicant shall be able to review the entered information before final submission.

### FR-07

After successful submission, the system shall display a confirmation message.

### FR-08

Each submitted application shall receive a unique application ID.

---

## 5.2 Account Registration

### FR-09

The system shall automatically create an applicant account after a foster application is submitted.

### FR-10

The applicant shall use their email address as their primary login identifier.

### FR-11

The system shall prevent duplicate active accounts using the same email address.

### FR-12

Applicants shall be able to create a secure password.

### FR-13

The system may allow account registration through a supported external identity provider such as Google.

### FR-14

The system shall provide email verification.

### FR-15

The system shall provide a forgotten-password and password-reset function.

### FR-16

The applicant shall be required to accept the system’s privacy policy and terms of use.

---

## 5.3 Applicant Dashboard

### FR-17

The applicant shall have access to a personal dashboard after login.

### FR-18

The dashboard shall display the applicant’s current application status.

Possible statuses include:

* Draft
* Submitted
* Under review
* Further information required
* Approved
* Rejected
* Withdrawn
* Inactive

### FR-19

The dashboard shall show the date the application was submitted.

### FR-20

The applicant shall be able to view their submitted application.

### FR-21

The applicant shall be able to update selected contact information.

### FR-22

The applicant shall not be able to change protected application details after submission unless GAP staff permit the change.

### FR-23

The applicant shall be able to provide additional information when requested by staff.

---

## 5.4 Staff Authentication

### FR-24

GAP staff shall log in using Microsoft Single Sign-On.

### FR-25

The system should support Microsoft SAML or another approved Microsoft identity service.

### FR-26

Only authorised GAP staff accounts shall be allowed to access the administration area.

### FR-27

The system shall assign staff permissions according to their role.

---

## 5.5 Application Management

### FR-28

Staff shall be able to view a list of all foster applications.

### FR-29

The application list shall display:

* Application ID
* Applicant name
* Email address
* Submission date
* Application status
* Assigned staff member
* Approval date, where applicable

### FR-30

Staff shall be able to search for applications by:

* Applicant name
* Email address
* Application ID
* Phone number

### FR-31

Staff shall be able to filter applications by:

* Application status
* Submission date
* Location
* Assigned staff member
* Approval status

### FR-32

Staff shall be able to open and review the complete application.

### FR-33

Staff shall be able to approve an application.

### FR-34

Staff shall be able to reject an application.

### FR-35

Staff shall be able to request additional information.

### FR-36

Staff shall be able to add internal notes to an application.

### FR-37

Internal notes shall not be visible to applicants unless specifically marked as applicant-visible.

### FR-38

The system shall record the name of the staff member who completed an approval, rejection or status change.

### FR-39

The system shall record the date and time of each application decision.

### FR-40

A reason should be recorded when an application is rejected.

---

## 5.6 Approved Foster Carer Access

### FR-41

When an application is approved, the applicant’s account shall be updated to approved foster carer status.

### FR-42

Approval shall unlock additional resources.

### FR-43

Approved resources may include:

* Foster carer guides
* Greyhound care instructions
* Feeding information
* Safety information
* Settling-in instructions
* Behaviour information
* Contact information
* YouTube videos
* Vimeo videos
* Frequently asked questions
* Downloadable PDF documents

### FR-44

Applicants who have not been approved shall not be able to access restricted foster resources.

### FR-45

Administrators shall be able to add, update and remove training resource links.

### FR-46

Video completion tracking may be included as an optional feature.

### FR-47

The first version shall not require foster carers to complete quizzes or formal training assessments.

---

# 6. Greyhound Management Requirements

## 6.1 Greyhound Data Import

### FR-48

The system shall allow authorised staff to import greyhound information using a CSV file.

### FR-49

The system should also support Microsoft Excel files if technically possible.

### FR-50

The import file may be generated from Salesforce.

### FR-51

The greyhound data may include:

* Greyhound ID
* Registration number
* Greyhound name
* Sex
* Date of birth or age
* Colour
* Current location
* Current status
* Availability for fostering
* Behaviour notes
* Medical or care notes appropriate for the foster carer
* Compatibility with children
* Compatibility with cats
* Compatibility with small dogs
* Compatibility with other animals
* Special requirements
* Salesforce record ID

### FR-52

The system shall validate the uploaded file before completing the import.

### FR-53

The system shall identify missing mandatory columns.

### FR-54

The system shall identify invalid data formats.

### FR-55

The system shall detect possible duplicate greyhound records.

### FR-56

The system shall provide an import summary showing:

* Number of successful records
* Number of failed records
* Number of duplicate records
* Error messages
* Date and time of import
* Staff member who performed the import

### FR-57

The system shall allow staff to download an import error report.

### FR-58

The import process shall not overwrite existing data without warning.

---

## 6.2 Greyhound Record Management

### FR-59

Staff shall be able to view all imported greyhound records.

### FR-60

Staff shall be able to search for a greyhound by:

* Greyhound name
* Greyhound ID
* Registration number
* Salesforce ID

### FR-61

Staff shall be able to filter greyhounds by:

* Availability
* Current location
* Allocation status
* Colour
* Age
* Compatibility requirements

### FR-62

Staff shall be able to update permitted greyhound information.

### FR-63

The system shall show whether a greyhound is:

* Available
* Pending allocation
* Allocated
* Returned
* Adopted
* Unavailable
* Inactive

---

# 7. Greyhound Allocation Requirements

### FR-64

Staff shall be able to allocate an available greyhound to an approved foster carer.

### FR-65

The system shall prevent a greyhound from being allocated to more than one active foster carer at the same time.

### FR-66

The system shall prevent an unapproved applicant from receiving a greyhound allocation.

### FR-67

Before confirming an allocation, the system shall display the foster carer and greyhound details.

### FR-68

The allocation record shall contain:

* Allocation ID
* Foster carer ID
* Greyhound ID
* Allocation date
* Expected foster start date
* Expected end date, where applicable
* Actual return date
* Allocation status
* Staff member who created the allocation
* Internal notes

### FR-69

Staff shall be able to change or cancel an allocation.

### FR-70

The system shall record previous allocations for historical purposes.

### FR-71

Approved foster carers shall be able to view only the greyhound currently allocated to them.

### FR-72

Foster carers shall not be able to view greyhounds allocated to other carers.

### FR-73

The foster carer view shall display only appropriate information, such as:

* Greyhound name
* Age
* Colour
* Photograph, if available
* Care instructions
* Feeding information
* Behaviour notes
* Relevant medical or safety information
* GAP contact details

### FR-74

Sensitive internal or regulatory information shall not be displayed to foster carers.

---

# 8. Salesforce Integration Requirements

## 8.1 Proof-of-Concept Integration

### FR-75

The proof-of-concept system shall support greyhound data exported from Salesforce.

### FR-76

The initial integration method shall use CSV or Excel import.

### FR-77

Imported records should contain the Salesforce record ID to support future synchronisation.

## 8.2 Future Integration

### FR-78

The system architecture should allow future direct integration with Salesforce.

Possible future methods include:

* Salesforce REST API
* Salesforce Bulk API
* Scheduled data synchronisation
* Middleware integration
* Webhooks
* Integration platforms such as MuleSoft or Microsoft Power Automate

### FR-79

A future integration should reduce repeated manual data extraction, transformation and loading.

### FR-80

Future synchronisation should support detecting updated greyhound records.

### FR-81

Future integration should include authentication and authorisation approved by GRNSW.

---

# 9. Email Notification Requirements

### FR-82

The system shall send a confirmation email when a foster application is successfully submitted.

The email should include:

* Applicant name
* Confirmation of submission
* Application ID
* Basic explanation of the next step
* GAP contact information

### FR-83

The system shall send an email after the applicant verifies their email address.

### FR-84

The system shall send an approval email when GAP staff approve the application.

The approval email should include:

* Confirmation of approval
* Instructions for logging in
* Information about accessing training resources
* Explanation that GAP staff will contact the foster carer
* Greyhound information if an allocation has already been completed

### FR-85

The system shall send an email when a greyhound is allocated.

The allocation email should include:

* Greyhound name
* Basic greyhound details
* Allocation confirmation
* GAP contact details
* Notice that a GAP staff member will make contact

### FR-86

The system should send an email when additional information is required.

### FR-87

The system should send an email when an application is rejected or withdrawn, using an approved communication template.

### FR-88

Administrators shall be able to edit email templates.

### FR-89

The system shall record whether an email was successfully sent.

### FR-90

Failed email deliveries shall be visible to authorised staff.

---

# 10. Reporting Requirements

### FR-91

The system shall provide an application status report.

### FR-92

The report shall include:

* Applicant name
* Email address
* Phone number
* Application ID
* Submission date
* Current status
* Approval date
* Assigned greyhound
* Greyhound ID
* Assigned staff member

### FR-93

Staff shall be able to generate reports on demand.

### FR-94

The system should support a weekly report.

### FR-95

Reports shall be filterable by:

* Date range
* Application status
* Location
* Staff member
* Greyhound allocation status

### FR-96

Reports shall be exportable as CSV.

### FR-97

Reports should also be exportable as Excel or PDF where practical.

### FR-98

The system should provide summary statistics, including:

* Number of applications received
* Number of applications under review
* Number of applications approved
* Number of applications rejected
* Number of approved foster carers
* Number of greyhounds available
* Number of greyhounds allocated
* Average application processing time

---

# 11. Security Requirements

## 11.1 Authentication

### SR-01

Applicants shall authenticate using a verified email address and password.

### SR-02

Staff shall authenticate through Microsoft SSO or SAML.

### SR-03

Passwords shall never be stored in plain text.

### SR-04

Passwords shall be securely hashed.

### SR-05

The system shall use secure password-reset tokens.

### SR-06

The system should support multi-factor authentication for staff through Microsoft identity services.

## 11.2 Authorisation

### SR-07

The system shall use role-based access control.

### SR-08

Applicants shall access only their own information.

### SR-09

Foster carers shall access only their own allocated greyhound information.

### SR-10

Staff shall access information according to their assigned role.

### SR-11

Administrators shall have access to all system management functions.

### SR-12

The system shall prevent direct access to unauthorised pages through manipulated URLs.

## 11.3 Data Security

### SR-13

All communication between users and the system shall use HTTPS.

### SR-14

Personal information shall be protected during storage and transmission.

### SR-15

Sensitive information shall not be included unnecessarily in URLs or system logs.

### SR-16

The system shall apply session timeouts.

### SR-17

Users shall be logged out after an extended period of inactivity.

### SR-18

The system shall protect against common web attacks, including:

* SQL injection
* Cross-site scripting
* Cross-site request forgery
* Brute-force login attempts
* Malicious file uploads
* Session hijacking

### SR-19

File uploads shall be restricted to approved file types.

### SR-20

The system shall apply reasonable file-size limits.

---

# 12. Privacy Requirements

### PR-01

The system shall collect only information necessary for managing foster applications.

### PR-02

Applicants shall be informed about how their information will be used.

### PR-03

Applicants shall provide consent before submitting personal information.

### PR-04

The system shall provide a link to the relevant privacy policy.

### PR-05

Personal information shall not be visible to unauthorised users.

### PR-06

The system shall support correction of inaccurate personal information.

### PR-07

Data retention should follow GRNSW and GAP policies and applicable Australian privacy requirements.

### PR-08

Reports containing personal information shall be accessible only to authorised staff.

---

# 13. Audit and Logging Requirements

### FR-99

The system shall maintain an audit log for important activities.

The audit log should record:

* Account creation
* Login attempts
* Application submission
* Application status changes
* Application approval
* Application rejection
* Greyhound import
* Greyhound allocation
* Allocation removal
* Report export
* Administrative changes

### FR-100

Each audit record shall include:

* User or staff ID
* Action
* Date and time
* Relevant record ID
* Previous value, where appropriate
* New value, where appropriate

### FR-101

Audit records shall not be editable by normal users.

---

# 14. Non-Functional Requirements

## 14.1 Usability

### NFR-01

The website shall be easy to use for users with limited technical experience.

### NFR-02

The system shall use clear labels and simple instructions.

### NFR-03

Error messages shall explain what went wrong and how to fix it.

### NFR-04

The application form should be divided into logical sections.

### NFR-05

Users should be able to save a draft application and return later, where possible.

### NFR-06

The interface shall work on desktop computers, tablets and mobile devices.

## 14.2 Accessibility

### NFR-07

The system should follow Web Content Accessibility Guidelines, preferably WCAG 2.1 Level AA.

### NFR-08

The system shall support keyboard navigation.

### NFR-09

Form fields shall have accessible labels.

### NFR-10

Text shall have appropriate readability and contrast.

### NFR-11

Videos should include captions where available.

## 14.3 Performance

### NFR-12

Normal pages should load within approximately three seconds under expected usage conditions.

### NFR-13

Search results should normally display within three seconds.

### NFR-14

The system shall process a normal CSV import within a reasonable time.

### NFR-15

Long-running imports should provide a progress or processing message.

## 14.4 Reliability

### NFR-16

The system shall validate information before saving it.

### NFR-17

The system shall prevent partial or corrupted allocation records.

### NFR-18

The system shall provide meaningful error messages if an external service is unavailable.

### NFR-19

The system shall maintain regular backups.

### NFR-20

The system should support recovery after a failure.

## 14.5 Maintainability

### NFR-21

The source code shall be organised into clear components.

### NFR-22

The system shall include technical documentation.

### NFR-23

Configuration information shall be separated from source code where possible.

### NFR-24

Email templates and training links should be changeable without major code modifications.

### NFR-25

The architecture should allow future Salesforce API integration.

## 14.6 Scalability

### NFR-26

The system should support growth in applications, users and greyhound records.

### NFR-27

The system should support at least several thousand foster applications and greyhound records.

### NFR-28

The database design shall allow new roles, statuses and data fields to be added later.

---

# 15. Data Requirements

## 15.1 Applicant Entity

The applicant record should contain:

* Applicant ID
* Application ID
* First name
* Last name
* Email
* Phone number
* Address
* Suburb
* State
* Postcode
* Account status
* Application status
* Email verification status
* Submission date
* Approval date
* Created date
* Updated date

## 15.2 Staff Entity

The staff record should contain:

* Staff ID
* Microsoft identity ID
* Name
* Email
* Role
* Account status
* Last login date

## 15.3 Greyhound Entity

The greyhound record should contain:

* Greyhound ID
* Salesforce record ID
* Registration number
* Name
* Sex
* Date of birth
* Age
* Colour
* Location
* Availability status
* Compatibility information
* Behaviour notes
* Care instructions
* Record created date
* Record updated date

## 15.4 Allocation Entity

The allocation record should contain:

* Allocation ID
* Applicant or foster carer ID
* Greyhound ID
* Allocated by staff ID
* Allocation date
* Start date
* Expected end date
* Actual end date
* Allocation status
* Notes

## 15.5 Training Resource Entity

The training resource should contain:

* Resource ID
* Title
* Description
* Resource type
* YouTube, Vimeo or document URL
* Display order
* Active status
* Date created
* Date updated

## 15.6 Notification Entity

The notification record should contain:

* Notification ID
* Recipient
* Notification type
* Subject
* Date sent
* Delivery status
* Related application or allocation ID

---

# 16. Main System Workflows

## 16.1 Foster Application Workflow

1. Visitor opens the foster application page.
2. Visitor completes the application form.
3. System validates the form.
4. Visitor submits the application.
5. System creates an application record.
6. System creates an applicant account.
7. System sends an email verification or confirmation email.
8. Application status becomes Submitted.
9. GAP staff review the application.
10. Staff approve, reject or request further information.
11. Applicant receives the appropriate email.
12. If approved, restricted resources become available.

## 16.2 Greyhound Import Workflow

1. Staff export greyhound data from Salesforce.
2. Staff log in to the administration portal.
3. Staff select the import function.
4. Staff upload a CSV or Excel file.
5. System validates the file.
6. System displays errors or warnings.
7. Staff confirm the import.
8. System creates or updates approved records.
9. System displays an import summary.
10. System records the import in the audit log.

## 16.3 Greyhound Allocation Workflow

1. Staff open the approved foster carer record.
2. Staff select the allocation function.
3. System displays available greyhounds.
4. Staff review relevant greyhound information.
5. Staff select a greyhound.
6. System validates that the carer is approved.
7. System validates that the greyhound is available.
8. Staff confirm the allocation.
9. System creates the allocation record.
10. Greyhound status changes to Allocated.
11. Foster carer dashboard displays the greyhound.
12. System sends an allocation email.
13. The action is recorded in the audit log.

---

# 17. Business Rules

### BR-01

Only applicants with an approved status can be allocated a greyhound.

### BR-02

A greyhound can have only one active foster allocation at a time.

### BR-03

A foster applicant shall not see restricted training resources before approval.

### BR-04

A foster carer shall not see another foster carer’s information.

### BR-05

A foster carer shall not see information about another greyhound unless it has been allocated to them.

### BR-06

Only authorised staff can approve applications.

### BR-07

Only authorised staff can import greyhound data.

### BR-08

Only authorised staff can allocate or remove greyhounds.

### BR-09

Every application decision must be linked to a staff member and date.

### BR-10

Every imported greyhound must have a unique identifier.

### BR-11

Every allocation must retain a historical record even after it ends.

### BR-12

An application cannot be approved unless mandatory information has been completed.

---

# 18. Suggested Application Statuses

The following application statuses are recommended:

| Status               | Meaning                                         |
| -------------------- | ----------------------------------------------- |
| Draft                | Application has been started but not submitted  |
| Submitted            | Application has been successfully submitted     |
| Under Review         | GAP staff are reviewing the application         |
| Information Required | More information is required from the applicant |
| Approved             | Applicant is approved as a foster carer         |
| Rejected             | Application was not approved                    |
| Withdrawn            | Applicant withdrew their application            |
| Inactive             | Foster carer is no longer active                |

---

# 19. Suggested Greyhound Statuses

| Status             | Meaning                                |
| ------------------ | -------------------------------------- |
| Imported           | Greyhound record has been imported     |
| Available          | Greyhound is available for fostering   |
| Pending Allocation | Allocation is being prepared           |
| Allocated          | Greyhound is currently allocated       |
| Returned           | Greyhound has returned from fostering  |
| Adopted            | Greyhound has been permanently adopted |
| Unavailable        | Greyhound is temporarily unavailable   |
| Inactive           | Record is no longer active             |

---

# 20. Suggested Allocation Statuses

| Status         | Meaning                                    |
| -------------- | ------------------------------------------ |
| Proposed       | Allocation has been proposed               |
| Confirmed      | Allocation has been confirmed              |
| Active         | Foster placement is currently active       |
| Completed      | Foster placement has ended normally        |
| Cancelled      | Allocation was cancelled                   |
| Returned Early | Greyhound returned before the planned date |

---

# 21. Minimum Viable Product Requirements

The minimum viable product should include:

1. Foster application form
2. Applicant account creation
3. Email and password login
4. Staff login
5. Staff application list
6. Application approval and rejection
7. Approved foster carer dashboard
8. Links to training videos
9. CSV greyhound import
10. Greyhound record list
11. Greyhound allocation
12. Confirmation and approval emails
13. Application status report
14. Role-based access control
15. Basic audit logging

---

# 22. Optional Features

The following features are optional or suitable for later development:

* Google login for foster carers
* Excel file import
* Microsoft Power BI reporting
* Video completion tracking
* Foster carer progress tracking
* Automatic reminders
* Greyhound photographs
* Electronic document signing
* Advanced matching recommendations
* Direct Salesforce API connection
* Scheduled Salesforce synchronisation
* Foster placement feedback forms
* Incident reporting
* Foster carer availability calendar
* SMS notifications
* Mobile application
* Adoption conversion process

---

# 23. Acceptance Criteria

## AC-01 Application Submission

Given that a visitor completes all required fields, when they submit the application, the system must create an application and applicant account.

## AC-02 Invalid Application

Given that required information is missing, when the visitor submits the application, the system must display validation errors and prevent submission.

## AC-03 Application Confirmation

When an application is submitted successfully, the system must send a confirmation email.

## AC-04 Staff Review

Given that a staff member is authenticated, they must be able to view submitted applications.

## AC-05 Approval

When a staff member approves an application, the status must change to Approved and restricted resources must become available.

## AC-06 Approval Email

When an application is approved, the system must send an approval email.

## AC-07 CSV Import

Given a correctly formatted CSV file, authorised staff must be able to import greyhound records.

## AC-08 Invalid Import

Given an incorrectly formatted file, the system must reject invalid records and show meaningful error messages.

## AC-09 Allocation

Given an approved foster carer and available greyhound, staff must be able to create an allocation.

## AC-10 Duplicate Allocation Prevention

Given that a greyhound already has an active allocation, the system must prevent another active allocation.

## AC-11 Foster Carer Access

A foster carer must only be able to view their own personal information and allocated greyhound.

## AC-12 Reporting

Staff must be able to generate and export a report showing applicants and their application statuses.

## AC-13 Staff SSO

Authorised staff must be able to access the administration portal using Microsoft authentication.

## AC-14 Unauthorised Access

An unauthorised user must not be able to access administrative functions or another person’s records.

---

# 24. Project Deliverables

The project should produce:

* Requirements specification
* User stories
* Product backlog
* Use-case diagram
* System context diagram
* Database design
* Wireframes
* User interface prototype
* Working foster application form
* Applicant dashboard
* Staff administration dashboard
* CSV import feature
* Greyhound allocation feature
* Email notification feature
* Reporting feature
* Security and access-control design
* Testing documentation
* User guide
* Technical documentation
* Final demonstration
* Recommendations for future Salesforce integration

---

# 25. Key Assumptions

1. GAP will provide the existing foster application form.
2. GAP will provide sample greyhound data exported from Salesforce.
3. GAP will provide links to approved YouTube or Vimeo videos.
4. GAP will provide branding guidelines and logos.
5. Microsoft authentication details may not be available during the early prototype stage.
6. A simulated staff login may be used until Microsoft SSO is configured.
7. CSV import will be the main greyhound integration method for the proof of concept.
8. GAP staff will manually decide whether an applicant should be approved.
9. GAP staff will manually decide which greyhound should be allocated.
10. The project team will not modify the main Salesforce system.
11. The system is a proof of concept and may require additional security testing before production use.

---

# 26. Client Information Still Required

The project team should request the following information from the client:

* Final foster application form fields
* Mandatory and optional application fields
* Application approval rules
* Reasons for rejection
* Sample Salesforce CSV file
* Exact greyhound data fields
* Details visible to foster carers
* Details restricted to GAP staff
* Staff roles and permission levels
* Microsoft SSO configuration requirements
* Email sender account
* Email wording and templates
* Training video links
* Reporting format
* Data retention rules
* Privacy requirements
* Branding guidelines
* Hosting preference
* Expected number of users
* Expected number of applications
* Expected frequency of Salesforce imports
* Backup requirements
* Support and maintenance responsibilities
