# TODO: Fix Translation Keys for View Modals

## Context

During testing of the view modals implementation, it was discovered that several translation keys are missing from the translation files (`messages/en.json` and `messages/pt.json`). This causes raw key names to display instead of properly translated text.

**Issue Found**: The Passports view modal showed "Passports.passportDetails" instead of "Passport Details".

**Root Cause**: When implementing the 15 view modals according to the todo list, translation keys referenced in the components were not added to the translation files.

**Affected Components**: All 15 view modals need their translation keys verified and added if missing.

## Related PRD Sections

- **Section 3**: System Architecture - Component reusability and consistency
- **Section 10**: Database Schema - Understanding entity structures and field names
- **i18n Implementation**: All user-facing strings must be properly localized

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand current translation structure and identify all view modal components

#### Sub-tasks:

- [x] 0.1: Review translation file structure
  - Validation: Confirmed `messages/en.json` and `messages/pt.json` structure
  - Output: Each module has its own section (e.g., `"Passports": { ... }`)

- [x] 0.2: Identify all view modal components that need checking
  - Validation: Grep found 15 view modal components
  - Output:
    1. Companies (`company-view-modal.tsx`) - TESTED & WORKING
    2. Passports (`passport-view-modal.tsx`) - TESTED & FIXED
    3. Countries (`country-view-modal.tsx`)
    4. States (`state-view-modal.tsx`)
    5. Cities (`city-view-modal.tsx`)
    6. Consulates (`consulate-view-modal.tsx`)
    7. CBO Codes (`cbo-code-view-modal.tsx`)
    8. Legal Frameworks (`legal-framework-view-modal.tsx`)
    9. Process Types (`process-type-view-modal.tsx`)
    10. Document Types (`document-type-view-modal.tsx`)
    11. Documents (`document-view-modal.tsx`)
    12. Notifications (`notification-view-modal.tsx`)
    13. Activity Logs (`activity-log-view-modal.tsx`)
    14. People-Companies (`people-company-view-modal.tsx`)
    15. Case Statuses (`case-status-view-modal.tsx`)

#### Quality Checklist:

- [x] All view modal components identified
- [x] Translation file structure understood
- [x] Pattern for adding keys documented

---

### 1. Extract All Translation Keys from View Modals

**Objective**: Systematically extract all translation keys used in each view modal component

#### Sub-tasks:

- [ ] 1.1: Extract keys from Countries view modal
  - Component: `components/countries/country-view-modal.tsx`
  - Module: "Countries"
  - Keys to check:
    - `countryDetails` - Modal title
    - `countryInformation` - Section title
    - `name`, `code`, `iso3` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.2: Extract keys from States view modal
  - Component: `components/states/state-view-modal.tsx`
  - Module: "States"
  - Keys to check:
    - `stateDetails` - Modal title
    - `stateInformation` - Section title
    - `name`, `code`, `country` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.3: Extract keys from Cities view modal
  - Component: `components/cities/city-view-modal.tsx`
  - Module: "Cities"
  - Keys to check:
    - `cityDetails` - Modal title
    - `cityInformation` - Section title
    - `name`, `state`, `country`, `hasFederalPolice` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.4: Extract keys from Consulates view modal
  - Component: `components/consulates/consulate-view-modal.tsx`
  - Module: "Consulates"
  - Keys to check:
    - `consulateDetails` - Modal title
    - `basicInformation`, `contactInformation` - Section titles
    - `name`, `city`, `address`, `phoneNumber`, `email`, `website` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.5: Extract keys from CBO Codes view modal
  - Component: `components/cbo-codes/cbo-code-view-modal.tsx`
  - Module: "CboCodes"
  - Keys to check:
    - `cboCodeDetails` - Modal title
    - `cboInformation` - Section title
    - `code`, `cboTitle`, `description` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.6: Extract keys from Legal Frameworks view modal
  - Component: `components/legal-frameworks/legal-framework-view-modal.tsx`
  - Module: "LegalFrameworks"
  - Keys to check:
    - `legalFrameworkDetails` - Modal title
    - `frameworkInformation` - Section title
    - `name`, `processType`, `status`, `description` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.7: Extract keys from Process Types view modal
  - Component: `components/process-types/process-type-view-modal.tsx`
  - Module: "ProcessTypes"
  - Keys to check:
    - `processTypeDetails` - Modal title
    - `typeInformation`, `details` - Section titles
    - `name`, `code`, `category`, `description`, `estimatedDays`, `isActive` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.8: Extract keys from Document Types view modal
  - Component: `components/document-types/document-type-view-modal.tsx`
  - Module: "DocumentTypes"
  - Keys to check:
    - `documentTypeDetails` - Modal title
    - `typeInformation` - Section title
    - `name`, `code`, `category`, `description`, `status` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.9: Extract keys from Documents view modal
  - Component: `components/documents/document-view-modal.tsx`
  - Module: "Documents"
  - Keys to check:
    - `documentDetails` - Modal title
    - `documentInformation`, `relatedEntities`, `uploadInformation`, `reviewInformation` - Section titles
    - `name`, `type`, `fileName`, `fileSize`, `fileType`, `status`, `file`, `downloadFile` - Field labels
    - `person`, `company`, `uploadedBy`, `uploadedAt`, `reviewedBy`, `reviewedAt`, `rejectionReason` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.10: Extract keys from Notifications view modal
  - Component: `components/notifications/notification-view-modal.tsx`
  - Module: "Notifications"
  - Keys to check:
    - `notificationDetails` - Modal title
    - `notificationInformation`, `status`, `relatedEntity` - Section titles
    - `title`, `type`, `message`, `readStatus`, `read`, `unread`, `readAt`, `createdAt` - Field labels
    - `entityType`, `entityLink`, `viewEntity` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.11: Extract keys from Activity Logs view modal
  - Component: `components/activity-logs/activity-log-view-modal.tsx`
  - Module: "ActivityLogs"
  - Keys to check:
    - `activityLogDetails` - Modal title
    - `activityInformation`, `userInformation`, `details`, `timestamp` - Section titles
    - `action`, `entityType`, `entityId`, `ipAddress`, `userAgent`, `details`, `createdAt` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.12: Extract keys from People-Companies view modal
  - Component: `components/people-companies/people-company-view-modal.tsx`
  - Module: "PeopleCompanies"
  - Keys to check:
    - `relationshipDetails` - Modal title
    - `relationshipInformation`, `employmentPeriod` - Section titles
    - `person`, `company`, `role`, `startDate`, `endDate`, `currentEmployment` - Field labels
  - Validation: All keys identified and documented

- [ ] 1.13: Extract keys from Case Statuses view modal
  - Component: `components/case-statuses/case-status-view-modal.tsx`
  - Module: "CaseStatuses"
  - Keys to check:
    - `caseStatusDetails` - Modal title
    - `statusInformation`, `display`, `state` - Section titles
    - `name`, `nameEn`, `code`, `category`, `description`, `color`, `sortOrder`, `status`, `createdAt`, `updatedAt` - Field labels
  - Validation: All keys identified and documented

#### Quality Checklist:

- [ ] All 13 remaining view modals analyzed
- [ ] All translation keys documented per module
- [ ] Keys organized by: modal title, section titles, field labels
- [ ] Duplicate keys identified across modules

---

### 2. Check Existing Translation Keys

**Objective**: Verify which keys already exist in the translation files and which are missing

#### Sub-tasks:

- [ ] 2.1: Check English translations (`messages/en.json`)
  - For each module from task 1.x:
    - Check if module section exists
    - Check which keys exist
    - Document missing keys
  - Validation: Complete list of missing English keys
  - Output: Organized list per module of what needs to be added

- [ ] 2.2: Check Portuguese translations (`messages/pt.json`)
  - For each module from task 1.x:
    - Check if module section exists
    - Check which keys exist
    - Document missing keys
  - Validation: Complete list of missing Portuguese keys
  - Output: Organized list per module of what needs to be added

- [ ] 2.3: Cross-reference with existing keys
  - Check if similar keys exist in other modules that can be reused
  - Identify common patterns (e.g., "details", "information", "status")
  - Document reusable keys vs. module-specific keys
  - Validation: Clear categorization of keys
  - Output: Optimized list avoiding duplicate translations

#### Quality Checklist:

- [ ] All modules checked in both language files
- [ ] Missing keys documented
- [ ] Reusable keys identified
- [ ] No unnecessary duplicates planned

---

### 3. Add Missing Translation Keys

**Objective**: Add all missing translation keys to both English and Portuguese translation files

#### Sub-tasks:

- [ ] 3.1: Add missing keys to `messages/en.json`
  - Add keys for each module identified in task 2.1
  - Follow existing naming conventions
  - Use professional, clear English
  - Maintain alphabetical order within sections where applicable
  - Validation: All missing English keys added
  - Dependencies: Task 2.1

- [ ] 3.2: Add missing keys to `messages/pt.json`
  - Add Portuguese translations for each key added in 3.1
  - Ensure professional, accurate Portuguese
  - Mirror structure from en.json
  - Maintain consistency with existing Portuguese translations
  - Validation: All missing Portuguese keys added
  - Dependencies: Task 3.1

- [ ] 3.3: Verify translation quality
  - Review all added translations for accuracy
  - Ensure terminology consistency across modules
  - Check for typos and grammatical errors
  - Validate professional tone
  - Validation: All translations reviewed and approved
  - Dependencies: Tasks 3.1, 3.2

#### Quality Checklist:

- [ ] All missing keys added to both files
- [ ] Professional and accurate translations
- [ ] Consistent terminology across modules
- [ ] No typos or grammatical errors
- [ ] Proper JSON formatting maintained

---

### 4. Test All View Modals

**Objective**: Verify that all view modals display properly translated text without any raw key names

#### Sub-tasks:

- [ ] 4.1: Test Countries view modal
  - Open the view modal
  - Verify all text displays properly (not raw keys)
  - Test in both English and Portuguese
  - Screenshot for documentation
  - Validation: No raw keys visible, all translations correct

- [ ] 4.2: Test States view modal
  - Same validation as 4.1

- [ ] 4.3: Test Cities view modal
  - Same validation as 4.1

- [ ] 4.4: Test Consulates view modal
  - Same validation as 4.1

- [ ] 4.5: Test CBO Codes view modal
  - Same validation as 4.1

- [ ] 4.6: Test Legal Frameworks view modal
  - Same validation as 4.1

- [ ] 4.7: Test Process Types view modal
  - Same validation as 4.1

- [ ] 4.8: Test Document Types view modal
  - Same validation as 4.1

- [ ] 4.9: Test Documents view modal
  - Same validation as 4.1

- [ ] 4.10: Test Notifications view modal
  - Same validation as 4.1

- [ ] 4.11: Test Activity Logs view modal
  - Same validation as 4.1

- [ ] 4.12: Test People-Companies view modal
  - Same validation as 4.1

- [ ] 4.13: Test Case Statuses view modal
  - Same validation as 4.1

- [ ] 4.14: Re-test Companies and Passports modals
  - Verify previously fixed modals still work
  - Same validation as 4.1

#### Quality Checklist:

- [ ] All 15 view modals tested
- [ ] No raw translation keys visible anywhere
- [ ] Both languages tested (EN and PT)
- [ ] All translations display correctly
- [ ] Professional appearance confirmed

---

## Implementation Notes

### Translation Key Patterns

Based on the existing implementation, view modals typically use these key patterns:

1. **Modal Titles**: `{entityType}Details` (e.g., `passportDetails`, `companyDetails`)
2. **Section Titles**: `{sectionName}Information` (e.g., `passportInformation`, `contactInformation`)
3. **Field Labels**: Reuse existing keys from form dialogs when possible
4. **Status/Badge Text**: Often reused from Common or module-specific sections

### Keys Already Fixed (Reference)

**Passports module** - these keys were already added:
```json
"passportDetails": "Passport Details",
"passportInformation": "Passport Information",
"personInformation": "Person Information",
"expiryStatus": "Expiry Status",
"valid": "Valid",
"expired": "Expired",
"expiringSoon": "Expiring Soon",
"document": "Document",
"documentFile": "Document File"
```

### Key Reuse Strategy

Many keys can be reused from existing modules:
- `"name"`, `"code"`, `"description"` - Already exist in most modules
- `"status"`, `"isActive"` - Common across modules
- `"createdAt"`, `"updatedAt"` - Standard timestamp fields
- `"basicInformation"`, `"contactInformation"` - Common section titles

**Only add new keys when**:
- The exact key doesn't exist in the current module
- The translation needs to be module-specific
- The context differs significantly from existing keys

### Testing Approach

For each modal, verify:
1. Modal title displays correctly
2. All section titles display correctly
3. All field labels display correctly
4. All badge/status text displays correctly
5. No raw keys like "ModuleName.keyName" are visible
6. Language switching works (EN ↔ PT)

## Definition of Done

- [ ] All 13 remaining view modal components analyzed for translation keys
- [ ] All missing keys identified and documented
- [ ] All missing keys added to `messages/en.json`
- [ ] All missing keys added to `messages/pt.json`
- [ ] All translations reviewed for quality and consistency
- [ ] All 15 view modals tested (13 new + 2 previously fixed)
- [ ] No raw translation keys visible in any view modal
- [ ] Both English and Portuguese translations working correctly
- [ ] Documentation updated with findings
