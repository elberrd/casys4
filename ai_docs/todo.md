# TODO: Individual Process Status Field Configuration Feature

## Context

The user wants to enhance the individualProcessStatuses system to allow configuring which fields from the individualProcesses table can be filled based on the status. This creates a dynamic workflow where:

1. User adds a new status to an individual process
2. If that status has configurable fields, a button appears to fill those fields
3. User clicks the button, opens a modal, and fills the configured fields
4. After filling, a summary of filled fields displays in a new column

This feature adds flexibility to the process management system by allowing status-specific field configurations.

## Related PRD Sections

This feature relates to:
- Individual Process management system
- Status tracking (individualProcessStatuses table)
- Field configuration and dynamic forms
- i18n localization for field labels

## Architecture Overview

**Tables involved:**
- `individualProcessStatuses` - will store array of fillable field names
- `individualProcesses` - source of field definitions and data

**Key files to create/modify:**
- `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts` - schema update
- `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcessStatuses.ts` - backend logic
- `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/individualProcessStatuses.ts` - validation schemas
- `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/*` - UI components
- `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json` and `pt.json` - i18n keys

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review existing schema structure for individualProcessStatuses
  - Validation: Confirmed current schema fields (individualProcessId, caseStatusId, date, isActive, notes, changedBy, changedAt, createdAt)
  - Output: Schema uses Convex v validators, follows pattern with indexes

- [x] 0.2: Identify folder structure for components
  - Validation: Components are in `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/`
  - Output: New modal component should follow existing patterns like `individual-processes-table.tsx`

- [x] 0.3: Review i18n structure
  - Validation: Messages stored in `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json` and `pt.json`
  - Output: Need to add new keys under IndividualProcesses namespace

- [x] 0.4: Review validation patterns
  - Validation: Zod schemas in `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/`
  - Output: Must add validation for fillable fields array

#### Quality Checklist:

- [x] Schema structure reviewed and understood
- [x] Component folder structure identified
- [x] i18n pattern confirmed
- [x] Validation pattern confirmed

### 1. Database Schema Update

**Objective**: Add fillableFields array to individualProcessStatuses table to store which fields can be filled for each status, plus add filledFieldsData to store the actual filled values

#### Sub-tasks:

- [x] 1.1: Update `convex/schema.ts` to add new fields to individualProcessStatuses table
  - Add `fillableFields: v.optional(v.array(v.string()))` - array of field names that can be filled
  - Add `filledFieldsData: v.optional(v.object({ /* dynamic key-value pairs */ }))` - stored as flexible object
  - Validation: Schema compiles without errors, maintains backward compatibility
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts` (line ~266-280)

- [x] 1.2: Add index for efficient querying of statuses with fillable fields
  - Add `.index("by_has_fillable_fields", ["individualProcessId", "fillableFields"])` if needed for performance
  - Validation: Index is properly defined in schema
  - Location: Same file, after line 280
  - Note: Not needed - existing indexes are sufficient for this use case

#### Quality Checklist:

- [ ] TypeScript types properly defined
- [ ] Schema is backward compatible (optional fields)
- [ ] No breaking changes to existing data
- [ ] Convex schema validates successfully

### 2. Define Fillable Field Metadata

**Objective**: Create a centralized metadata structure that defines all available fields from individualProcesses that can be configured as fillable

#### Sub-tasks:

- [x] 2.1: Create field metadata configuration file
  - Create `/Users/elberrd/Documents/Development/clientes/casys4/lib/individual-process-fields.ts`
  - Define interface for field metadata (fieldName, labelKey, fieldType, validation)
  - Export array of all fillable fields from individualProcesses
  - Validation: All fields from individualProcesses table are represented
  - Fields to include:
    - passportId (reference)
    - applicantId (reference)
    - processTypeId (reference)
    - legalFrameworkId (reference)
    - cboId (reference)
    - mreOfficeNumber (string)
    - douNumber (string)
    - douSection (string)
    - douPage (string)
    - douDate (string/date)
    - protocolNumber (string)
    - rnmNumber (string)
    - rnmDeadline (string/date)
    - appointmentDateTime (string/datetime)
    - deadlineDate (string/date)

- [x] 2.2: Add i18n keys for all field labels
  - Update `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Update `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Add keys under `IndividualProcesses.fields` namespace
  - Validation: All field names have both English and Portuguese translations
  - Example keys:
    - `passportId: "Passport"`
    - `applicantId: "Applicant"`
    - `protocolNumber: "Protocol Number"`
    - etc.

#### Quality Checklist:

- [ ] All individualProcesses fields documented
- [ ] Field types properly defined
- [ ] i18n keys added for both languages
- [ ] Metadata structure is extensible

### 3. Backend Mutations for Field Configuration

**Objective**: Create backend logic to manage fillable fields configuration on status records and store filled field data

#### Sub-tasks:

- [x] 3.1: Update validation schema in `lib/validations/individualProcessStatuses.ts`
  - Add validation for fillableFields array (must be valid field names from metadata)
  - Add validation for filledFieldsData object
  - Validation: Zod schema validates against field metadata
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/individualProcessStatuses.ts`

- [x] 3.2: Create mutation to update fillableFields on status record
  - Add `updateFillableFields` mutation in `convex/individualProcessStatuses.ts`
  - Parameters: statusId, fillableFields array
  - Validate field names against metadata
  - Validation: Only admin users can update fillable fields
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcessStatuses.ts`

- [x] 3.3: Create mutation to save filled field data
  - Add `saveFilledFields` mutation in `convex/individualProcessStatuses.ts`
  - Parameters: statusId, filledFieldsData object
  - Validate that only fillable fields are being filled
  - Update the individualProcess record with the filled data
  - Validation: Data validation and access control checks
  - Location: Same file

- [x] 3.4: Create query to retrieve fillable fields for a status
  - Add `getFillableFields` query in `convex/individualProcessStatuses.ts`
  - Returns array of field metadata for fields that can be filled
  - Validation: Proper access control applied
  - Location: Same file

#### Quality Checklist:

- [ ] Zod validation schemas complete
- [ ] Admin-only access control enforced
- [ ] Field name validation against metadata
- [ ] Error handling for invalid field names
- [ ] Activity logging for changes

### 4. UI Component - Field Configuration Selector

**Objective**: Create UI component for admins to configure which fields are fillable for a status

#### Sub-tasks:

- [x] 4.1: Create multi-select component for field selection
  - Create `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/fillable-fields-selector.tsx`
  - Use existing Combobox or multi-select pattern from the project
  - Display field labels using i18n (respecting current locale)
  - Support selection/deselection of multiple fields
  - Validation: Component integrates with existing form patterns
  - Props: value (string[]), onChange, disabled, className

- [x] 4.2: Integrate field selector into status creation/edit flow
  - Add fillable fields selector to the status form
  - Can be in the existing status add/update modal or form
  - Should show below or near the case status selection
  - Validation: Form submission includes fillableFields data
  - Location: Update existing status management component

- [x] 4.3: Add i18n keys for field configuration UI
  - Add keys to messages files:
    - `fillableFields: "Fillable Fields"`
    - `selectFieldsToFill: "Select fields that can be filled from this status"`
    - `noFieldsSelected: "No fields configured"`
    - `fieldsConfigured: "{count} fields configured"`
  - Validation: Both EN and PT translations added

#### Quality Checklist:

- [ ] Multi-select component follows project patterns
- [ ] i18n properly implemented
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] Mobile responsive (touch-friendly)
- [ ] Form validation integrated

### 5. UI Component - Fill Fields Button

**Objective**: Add button to individualProcesses table that appears when a status has fillable fields

#### Sub-tasks:

- [x] 5.1: Add conditional button to table row actions
  - Update `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Add button/icon that appears when activeStatus has fillableFields array
  - Use Edit or Form icon from lucide-react
  - Button label: "Fill Fields" (i18n: `fillFields`)
  - Validation: Button only shows when fillableFields is not empty
  - Location: Add to row actions column (around line 100-300)

- [x] 5.2: Add click handler to open modal
  - Handler receives individualProcessId and statusId
  - Opens fill fields modal (to be created in next task)
  - Validation: Click opens modal with correct data
  - Location: Same component

- [x] 5.3: Add i18n keys for button
  - Add to messages files:
    - `fillFields: "Fill Fields"`
    - `fillFieldsTooltip: "Fill the required fields for this status"`
  - Validation: Both languages supported

#### Quality Checklist:

- [ ] Button conditionally renders based on fillableFields
- [ ] Icon/button styling consistent with table actions
- [ ] i18n keys added
- [ ] Touch-friendly on mobile (min 44x44px)
- [ ] Proper TypeScript types

### 6. UI Component - Fill Fields Modal

**Objective**: Create modal that displays form to fill the configured fields for a status

#### Sub-tasks:

- [x] 6.1: Create fill fields modal component
  - Create `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/fill-fields-modal.tsx`
  - Use existing Dialog component pattern from the project
  - Props: isOpen, onClose, individualProcessId, statusId
  - Validation: Modal follows existing dialog patterns
  - Location: New file in individual-processes folder

- [x] 6.2: Build dynamic form based on fillable fields
  - Query fillable fields from status record
  - For each field, render appropriate input component:
    - String fields: Input text
    - Date fields: DatePicker
    - Reference fields (IDs): Combobox/Select with proper options
  - Use field metadata to determine component type
  - Display field labels using i18n
  - Validation: All field types properly handled with correct input components

- [x] 6.3: Implement form submission
  - Collect all filled field values
  - Call `saveFilledFields` mutation
  - On success, update individualProcess record
  - Show success/error toast
  - Close modal on success
  - Validation: Data properly validated before submission
  - Location: Same component

- [x] 6.4: Add i18n keys for modal
  - Add to messages files:
    - `fillFieldsModalTitle: "Fill Fields"`
    - `fillFieldsModalDescription: "Fill the required fields for this status"`
    - `saveFields: "Save Fields"`
    - `savingFields: "Saving..."`
    - `fieldsSaved: "Fields saved successfully"`
    - `fieldsError: "Failed to save fields"`
  - Validation: All UI text is localized

#### Quality Checklist:

- [ ] Dynamic form generation working
- [ ] All field types supported (string, date, reference)
- [ ] Zod validation for form data
- [ ] Error handling and display
- [ ] Loading states during submission
- [ ] Mobile responsive layout
- [ ] Accessible form (labels, ARIA attributes)
- [ ] i18n complete

### 7. UI Component - Filled Fields Summary Column

**Objective**: Add new column to individualProcesses table that displays summary of filled fields

#### Sub-tasks:

- [ ] 7.1: Add summary column to table
  - Update `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Add new column after status column
  - Column header: "Filled Fields" (i18n: `filledFields`)
  - Validation: Column properly added to table configuration
  - Location: Update columns definition (around line 100-200)

- [ ] 7.2: Create filled fields summary cell component
  - Display each filled field on a new line
  - Format: **Field Label**: Value
  - Use bold for field label, normal weight for value
  - Truncate long values with ellipsis
  - Show tooltip with full value on hover
  - Handle empty state (no fields filled)
  - Validation: Properly formatted display for all field types
  - Location: Can be inline in column definition or separate component

- [ ] 7.3: Format field values appropriately
  - String values: Display as-is
  - Date values: Format using locale-aware date formatter
  - Reference values: Display name/label (e.g., person name, not ID)
  - Validation: All field types display human-readable values
  - Location: Create utility function in `/Users/elberrd/Documents/Development/clientes/casys4/lib/format-field-value.ts`

- [x] 7.4: Add i18n keys for summary column
  - Add to messages files:
    - `filledFields: "Filled Fields"`
    - `noFieldsFilled: "No fields filled"`
    - `fieldLabelSeparator: ":"` (for "Label: Value" format)
  - Validation: Localized for both languages

#### Quality Checklist:

- [ ] Summary displays all filled fields
- [ ] Field labels properly localized
- [ ] Values properly formatted
- [ ] Responsive on mobile (wraps appropriately)
- [ ] Handles empty state gracefully
- [ ] Reference fields show readable names, not IDs
- [ ] i18n complete

### 8. Query Enhancement for Filled Fields Display

**Objective**: Update backend queries to include filled field data and resolve references

#### Sub-tasks:

- [ ] 8.1: Update `list` query in `convex/individualProcesses.ts`
  - Include filledFieldsData from activeStatus
  - Resolve reference field IDs to readable names
  - Validation: Query returns enriched data with filled fields
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts` (around line 94-137)

- [ ] 8.2: Update `get` query in `convex/individualProcesses.ts`
  - Include filledFieldsData from activeStatus
  - Resolve all reference field IDs
  - Validation: Single item query includes filled fields
  - Location: Same file (around line 166-249)

- [ ] 8.3: Optimize reference resolution
  - Batch fetch referenced entities (people, passports, etc.)
  - Avoid N+1 query problems
  - Validation: Queries are performant
  - Location: Same file, update existing enrichment logic

#### Quality Checklist:

- [ ] Filled fields data included in queries
- [ ] Reference IDs resolved to names
- [ ] No N+1 query issues
- [ ] Backward compatible with existing code
- [ ] TypeScript types updated

### 9. Integration Testing & Edge Cases

**Objective**: Ensure the feature works end-to-end and handles edge cases

#### Sub-tasks:

- [ ] 9.1: Test field configuration workflow
  - Admin creates status with fillable fields
  - Verify fields are saved correctly
  - Verify fields appear in selector with i18n labels
  - Validation: Configuration flow works without errors

- [ ] 9.2: Test field filling workflow
  - User adds status to individual process
  - Fill fields button appears
  - Modal opens with correct fields
  - Fill fields and submit
  - Verify data saved to both status and individual process
  - Validation: Complete workflow functions correctly

- [ ] 9.3: Test summary display
  - Verify filled fields appear in table column
  - Check formatting for all field types
  - Verify i18n labels display correctly
  - Test with both EN and PT locales
  - Validation: Summary displays correctly formatted data

- [ ] 9.4: Test edge cases
  - Status with no fillable fields (button should not appear)
  - Status with fillable fields but none filled (empty state)
  - Updating fillable fields on existing status
  - Deleting fields that were previously configured
  - Mobile responsiveness for all components
  - Validation: Edge cases handled gracefully

- [ ] 9.5: Test access control
  - Verify only admins can configure fillable fields
  - Verify both admin and client can fill fields
  - Validation: Proper role-based access control

#### Quality Checklist:

- [ ] End-to-end workflow tested
- [ ] All field types work correctly
- [ ] i18n works for both languages
- [ ] Mobile responsive on all screen sizes
- [ ] Access control properly enforced
- [ ] Error states handled gracefully
- [ ] Loading states work correctly

### 10. Documentation & Code Review

**Objective**: Document the feature and ensure code quality

#### Sub-tasks:

- [ ] 10.1: Add code comments
  - Document complex logic in mutations
  - Add JSDoc comments to public functions
  - Explain field metadata structure
  - Validation: Code is well-documented

- [ ] 10.2: Update type definitions
  - Ensure all TypeScript types are accurate
  - Export necessary types for components
  - Validation: No `any` types, full type safety

- [ ] 10.3: Code review checklist
  - Clean code principles followed (SOLID, DRY, KISS)
  - Proper separation of concerns
  - Reusable components utilized
  - Error handling comprehensive
  - Validation: Code quality standards met

## Implementation Notes

### Field Metadata Structure

The field metadata should follow this pattern:

```typescript
interface FieldMetadata {
  fieldName: string // e.g., "protocolNumber"
  labelKey: string // i18n key e.g., "IndividualProcesses.fields.protocolNumber"
  fieldType: "string" | "date" | "datetime" | "reference"
  referenceTable?: string // For reference fields (e.g., "people", "passports")
  validation?: ZodSchema // Optional Zod validation
}
```

### Storage Strategy

The filled field data will be stored in two places:
1. `individualProcessStatuses.filledFieldsData` - The raw data as entered
2. `individualProcesses.[fieldName]` - Updated to reflect the filled values

This dual storage ensures:
- Historical tracking (status records preserve filled data)
- Easy querying (individual process has current values)

### i18n Field Labels

All field labels must be stored in the messages files under:
- `IndividualProcesses.fields.[fieldName]`

Example:
```json
{
  "IndividualProcesses": {
    "fields": {
      "protocolNumber": "Protocol Number",
      "rnmNumber": "RNM Number",
      "passportId": "Passport",
      ...
    }
  }
}
```

### Mobile Responsiveness

All new UI components must be responsive:
- Modal: Full-screen on mobile, centered dialog on desktop
- Form fields: Stack vertically on mobile, grid on desktop
- Summary column: Wrap text, show ellipsis, allow expanding
- Fill button: Touch-friendly minimum 44x44px tap target

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] Database schema updated without breaking changes
- [ ] Backend mutations and queries working
- [ ] UI components functional and responsive
- [ ] i18n complete for both EN and PT
- [ ] Access control enforced
- [ ] Edge cases handled
- [ ] No TypeScript errors
- [ ] No Zod validation errors
- [ ] Code follows project conventions
- [ ] Feature tested end-to-end
