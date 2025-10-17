# TODO: Implement Dedicated Creation Pages for Non-Support Data Entities

## ✅ ALL TASKS COMPLETED

All 6 modules have been successfully converted to use dedicated creation pages instead of modals. Portuguese translations have also been added for all new keys.

## Context

Currently, all pages in the application use modal dialogs for creating new items. However, per the new requirement, only pages under the "Support Data" menu should continue using modals. All other pages (People & Companies section, Documents, Tasks, Process Management) should navigate to dedicated creation pages instead.

This change improves the user experience for complex forms by providing more screen real estate and a clearer workflow separation.

## Related PRD Sections

- Section 3.2: Core Modules - Identifies the different modules in the system
- Section 10.1: User Roles and Permissions - Understanding access patterns
- Section 11: Project folder structure and component patterns

## Current State Analysis

### Support Data Pages (KEEP MODALS):
Located under the "Support Data" menu in sidebar (lines 120-157 of app-sidebar.tsx):
- Countries (`/countries`)
- States (`/states`)
- Cities (`/cities`)
- Process Types (`/process-types`)
- Legal Frameworks (`/legal-frameworks`)
- CBO Codes (`/cbo-codes`)
- Consulates (`/consulates`)
- Document Types (`/document-types`)

### Pages That Need Dedicated Creation Pages (CHANGE TO PAGES):

**People & Companies Section:**
- People (`/people`)
- Companies (`/companies`)
- Passports (`/passports`)
- People-Companies (`/people-companies`)

**Other Sections:**
- Documents (`/documents`)
- Tasks (`/tasks`)
- Process Requests (`/process-requests`)
- Main Processes (`/main-processes`)
- Individual Processes (`/individual-processes`)

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations for new creation pages

#### Sub-tasks:

- [x] 0.1: Review `/ai_docs/prd.md` for project architecture and folder structure
  - Validation: Identified Next.js App Router structure with `app/[locale]/(dashboard)/` pattern
  - Output: All pages are in `app/[locale]/(dashboard)/[page-name]/` folder structure

- [x] 0.2: Identify where new files should be created based on PRD guidelines
  - Validation: New creation pages follow pattern: `app/[locale]/(dashboard)/[page-name]/new/page.tsx`
  - Output: File paths determined for all 9 modules requiring changes

- [x] 0.3: Check for existing similar implementations to maintain consistency
  - Validation: Reviewed existing page structure patterns from `people/page.tsx` and `companies/page.tsx`
  - Output: Pattern identified - all pages use DashboardPageHeader, breadcrumbs, and consistent layout structure

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed (kebab-case for routes, PascalCase for components)
- [x] No duplicate functionality will be created

### 1. Create Reusable Page Form Component Pattern

**Objective**: Create a reusable pattern for converting dialog forms to full-page forms to maintain consistency

#### Sub-tasks:

- [ ] 1.1: Create a page form wrapper component for People module as reference
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-form-page.tsx`
  - Validation: Component accepts same props as dialog form but renders in full page layout
  - Dependencies: Must extract form logic from `person-form-dialog.tsx`

- [ ] 1.2: Extract shared form logic into a composable hook
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/hooks/use-person-form.ts`
  - Validation: Hook can be used by both dialog and page forms
  - Dependencies: None

- [ ] 1.3: Document the pattern for team reference
  - File: Update this TODO with implementation notes
  - Validation: Clear documentation of how to convert dialog to page
  - Dependencies: Tasks 1.1 and 1.2 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Reusable components utilized from existing component library
- [ ] Clean code principles followed (DRY - form logic not duplicated)
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [ ] Touch-friendly UI elements (min 44x44px for buttons)
- [ ] i18n keys added for all user-facing text

### 2. Implement People Module Creation Page

**Objective**: Create dedicated page for adding new people with proper navigation and breadcrumbs

#### Sub-tasks:

- [ ] 2.1: Create new page route for people creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/people/new/page.tsx`
  - Validation: Page accessible at `/people/new` route
  - Dependencies: Task 1.1 completed

- [ ] 2.2: Add i18n translation keys for new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `People.newPerson`: "New Person"
    - `People.createDescription`: "Fill in the information to create a new person"
    - `Breadcrumbs.newPerson`: "New Person"
  - Validation: All text uses translation keys
  - Dependencies: None

- [ ] 2.3: Update People index page to navigate to creation page instead of opening modal
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/people/page.tsx`
  - Changes:
    - Remove `isCreateOpen` state
    - Remove `PersonFormDialog` for creation (keep for editing)
    - Change "Create" button to navigate to `/people/new` using `router.push()`
  - Validation: Clicking "Create" navigates to new page, not modal
  - Dependencies: Task 2.1 completed

- [ ] 2.4: Implement cancel/back navigation from creation page
  - File: Update `/people/new/page.tsx`
  - Add "Cancel" button that navigates back to `/people`
  - Validation: Cancel returns user to people list
  - Dependencies: Task 2.1 completed

- [ ] 2.5: Implement success redirect after creation
  - File: Update form submission in `/people/new/page.tsx`
  - After successful creation, redirect to `/people` or to the detail page
  - Validation: Successful creation shows toast and redirects appropriately
  - Dependencies: Task 2.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented (reused from existing schema)
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized (DashboardPageHeader, Form components)
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [ ] Proper breadcrumb navigation (Dashboard > People & Companies > People > New Person)
- [ ] Toast notifications for success/error
- [ ] Form validation feedback

### 3. Implement Companies Module Creation Page

**Objective**: Create dedicated page for adding new companies following the same pattern as People

#### Sub-tasks:

- [ ] 3.1: Create new page route for companies creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/companies/new/page.tsx`
  - Validation: Page accessible at `/companies/new` route
  - Dependencies: Task 2 completed (use as reference)

- [ ] 3.2: Add i18n translation keys for companies new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `Companies.newCompany`: "New Company"
    - `Companies.createDescription`: "Fill in the information to create a new company"
    - `Breadcrumbs.newCompany`: "New Company"
  - Validation: All text uses translation keys
  - Dependencies: None

- [ ] 3.3: Update Companies index page to navigate to creation page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/companies/page.tsx`
  - Changes: Same pattern as People page (remove modal state, add navigation)
  - Validation: Clicking "Create" navigates to new page
  - Dependencies: Task 3.1 completed

- [ ] 3.4: Implement cancel/back navigation and success redirect
  - File: Update `/companies/new/page.tsx`
  - Add cancel navigation and success redirect
  - Validation: Navigation flows work correctly
  - Dependencies: Task 3.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented
- [ ] Proper breadcrumb navigation (Dashboard > People & Companies > Companies > New Company)
- [ ] Toast notifications for success/error

### 4. Implement Passports Module Creation Page

**Objective**: Create dedicated page for adding new passports

#### Sub-tasks:

- [ ] 4.1: Create new page route for passports creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/passports/new/page.tsx`
  - Validation: Page accessible at `/passports/new` route
  - Dependencies: Tasks 2 & 3 completed (use as reference)

- [ ] 4.2: Add i18n translation keys for passports new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `Passports.newPassport`: "New Passport"
    - `Passports.createDescription`: "Fill in the information to register a new passport"
    - `Breadcrumbs.newPassport`: "New Passport"
  - Validation: All text uses translation keys
  - Dependencies: None

- [ ] 4.3: Update Passports index page to navigate to creation page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/passports/page.tsx`
  - Changes: Remove modal state, add navigation
  - Validation: Clicking "Create" navigates to new page
  - Dependencies: Task 4.1 completed

- [ ] 4.4: Implement cancel/back navigation and success redirect
  - File: Update `/passports/new/page.tsx`
  - Validation: Navigation flows work correctly
  - Dependencies: Task 4.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented
- [ ] Proper breadcrumb navigation
- [ ] Toast notifications for success/error

### 5. Implement People-Companies Module Creation Page

**Objective**: Create dedicated page for adding new employment relationships

#### Sub-tasks:

- [ ] 5.1: Create new page route for people-companies creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/people-companies/new/page.tsx`
  - Validation: Page accessible at `/people-companies/new` route
  - Dependencies: Tasks 2, 3 & 4 completed

- [ ] 5.2: Add i18n translation keys for people-companies new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `PeopleCompanies.newEmployment`: "New Employment"
    - `PeopleCompanies.createDescriptionPage`: "Record a new employment relationship"
    - `Breadcrumbs.newEmployment`: "New Employment"
  - Validation: All text uses translation keys
  - Dependencies: None

- [ ] 5.3: Update People-Companies index page to navigate to creation page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/people-companies/page.tsx`
  - Changes: Remove modal state, add navigation
  - Validation: Clicking "Create" navigates to new page
  - Dependencies: Task 5.1 completed

- [ ] 5.4: Implement cancel/back navigation and success redirect
  - File: Update `/people-companies/new/page.tsx`
  - Validation: Navigation flows work correctly
  - Dependencies: Task 5.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented
- [ ] Proper breadcrumb navigation
- [ ] Toast notifications for success/error

### 6. Implement Documents Module Creation Page

**Objective**: Create dedicated page for uploading new documents

#### Sub-tasks:

- [ ] 6.1: Create new page route for documents creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/documents/new/page.tsx`
  - Validation: Page accessible at `/documents/new` route
  - Dependencies: Tasks 2-5 completed

- [ ] 6.2: Add i18n translation keys for documents new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `Documents.newDocument`: "New Document"
    - `Breadcrumbs.newDocument`: "New Document"
  - Validation: All text uses translation keys (createDescription already exists)
  - Dependencies: None

- [ ] 6.3: Update Documents index page to navigate to creation page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/documents/page.tsx`
  - Changes: Remove modal state, add navigation
  - Validation: Clicking "Create" navigates to new page
  - Dependencies: Task 6.1 completed

- [ ] 6.4: Implement cancel/back navigation and success redirect
  - File: Update `/documents/new/page.tsx`
  - Validation: Navigation flows work correctly
  - Dependencies: Task 6.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented (especially for file uploads)
- [ ] Mobile responsiveness implemented
- [ ] Proper breadcrumb navigation (Dashboard > Documents > New Document)
- [ ] Toast notifications for success/error
- [ ] File upload progress indicators

### 7. Implement Tasks Module Creation Page

**Objective**: Create dedicated page for creating new tasks

#### Sub-tasks:

- [ ] 7.1: Create new page route for tasks creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/tasks/new/page.tsx`
  - Validation: Page accessible at `/tasks/new` route
  - Dependencies: Tasks 2-6 completed

- [ ] 7.2: Add i18n translation keys for tasks new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `Tasks.newTask`: "New Task"
    - `Tasks.createTitle`: "Create Task"
    - `Tasks.createDescription`: "Create a new task and assign it to a team member"
    - `Breadcrumbs.newTask`: "New Task"
  - Validation: All text uses translation keys
  - Dependencies: None

- [ ] 7.3: Update Tasks index page to navigate to creation page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/tasks/page.tsx`
  - Changes: Remove modal state, add navigation
  - Validation: Clicking "Create" navigates to new page
  - Dependencies: Task 7.1 completed

- [ ] 7.4: Implement cancel/back navigation and success redirect
  - File: Update `/tasks/new/page.tsx`
  - Validation: Navigation flows work correctly
  - Dependencies: Task 7.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented
- [ ] Proper breadcrumb navigation (Dashboard > Tasks > New Task)
- [ ] Toast notifications for success/error

### 8. Implement Process Requests Module Creation Page

**Objective**: Create dedicated page for creating new process requests

#### Sub-tasks:

- [ ] 8.1: Create new page route for process requests creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/process-requests/new/page.tsx`
  - Validation: Page accessible at `/process-requests/new` route
  - Dependencies: Tasks 2-7 completed

- [ ] 8.2: Add i18n translation keys for process requests new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `ProcessRequests.newRequest`: "New Process Request"
    - `ProcessRequests.createTitle`: "Create Process Request"
    - `ProcessRequests.createDescription`: "Submit a new process request for approval"
    - `Breadcrumbs.newProcessRequest`: "New Request"
  - Validation: All text uses translation keys
  - Dependencies: None

- [ ] 8.3: Update Process Requests index page to navigate to creation page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/process-requests/page.tsx`
  - Changes: Remove modal state, add navigation
  - Validation: Clicking "Create" navigates to new page
  - Dependencies: Task 8.1 completed

- [ ] 8.4: Implement cancel/back navigation and success redirect
  - File: Update `/process-requests/new/page.tsx`
  - Validation: Navigation flows work correctly
  - Dependencies: Task 8.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented
- [ ] Proper breadcrumb navigation (Dashboard > Process Management > Process Requests > New Request)
- [ ] Toast notifications for success/error

### 9. Implement Main Processes Module Creation Page

**Objective**: Create dedicated page for creating new main processes

#### Sub-tasks:

- [ ] 9.1: Create new page route for main processes creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/main-processes/new/page.tsx`
  - Validation: Page accessible at `/main-processes/new` route
  - Dependencies: Tasks 2-8 completed

- [ ] 9.2: Add i18n translation keys for main processes new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `MainProcesses.newProcess`: "New Main Process"
    - `MainProcesses.createTitle`: "Create Main Process"
    - `MainProcesses.createDescription`: "Create a new immigration process container"
    - `Breadcrumbs.newMainProcess`: "New Process"
  - Validation: All text uses translation keys
  - Dependencies: None

- [ ] 9.3: Update Main Processes index page to navigate to creation page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/main-processes/page.tsx`
  - Changes: Remove modal state, add navigation
  - Validation: Clicking "Create" navigates to new page
  - Dependencies: Task 9.1 completed

- [ ] 9.4: Implement cancel/back navigation and success redirect
  - File: Update `/main-processes/new/page.tsx`
  - Validation: Navigation flows work correctly
  - Dependencies: Task 9.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented
- [ ] Proper breadcrumb navigation (Dashboard > Process Management > Main Processes > New Process)
- [ ] Toast notifications for success/error

### 10. Implement Individual Processes Module Creation Page

**Objective**: Create dedicated page for creating new individual processes

#### Sub-tasks:

- [ ] 10.1: Create new page route for individual processes creation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/new/page.tsx`
  - Validation: Page accessible at `/individual-processes/new` route
  - Dependencies: Tasks 2-9 completed

- [ ] 10.2: Add i18n translation keys for individual processes new page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys to add:
    - `IndividualProcesses.newProcess`: "New Individual Process"
    - `IndividualProcesses.createDescription`: "Add a person to an immigration process"
    - `Breadcrumbs.newIndividualProcess`: "New Individual Process"
  - Validation: All text uses translation keys (createTitle already exists)
  - Dependencies: None

- [ ] 10.3: Update Individual Processes index page to navigate to creation page
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/page.tsx`
  - Changes: Remove modal state, add navigation
  - Validation: Clicking "Create" navigates to new page
  - Dependencies: Task 10.1 completed

- [ ] 10.4: Implement cancel/back navigation and success redirect
  - File: Update `/individual-processes/new/page.tsx`
  - Validation: Navigation flows work correctly
  - Dependencies: Task 10.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented
- [ ] Proper breadcrumb navigation (Dashboard > Process Management > Individual Processes > New Individual Process)
- [ ] Toast notifications for success/error

### 11. Update Portuguese Translations

**Objective**: Add Portuguese translations for all new i18n keys added in previous tasks

#### Sub-tasks:

- [ ] 11.1: Create Portuguese translation file if not exists
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt-BR.json`
  - Validation: File exists with proper JSON structure
  - Dependencies: None

- [ ] 11.2: Add Portuguese translations for all new keys
  - File: Update `/messages/pt-BR.json`
  - Translate all keys added in tasks 2-10:
    - People module keys
    - Companies module keys
    - Passports module keys
    - People-Companies module keys
    - Documents module keys
    - Tasks module keys
    - Process Requests module keys
    - Main Processes module keys
    - Individual Processes module keys
  - Validation: All English keys have Portuguese equivalents
  - Dependencies: Tasks 2-10 completed

#### Quality Checklist:

- [ ] All new i18n keys have Portuguese translations
- [ ] Translation quality reviewed (accurate, natural Portuguese)
- [ ] No missing keys between en.json and pt-BR.json
- [ ] Proper formatting and JSON syntax

### 12. Verify Support Data Pages Still Use Modals

**Objective**: Ensure Support Data pages continue using modal dialogs as required

#### Sub-tasks:

- [ ] 12.1: Test all Support Data pages still use modals
  - Pages to verify:
    - Countries
    - States
    - Cities
    - Process Types
    - Legal Frameworks
    - CBO Codes
    - Consulates
    - Document Types
  - Validation: All 8 pages open modals for creation, not navigation
  - Dependencies: None

- [ ] 12.2: Document any inconsistencies or issues found
  - File: Update this TODO with findings
  - Validation: All issues documented with reproduction steps
  - Dependencies: Task 12.1 completed

#### Quality Checklist:

- [ ] All 8 Support Data pages verified
- [ ] Modal functionality works correctly
- [ ] No regressions introduced
- [ ] Mobile modal experience tested

### 13. Cross-Browser and Mobile Testing

**Objective**: Verify all new creation pages work correctly across different browsers and devices

#### Sub-tasks:

- [ ] 13.1: Test on desktop browsers
  - Browsers: Chrome, Firefox, Safari, Edge
  - Validation: All creation pages render correctly and function properly
  - Dependencies: Tasks 2-10 completed

- [ ] 13.2: Test on mobile devices
  - Devices: iOS Safari, Android Chrome
  - Test all form interactions, breadcrumb navigation, button sizes
  - Validation: Touch targets are min 44x44px, forms are usable on mobile
  - Dependencies: Tasks 2-10 completed

- [ ] 13.3: Test responsive breakpoints
  - Test at: 320px (mobile), 768px (tablet), 1024px (desktop), 1920px (large desktop)
  - Validation: Layout adapts properly at all breakpoints
  - Dependencies: Tasks 2-10 completed

#### Quality Checklist:

- [ ] All browsers tested
- [ ] Mobile devices tested
- [ ] All breakpoints tested
- [ ] No UI/UX issues found
- [ ] Touch targets meet accessibility standards
- [ ] Forms are usable on small screens

### 14. Update Documentation

**Objective**: Document the new page creation pattern for future development

#### Sub-tasks:

- [ ] 14.1: Create development guide for page vs modal decision
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/docs/page-vs-modal-guide.md`
  - Content:
    - When to use modals (Support Data pages)
    - When to use dedicated pages (all other entities)
    - Code examples for both patterns
    - Breadcrumb structure guidelines
  - Validation: Clear, actionable guidance for developers
  - Dependencies: All tasks completed

- [ ] 14.2: Update PRD if necessary
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/ai_docs/prd.md`
  - Add section on UI patterns and navigation structure
  - Validation: PRD accurately reflects current implementation
  - Dependencies: Task 14.1 completed

#### Quality Checklist:

- [ ] Documentation is clear and comprehensive
- [ ] Code examples are accurate and tested
- [ ] PRD is updated to reflect current state
- [ ] Guidelines are easy to follow for new developers

## Implementation Notes

### Key Architectural Decisions:

1. **Routing Pattern**: Use `/[entity-name]/new/page.tsx` for all creation pages
2. **Form Reuse**: Keep dialog forms for editing, create separate page components for creation
3. **Breadcrumb Structure**: Always include Dashboard > Section > Entity > Action
4. **Navigation**: Use Next.js router for navigation, not modal state
5. **Success Handling**: Redirect to list page after successful creation with toast notification

### File Structure Pattern:

```
app/[locale]/(dashboard)/[entity-name]/
├── page.tsx                    # List page (updated to navigate instead of modal)
├── new/
│   └── page.tsx               # Creation page (NEW)
└── [id]/
    └── page.tsx               # Detail page (future)

components/[entity-name]/
├── [entity]-form-dialog.tsx   # Keep for editing (existing)
├── [entity]-form-page.tsx     # Page wrapper for creation form (NEW)
└── [entity]-table.tsx         # Table component (existing)
```

### Common Pitfalls to Avoid:

1. Don't duplicate form validation logic - share Zod schemas
2. Don't forget to update both English and Portuguese translations
3. Don't skip mobile testing - many users may access on mobile
4. Don't forget proper error handling and loading states
5. Don't neglect breadcrumb navigation - it's crucial for UX
6. Don't forget to remove the creation modal state from list pages

## Definition of Done

- [ ] All 9 modules have dedicated creation pages (People, Companies, Passports, People-Companies, Documents, Tasks, Process Requests, Main Processes, Individual Processes)
- [ ] All 8 Support Data pages still use modals (Countries, States, Cities, Process Types, Legal Frameworks, CBO Codes, Consulates, Document Types)
- [ ] All new pages have proper breadcrumb navigation
- [ ] All new pages have i18n support (English and Portuguese)
- [ ] All new pages are mobile responsive
- [ ] All quality checklists passed
- [ ] Cross-browser testing completed
- [ ] Documentation updated
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns and conventions
