# TODO: Dynamic Field Rendering in "Adicionar Status" Modal

## Context

The "Adicionar status" (Add status) modal currently only allows users to select a status and date. However, some statuses have custom fillable fields that need to be completed when the status is added. This enhancement will dynamically show these custom fields in the "Adicionar status" modal based on the selected status.

## Current System Understanding

- The system has a `FillFieldsModal` component that shows custom fields for existing statuses
- Case statuses (`caseStatuses` table) have a `fillableFields` array defining which fields can be filled
- The `AddStatusDialog` component currently exists but doesn't show custom fields
- Field metadata is centralized in `/Users/elberrd/Documents/Development/clientes/casys4/lib/individual-process-fields.ts`
- The `getFillableFields` query exists in `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcessStatuses.ts`

## Related PRD Sections

Not applicable - no PRD file exists yet.

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review existing file structure for status management
  - Validation: Confirmed `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/` contains status-related components
  - Output: All status components are in `components/individual-processes/` directory

- [x] 0.2: Identify reusable patterns from FillFieldsModal
  - Validation: Reviewed `fill-fields-modal.tsx` for field rendering logic
  - Output: Field rendering logic can be extracted and reused

- [x] 0.3: Verify data structure for fillableFields
  - Validation: Checked schema.ts and caseStatuses.ts
  - Output: `caseStatuses.fillableFields` is an optional array of strings

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

### 1. Create Query to Fetch Fillable Fields for Case Status

**Objective**: Add a Convex query to retrieve fillable fields configuration for a case status before a status record is created

#### Sub-tasks:

- [ ] 1.1: Add new query `getFillableFieldsForCaseStatus` in `/Users/elberrd/Documents/Development/clientes/casys4/convex/caseStatuses.ts`
  - Validation: Query accepts `caseStatusId` and returns `fillableFields` array
  - Dependencies: None
  - Implementation: Simple query that gets case status and returns fillableFields

- [ ] 1.2: Test query returns correct data structure
  - Validation: Query returns `{ fillableFields: string[] }` or `{ fillableFields: undefined }`
  - Dependencies: Task 1.1 must be completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Query follows existing Convex patterns in caseStatuses.ts
- [ ] Clean code principles followed
- [ ] Error handling for non-existent case status

### 2. Extract Reusable Field Rendering Logic

**Objective**: Create a shared component for rendering dynamic fields that both FillFieldsModal and AddStatusDialog can use

#### Sub-tasks:

- [ ] 2.1: Create new component `DynamicFieldRenderer` in `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/dynamic-field-renderer.tsx`
  - Validation: Component accepts props for field metadata, form data, and change handlers
  - Dependencies: None
  - Implementation:
    - Extract rendering logic from FillFieldsModal
    - Create TypeScript interface for props
    - Support string, date, datetime, and reference field types

- [ ] 2.2: Refactor FillFieldsModal to use DynamicFieldRenderer
  - Validation: FillFieldsModal works exactly as before, no regression
  - Dependencies: Task 2.1 must be completed
  - Implementation: Replace inline field rendering with DynamicFieldRenderer component

- [ ] 2.3: Add loading state support to DynamicFieldRenderer
  - Validation: Component shows skeleton loaders while data is fetching
  - Dependencies: Task 2.1 must be completed
  - Implementation: Accept `isLoading` prop and render Skeleton components

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Component is properly abstracted and reusable
- [ ] Props interface clearly defined
- [ ] Clean code principles followed
- [ ] Component handles all field types (string, date, datetime, reference)
- [ ] Loading states implemented with proper UI feedback
- [ ] No breaking changes to FillFieldsModal

### 3. Enhance AddStatusDialog with Dynamic Field Rendering

**Objective**: Modify AddStatusDialog to fetch and display fillable fields based on selected status

#### Sub-tasks:

- [ ] 3.1: Add query to fetch fillable fields when status is selected in `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/add-status-dialog.tsx`
  - Validation: Uses the new `getFillableFieldsForCaseStatus` query
  - Dependencies: Task 1.1 must be completed
  - Implementation:
    - Add `useQuery` hook for fillable fields
    - Pass `selectedStatusId` to query (use "skip" when empty)
    - Store query result in component state

- [ ] 3.2: Add state management for dynamic field values
  - Validation: Form can track values for any number of dynamic fields
  - Dependencies: None
  - Implementation:
    - Add `formData` state: `Record<string, any>`
    - Add handler function to update field values
    - Reset formData when dialog closes or status changes

- [ ] 3.3: Integrate DynamicFieldRenderer component
  - Validation: Dynamic fields render when status has fillableFields
  - Dependencies: Tasks 2.1, 3.1, and 3.2 must be completed
  - Implementation:
    - Import DynamicFieldRenderer
    - Pass fillable fields metadata using getFieldsMetadata
    - Wire up formData and change handlers
    - Show loading state while query is fetching

- [ ] 3.4: Update form submission to include dynamic field values
  - Validation: Dynamic field values are passed to addStatus mutation
  - Dependencies: Task 3.2 must be completed
  - Implementation:
    - Extend addStatus mutation call to accept filledFieldsData
    - Only include fields that have values (filter out empty strings)

- [ ] 3.5: Add visual separation between standard and dynamic fields
  - Validation: UI clearly shows which fields are standard and which are custom
  - Dependencies: Task 3.3 must be completed
  - Implementation:
    - Add Separator component before dynamic fields section
    - Add descriptive heading for dynamic fields section
    - Use conditional rendering (only show section if fields exist)

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Clean code principles followed
- [ ] Proper error handling implemented
- [ ] Loading states provide clear user feedback
- [ ] Form validation works for all field types
- [ ] Dialog properly resets state when closed
- [ ] Mobile responsiveness maintained (sm, md, lg breakpoints)
- [ ] All user-facing strings use i18n

### 4. Update Backend Mutation to Handle Dynamic Fields

**Objective**: Modify the addStatus mutation to accept and save dynamic field data

#### Sub-tasks:

- [ ] 4.1: Update addStatus mutation signature in `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcessStatuses.ts`
  - Validation: Mutation accepts optional `filledFieldsData` parameter
  - Dependencies: None
  - Implementation:
    - Add `filledFieldsData: v.optional(v.any())` to args
    - Update mutation handler to accept the new parameter

- [ ] 4.2: Save filled fields data when creating status
  - Validation: filledFieldsData is saved to status record
  - Dependencies: Task 4.1 must be completed
  - Implementation:
    - Add filledFieldsData to the insert call
    - Also update the individualProcess record with field values (same logic as saveFilledFields mutation)

- [ ] 4.3: Add validation for fillable fields
  - Validation: Only fields defined in fillableFields can be saved
  - Dependencies: Task 4.1 must be completed
  - Implementation:
    - Get fillableFields from caseStatus
    - Validate that keys in filledFieldsData exist in fillableFields
    - Throw error if invalid fields are attempted

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation for mutation parameters
- [ ] Clean code principles followed
- [ ] Proper error handling and validation
- [ ] Database updates are atomic
- [ ] Activity logging updated to include filled fields info

### 5. Add Internationalization Keys

**Objective**: Add all necessary i18n keys for the new feature

#### Sub-tasks:

- [ ] 5.1: Add English translations in `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Validation: All new UI text has English translations
  - Dependencies: None
  - Implementation:
    - Add "IndividualProcesses.customFields" key
    - Add "IndividualProcesses.customFieldsDescription" key
    - Add "IndividualProcesses.fillCustomFields" key
    - Add "IndividualProcesses.noCustomFields" key
    - Add "IndividualProcesses.loadingCustomFields" key

- [ ] 5.2: Add Portuguese translations in `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Validation: All new UI text has Portuguese translations
  - Dependencies: None
  - Implementation:
    - Mirror all keys from Task 5.1
    - Provide accurate Portuguese translations

#### Quality Checklist:

- [ ] All user-facing strings use i18n
- [ ] Translations are accurate and professional
- [ ] Key naming follows existing conventions
- [ ] Both languages have complete coverage

### 6. Testing and Refinement

**Objective**: Thoroughly test the feature and ensure it works seamlessly

#### Sub-tasks:

- [ ] 6.1: Test with status that has no fillable fields
  - Validation: Modal shows only standard fields (status, date, notes)
  - Dependencies: All previous tasks completed
  - Output: No dynamic fields section appears

- [ ] 6.2: Test with status that has fillable fields
  - Validation: Dynamic fields render correctly below standard fields
  - Dependencies: All previous tasks completed
  - Output: Fields appear with proper labels and input types

- [ ] 6.3: Test field value persistence
  - Validation: Values entered are saved to both status record and individual process
  - Dependencies: All previous tasks completed
  - Output: Values appear in database and in FillFieldsModal when editing

- [ ] 6.4: Test status switching behavior
  - Validation: Changing status clears previous dynamic fields and shows new ones
  - Dependencies: All previous tasks completed
  - Output: No stale data from previous status selection

- [ ] 6.5: Test loading states
  - Validation: Loading indicators appear while fetching fillable fields
  - Dependencies: All previous tasks completed
  - Output: Smooth loading experience, no layout shift

- [ ] 6.6: Test mobile responsiveness
  - Validation: Modal and fields work on mobile viewports
  - Dependencies: All previous tasks completed
  - Output: Touch-friendly, properly sized, no overflow issues

- [ ] 6.7: Test error scenarios
  - Validation: Proper error messages for invalid data, network errors, etc.
  - Dependencies: All previous tasks completed
  - Output: User-friendly error messages, no crashes

#### Quality Checklist:

- [ ] All test cases pass
- [ ] No console errors or warnings
- [ ] Performance is acceptable (no noticeable lag)
- [ ] UX is smooth and intuitive
- [ ] Mobile experience is excellent
- [ ] Error handling is comprehensive

## Implementation Notes

### Technical Considerations

1. **Query Optimization**: The `getFillableFieldsForCaseStatus` query should use "skip" pattern when no status is selected to avoid unnecessary database calls

2. **State Management**: Use React's `useEffect` to reset `formData` when `selectedStatusId` changes, preventing stale data

3. **Field Validation**: Leverage existing field metadata from `/Users/elberrd/Documents/Development/clientes/casys4/lib/individual-process-fields.ts` for consistent validation

4. **Loading States**: Show skeleton loaders for dynamic fields section to prevent layout shift

5. **Mobile Considerations**:
   - Ensure modal is scrollable on small screens
   - Use responsive grid layouts for fields
   - Maintain minimum 44x44px touch targets

### Architecture Decisions

1. **Component Extraction**: Creating `DynamicFieldRenderer` promotes reusability and maintains DRY principle

2. **Backend Consistency**: Using same field saving logic as `saveFilledFields` ensures data consistency

3. **Progressive Enhancement**: The feature gracefully handles statuses without fillable fields (shows nothing extra)

### Edge Cases to Handle

1. Status with empty fillableFields array
2. Status with fillableFields but user doesn't fill them (optional fields)
3. Network errors while fetching fillable fields
4. Switching between statuses rapidly (race conditions)
5. Reference fields with no available options

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] Code reviewed
- [ ] Feature tested in development environment
- [ ] No regressions in existing functionality
- [ ] Documentation updated (if needed)
- [ ] Both Portuguese and English translations complete
- [ ] Mobile and desktop experiences are excellent
