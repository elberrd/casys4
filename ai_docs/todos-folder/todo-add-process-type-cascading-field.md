# TODO: Add Process Type Cascading Field to Individual Process Forms

## Context

Add a cascading field feature to the individual process forms (both create and edit modes) that allows users to first select a "Tipos de processo" (Process Types), which then automatically filters the "Amparo Legal" (Legal Framework) field to only show legal frameworks related to the selected process type.

This feature leverages the existing many-to-many relationship between Process Types and Legal Frameworks via the `processTypesLegalFrameworks` junction table.

## Related PRD Sections

- Section 4.2: individualProcesses table structure
- Section 10.4: Schema showing processTypesLegalFrameworks junction table (lines 74-83)
- The schema already has the many-to-many relationship established via migrations

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations for implementing the cascading field feature

#### Sub-tasks:

- [x] 0.1: Review schema and existing relationships
  - Validation: Confirmed `processTypesLegalFrameworks` junction table exists with proper indexes
  - Output: Junction table connects processTypes and legalFrameworks via `by_processType` and `by_legalFramework` indexes

- [x] 0.2: Identify files that need modification
  - Validation: Found two form components that need updates
  - Output:
    - `/components/individual-processes/individual-process-form-dialog.tsx` (dialog form)
    - `/components/individual-processes/individual-process-form-page.tsx` (full page form)
    - `/lib/validations/individualProcesses.ts` (validation schema)

- [x] 0.3: Review existing Convex queries for process types and legal frameworks
  - Validation: Confirmed existing queries can support cascading logic
  - Output:
    - `convex/processTypes.ts` has `getLegalFrameworks` query (lines 71-88)
    - `convex/legalFrameworks.ts` has `getProcessTypes` query (lines 72-89)
    - Both can be used to implement filtering

- [x] 0.4: Check form validation requirements
  - Validation: Current schema requires `legalFrameworkId` but not `processTypeId`
  - Output: Need to add optional `processTypeId` field to form and validation schema

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Existing query patterns identified
- [x] Schema relationship confirmed via junction table

### 1. Update Validation Schema

**Objective**: Add processTypeId field to the individual process validation schema to support cascading selection

#### Sub-tasks:

- [ ] 1.1: Add processTypeId field to individualProcessSchema in `/lib/validations/individualProcesses.ts`
  - Validation: Field should be optional (not required) and accept either a valid ID or empty string
  - Dependencies: None
  - Implementation:
    ```typescript
    processTypeId: z
      .custom<Id<"processTypes">>((val) => typeof val === "string", {
        message: "Invalid process type ID",
      })
      .optional()
      .or(z.literal("")),
    ```

- [ ] 1.2: Update IndividualProcessFormData type to include processTypeId
  - Validation: TypeScript compilation succeeds with no errors
  - Dependencies: Task 1.1 must be complete

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented with proper error messages
- [ ] Optional field pattern matches existing optional fields (passportId, cboId, etc.)
- [ ] Clean code principles followed

### 2. Add Convex Query for Filtered Legal Frameworks

**Objective**: Create a query to fetch legal frameworks filtered by selected process type

#### Sub-tasks:

- [ ] 2.1: Add new query `listByProcessType` to `/convex/legalFrameworks.ts`
  - Validation: Query returns only legal frameworks linked to the specified process type
  - Dependencies: None
  - Implementation details:
    - Use `processTypesLegalFrameworks` junction table
    - Query by `by_processType` index
    - Return only active legal frameworks
    - Sort results alphabetically by name

- [ ] 2.2: Add fallback query to return all legal frameworks when no process type selected
  - Validation: Existing `listActive` query can be used for this purpose
  - Dependencies: Task 2.1 complete
  - Note: Use existing `listActive` query as fallback

#### Quality Checklist:

- [ ] Query properly uses junction table indexes
- [ ] Query filters for active legal frameworks only
- [ ] Error handling implemented for missing process type
- [ ] Clean code principles followed
- [ ] TypeScript types properly defined

### 3. Update Database Schema (Optional)

**Objective**: Add processTypeId field to individualProcesses table to persist the selection

#### Sub-tasks:

- [ ] 3.1: Review if processTypeId should be persisted in individualProcesses table
  - Validation: Determine if this is needed or if it can be derived from mainProcess
  - Dependencies: None
  - Decision: Currently, processTypeId exists in mainProcesses table. Evaluate if individual processes need their own processTypeId or should inherit from parent

- [ ] 3.2: If needed, update schema in `/convex/schema.ts`
  - Validation: Schema deployment succeeds without errors
  - Dependencies: Task 3.1 decision
  - Add field:
    ```typescript
    processTypeId: v.optional(v.id("processTypes")),
    ```
  - Add index:
    ```typescript
    .index("by_processType", ["processTypeId"])
    ```

- [ ] 3.3: If needed, update mutations in `/convex/individualProcesses.ts`
  - Validation: Create and update mutations handle processTypeId correctly
  - Dependencies: Task 3.2 complete

#### Quality Checklist:

- [ ] Schema changes are backward compatible
- [ ] Indexes added for query performance
- [ ] TypeScript types automatically updated
- [ ] No data migration needed (field is optional)

### 4. Update Individual Process Form Dialog Component

**Objective**: Add process type field and implement cascading filter logic in the dialog form

#### Sub-tasks:

- [ ] 4.1: Add processTypeId to form state in `/components/individual-processes/individual-process-form-dialog.tsx`
  - Validation: Form state includes processTypeId field
  - Dependencies: Task 1 complete
  - Location: Update `defaultValues` in useForm hook (around line 81)

- [ ] 4.2: Add Process Type field to the form UI (before Legal Framework field)
  - Validation: Process Type combobox appears in "Required Fields" section
  - Dependencies: Task 4.1 complete
  - Location: Insert FormField after mainProcessId field (around line 264)
  - Use existing `Combobox` component pattern

- [ ] 4.3: Implement cascading query logic for legal frameworks
  - Validation: Legal frameworks filter when process type changes
  - Dependencies: Task 2, 4.2 complete
  - Implementation:
    - Use `form.watch("processTypeId")` to watch for changes
    - Use conditional query: `useQuery(api.processTypes.getLegalFrameworks, processTypeId ? { processTypeId } : "skip")`
    - Update legal framework options based on filtered results

- [ ] 4.4: Add logic to clear legal framework when process type changes
  - Validation: Legal framework resets to empty when process type selection changes
  - Dependencies: Task 4.3 complete
  - Use useEffect hook to watch processTypeId and reset legalFrameworkId

- [ ] 4.5: Update form submission to include processTypeId
  - Validation: processTypeId is included in submit data when filled
  - Dependencies: Task 4.1 complete
  - Location: Update `onSubmit` function (around line 150)

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] i18n keys added for user-facing text
- [ ] Reusable Combobox component utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness maintained
- [ ] Form validation works correctly

### 5. Update Individual Process Form Page Component

**Objective**: Add process type field and implement cascading filter logic in the full page form

#### Sub-tasks:

- [ ] 5.1: Add processTypeId to form state in `/components/individual-processes/individual-process-form-page.tsx`
  - Validation: Form state includes processTypeId field
  - Dependencies: Task 1 complete
  - Location: Update `defaultValues` in useForm hook (around line 75)

- [ ] 5.2: Add Process Type field to the form UI (before Legal Framework field)
  - Validation: Process Type combobox appears in "Required Fields" section
  - Dependencies: Task 5.1 complete
  - Location: Insert FormField after mainProcessId field (around line 320)
  - Use existing `Combobox` component pattern

- [ ] 5.3: Implement cascading query logic for legal frameworks
  - Validation: Legal frameworks filter when process type changes
  - Dependencies: Task 2, 5.2 complete
  - Implementation:
    - Use `form.watch("processTypeId")` to watch for changes
    - Use conditional query: `useQuery(api.processTypes.getLegalFrameworks, processTypeId ? { processTypeId } : "skip")`
    - Update legal framework options based on filtered results

- [ ] 5.4: Add logic to clear legal framework when process type changes
  - Validation: Legal framework resets to empty when process type selection changes
  - Dependencies: Task 5.3 complete
  - Use useEffect hook to watch processTypeId and reset legalFrameworkId

- [ ] 5.5: Update form submission to include processTypeId
  - Validation: processTypeId is included in submit data when filled
  - Dependencies: Task 5.1 complete
  - Location: Update `onSubmit` function (around line 185)

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] i18n keys added for user-facing text
- [ ] Reusable Combobox component utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness maintained
- [ ] Form validation works correctly

### 6. Add Internationalization Keys

**Objective**: Add translation keys for the new Process Type field in both English and Portuguese

#### Sub-tasks:

- [ ] 6.1: Add keys to `/messages/en.json` under IndividualProcesses section
  - Validation: All new UI text has English translations
  - Dependencies: None
  - Keys to add:
    - `processType`: "Process Type"
    - `selectProcessType`: "Select process type"
    - `processTypeRequired`: "Process type is required"

- [ ] 6.2: Add keys to `/messages/pt.json` under IndividualProcesses section
  - Validation: All new UI text has Portuguese translations
  - Dependencies: None
  - Keys to add:
    - `processType`: "Tipo de Processo"
    - `selectProcessType`: "Selecione o tipo de processo"
    - `processTypeRequired`: "Tipo de processo é obrigatório"

#### Quality Checklist:

- [ ] All user-facing strings use i18n
- [ ] Both English and Portuguese translations added
- [ ] Key naming follows existing conventions
- [ ] No hardcoded strings in components

### 7. Test Cascading Behavior

**Objective**: Thoroughly test the cascading field feature in both form modes to ensure proper functionality

#### Sub-tasks:

- [ ] 7.1: Test create mode in dialog form
  - Validation:
    - Process type selection filters legal frameworks correctly
    - Legal framework resets when process type changes
    - Can submit form with both fields filled
    - Form validation prevents submission without required fields
  - Dependencies: Tasks 4, 6 complete

- [ ] 7.2: Test edit mode in dialog form
  - Validation:
    - Existing process type and legal framework load correctly
    - Can change process type and see filtered legal frameworks
    - Legal framework persists if valid for new process type
    - Can save changes successfully
  - Dependencies: Tasks 4, 6 complete

- [ ] 7.3: Test create mode in full page form
  - Validation:
    - Process type selection filters legal frameworks correctly
    - Legal framework resets when process type changes
    - Can submit form with both fields filled
    - Form validation prevents submission without required fields
  - Dependencies: Tasks 5, 6 complete

- [ ] 7.4: Test edit mode in full page form
  - Validation:
    - Existing process type and legal framework load correctly
    - Can change process type and see filtered legal frameworks
    - Legal framework persists if valid for new process type
    - Can save changes successfully
  - Dependencies: Tasks 5, 6 complete

- [ ] 7.5: Test edge cases
  - Validation:
    - Process type with no legal frameworks shows empty dropdown with helpful message
    - Changing process type when legal framework already selected clears it appropriately
    - Form works correctly when process type is not selected (shows all legal frameworks)
  - Dependencies: All previous test tasks complete

- [ ] 7.6: Test mobile responsiveness
  - Validation:
    - Process type combobox works on mobile devices
    - Cascading behavior works on touch devices
    - Form layout remains usable on small screens
  - Dependencies: All previous test tasks complete

#### Quality Checklist:

- [ ] All test scenarios pass
- [ ] No console errors during testing
- [ ] Mobile responsiveness verified
- [ ] Edge cases handled gracefully
- [ ] User experience is intuitive

## Implementation Notes

### Key Technical Considerations

1. **Existing Junction Table**: The `processTypesLegalFrameworks` junction table already exists and has proper indexes, making the implementation straightforward.

2. **Query Pattern**: Use the existing `processTypes.getLegalFrameworks` query which returns legal frameworks filtered by process type.

3. **Optional Field**: The processTypeId field should be optional because:
   - Some individual processes might not need process type (inherited from mainProcess)
   - Backward compatibility with existing data
   - Allows flexibility in the form

4. **Form Reset Logic**: When process type changes, the legal framework should reset to prevent invalid combinations.

5. **Fallback Behavior**: When no process type is selected, show all active legal frameworks (existing behavior).

### Architectural Decisions

1. **Should processTypeId be stored in individualProcesses?**
   - **Option A (Recommended)**: Don't store it - derive from mainProcess.processTypeId
     - Pros: Single source of truth, no data duplication
     - Cons: Requires join when filtering legal frameworks
   - **Option B**: Store it in individualProcesses
     - Pros: Direct filtering, no joins needed
     - Cons: Data duplication, potential inconsistency

   **Decision**: Start with Option A (no storage) and only add to schema if performance requires it.

2. **Query Strategy**:
   - Use conditional queries with "skip" when process type not selected
   - Leverage existing junction table queries
   - Cache query results for performance

### Form Field Order

The field order in the form should be:
1. Main Process (existing)
2. **Process Type (new)** ← Add here
3. Legal Framework (existing) ← Gets filtered by process type
4. Person (existing)
5. Other fields...

This order makes logical sense because:
- Process type determines available legal frameworks
- User selects process type first, then sees relevant legal frameworks
- Follows a natural workflow progression

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] Code follows project conventions
- [ ] TypeScript compilation successful with no errors
- [ ] Both form components (dialog and page) work correctly
- [ ] Cascading filter works in both create and edit modes
- [ ] All tests passing (manual testing)
- [ ] Mobile responsiveness verified
- [ ] Internationalization complete (English and Portuguese)
- [ ] No console errors or warnings
- [ ] User experience is smooth and intuitive
