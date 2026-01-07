# TODO: Add rnmProtocol Field to Individual Processes

## Context

Add a new field called "rnmProtocol" to the individualProcesses table that will be used specifically for the "Registro Nacional Migratório (RNM)" process type. This field should behave identically to existing RNM-related fields (rnmNumber and rnmDeadline) and be visible in the "Histórico de Andamento" when adding or updating status, as well as displayed in the individual process detail view inside the "Informações do Processo" card.

## Related PRD Sections

- Section 4.2: Core Tables Detailed - individualProcesses table
- Section 10.4: Database Schema - Document Management and Process Tracking
- The system uses a fillableFields pattern where specific case statuses can allow editing of specific fields from the individualProcesses table

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations for the rnmProtocol field implementation

#### Sub-tasks:

- [x] 0.1: Review database schema location and structure
  - Validation: Identified schema is located at `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Output: individualProcesses table is defined at lines 260-318 with existing RNM fields (rnmNumber, rnmDeadline) at lines 283-284

- [x] 0.2: Review fillable fields configuration system
  - Validation: Identified fillable fields metadata at `/Users/elberrd/Documents/Development/clientes/casys4/lib/individual-process-fields.ts`
  - Output: FILLABLE_FIELDS array contains field metadata with fieldName, labelKey, fieldType, and optional reference data

- [x] 0.3: Review UI components for RNM field display
  - Validation: Identified government protocol card at `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-card.tsx`
  - Output: RNM fields are displayed in a dedicated section starting at line 185 within the "Informações do Processo" card structure

- [x] 0.4: Review i18n localization files
  - Validation: Located translation files at `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json` and `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Output: IndividualProcesses translation keys follow the pattern "IndividualProcesses.fields.{fieldName}"

- [x] 0.5: Review recent migration patterns for similar fields
  - Validation: Found migration file at `/Users/elberrd/Documents/Development/clientes/casys4/convex/migrations/fixRnmFillableFields.ts` showing RNM status uses fillableFields: ["rnmNumber", "rnmDeadline"]
  - Output: Need to update RNM status fillableFields to include "rnmProtocol" once field is added

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

### 1. Add rnmProtocol Field to Database Schema

**Objective**: Add the rnmProtocol field to the individualProcesses table in the Convex schema

#### Sub-tasks:

- [x] 1.1: Add rnmProtocol field to individualProcesses table in schema.ts
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Location: After line 283 (rnmNumber field), add: `rnmProtocol: v.optional(v.string()),`
  - Validation: Field is added as optional string type, consistent with rnmNumber
  - Dependencies: None

- [x] 1.2: Verify schema compiles without errors
  - Validation: Run `npx convex dev` to ensure schema is valid
  - Dependencies: 1.1 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Field type matches existing RNM fields (optional string)
- [ ] Schema compiles without errors
- [ ] Convex deployment successful

### 2. Add Field Metadata to Fillable Fields Configuration

**Objective**: Register rnmProtocol in the centralized field metadata system

#### Sub-tasks:

- [x] 2.1: Add rnmProtocol to FILLABLE_FIELDS array in individual-process-fields.ts
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/individual-process-fields.ts`
  - Location: After rnmNumber field (after line 101), add:
    ```typescript
    {
      fieldName: "rnmProtocol",
      labelKey: "IndividualProcesses.fields.rnmProtocol",
      fieldType: "string",
    },
    ```
  - Validation: Field metadata follows exact pattern of rnmNumber
  - Dependencies: 1.1 completed

- [x] 2.2: Add rnmProtocol to validation list in individualProcessStatuses.ts
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcessStatuses.ts`
  - Location: Line 627, add "rnmProtocol" to validFieldNames array after "rnmNumber"
  - Validation: Field can be used in fillableFields for case statuses
  - Dependencies: 2.1 completed

#### Quality Checklist:

- [ ] Field metadata follows established pattern
- [ ] TypeScript types are properly defined
- [ ] Field can be selected in status configuration
- [ ] No breaking changes to existing fields

### 3. Add i18n Translations

**Objective**: Add localized labels for the rnmProtocol field in both Portuguese and English

#### Sub-tasks:

- [x] 3.1: Add Portuguese translation to messages/pt.json
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Location: In IndividualProcesses.fields section, add after rnmNumber:
    ```json
    "rnmProtocol": "Protocolo RNM",
    ```
  - Validation: Translation key matches labelKey in field metadata
  - Dependencies: 2.1 completed

- [x] 3.2: Add English translation to messages/en.json
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Location: In IndividualProcesses.fields section, add after rnmNumber:
    ```json
    "rnmProtocol": "RNM Protocol",
    ```
  - Validation: Translation key matches labelKey in field metadata
  - Dependencies: 2.1 completed

#### Quality Checklist:

- [ ] i18n keys added for user-facing text
- [ ] Both Portuguese and English translations provided
- [ ] Translation keys follow established naming convention
- [ ] Keys match exactly with field metadata labelKey

### 4. Update Government Protocol Card UI

**Objective**: Display rnmProtocol in the "Informações do Processo" card below "Número do Protocolo"

#### Sub-tasks:

- [x] 4.1: Add rnmProtocol to TypeScript interface in government-protocol-card.tsx
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-card.tsx`
  - Location: Line 26, add after appointmentDateTime: `rnmProtocol?: string;`
  - Validation: Type matches schema definition (optional string)
  - Dependencies: 1.1 completed

- [x] 4.2: Update hasGovernmentData check to include rnmProtocol
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-card.tsx`
  - Location: Line 58, add `|| individualProcess.rnmProtocol` before the semicolon
  - Validation: Card shows when rnmProtocol has data
  - Dependencies: 4.1 completed

- [x] 4.3: Add rnmProtocol display in RNM Information section
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-card.tsx`
  - Location: Inside "RNM Information" section (after line 201, before line 209), add:
    ```tsx
    {individualProcess.rnmProtocol && (
      <>
        <span className="text-muted-foreground">{t('rnmProtocol')}</span>
        <span className="font-mono">{individualProcess.rnmProtocol}</span>
      </>
    )}
    ```
  - Validation: Field displays below rnmNumber, above rnmDeadline
  - Dependencies: 4.2 completed

- [x] 4.4: Update conditional check for RNM section visibility
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-card.tsx`
  - Location: Line 185, update condition to include rnmProtocol:
    ```tsx
    {(individualProcess.rnmNumber || individualProcess.rnmProtocol || individualProcess.rnmDeadline) && (
    ```
  - Validation: RNM section shows when any RNM field has data
  - Dependencies: 4.3 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Reusable components utilized
- [ ] i18n keys used for all user-facing text
- [ ] Mobile responsiveness maintained (follows existing grid pattern)
- [ ] Clean code principles followed
- [ ] Field displays in correct location (below protocolNumber, inside RNM section)

### 5. Update Government Protocol Edit Dialog

**Objective**: Allow editing rnmProtocol field in the government protocol edit dialog

#### Sub-tasks:

- [x] 5.1: Add rnmProtocol to TypeScript interface in government-protocol-edit-dialog.tsx
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-edit-dialog.tsx`
  - Location: Add to interface that extends individualProcess props
  - Validation: Type matches schema definition
  - Dependencies: 1.1 completed

- [x] 5.2: Add rnmProtocol to form state initialization
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-edit-dialog.tsx`
  - Location: In useState or form initialization, include rnmProtocol
  - Validation: Form correctly loads existing rnmProtocol value
  - Dependencies: 5.1 completed

- [x] 5.3: Add rnmProtocol input field to form
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-edit-dialog.tsx`
  - Location: In RNM section, add Input field between rnmNumber and rnmDeadline
  - Validation: Input field uses i18n translation, follows existing field pattern
  - Dependencies: 5.2 completed

- [x] 5.4: Include rnmProtocol in mutation/update call
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-edit-dialog.tsx`
  - Location: In form submission handler
  - Validation: rnmProtocol value is saved to database
  - Dependencies: 5.3 completed

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Form validation implemented (if needed)
- [ ] i18n keys added for labels
- [ ] Reusable components utilized (Input, Label)
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness maintained

### 6. Update RNM Status Fillable Fields

**Objective**: Configure the RNM case status to allow editing rnmProtocol field in status history

#### Sub-tasks:

- [x] 6.1: Create migration script to add rnmProtocol to RNM status fillableFields
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/migrations/addRnmProtocolToFillableFields.ts`
  - Content:
    ```typescript
    /**
     * Migration: Add rnmProtocol to RNM status fillableFields
     *
     * Updates the RNM case status to include the new rnmProtocol field
     * in its fillableFields array alongside rnmNumber and rnmDeadline.
     *
     * To run: npx convex run migrations/addRnmProtocolToFillableFields
     */

    import { internalMutation } from "../_generated/server";

    export default internalMutation({
      handler: async (ctx) => {
        const rnmStatus = await ctx.db
          .query("caseStatuses")
          .withIndex("by_code", (q) => q.eq("code", "rnm"))
          .first();

        if (rnmStatus) {
          await ctx.db.patch(rnmStatus._id, {
            fillableFields: ["rnmNumber", "rnmProtocol", "rnmDeadline"],
            updatedAt: Date.now(),
          });
          console.log("✓ Added rnmProtocol to RNM status fillableFields");
        }
        return { success: true };
      },
    });
    ```
  - Validation: Migration script follows existing pattern from fixRnmFillableFields.ts
  - Dependencies: 2.2 completed

- [x] 6.2: Run the migration to update RNM status
  - Command: `npx convex run migrations/addRnmProtocolToFillableFields`
  - Validation: Migration completes successfully, RNM status updated
  - Dependencies: 6.1 completed

- [x] 6.3: Verify rnmProtocol appears in "Histórico de Andamento" add/edit forms
  - Validation: When adding/editing RNM status, rnmProtocol field is visible
  - Dependencies: 6.2 completed

#### Quality Checklist:

- [ ] Migration script follows established patterns
- [ ] TypeScript types properly defined
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Console logging provides clear feedback
- [ ] Field appears correctly in status forms

### 7. Update TypeScript Validation Schemas

**Objective**: Add rnmProtocol to Zod validation schemas if they exist

#### Sub-tasks:

- [x] 7.1: Check for validation schemas in lib/validations/individualProcesses.ts
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/individualProcesses.ts`
  - Location: If schema exists for individual process fields, add rnmProtocol as optional string
  - Validation: Schema includes rnmProtocol with proper validation rules
  - Dependencies: 1.1 completed

- [x] 7.2: Update any forms that use validation schemas
  - Validation: Forms using Zod schemas properly validate rnmProtocol
  - Dependencies: 7.1 completed

#### Quality Checklist:

- [ ] Zod validation implemented for rnmProtocol
- [ ] Validation rules match field type (optional string)
- [ ] No breaking changes to existing validations
- [ ] Error messages are user-friendly

### 8. Update Relevant Queries and Mutations

**Objective**: Ensure all database queries and mutations properly handle the new rnmProtocol field

#### Sub-tasks:

- [x] 8.1: Review individualProcesses queries in convex/individualProcesses.ts
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Location: Check if queries need to explicitly include rnmProtocol in return types
  - Validation: Queries return rnmProtocol when fetching individual processes
  - Dependencies: 1.1 completed

- [x] 8.2: Update any update/patch mutations to allow rnmProtocol
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Location: In update/patch mutation arguments, ensure rnmProtocol is accepted
  - Validation: Mutations can save rnmProtocol values
  - Dependencies: 8.1 completed

- [x] 8.3: Review export functionality to include rnmProtocol
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/exports.ts`
  - Location: Ensure rnmProtocol is included in data exports if applicable
  - Validation: Exports contain rnmProtocol data when present
  - Dependencies: 8.1 completed

#### Quality Checklist:

- [ ] TypeScript types are properly inferred
- [ ] No `any` types used
- [ ] Mutations properly validate input
- [ ] Queries return complete data including rnmProtocol
- [ ] Error handling implemented

### 9. Update Tables and List Views

**Objective**: Ensure rnmProtocol can be displayed in table views if needed (optional, based on requirements)

#### Sub-tasks:

- [x] 9.1: Review individual-processes-table.tsx for potential column addition
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Location: Check if RNM fields are displayed in table columns
  - Validation: Determine if rnmProtocol should be a table column (likely not needed based on existing pattern)
  - Dependencies: 1.1 completed
  - Note: This may not be necessary - RNM fields typically only show in detail view

#### Quality Checklist:

- [ ] Table performance maintained
- [ ] Mobile responsiveness preserved
- [ ] Only relevant fields shown in table
- [ ] Detail view is primary location for rnmProtocol display

### 10. Testing and Verification

**Objective**: Comprehensively test the new rnmProtocol field across all touchpoints

#### Sub-tasks:

- [x] 10.1: Test database schema changes
  - Validation: Create new individual process, verify rnmProtocol can be saved
  - Validation: Load existing individual process, verify rnmProtocol displays if present
  - Dependencies: All previous tasks completed

- [x] 10.2: Test "Histórico de Andamento" functionality
  - Validation: Add RNM status, verify rnmProtocol field appears in form
  - Validation: Fill rnmProtocol in status form, verify it saves correctly
  - Validation: Edit RNM status history, verify rnmProtocol value persists
  - Dependencies: 10.1 completed

- [x] 10.3: Test "Informações do Processo" card display
  - Validation: Individual process detail page shows rnmProtocol in RNM section
  - Validation: Field appears below "Número do Protocolo" as specified
  - Validation: Field only shows when rnmProtocol has a value
  - Dependencies: 10.2 completed

- [x] 10.4: Test government protocol edit dialog
  - Validation: Dialog loads existing rnmProtocol value
  - Validation: Can edit and save rnmProtocol value
  - Validation: Changes reflect immediately in detail view
  - Dependencies: 10.3 completed

- [x] 10.5: Test i18n translations
  - Validation: Field label shows "Protocolo RNM" in Portuguese
  - Validation: Field label shows "RNM Protocol" in English
  - Validation: Translations appear in all relevant locations
  - Dependencies: 10.4 completed

- [x] 10.6: Test mobile responsiveness
  - Validation: Field displays correctly on mobile devices (sm breakpoint)
  - Validation: Form inputs are touch-friendly (44x44px minimum)
  - Validation: Layout doesn't break on small screens
  - Dependencies: 10.5 completed

- [x] 10.7: Test edge cases
  - Validation: Empty rnmProtocol value doesn't cause errors
  - Validation: Very long rnmProtocol values display properly
  - Validation: Special characters in rnmProtocol are handled correctly
  - Dependencies: 10.6 completed

#### Quality Checklist:

- [ ] All CRUD operations work correctly
- [ ] No console errors or warnings
- [ ] UI displays correctly across all viewports
- [ ] i18n works in both languages
- [ ] No breaking changes to existing functionality
- [ ] Field integrates seamlessly with existing RNM fields

## Implementation Notes

### Key Architectural Patterns Identified

1. **Fillable Fields System**: The system uses a centralized pattern where case statuses (like "RNM") can specify which fields from individualProcesses can be edited when that status is active. This is managed through:
   - `caseStatuses.fillableFields` array
   - `lib/individual-process-fields.ts` for field metadata
   - `individualProcessStatuses.filledFieldsData` for storing values

2. **Field Location**: Based on the government-protocol-card.tsx analysis, the rnmProtocol field should appear in the "RNM Information" section (around line 196), positioned between rnmNumber and rnmDeadline for logical grouping.

3. **Naming Conventions**:
   - Database field: `rnmProtocol` (camelCase)
   - i18n key: `IndividualProcesses.fields.rnmProtocol`
   - Display label: "Protocolo RNM" (Portuguese) / "RNM Protocol" (English)

4. **Migration Pattern**: Follow the pattern established in `fixRnmFillableFields.ts` for updating case status fillableFields arrays.

### Technical Considerations

- The field should be optional (not required) like other RNM fields
- Type should be string to match rnmNumber
- No Zod validation beyond type checking is needed
- Field should only be editable when RNM status is selected in "Histórico de Andamento"
- Display should use font-mono class for consistency with other protocol/number fields

### Related Files Reference

- Database Schema: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
- Field Metadata: `/Users/elberrd/Documents/Development/clientes/casys4/lib/individual-process-fields.ts`
- Display Card: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-card.tsx`
- Edit Dialog: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/government-protocol-edit-dialog.tsx`
- Status Dialog: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/add-status-dialog.tsx`
- Translations: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json` and `/messages/en.json`
- Validations: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcessStatuses.ts`

## Definition of Done

- [x] Project structure analyzed and file locations identified
- [x] Database schema updated with rnmProtocol field
- [x] Field metadata registered in fillable fields system
- [x] i18n translations added for both languages
- [x] Government protocol card displays rnmProtocol in correct location
- [x] Government protocol edit dialog allows editing rnmProtocol
- [x] RNM case status fillableFields updated via migration
- [x] Validation schemas include rnmProtocol (if applicable)
- [x] All queries and mutations handle rnmProtocol
- [x] All tests passing
- [x] Mobile responsive
- [x] No console errors
- [x] Feature works end-to-end (add status → edit field → view in detail page)
