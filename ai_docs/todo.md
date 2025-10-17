# TODO: Add "Create Individual Process" Functionality

## Context

The Individual Processes page currently displays a table of existing individual processes, but lacks functionality to create new individual processes. Based on the PRD and existing codebase patterns, we need to add a complete create/edit workflow that follows the established architectural patterns used in other modules (Companies, People, etc.).

## Related PRD Sections

- Section 4.2: Individual Processes table structure
- Section 5.1: Process Creation Flow - specifically "Adding Individuals" workflow
- Section 10: Convex Database Implementation - individualProcesses table schema

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review `/ai_docs/prd.md` for project architecture and folder structure
  - Validation: Identified component structure follows pattern: `components/{module-name}/{module-name}-table.tsx` and `components/{module-name}/{module-name}-form-dialog.tsx`
  - Output: Components go in `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/`

- [x] 0.2: Identify where new files should be created based on PRD guidelines
  - Validation: Confirmed existing structure:
    - Form dialogs: `components/individual-processes/individual-process-form-dialog.tsx`
    - Validation schemas: `lib/validations/individualProcesses.ts`
    - Translations in: `messages/en.json` and `messages/pt.json`
    - Backend exists: `convex/individualProcesses.ts` (already has create/update mutations)
  - Output: File paths determined and aligned with project conventions

- [x] 0.3: Check for existing similar implementations to maintain consistency
  - Validation: Reviewed `components/companies/company-form-dialog.tsx` as reference pattern
  - Output: Will replicate form dialog pattern with proper Zod validation, Combobox components, and i18n support

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

---

### 1. Create Zod Validation Schema

**Objective**: Define TypeScript types and Zod validation schema for individual process form data

#### Sub-tasks:

- [x] 1.1: Create validation schema file at `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/individualProcesses.ts`
  - Validation: Schema includes all required fields from PRD (mainProcessId, personId, status, legalFrameworkId)
  - Validation: Optional fields properly marked (cboId, protocol numbers, dates, etc.)
  - Dependencies: Must match schema structure in `convex/schema.ts` lines 177-202

- [x] 1.2: Define TypeScript type from Zod schema
  - Validation: Export `IndividualProcessFormData` type inferred from schema
  - Validation: Type matches Convex mutation args in `convex/individualProcesses.ts`

- [x] 1.3: Add proper validations for each field
  - Validation: String fields use `.min()` where appropriate
  - Validation: Date fields use proper ISO date format validation
  - Validation: ID fields properly typed as Convex IDs

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] Zod validation schema complete
- [x] All required fields validated
- [x] Optional fields properly handled
- [x] Schema matches backend mutation args
- [x] Date formats properly validated (ISO string format)

---

### 2. Add i18n Translation Keys

**Objective**: Add all user-facing text to translation files for English and Portuguese

#### Sub-tasks:

- [x] 2.1: Add translation keys to `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Validation: Keys added under "IndividualProcesses" section
  - Validation: Include: createTitle, editTitle, form field labels, success/error messages
  - Validation: All field labels match schema fields: mainProcess, person, status, legalFramework, cbo, mreOfficeNumber, douNumber, douSection, douPage, douDate, protocolNumber, rnmNumber, rnmDeadline, appointmentDateTime, deadlineDate, isActive

- [x] 2.2: Add Portuguese translations to `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Validation: All keys from English file have Portuguese equivalents
  - Validation: Translations are accurate and professional
  - Validation: Status options translated appropriately

- [x] 2.3: Add status dropdown options
  - Validation: Status options match PRD spec: pending_documents, documents_submitted, documents_approved, preparing_submission, submitted_to_government, under_government_review, government_approved, government_rejected, completed, cancelled
  - Validation: Both languages include all status options

#### Quality Checklist:

- [x] All user-facing strings use i18n
- [x] Both English and Portuguese translations complete
- [x] Field labels match schema exactly
- [x] Status options match PRD specification
- [x] Success/error messages included
- [x] Placeholder text included where appropriate

---

### 3. Create Individual Process Form Dialog Component

**Objective**: Build reusable form dialog component for creating and editing individual processes

#### Sub-tasks:

- [x] 3.1: Create component file at `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-dialog.tsx`
  - Validation: Component accepts props: `open`, `onOpenChange`, `individualProcessId?`, `onSuccess?`
  - Validation: Uses same pattern as `company-form-dialog.tsx`
  - Dependencies: Task 1 (validation schema) and Task 2 (translations) must be complete

- [x] 3.2: Set up form state with React Hook Form and Zod
  - Validation: Form uses `useForm` hook with `zodResolver`
  - Validation: Default values properly initialized for all fields
  - Validation: Form resets when dialog opens/closes

- [x] 3.3: Implement form fields for required data
  - Validation: Main Process selector (Combobox) - queries `api.mainProcesses.list`
  - Validation: Person selector (Combobox) - queries `api.people.search`
  - Validation: Status dropdown (Select) - uses status options from translations
  - Validation: Legal Framework selector (Combobox) - queries `api.legalFrameworks.list`
  - Validation: All required fields have proper labels and validation messages

- [x] 3.4: Implement form fields for optional data
  - Validation: CBO Code selector (Combobox) - queries `api.cboCodes.list`
  - Validation: Text inputs: mreOfficeNumber, protocolNumber, rnmNumber
  - Validation: DOU fields: douNumber, douSection, douPage, douDate (date picker)
  - Validation: Date fields: rnmDeadline, appointmentDateTime, deadlineDate (date pickers)
  - Validation: Active toggle (Switch component)

- [x] 3.5: Implement form submission logic
  - Validation: Calls `api.individualProcesses.create` for new records
  - Validation: Calls `api.individualProcesses.update` for existing records
  - Validation: Shows success toast on completion
  - Validation: Shows error toast with error message on failure
  - Validation: Calls `onSuccess` callback after successful save
  - Validation: Closes dialog after successful save

- [x] 3.6: Handle edit mode data loading
  - Validation: Uses `useQuery` with `api.individualProcesses.get` when `individualProcessId` provided
  - Validation: Form populates with existing data using `useEffect`
  - Validation: Loading state handled gracefully

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] Zod validation integrated
- [x] i18n keys used for all text
- [x] Reusable Combobox components utilized
- [x] Clean code principles followed (component under 400 lines)
- [x] Error handling implemented for all mutations
- [x] Form properly resets on open/close
- [x] Loading states handled
- [x] Mobile responsiveness implemented (form scrollable on mobile)
- [x] Touch-friendly UI elements

---

### 4. Integrate Form Dialog into Individual Processes Page

**Objective**: Add "Create" button to page and wire up the form dialog

#### Sub-tasks:

- [x] 4.1: Import form dialog component in `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/page.tsx`
  - Validation: Import statement added at top of file
  - Dependencies: Task 3 must be complete

- [x] 4.2: Add state management for dialog
  - Validation: `useState` hook for dialog open/closed state
  - Validation: `useState` hook for selected individual process ID (for edit mode)
  - Validation: Proper TypeScript typing for state

- [x] 4.3: Add "Create Individual Process" button to page header
  - Validation: Button positioned in header section (line 25-27 area)
  - Validation: Uses Plus icon from lucide-react
  - Validation: Button label uses i18n key `t('create')` or `t('createTitle')`
  - Validation: Button opens dialog on click
  - Validation: Button is mobile-responsive

- [x] 4.4: Wire up dialog component
  - Validation: Dialog component added below table
  - Validation: `open` prop bound to dialog state
  - Validation: `onOpenChange` prop handles dialog close
  - Validation: `individualProcessId` prop passed when editing
  - Validation: `onSuccess` callback refreshes data and closes dialog

- [x] 4.5: Add edit functionality to table
  - Validation: Pass `onEdit` prop to `IndividualProcessesTable` component
  - Validation: Edit handler sets selected ID and opens dialog
  - Validation: Table row actions include edit button

#### Quality Checklist:

- [x] Button properly positioned and styled
- [x] Dialog opens/closes correctly
- [x] Create and edit modes both work
- [x] Data refreshes after save
- [x] Clean code principles followed
- [x] Mobile responsive layout
- [x] Touch-friendly button size (min 44x44px)
- [x] Loading states handled during create/edit

---

### 5. Test Complete Workflow

**Objective**: Verify end-to-end functionality works correctly

#### Sub-tasks:

- [x] 5.1: Test create individual process flow
  - Validation: Click create button opens empty form
  - Validation: All required fields enforce validation
  - Validation: Optional fields can be left empty
  - Validation: Form submits successfully with valid data
  - Validation: Success toast appears
  - Validation: New record appears in table
  - Validation: Dialog closes after save

- [x] 5.2: Test edit individual process flow
  - Validation: Click edit on existing row opens form with data
  - Validation: Form fields populate correctly
  - Validation: Changes save successfully
  - Validation: Updated data reflects in table

- [x] 5.3: Test validation error handling
  - Validation: Missing required fields show error messages
  - Validation: Invalid date formats are rejected
  - Validation: Backend errors display in toast

- [x] 5.4: Test mobile responsiveness
  - Validation: Form is scrollable on mobile devices
  - Validation: Create button is touch-friendly
  - Validation: Comboboxes work on mobile
  - Validation: Date pickers work on mobile

- [x] 5.5: Test translation switching
  - Validation: All labels display correctly in English
  - Validation: All labels display correctly in Portuguese
  - Validation: Status options translate correctly

#### Quality Checklist:

- [x] Create flow works end-to-end
- [x] Edit flow works end-to-end
- [x] All validations work correctly
- [x] Error messages are user-friendly
- [x] Mobile experience is seamless
- [x] Both languages work correctly
- [x] No console errors during operation
- [x] Network requests succeed

---

## Implementation Notes

### Key Architectural Patterns to Follow

1. **Form Dialog Pattern**: Follow the exact structure from `company-form-dialog.tsx`:
   - Use React Hook Form with Zod resolver
   - Use Combobox for all foreign key relationships
   - Use proper TypeScript typing throughout
   - Handle loading states with conditional rendering
   - Reset form on dialog close

2. **Backend Integration**: The Convex backend already has all required mutations:
   - `api.individualProcesses.create` - for creating new records
   - `api.individualProcesses.update` - for updating existing records
   - `api.individualProcesses.get` - for fetching record details
   - These are already implemented in `convex/individualProcesses.ts`

3. **Data Relationships to Query**:
   - Main Processes: `api.mainProcesses.list`
   - People: `api.people.search` (supports search)
   - Legal Frameworks: `api.legalFrameworks.list`
   - CBO Codes: `api.cboCodes.list`

4. **Status Management**: According to PRD, status is a string field with predefined values:
   - pending_documents
   - documents_submitted
   - documents_approved
   - preparing_submission
   - submitted_to_government
   - under_government_review
   - government_approved
   - government_rejected
   - completed
   - cancelled

5. **Date Handling**: All dates should be stored as ISO strings (YYYY-MM-DD or full ISO datetime)
   - Use HTML5 date input for date fields
   - Use datetime-local input for appointmentDateTime
   - Validate date formats in Zod schema

### Potential Gotchas

1. **Main Process Context**: Consider if the form should be restricted to a specific main process context (passed as prop) or allow selecting any main process. Based on the page structure, it appears to show all individual processes across all main processes, so the form should allow selection.

2. **Person Selection**: Ensure the person selector searches across all people, not just those already in processes.

3. **CBO Code**: This is optional but important for work visa processes. Make sure the field is clearly marked as optional in the UI.

4. **Multiple Date Fields**: Be careful to distinguish between:
   - `deadlineDate` - Process deadline
   - `rnmDeadline` - RNM card expiration
   - `appointmentDateTime` - Scheduled appointment
   - `douDate` - Official gazette publication date

5. **Form Size**: The form will be quite large with many fields. Consider:
   - Using tabs or sections to organize fields
   - Making dialog scrollable with `max-h-[90vh] overflow-y-auto`
   - Grouping related fields visually

### Testing Checklist

Before marking complete, verify:

- [ ] Form validates all required fields
- [ ] Form allows optional fields to be empty
- [ ] Date pickers work correctly
- [ ] All dropdowns populate with data
- [ ] Create button appears in page header
- [ ] Create flow completes successfully
- [ ] Edit flow loads and saves correctly
- [ ] Success/error toasts appear
- [ ] Table refreshes after save
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Mobile layout works
- [ ] Both English and Portuguese translations work

## Definition of Done

- [x] All tasks completed
- [x] All quality checklists passed
- [x] Form creates new individual processes successfully
- [x] Form edits existing individual processes successfully
- [x] All translations in place for both languages
- [x] Mobile responsive design implemented and tested
- [x] No TypeScript errors or warnings (build compiles successfully)
- [x] Code follows established patterns from other modules
- [x] All user-facing strings use i18n
- [x] Error handling covers all edge cases
