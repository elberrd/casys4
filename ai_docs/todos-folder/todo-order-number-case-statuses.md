# TODO: Add Order Number to Case Statuses and Auto-Suggest Next Status

## Context

The Case Statuses table needs a new `orderNumber` field to establish a sequential workflow. When a user adds a new status to an individual process in the status history subtable, the system should intelligently suggest the next status based on the current status's order number.

**Current State:**

- Case statuses exist in the `caseStatuses` table with names, codes, colors, categories, and sortOrder
- The `sortOrder` field currently controls display order (1-17)
- Individual processes track status history in `individualProcessStatuses` table
- The status history subtable allows admins to add new statuses via `AddStatusDialog`

**Desired Behavior:**

- Each case status should have an `orderNumber` field indicating its position in the workflow sequence
- When adding a new status, the system should suggest the next status in sequence
- If the current status is the last one in sequence, leave the suggestion blank
- Special case: "Nova Solicitação de Visto" should NOT have an order number

**Order Number Mapping:**

```
Em Preparação → 1
Em Trâmite → 2
Encaminhado a análise → 3
Exigência → 4
Juntada de documento → 5
Proposta de Deferimento → 6
Deferido → 7
Publicado no DOU → 8
Emissão do VITEM → 9
Entrada no Brasil → 10
Registro Nacional Migratório (RNM) → 11
Em Renovação → 12
Pedido de Cancelamento → 13
Pedido de Arquivamento → 14
Pedido cancelado → 15
Nova Solicitação de Visto → (No order number)
```

## Related PRD Sections

- Section 10.4: Complete Convex Database Schema - caseStatuses table (lines 168-184)
- Section 10.4: Complete Convex Database Schema - individualProcessStatuses table (lines 252-266)
- The status system uses workflow progression with sequential stages

## Task Sequence

### 0. Project Structure Analysis (MANDATORY)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review `/ai_docs/prd.md` for database schema and case status structure
  - Validation: Identify the `caseStatuses` table schema and existing fields
  - Output: Document current schema structure and indexes

- [x] 0.2: Locate all files related to case statuses
  - File: `/convex/schema.ts` - Database schema definition
  - File: `/convex/caseStatuses.ts` - Case status mutations and queries
  - File: `/convex/seedCaseStatuses.ts` - Seed data for case statuses
  - File: `/components/case-statuses/case-statuses-table.tsx` - Case status management UI
  - File: `/components/individual-processes/add-status-dialog.tsx` - Dialog for adding statuses
  - Validation: All files identified and paths confirmed
  - Output: Complete list of files that will be modified

- [x] 0.3: Identify the status history workflow
  - File: `/components/individual-processes/individual-process-statuses-subtable.tsx` - Status history display
  - File: `/convex/individualProcessStatuses.ts` - Status history mutations
  - Validation: Understand how new statuses are added to individual processes
  - Output: Document the current flow for adding statuses

- [x] 0.4: Review existing order/sequence fields
  - Current: `sortOrder` field controls display order in the table
  - New: `orderNumber` field will control workflow sequence
  - Validation: Confirm these are separate concerns (display vs workflow)
  - Output: Clarify the difference between sortOrder and orderNumber

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] All affected files identified with absolute paths
- [x] Database schema structure documented
- [x] Naming conventions identified (camelCase for fields)
- [x] Difference between sortOrder and orderNumber clarified

### 1. Update Database Schema

**Objective**: Add the `orderNumber` field to the `caseStatuses` table schema

#### Sub-tasks:

- [x] 1.1: Add orderNumber field to schema in `/convex/schema.ts`
  - Add `orderNumber: v.optional(v.number())` to the caseStatuses table definition (around line 176)
  - Field should be optional to handle existing records and special cases like "Nova Solicitação de Visto"
  - Validation: Schema compiles without TypeScript errors
  - Dependencies: None

- [x] 1.2: Add index for orderNumber
  - Add `.index("by_orderNumber", ["orderNumber"])` to caseStatuses table
  - This allows efficient querying by workflow order
  - Validation: Index properly defined in schema
  - Dependencies: 1.1 must be completed

- [x] 1.3: Update TypeScript types
  - Run `npx convex dev` to regenerate types
  - Verify that `Doc<"caseStatuses">` includes the optional orderNumber field
  - Validation: TypeScript recognizes the new field
  - Dependencies: 1.1 and 1.2 must be completed

#### Quality Checklist:

- [x] orderNumber field added as optional number
- [x] Index created for efficient querying
- [x] TypeScript types regenerated successfully
- [x] Schema remains backward compatible
- [x] No TypeScript compilation errors

### 2. Update Seed Data

**Objective**: Add orderNumber values to the seed data for case statuses

#### Sub-tasks:

- [x] 2.1: Update seed data in `/convex/seedCaseStatuses.ts`
  - Add `orderNumber` field to each status in `caseStatusesData` array
  - Map order numbers according to the user's specification (1-15)
  - Leave `orderNumber` undefined for "Nova Solicitação de Visto" (code: `nova_solicitacao_visto`)
  - Note: Also update sortOrder to match order numbers where appropriate
  - Validation: All statuses have correct order numbers except "Nova Solicitação de Visto"
  - Dependencies: 1.3 must be completed

- [x] 2.2: Document the sortOrder update consideration
  - Current sortOrder goes 1-17 based on the seed file
  - New orderNumber goes 1-15 (excluding "Nova Solicitação de Visto" and "Diário Oficial")
  - Decide: Should sortOrder match orderNumber for consistency?
  - Note: "Proposta de Deferimento" moved to sortOrder 6 to match orderNumber 6
  - Note: "Diário Oficial" has sortOrder 17, but no orderNumber
  - Validation: Document decision for sortOrder vs orderNumber relationship
  - Dependencies: 2.1 must be completed

#### Quality Checklist:

- [x] All order numbers correctly mapped (1-15)
- [x] "Nova Solicitação de Visto" has no orderNumber
- [x] Seed data structure is valid
- [x] Decision documented regarding sortOrder alignment
- [x] No duplicate order numbers

### 3. Create Data Migration

**Objective**: Migrate existing case status records to include orderNumber

#### Sub-tasks:

- [x] 3.1: Create migration file `/convex/migrations/addOrderNumberToCaseStatuses.ts`
  - Create an internal mutation to update existing case status records
  - Map each status by code to its corresponding orderNumber
  - Handle "Nova Solicitação de Visto" by leaving orderNumber as undefined
  - Validation: Migration script structure follows existing migration patterns
  - Dependencies: 2.2 must be completed

- [x] 3.2: Implement migration logic
  - Query all case statuses
  - For each status, check its code and assign the correct orderNumber
  - Use a mapping object: `{ "em_preparacao": 1, "em_tramite": 2, ... }`
  - Skip updating if orderNumber already exists (idempotent)
  - Validation: Migration handles all 18 existing statuses correctly
  - Dependencies: 3.1 must be completed

- [x] 3.3: Add logging and error handling
  - Log each status as it's updated
  - Log summary: total, updated, skipped, errors
  - Handle errors gracefully without stopping the entire migration
  - Validation: Migration provides clear feedback on what was updated
  - Dependencies: 3.2 must be completed

- [x] 3.4: Test migration in development
  - Run: `npx convex run migrations/addOrderNumberToCaseStatuses`
  - Verify all statuses have correct orderNumbers
  - Verify "Nova Solicitação de Visto" has no orderNumber
  - Re-run to confirm idempotency (no duplicate updates)
  - Validation: Migration runs successfully and data is correct
  - Dependencies: 3.3 must be completed

#### Quality Checklist:

- [x] Migration file created in correct location
- [x] All 18 statuses handled correctly
- [x] Idempotent (can be run multiple times safely)
- [x] Comprehensive logging implemented
- [x] Error handling covers edge cases
- [x] Tested successfully in development
- [x] No data loss or corruption

### 4. Update Case Status Mutations

**Objective**: Update CRUD mutations to support the orderNumber field

#### Sub-tasks:

- [x] 4.1: Update create mutation in `/convex/caseStatuses.ts`
  - Add `orderNumber: v.optional(v.number())` to the args (around line 93)
  - Include orderNumber in the insert operation
  - Add validation: orderNumber must be unique if provided
  - Validation: New case statuses can be created with orderNumber
  - Dependencies: 3.4 must be completed

- [x] 4.2: Update update mutation
  - Add `orderNumber: v.optional(v.number())` to the args (around line 138)
  - Include orderNumber in the patch operation
  - Add validation: new orderNumber must be unique if changed
  - Validation: Existing case statuses can have orderNumber updated
  - Dependencies: 4.1 must be completed

- [x] 4.3: Add query to get next status by orderNumber
  - Create new query `getNextStatusByOrderNumber` in `/convex/caseStatuses.ts`
  - Args: `currentOrderNumber: v.optional(v.number())`
  - Logic: Find the active status with orderNumber = currentOrderNumber + 1
  - Return: The next status object, or null if none exists or current is last
  - Handle case where currentOrderNumber is undefined (return null)
  - Validation: Query returns correct next status
  - Dependencies: 4.2 must be completed

- [x] 4.4: Add query to get status by orderNumber
  - Create new query `getByOrderNumber` in `/convex/caseStatuses.ts`
  - Args: `orderNumber: v.number()`
  - Use the new "by_orderNumber" index
  - Return: The status with that order number, or null if not found
  - Validation: Query efficiently finds status by order number
  - Dependencies: 4.3 must be completed

#### Quality Checklist:

- [x] Create mutation supports orderNumber
- [x] Update mutation supports orderNumber changes
- [x] Uniqueness validation for orderNumber implemented
- [x] New query getNextStatusByOrderNumber created
- [x] New query getByOrderNumber created
- [x] All queries use proper indexes for efficiency
- [x] Error handling covers edge cases
- [x] TypeScript types are correct

### 5. Update Case Status UI Table

**Objective**: Display orderNumber in the case statuses management table

#### Sub-tasks:

- [x] 5.1: Add orderNumber column to table in `/components/case-statuses/case-statuses-table.tsx`
  - Add column definition after sortOrder column (around line 100)
  - Header: Use translation key like `t('orderNumber')` or `t('workflowOrder')`
  - Cell: Display orderNumber if present, otherwise show "-" or "N/A"
  - Size: Small width like 80-100px
  - Make it sortable
  - Validation: Column displays correctly in the table
  - Dependencies: 4.4 must be completed

- [x] 5.2: Allow editing orderNumber in the table
  - The case status table already supports inline editing via row actions
  - Ensure orderNumber can be edited when clicking "Edit" action
  - This will be handled by the form dialog that opens
  - Validation: orderNumber is editable through the existing edit flow
  - Dependencies: 5.1 must be completed

- [x] 5.3: Update case status form dialog
  - File: Look for case status form/dialog component (likely in `/components/case-statuses/`)
  - Add orderNumber field to the form
  - Use number input with proper validation
  - Show helper text: "Leave empty for statuses outside the main workflow"
  - Validation: Form accepts orderNumber input
  - Dependencies: 5.2 must be completed

#### Quality Checklist:

- [x] orderNumber column visible in table
- [x] Column properly sorted
- [x] Edit functionality works through existing dialog
- [x] Form includes orderNumber field
- [x] Number input with proper validation
- [x] Helper text explains optional nature
- [x] Mobile responsive design maintained
- [x] i18n keys added for labels

### 6. Implement Next Status Suggestion Logic

**Objective**: Auto-suggest the next status when adding a new status to individual process

#### Sub-tasks:

- [x] 6.1: Update AddStatusDialog component in `/components/individual-processes/add-status-dialog.tsx`
  - Import the new `getNextStatusByOrderNumber` query
  - Add logic to fetch current active status's orderNumber
  - Use query to get the suggested next status
  - Validation: Component can query for next status
  - Dependencies: 5.3 must be completed

- [x] 6.2: Query current active status when dialog opens
  - Use existing `getActiveStatus` query from `api.individualProcessStatuses`
  - Extract the caseStatusId from the active status
  - Query the caseStatus to get its orderNumber
  - Validation: Current status's orderNumber is retrieved
  - Dependencies: 6.1 must be completed

- [x] 6.3: Fetch and auto-select suggested next status
  - Once current orderNumber is known, call `getNextStatusByOrderNumber`
  - If a next status exists, pre-select it in the status dropdown
  - If no next status exists (current is last), leave dropdown empty
  - If current status has no orderNumber, leave dropdown empty
  - User can still manually change the selection
  - Validation: Next status is auto-suggested correctly
  - Dependencies: 6.2 must be completed

- [x] 6.4: Add visual indicator for suggested status
  - Show a small badge or label next to the suggested status in the dropdown
  - Text: "Suggested" or "Next in workflow" (with i18n)
  - Make it subtle but noticeable
  - Validation: User can see which status is suggested
  - Dependencies: 6.3 must be completed

- [x] 6.5: Update dialog UI and UX
  - Add explanatory text: "Based on the current status, the next step is suggested below"
  - Show current status name prominently
  - Allow user to easily override the suggestion
  - Validation: Dialog is user-friendly and intuitive
  - Dependencies: 6.4 must be completed

#### Quality Checklist:

- [x] Current status orderNumber retrieved correctly
- [x] Next status query called with proper parameters
- [x] Auto-selection works for statuses with orderNumber
- [x] Empty selection for last status or no orderNumber
- [x] Visual indicator for suggested status
- [x] User can override suggestion
- [x] Loading states handled properly
- [x] Error states handled gracefully
- [x] i18n keys added for all new text
- [x] Mobile responsive design

### 7. Add i18n Translation Keys

**Objective**: Add all necessary translation strings for the new orderNumber feature

#### Sub-tasks:

- [x] 7.1: Add English translations to `/messages/en.json`
  - `CaseStatuses.orderNumber`: "Order Number"
  - `CaseStatuses.workflowOrder`: "Workflow Order"
  - `CaseStatuses.orderNumberHelp`: "Leave empty for statuses outside the main workflow"
  - `IndividualProcesses.suggestedStatus`: "Suggested"
  - `IndividualProcesses.nextInWorkflow`: "Next in workflow"
  - `IndividualProcesses.currentStatus`: "Current Status"
  - `IndividualProcesses.basedOnCurrentStatus`: "Based on the current status, the next step is suggested below"
  - Validation: All English keys present
  - Dependencies: 6.5 must be completed

- [x] 7.2: Add Portuguese translations to `/messages/pt.json`
  - `CaseStatuses.orderNumber`: "Número de Ordem"
  - `CaseStatuses.workflowOrder`: "Ordem do Fluxo"
  - `CaseStatuses.orderNumberHelp`: "Deixe vazio para status fora do fluxo principal"
  - `IndividualProcesses.suggestedStatus`: "Sugerido"
  - `IndividualProcesses.nextInWorkflow`: "Próximo no fluxo"
  - `IndividualProcesses.currentStatus`: "Status Atual"
  - `IndividualProcesses.basedOnCurrentStatus`: "Com base no status atual, o próximo passo é sugerido abaixo"
  - Validation: All Portuguese keys present
  - Dependencies: 7.1 must be completed

#### Quality Checklist:

- [x] All keys added to en.json
- [x] All keys added to pt.json
- [x] Translations are contextually accurate
- [x] Naming conventions followed
- [x] JSON files remain valid
- [x] No duplicate keys

### 8. Testing and Validation

**Objective**: Comprehensive testing of the orderNumber feature and next status suggestion

#### Sub-tasks:

- [ ] 8.1: Test database migration
  - Verify all case statuses have correct orderNumbers
  - Verify "Nova Solicitação de Visto" has no orderNumber
  - Check that no duplicate orderNumbers exist
  - Validation: Data integrity confirmed
  - Dependencies: 7.2 must be completed

- [ ] 8.2: Test CRUD operations on case statuses
  - Create a new case status with orderNumber
  - Update an existing case status's orderNumber
  - Verify uniqueness validation works
  - Delete a case status (existing functionality)
  - Validation: All operations work correctly
  - Dependencies: 8.1 must be completed

- [ ] 8.3: Test next status suggestion logic
  - Start with "Em Preparação" (orderNumber 1)
  - Add new status → should suggest "Em Trâmite" (orderNumber 2)
  - Add new status → should suggest "Encaminhado a análise" (orderNumber 3)
  - Continue through workflow to "Pedido cancelado" (orderNumber 15)
  - Add new status → should leave dropdown empty (no next status)
  - Validation: Suggestion logic works for all sequences
  - Dependencies: 8.2 must be completed

- [ ] 8.4: Test edge cases
  - Individual process with no active status (new process)
  - Individual process with active status that has no orderNumber
  - Individual process with the last status in sequence (orderNumber 15)
  - Multiple statuses with same orderNumber (should not happen, but test validation)
  - Validation: Edge cases handled gracefully
  - Dependencies: 8.3 must be completed

- [ ] 8.5: Test UI/UX
  - Case status table displays orderNumber correctly
  - Sorting by orderNumber works
  - Editing orderNumber through form dialog works
  - Add status dialog shows current status
  - Add status dialog pre-selects next status
  - Suggested status has visual indicator
  - User can override suggestion
  - Validation: All UI elements work as expected
  - Dependencies: 8.4 must be completed

- [ ] 8.6: Test localization
  - Switch to English locale
  - Verify all labels are in English
  - Switch to Portuguese locale
  - Verify all labels are in Portuguese
  - Validation: Full i18n support working
  - Dependencies: 8.5 must be completed

- [ ] 8.7: Test mobile responsiveness
  - Test on mobile viewport (375px)
  - Verify case status table is usable
  - Verify add status dialog works on mobile
  - Check touch targets are adequate (44x44px minimum)
  - Validation: Mobile UX is acceptable
  - Dependencies: 8.6 must be completed

- [ ] 8.8: Test backward compatibility
  - Verify existing individual processes still work
  - Verify status history displays correctly
  - Verify adding statuses without using suggestion still works
  - Validation: No breaking changes to existing functionality
  - Dependencies: 8.7 must be completed

#### Quality Checklist:

- [ ] Database migration verified
- [ ] CRUD operations tested successfully
- [ ] Next status suggestion logic works correctly
- [ ] All edge cases handled properly
- [ ] UI/UX tested and working
- [ ] Full localization verified
- [ ] Mobile responsive design confirmed
- [ ] Backward compatibility maintained
- [ ] No console errors or warnings
- [ ] Performance is acceptable

## Implementation Notes

### Database Schema Considerations

The `caseStatuses` table will have:

- `sortOrder`: Controls display order in management tables (1-17)
- `orderNumber`: Controls workflow sequence (1-15, with some statuses having no order)

These are **separate concerns**:

- `sortOrder` is for **display organization** (admin decides how to organize the table)
- `orderNumber` is for **workflow logic** (defines the sequential progression of a process)

### Workflow Sequence Logic

The workflow sequence is linear:

1. Start with "Em Preparação" (orderNumber 1)
2. Progress through each sequential status
3. End with "Pedido cancelado" (orderNumber 15)

Special statuses without orderNumber:

- "Nova Solicitação de Visto" - Represents a completely new process, not part of the main workflow

### UI/UX Considerations

1. **Auto-suggestion is optional**: Users can always override the suggested next status
2. **Visual clarity**: Show current status prominently so users understand the context
3. **Graceful degradation**: If no next status exists, simply leave the selection empty
4. **Mobile-first**: Ensure dialog and form work well on small screens

### Migration Strategy

1. Run migration script to populate orderNumber for existing records
2. Update seed data for consistency
3. Deploy schema changes and new queries
4. Deploy UI changes that use the new field
5. Monitor for any issues

### Uniqueness Validation

The orderNumber should be unique across active statuses, but:

- Multiple statuses can have `orderNumber: undefined` (e.g., special statuses)
- Deactivated statuses don't need unique orderNumbers (they're not in use)
- Validation should only check uniqueness among active statuses

## Definition of Done

- [ ] Database schema updated with orderNumber field
- [ ] Index created for orderNumber queries
- [ ] Seed data includes orderNumber values
- [ ] Migration script created and tested
- [ ] All existing case statuses have correct orderNumbers
- [ ] CRUD mutations support orderNumber field
- [ ] New queries created: getNextStatusByOrderNumber, getByOrderNumber
- [ ] Case status table displays orderNumber column
- [ ] Case status form allows editing orderNumber
- [ ] AddStatusDialog suggests next status based on orderNumber
- [ ] Visual indicator shows suggested status
- [ ] All i18n keys added (English and Portuguese)
- [ ] All tests pass successfully
- [ ] Mobile responsive design verified
- [ ] Backward compatibility confirmed
- [ ] No TypeScript errors or console warnings
- [ ] Code reviewed and documented
- [ ] Ready for production deployment
