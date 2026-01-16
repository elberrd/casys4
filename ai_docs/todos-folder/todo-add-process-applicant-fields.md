# TODO: Add Individual Process and Applicant Fields to Document Form

## Context

Add two optional fields to the document creation form to enhance document tracking:
1. **Processo Individual** (Individual Process) - links a document to an individual process, with auto-fill support when creating from within a process context
2. **Requerente** (Applicant) - allows selecting a person as applicant using the same pattern as individual processes (only shows people with company relationships)

These fields will enable better organization of documents by connecting them to specific processes and applicants.

## Related PRD Sections

This enhancement aligns with the document management system described in the PRD, extending the documents table with process and applicant relationships similar to how individual processes are structured.

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations for the new fields

#### Sub-tasks:

- [x] 0.1: Review existing document system architecture
  - Validation: Confirmed documents table at `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Validation: Confirmed document mutations at `/Users/elberrd/Documents/Development/clientes/casys4/convex/documents.ts`
  - Validation: Confirmed document validation at `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documents.ts`
  - Output: All files follow established patterns

- [x] 0.2: Review individual process patterns for applicant selector
  - Validation: Confirmed UserApplicantSelector at `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/user-applicant-selector.tsx`
  - Validation: Confirmed individualProcesses queries at `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Output: Patterns identified for reuse

- [x] 0.3: Check form components structure
  - Validation: Confirmed form page at `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - Validation: Confirmed form dialog at `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - Output: Both components need identical updates

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations confirmed
- [x] Existing patterns identified
- [x] No duplicate functionality will be created

---

### 1. Schema Changes (Database Layer)

**Objective**: Add individualProcessId and userApplicantId fields to documents table with proper indexing

#### Sub-tasks:

- [x] 1.1: Add new fields to documents table schema
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add `individualProcessId: v.optional(v.id("individualProcesses"))` (around line 374, after companyId)
  - Add `userApplicantId: v.optional(v.id("people"))` (around line 375, after individualProcessId)
  - Validation: TypeScript compiles without errors
  - Dependencies: None

- [x] 1.2: Add indexes for new fields
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add `.index("by_individualProcess", ["individualProcessId"])` after the existing indexes (around line 395)
  - Add `.index("by_userApplicant", ["userApplicantId"])` after by_individualProcess
  - Validation: Schema deployment succeeds
  - Dependencies: Task 1.1

#### Quality Checklist:

- [ ] Fields use optional v.id() validators
- [ ] Indexes created for query performance
- [ ] Naming convention follows existing patterns (camelCase)
- [ ] Comments added if needed for clarity
- [ ] No breaking changes to existing data

---

### 2. Backend Query Enhancement (Convex Layer)

**Objective**: Add query for individual processes selector and enrich document queries with related data

#### Sub-tasks:

- [x] 2.1: Create listForSelector query in individualProcesses.ts
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Create new export const `listForSelector` query
  - Return format: `{ _id, personName, referenceNumber }` or similar for combobox display
  - Consider display format: `${collectiveProcess.referenceNumber} - ${person.fullName}` for clarity
  - Apply role-based access control (admins see all, clients see their company's processes)
  - Validation: Query returns properly formatted data for combobox
  - Dependencies: None

- [x] 2.2: Update documents list query to include process and applicant filters
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documents.ts`
  - Add `individualProcessId: v.optional(v.id("individualProcesses"))` to args in list query (around line 65)
  - Add `userApplicantId: v.optional(v.id("people"))` to args
  - Add filtering logic similar to existing personId/companyId filters (around line 76)
  - Validation: Filters work correctly
  - Dependencies: Task 1.1, 1.2

- [x] 2.3: Enrich documents get query with process and applicant data
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documents.ts`
  - Fetch individualProcess data if individualProcessId exists (around line 181, after company fetch)
  - Fetch userApplicant (person) data if userApplicantId exists
  - Include in return object: `individualProcess: { _id, collectiveProcessReferenceNumber, personName } | null`
  - Include in return object: `userApplicant: { _id, fullName } | null`
  - Validation: Query enrichment includes new related data
  - Dependencies: Task 1.1, 1.2

- [x] 2.4: Enrich documents list query with process and applicant data
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documents.ts`
  - In documentsWithRelations mapping (around line 121), fetch individualProcess and userApplicant
  - Return enriched data in same format as get query
  - Validation: List includes new fields
  - Dependencies: Task 2.3

#### Quality Checklist:

- [ ] Role-based access control applied to new query
- [ ] Queries optimized using indexes
- [ ] Error handling for missing references
- [ ] Return types properly typed
- [ ] No breaking changes to existing queries

---

### 3. Backend Mutation Updates (Convex Layer)

**Objective**: Add new fields to create and update mutations for documents

#### Sub-tasks:

- [x] 3.1: Add fields to create mutation args
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documents.ts`
  - Add `individualProcessId: v.optional(v.id("individualProcesses"))` to args (around line 221, after companyId)
  - Add `userApplicantId: v.optional(v.id("people"))` to args
  - Include fields in insert statement (around line 243)
  - Validation: Create mutation accepts new fields
  - Dependencies: Task 1.1, 1.2

- [x] 3.2: Add fields to update mutation args
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documents.ts`
  - Add `individualProcessId: v.optional(v.id("individualProcesses"))` to args (around line 273, after companyId)
  - Add `userApplicantId: v.optional(v.id("people"))` to args
  - Include fields in patch statement (around line 308)
  - Validation: Update mutation accepts new fields
  - Dependencies: Task 1.1, 1.2

#### Quality Checklist:

- [ ] Both mutations use optional validators
- [ ] Fields persisted correctly to database
- [ ] No validation errors
- [ ] Backward compatible with existing code

---

### 4. Validation Schema Updates (Zod Layer)

**Objective**: Add Zod validation for new fields in document form validation

#### Sub-tasks:

- [x] 4.1: Add individualProcessId to documentSchema
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documents.ts`
  - Add `individualProcessId: z.string().optional()` to schema (after companyId, around line 7)
  - Validation: Schema validates correctly
  - Dependencies: None

- [x] 4.2: Add userApplicantId to documentSchema
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documents.ts`
  - Add `userApplicantId: z.string().optional()` to schema (after individualProcessId)
  - Validation: Schema validates correctly
  - Dependencies: None

#### Quality Checklist:

- [ ] Fields are optional (matching backend)
- [ ] String type used (UI will pass string IDs)
- [ ] No breaking changes to existing validation
- [ ] TypeScript infers types correctly from schema

---

### 5. Form Page Component Updates (UI Layer)

**Objective**: Add Individual Process and Applicant selector fields to document form page

#### Sub-tasks:

- [x] 5.1: Import UserApplicantSelector component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - Add import: `import { UserApplicantSelector } from "@/components/individual-processes/user-applicant-selector"`
  - Validation: Import resolves correctly
  - Dependencies: None

- [x] 5.2: Add query for individual processes selector
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - Add `const individualProcesses = useQuery(api.individualProcesses.listForSelector, {}) ?? []` (around line 52)
  - Validation: Query loads data successfully
  - Dependencies: Task 2.1

- [ ] 5.3: Add initialIndividualProcessId prop and searchParams handling
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - Add `initialIndividualProcessId?: string` to DocumentFormPageProps interface (around line 30)
  - Validation: Prop typing correct
  - Dependencies: None

- [ ] 5.4: Update form defaultValues with new fields
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - Add `individualProcessId: ""` to defaultValues (around line 62)
  - Add `userApplicantId: ""` to defaultValues
  - Validation: Form initializes correctly
  - Dependencies: Task 4.1, 4.2

- [ ] 5.5: Handle initialIndividualProcessId in form reset
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - In useEffect with document (around line 72), handle individualProcessId and userApplicantId from document
  - In else block (around line 92), set individualProcessId to initialIndividualProcessId prop if provided
  - Validation: Auto-fill works when coming from process context
  - Dependencies: Task 5.3

- [ ] 5.6: Add Individual Process combobox field to form
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - Add FormField for individualProcessId after the person/company grid (around line 299)
  - Use Combobox component with individualProcesses options
  - Display format: Show referenceNumber and person name for clarity
  - Label: `t("individualProcess")`
  - Placeholder: `t("selectIndividualProcess")`
  - EmptyText: `t("noIndividualProcesses")`
  - Validation: Field displays and functions correctly
  - Dependencies: Task 5.2, 5.4, Task 8 (translations)

- [ ] 5.7: Add Applicant (Requerente) field using UserApplicantSelector
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - Add FormField for userApplicantId after individualProcessId field
  - Use UserApplicantSelector component (not Combobox)
  - Label: `t("userApplicant")`
  - Note: UserApplicantSelector uses IndividualProcesses translation namespace internally
  - Validation: Field displays and functions correctly
  - Dependencies: Task 5.1, 5.4, Task 8 (translations)

- [ ] 5.8: Update onSubmit to include new fields in payload
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-page.tsx`
  - Add individualProcessId to payload (around line 150, cast as `Id<"individualProcesses">` if present)
  - Add userApplicantId to payload (cast as `Id<"people">` if present)
  - Handle empty strings by converting to undefined
  - Validation: Form submission includes new fields
  - Dependencies: Task 5.4

#### Quality Checklist:

- [ ] TypeScript types correct for all new fields
- [ ] i18n translations used for all labels/placeholders
- [ ] UserApplicantSelector reused (no duplication)
- [ ] Form layout maintains consistency with existing fields
- [ ] Fields are clearly optional (user not confused)
- [ ] Mobile responsive (Tailwind breakpoints used)
- [ ] Touch-friendly on mobile devices
- [ ] Auto-fill works from URL parameter

---

### 6. Form Dialog Component Updates (UI Layer)

**Objective**: Add same Individual Process and Applicant fields to document form dialog

#### Sub-tasks:

- [ ] 6.1: Import UserApplicantSelector component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - Add import: `import { UserApplicantSelector } from "@/components/individual-processes/user-applicant-selector"`
  - Validation: Import resolves correctly
  - Dependencies: None

- [ ] 6.2: Add query for individual processes selector
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - Add `const individualProcesses = useQuery(api.individualProcesses.listForSelector, {}) ?? []` (around line 61)
  - Validation: Query loads data successfully
  - Dependencies: Task 2.1

- [ ] 6.3: Add initialIndividualProcessId prop
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - Add `initialIndividualProcessId?: string` to DocumentFormDialogProps interface (around line 38)
  - Validation: Prop typing correct
  - Dependencies: None

- [ ] 6.4: Update form defaultValues with new fields
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - Add `individualProcessId: ""` to defaultValues (around line 71)
  - Add `userApplicantId: ""` to defaultValues
  - Validation: Form initializes correctly
  - Dependencies: Task 4.1, 4.2

- [ ] 6.5: Handle initialIndividualProcessId in form reset
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - In useEffect with document (around line 98), handle individualProcessId and userApplicantId from document
  - In else block (around line 117), set individualProcessId to initialIndividualProcessId prop if provided
  - Validation: Auto-fill works when coming from process context
  - Dependencies: Task 6.3

- [ ] 6.6: Add Individual Process combobox field to dialog form
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - Add FormField for individualProcessId after the person/company grid (around line 304)
  - Use Combobox component with individualProcesses options
  - Display format: Show referenceNumber and person name for clarity
  - Label: `t("individualProcess")`
  - Placeholder: `t("selectIndividualProcess")`
  - EmptyText: `t("noIndividualProcesses")`
  - Validation: Field displays and functions correctly in dialog
  - Dependencies: Task 6.2, 6.4, Task 8 (translations)

- [ ] 6.7: Add Applicant (Requerente) field using UserApplicantSelector
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - Add FormField for userApplicantId after individualProcessId field
  - Use UserApplicantSelector component (not Combobox)
  - Label: `t("userApplicant")`
  - Validation: Field displays and functions correctly in dialog
  - Dependencies: Task 6.1, 6.4, Task 8 (translations)

- [ ] 6.8: Update onSubmit to include new fields in payload
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/documents/document-form-dialog.tsx`
  - Add individualProcessId to payload (around line 169, cast as `Id<"individualProcesses">` if present)
  - Add userApplicantId to payload (cast as `Id<"people">` if present)
  - Handle empty strings by converting to undefined
  - Validation: Dialog form submission includes new fields
  - Dependencies: Task 6.4

#### Quality Checklist:

- [ ] TypeScript types correct for all new fields
- [ ] i18n translations used for all labels/placeholders
- [ ] UserApplicantSelector reused (no duplication)
- [ ] Dialog layout maintains consistency with form page
- [ ] Fields are clearly optional
- [ ] Dialog scrollable if content overflows
- [ ] Mobile responsive and touch-friendly

---

### 7. Page Component Updates (Route Layer)

**Objective**: Enable URL parameter support for auto-filling individual process

#### Sub-tasks:

- [ ] 7.1: Update new document page to accept and pass searchParams
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/documents/new/page.tsx`
  - Modify function signature to accept searchParams: `export default function NewDocumentPage({ searchParams }: { searchParams: { individualProcessId?: string } })`
  - Pass `initialIndividualProcessId={searchParams.individualProcessId}` to DocumentFormPage component
  - Validation: URL parameter passes through correctly
  - Dependencies: Task 5.3

#### Quality Checklist:

- [ ] TypeScript types correct for searchParams
- [ ] Optional parameter handled gracefully
- [ ] No breaking changes to existing routing

---

### 8. Translation Updates (i18n Layer)

**Objective**: Add internationalized strings for new fields in both English and Portuguese

#### Sub-tasks:

- [ ] 8.1: Add English translations
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Navigate to "Documents" section (search for `"Documents": {`)
  - Add keys after existing fields (around line for "company" related translations):
    - `"individualProcess": "Individual Process"`
    - `"selectIndividualProcess": "Select individual process (optional)"`
    - `"noIndividualProcesses": "No individual processes found"`
    - `"userApplicant": "Applicant"`
    - `"selectUserApplicant": "Select applicant (optional)"`
  - Note: UserApplicantSelector internally uses `"noApplicantsFound"` from IndividualProcesses namespace
  - Validation: Translations load correctly
  - Dependencies: None

- [ ] 8.2: Add Portuguese translations
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Navigate to "Documents" section (search for `"Documents": {`)
  - Add keys matching English keys exactly:
    - `"individualProcess": "Processo Individual"`
    - `"selectIndividualProcess": "Selecione o processo individual (opcional)"`
    - `"noIndividualProcesses": "Nenhum processo individual encontrado"`
    - `"userApplicant": "Requerente"`
    - `"selectUserApplicant": "Selecione o requerente (opcional)"`
  - Validation: Translations load correctly in Portuguese
  - Dependencies: None

#### Quality Checklist:

- [ ] Both languages have matching keys
- [ ] Translations are accurate and natural
- [ ] Placeholder text clearly indicates fields are optional
- [ ] Key naming follows existing conventions (camelCase)
- [ ] JSON syntax valid (no trailing commas)

---

### 9. Integration Testing

**Objective**: Verify end-to-end functionality of new fields

#### Sub-tasks:

- [ ] 9.1: Test document creation with new fields from form page
  - Create document with individualProcessId selected
  - Create document with userApplicantId selected
  - Create document with both fields selected
  - Create document with neither field (ensure optional works)
  - Validation: All scenarios save correctly
  - Dependencies: All previous tasks

- [ ] 9.2: Test document creation from dialog
  - Open dialog and test same scenarios as 9.1
  - Validation: Dialog works identically to form page
  - Dependencies: All previous tasks

- [ ] 9.3: Test auto-fill from URL parameter
  - Navigate to `/documents/new?individualProcessId=<valid_id>`
  - Verify field pre-populates correctly
  - Validation: Auto-fill works as expected
  - Dependencies: Task 7.1, 5.5

- [ ] 9.4: Test document editing with new fields
  - Edit existing document and add individualProcessId
  - Edit existing document and add userApplicantId
  - Edit existing document and change/remove new fields
  - Validation: Updates persist correctly
  - Dependencies: All previous tasks

- [ ] 9.5: Test document list filtering
  - Verify documents can be filtered by individualProcessId (if list UI has filters)
  - Verify documents can be filtered by userApplicantId (if list UI has filters)
  - Validation: Filters work correctly
  - Dependencies: Task 2.2

- [ ] 9.6: Test role-based access control
  - Test as admin: verify access to all documents with new fields
  - Test as client: verify access only to company's documents
  - Verify listForSelector shows correct processes based on role
  - Validation: Access control works with new fields
  - Dependencies: Task 2.1, 2.2, 2.3

- [ ] 9.7: Test mobile responsiveness
  - Test form on mobile viewport (iPhone SE, iPhone 12, iPad)
  - Verify combobox dropdowns work with touch
  - Verify UserApplicantSelector works on mobile
  - Check field layout doesn't break on small screens
  - Validation: All fields fully functional on mobile devices
  - Dependencies: Task 5.6, 5.7, 6.6, 6.7

#### Quality Checklist:

- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All fields save and load correctly
- [ ] Auto-fill works from URL parameter
- [ ] Role-based access control enforced
- [ ] Mobile responsive and touch-friendly
- [ ] i18n works in both languages
- [ ] Form validation works correctly
- [ ] UserApplicantSelector shows only people with company relationships

---

## Implementation Notes

### Key Technical Considerations

1. **Component Reuse**: The UserApplicantSelector component is reused from individual processes, which ensures consistency and reduces code duplication. This component already handles the filtering of people with company relationships.

2. **Optional Fields**: Both new fields are optional (`v.optional()` in schema, `z.string().optional()` in validation). This ensures backward compatibility and doesn't break existing documents.

3. **Auto-fill Pattern**: The individualProcessId auto-fill from URL parameter enables a smooth UX when creating documents from within an individual process context (e.g., clicking "Add Document" from a process detail page).

4. **Role-Based Access**: The `listForSelector` query must respect role-based access control, showing admins all processes but clients only their company's processes (via collectiveProcess.companyId).

5. **Display Format**: For the Individual Process combobox, display meaningful information like `${collectiveProcess.referenceNumber} - ${person.fullName}` to help users identify the correct process.

6. **Translation Namespace Note**: The UserApplicantSelector component uses the "IndividualProcesses" translation namespace internally (e.g., `selectUserApplicant`, `noApplicantsFound`, `clearUserApplicant`). Make sure those keys exist or add them if needed.

### Potential Gotchas

- Ensure the new query `listForSelector` is optimized for performance, as it may be called frequently in forms
- The UserApplicantSelector expects specific translation keys in the "IndividualProcesses" namespace, not "Documents"
- When casting string IDs to typed IDs in payload, handle empty strings by converting them to undefined
- The form dialog has `max-h-[90vh] overflow-y-auto` - ensure new fields don't cause layout issues

### Mobile Responsiveness Considerations

- All combobox dropdowns must work with touch input
- Minimum tap target size of 44x44px for mobile devices
- Form fields should stack vertically on mobile (consider using `grid-cols-1 sm:grid-cols-2` if fields are currently in a grid)
- Ensure UserApplicantSelector dropdown is touch-friendly and doesn't get cut off on mobile screens

---

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] Schema deployed successfully to Convex
- [ ] No TypeScript compilation errors
- [ ] No ESLint warnings
- [ ] Both form page and dialog work identically
- [ ] Auto-fill from URL parameter works
- [ ] Role-based access control verified
- [ ] Mobile testing completed (responsive and touch-friendly)
- [ ] i18n works in English and Portuguese
- [ ] No breaking changes to existing functionality
- [ ] Code follows project conventions and patterns
