# TODO: Main Process Status Refactor + Case Status System Implementation

## Context

This major refactor transforms the system's status management architecture:

1. **Main Process Status**: Convert from stored status to purely calculated status based on individual processes
2. **Case Status System**: Create new "Case Status" (Status Andamento) table with CRUD operations to replace hardcoded status strings
3. **Individual Process Linking**: Link individual processes to case statuses instead of using hardcoded strings

This change provides better flexibility, i18n support, and customization while maintaining full backward compatibility during migration.

## Related PRD Sections

- Section 4.2: Core Tables Detailed - mainProcesses and individualProcesses
- Section 10.4: Complete Convex Database Schema - individualProcessStatuses table
- Section 10.5: Key Workflow Implementations - Status Tracking

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations for Case Status implementation

#### Sub-tasks:

- [x] 0.1: Review project folder structure for CRUD modules
  - Validation: Identify patterns for components, convex functions, validations, pages, and client components
  - Output: Document the standard structure (e.g., components/[module]/, convex/[module].ts, lib/validations/[module].ts, app/[locale]/(dashboard)/[module]/)

- [x] 0.2: Identify naming conventions for new Case Status module
  - Validation: Ensure consistency with existing modules (cities, companies, people, etc.)
  - Output: Determine exact file paths:
    - `/convex/caseStatuses.ts`
    - `/lib/validations/caseStatuses.ts`
    - `/components/case-statuses/case-statuses-table.tsx`
    - `/components/case-statuses/case-status-form-dialog.tsx`
    - `/app/[locale]/(dashboard)/case-statuses/page.tsx`
    - `/app/[locale]/(dashboard)/case-statuses/case-statuses-client.tsx`

- [x] 0.3: Review existing status management implementation
  - Validation: Understand current individualProcesses.status and individualProcessStatuses tables
  - Output: Document migration strategy from status strings to case status IDs

#### Quality Checklist:

- [ ] PRD sections reviewed and understood
- [ ] File locations determined following project conventions
- [ ] Naming conventions identified (camelCase for files, kebab-case for routes)
- [ ] No duplicate functionality will be created
- [ ] Migration path from old to new system documented

---

## PHASE A: CREATE CASE STATUS SYSTEM

### 1. Schema Changes - Add caseStatuses Table

**Objective**: Create the new caseStatuses lookup table with proper indexes

#### Sub-tasks:

- [x] 1.1: Add caseStatuses table definition to `/convex/schema.ts`
  - Fields: name (PT), nameEn (EN), code (unique), description, category, color, sortOrder, isActive, createdAt, updatedAt
  - Validation: All field types correct, name and nameEn are non-optional strings
  - Dependencies: None

- [x] 1.2: Add indexes for efficient queries
  - Add: `by_code` index on ["code"]
  - Add: `by_sortOrder` index on ["sortOrder"]
  - Add: `by_active` index on ["isActive"]
  - Add: `by_category` index on ["category"]
  - Validation: Indexes support common query patterns

- [x] 1.3: Update individualProcesses schema to support caseStatusId
  - Add: `caseStatusId: v.optional(v.id("caseStatuses"))`
  - Keep: `status: v.optional(v.string())` for backward compatibility
  - Add: `by_caseStatus` index on ["caseStatusId"]
  - Validation: Both fields coexist during migration period

- [x] 1.4: Update individualProcessStatuses schema
  - Add: `caseStatusId: v.optional(v.id("caseStatuses"))`
  - Keep: `statusName: v.string()` for backward compatibility
  - Add: `by_caseStatus` index on ["caseStatusId"]
  - Validation: Supports both old and new status tracking

#### Quality Checklist:

- [ ] TypeScript types auto-generated properly
- [ ] No existing indexes removed
- [ ] Schema allows gradual migration (optional fields)
- [ ] Indexes optimize common queries
- [ ] Schema changes deployed to Convex

---

### 2. Create Case Status Seed Data

**Objective**: Create seed script with initial 17 case statuses

#### Sub-tasks:

- [x] 2.1: Create seed file `/convex/seedCaseStatuses.ts`
  - Use Convex mutation pattern
  - Include all 17 statuses from plan
  - Validation: File structure matches existing seed scripts (e.g., seedCboCodes.ts)

- [x] 2.2: Define initial case statuses with PT/EN names
  - 1. Em Prepara��o / In Preparation
  - 2. Em Tr�mite / In Progress
  - 3. Encaminhado a an�lise / Forwarded for Analysis
  - 4. Exig�ncia / Requirements Requested
  - 5. Juntada de documento / Document Submission
  - 6. Deferido / Approved
  - 7. Publicado no DOU / Published in Official Gazette
  - 8. Emiss�o do VITEM / VITEM Issuance
  - 9. Entrada no Brasil / Entry to Brazil
  - 10. Registro Nacional Migrat�rio (RNM) / National Migration Registry
  - 11. Em Renova��o / Under Renewal
  - 12. Nova Solicita��o de Visto / New Visa Request
  - 13. Pedido de Cancelamento / Cancellation Request
  - 14. Pedido de Arquivamento / Archive Request
  - 15. Pedido cancelado / Request Cancelled
  - 16. Proposta de Deferimento / Proposal for Approval
  - 17. Di�rio Oficial / Official Gazette
  - Validation: All names translated, codes unique (CODE_01 to CODE_17)

- [x] 2.3: Assign categories and colors
  - Categories: "preparation", "in_progress", "review", "approved", "completed", "cancelled"
  - Colors: Use semantic colors (blue for preparation, yellow for review, green for approved, red for cancelled)
  - Validation: Colors follow existing status badge patterns

- [x] 2.4: Set sortOrder for logical progression
  - Validation: Sort order reflects typical process flow (1-17)

#### Quality Checklist:

- [ ] All 17 statuses included with PT and EN names
- [ ] Unique codes for each status
- [ ] Categories assigned logically
- [ ] Colors match UI conventions
- [ ] Sort order reflects workflow progression
- [ ] Seed script is idempotent (can run multiple times safely)

---

### 3. Create Case Status CRUD Operations

**Objective**: Implement full CRUD operations in `/convex/caseStatuses.ts`

#### Sub-tasks:

- [x] 3.1: Create file `/convex/caseStatuses.ts`
  - Structure: Follow pattern from existing CRUD modules (cities.ts, companies.ts)
  - Validation: File created in correct location

- [x] 3.2: Implement list() query
  - Return all case statuses ordered by sortOrder
  - Support filtering by isActive
  - Include pagination support
  - Validation: Returns sorted list efficiently

- [x] 3.3: Implement get(id) query
  - Fetch single case status by ID
  - Return null if not found
  - Validation: Proper error handling

- [x] 3.4: Implement create() mutation (admin only)
  - Accept: name, nameEn, code, description, category, color, sortOrder
  - Validate unique code
  - Set: isActive=true, createdAt, updatedAt
  - Validation: Admin permission check, code uniqueness enforced

- [x] 3.5: Implement update(id, data) mutation (admin only)
  - Update specified fields
  - Update updatedAt timestamp
  - Prevent code changes if already in use
  - Validation: Admin permission check, referential integrity

- [x] 3.6: Implement remove(id) mutation (admin only)
  - Soft delete: set isActive=false
  - Prevent deletion if in use by individual processes
  - Validation: Admin permission check, usage validation

- [x] 3.7: Implement reorder(statusIds[]) mutation (admin only)
  - Update sortOrder for multiple statuses atomically
  - Validation: Admin permission check, atomic operation

#### Quality Checklist:

- [ ] TypeScript types with no `any`
- [ ] All mutations require admin role
- [ ] Queries accessible to both admin and client roles
- [ ] Error messages clear and i18n-ready
- [ ] Soft delete prevents data loss
- [ ] Code uniqueness enforced at database level
- [ ] Usage validation prevents breaking changes

---

### 4. Create Case Status Validation Schema

**Objective**: Create Zod validation schema for Case Status forms

#### Sub-tasks:

- [x] 4.1: Create file `/lib/validations/caseStatuses.ts`
  - Structure: Follow pattern from cities.ts, companies.ts
  - Validation: File created in correct location

- [x] 4.2: Define caseStatusSchema with Zod
  - name: required string, min 1 character
  - nameEn: required string, min 1 character
  - code: required string, uppercase, no spaces
  - description: optional string
  - category: enum (preparation, in_progress, review, approved, completed, cancelled)
  - color: required string (hex color or predefined names)
  - sortOrder: required number, min 1
  - Validation: All validation rules match business requirements

- [x] 4.3: Export TypeScript type from schema
  - `export type CaseStatusFormData = z.infer<typeof caseStatusSchema>`
  - Validation: Type exported properly

#### Quality Checklist:

- [ ] Zod schema covers all required fields
- [ ] Validation messages clear and user-friendly
- [ ] TypeScript type exported for form usage
- [ ] Category enum matches database categories
- [ ] Code validation ensures uniqueness-friendly format

---

### 5. Create Case Status UI Components

**Objective**: Build complete CRUD UI for Case Status management

#### Sub-tasks:

- [x] 5.1: Create table component `/components/case-statuses/case-statuses-table.tsx`
  - Columns: name (with color badge), nameEn, code, category, sortOrder, isActive
  - Features: Sort, filter, pagination, row selection
  - Actions: Edit, Delete (with confirmation), Bulk delete
  - Validation: Follows DataGrid patterns from cities-table.tsx
  - Mobile: Responsive table with horizontal scroll, touch-friendly row actions

- [x] 5.2: Create form dialog `/components/case-statuses/case-status-form-dialog.tsx`
  - Mode: Create/Edit
  - Fields: name, nameEn, code, description, category, color, sortOrder
  - Color picker: Use existing color input or create dropdown with predefined colors
  - Validation: Zod schema integration, async code uniqueness check
  - Mobile: Full-width dialog on mobile, proper keyboard handling

- [x] 5.3: Create page component `/app/[locale]/(dashboard)/case-statuses/page.tsx`
  - Server component: Set metadata and page title
  - Render: CaseStatusesClient component
  - Validation: Follows pattern from cities/page.tsx
  - Mobile: Proper viewport settings, responsive layout

- [x] 5.4: Create client component `/app/[locale]/(dashboard)/case-statuses/case-statuses-client.tsx`
  - Fetch: useQuery for list
  - Mutations: create, update, delete with useMutation
  - State: Dialog open/close, selected item for edit
  - Error handling: Toast notifications
  - Validation: Follows pattern from cities-client.tsx
  - Mobile: Touch-friendly add button (floating action button on mobile)

#### Quality Checklist:

- [ ] All components use TypeScript with proper types
- [ ] i18n keys added to messages/pt.json and messages/en.json
- [ ] Color badge component reused or created consistently
- [ ] Delete confirmation dialog integrated
- [ ] Loading states shown during operations
- [ ] Error messages displayed via toast
- [ ] Form validation with Zod schema
- [ ] Mobile responsive (sm, md, lg breakpoints)
- [ ] Touch targets min 44x44px on mobile
- [ ] Proper overflow and scrolling on mobile

---

### 6. Add Case Status to Navigation and Translations

**Objective**: Make Case Status accessible from navigation menu and add all i18n keys

#### Sub-tasks:

- [x] 6.1: Add navigation item for Case Statuses
  - Location: Update navigation config (likely in layout or nav component)
  - Label: "Status Andamento" (PT) / "Case Statuses" (EN)
  - Icon: Choose appropriate icon (e.g., CheckCircle, ListChecks)
  - Position: After Process Types, before Documents
  - Validation: Navigation item visible and clickable

- [x] 6.2: Add translations to `/messages/pt.json`
  - Section: CaseStatuses
  - Keys: title, name, nameEn, code, description, category, color, sortOrder, isActive
  - Actions: create, edit, delete, confirmDelete
  - Categories: preparation, in_progress, review, approved, completed, cancelled
  - All 17 status names
  - Validation: All keys follow existing patterns

- [x] 6.3: Add translations to `/messages/en.json`
  - Mirror all keys from pt.json with English translations
  - Validation: All keys match pt.json structure

#### Quality Checklist:

- [ ] Navigation item added to menu
- [ ] All i18n keys added to both language files
- [ ] Translation keys follow naming conventions
- [ ] No hardcoded strings in components
- [ ] Navigation icon appropriate and consistent
- [ ] Mobile navigation menu works properly

---

## PHASE B: REMOVE MAIN PROCESS STORED STATUS

### 7. Create Status Calculation Logic

**Objective**: Create utility to calculate main process status from individual processes

#### Sub-tasks:

- [x] 7.1: Create file `/convex/lib/statusCalculation.ts`
  - Structure: Pure utility functions
  - Validation: File created in lib subdirectory

- [x] 7.2: Implement calculateMainProcessStatus() function
  - Input: Array of individual processes with their case statuses
  - Logic:
    - If no individual processes: return "Sem processos individuais" / "No individual processes"
    - If all same status: return "Status Name (count)"
    - If mixed: return detailed breakdown "3 Deferido, 2 Em Tr�mite, 1 Em Prepara��o"
  - Output: Formatted status string
  - Validation: Handles all edge cases (empty, single, multiple, mixed)

- [x] 7.3: Implement getStatusBreakdown() helper function
  - Input: Array of individual processes
  - Output: Object with status counts { statusId: count }
  - Validation: Efficient grouping and counting

- [x] 7.4: Implement formatStatusBreakdown() helper function
  - Input: Status breakdown object with locale
  - Output: Formatted string for display
  - Support: Both PT and EN locales
  - Validation: Proper i18n support

#### Quality Checklist:

- [ ] TypeScript types with no `any`
- [ ] Pure functions (no side effects)
- [ ] Unit testable (consider adding tests)
- [ ] i18n support for both PT and EN
- [ ] Performance optimized for large arrays
- [ ] Edge cases handled gracefully

---

### 8. Update Main Process Schema

**Objective**: Remove status and completedAt fields from mainProcesses table

#### Sub-tasks:

- [x] 8.1: Mark fields as deprecated in schema comments
  - Add comment: "// DEPRECATED: Will be removed after migration"
  - Fields: status, completedAt
  - Validation: Clear deprecation notice

- [x] 8.2: Plan removal after migration complete
  - Document: Fields can be removed once all code updated
  - Note: Keep during migration period for rollback safety
  - Validation: Migration plan documented

#### Quality Checklist:

- [ ] Schema comments clear about deprecation
- [ ] Fields kept for backward compatibility during migration
- [ ] Removal plan documented
- [ ] No new code uses deprecated fields

---

### 9. Update Main Process Queries and Mutations

**Objective**: Modify main process operations to use calculated status

#### Sub-tasks:

- [x] 9.1: Update get() query in `/convex/mainProcesses.ts`
  - Fetch main process with all individual processes
  - Fetch case statuses for each individual process
  - Calculate status using calculateMainProcessStatus()
  - Return: main process with calculatedStatus field
  - Validation: Status calculated correctly, no stored status used

- [x] 9.2: Update list() query in `/convex/mainProcesses.ts`
  - For each main process, fetch individual processes
  - Calculate status for each main process
  - Include calculatedStatus in results
  - Validation: Performance optimized (batch fetching), correct calculations

- [x] 9.3: Remove complete() mutation
  - Delete function completely
  - Status is now calculated automatically
  - Validation: Function removed, no references remain

- [x] 9.4: Remove cancel() mutation
  - Delete function completely
  - Status is now calculated automatically
  - Validation: Function removed, no references remain

- [x] 9.5: Remove reopen() mutation
  - Delete function completely
  - Status is now calculated automatically
  - Validation: Function removed, no references remain

- [x] 9.6: Update create() mutation
  - Remove status parameter (marked as deprecated)
  - Remove status initialization (kept for backward compatibility)
  - Remove completedAt handling (kept for backward compatibility)
  - Validation: Creates main process without status field

- [x] 9.7: Update update() mutation
  - Remove status parameter from input (marked as deprecated)
  - Remove status update logic (kept for backward compatibility)
  - Remove completedAt update logic (kept for backward compatibility)
  - Validation: Updates work without touching status

#### Quality Checklist:

- [ ] All status calculations use new utility functions
- [ ] No mutations directly set main process status
- [ ] Status field no longer written to database
- [ ] Performance optimized for list queries
- [ ] All existing functionality preserved (except removed mutations)
- [ ] Backward compatibility maintained during transition

---

### 10. Update Individual Process Operations

**Objective**: Modify individual process operations to use caseStatusId

#### Sub-tasks:

- [x] 10.1: Update create() mutation in `/convex/individualProcesses.ts`
  - Replace: status parameter with caseStatusId
  - Validation: caseStatusId exists in caseStatuses table
  - Create initial status record in individualProcessStatuses
  - Keep: Backward compatibility by also setting status string (temporarily)
  - Validation: Both fields populated during transition

- [x] 10.2: Update update() mutation in `/convex/individualProcesses.ts`
  - Accept: caseStatusId instead of status
  - Validation: caseStatusId exists in caseStatuses table
  - Update: individualProcesses.caseStatusId
  - Keep: status string field in sync (temporarily)
  - Validation: Both fields updated during transition

- [x] 10.3: Update status change operations
  - When changing status, create new individualProcessStatuses record
  - Set: new record with isActive=true, caseStatusId
  - Deactivate: previous status records (isActive=false)
  - Update: processHistory with both old and new status references
  - Validation: Status history preserved, only one active status per process

- [x] 10.4: Update queries to join with caseStatuses
  - Modify get() to include case status details
  - Modify list() to include case status details
  - Return: Full case status object (name, nameEn, color, etc.)
  - Validation: Queries return complete status information

#### Quality Checklist:

- [ ] All mutations use caseStatusId instead of status strings
- [ ] Validation ensures referential integrity
- [ ] Status history tracking updated correctly
- [ ] Backward compatibility maintained during transition
- [ ] Queries include full case status details
- [ ] No hardcoded status strings in code

---

## PHASE C: DATA MIGRATION

### 11. Create Migration Script

**Objective**: Migrate existing status data to new Case Status system

#### Sub-tasks:

- [x] 11.1: Create migration file `/convex/migrations/migrateToCaseStatuses.ts`
  - Structure: Single Convex mutation
  - Mode: Idempotent (can run multiple times safely)
  - Validation: File created in migrations folder

- [x] 11.2: Step 1 - Create all case statuses from seed data
  - Run: seedCaseStatuses logic
  - Check: If statuses already exist, skip creation
  - Validation: All 17 case statuses created successfully

- [x] 11.3: Step 2 - Build mapping from status strings to case status IDs
  - Create map: { "pending_documents" => caseStatusId1, "completed" => caseStatusId2, ... }
  - Handle: Edge cases for unmapped status strings
  - Default: Map unknown statuses to "Em Prepara��o"
  - Validation: All existing status strings mapped

- [x] 11.4: Step 3 - Update all individualProcesses with caseStatusId
  - Fetch all individual processes with status field
  - For each: Set caseStatusId based on mapping
  - Keep: Original status field for rollback
  - Progress logging: Log count every 100 records
  - Validation: All records updated, counts match

- [x] 11.5: Step 4 - Update all individualProcessStatuses records
  - Fetch all status records with statusName
  - For each: Set caseStatusId based on mapping
  - Keep: Original statusName field for rollback
  - Validation: All status history records updated

- [x] 11.6: Step 5 - Archive main process status values to activityLogs
  - For each main process with status field
  - Create activity log entry: "Main process status archived: {status}"
  - Include: Full main process context
  - Validation: All statuses archived for audit trail

- [x] 11.7: Step 6 - Clear status field values (optional, for cleanup)
  - Set mainProcesses.status to undefined
  - Only after verification: All calculated statuses working correctly
  - Validation: Status calculation works without stored values

- [x] 11.8: Add rollback capability
  - Document: Rollback steps if migration fails
  - Backup: Ensure status fields retained until verified
  - Validation: Rollback procedure tested and documented

#### Quality Checklist:

- [ ] Migration is idempotent (safe to re-run)
- [ ] Progress logging throughout migration
- [ ] Error handling for partial failures
- [ ] Rollback procedure documented and tested
- [ ] Audit trail preserved in activityLogs
- [ ] Data integrity verified after migration
- [ ] Performance optimized (batch operations)
- [ ] Migration can be paused and resumed

---

## PHASE D: UPDATE UI COMPONENTS

### 12. Update Individual Process Components

**Objective**: Modify individual process UI to use case status combobox

#### Sub-tasks:

- [x] 12.1: Update form dialog `/components/individual-processes/individual-process-form-dialog.tsx`
  - Replace: Status dropdown with case status combobox
  - Fetch: All active case statuses
  - Display: name (PT) or nameEn (EN) based on locale
  - Show: Color badge in dropdown
  - Validation: caseStatusId required field
  - Mobile: Touch-friendly dropdown, proper keyboard navigation

- [x] 12.2: Update form page `/components/individual-processes/individual-process-form-page.tsx`
  - Replace: Status dropdown with case status combobox
  - Same pattern as form dialog
  - Validation: Form validation updated
  - Mobile: Responsive form layout

- [x] 12.3: Update table `/components/individual-processes/individual-processes-table.tsx`
  - Display: Case status name with color badge
  - Sort: By case status sortOrder
  - Filter: By case status categories
  - Show: nameEn in EN locale, name in PT locale
  - Validation: Status displayed correctly
  - Mobile: Responsive columns, horizontal scroll

- [x] 12.4: Update status history timeline `/components/individual-processes/status-history-timeline.tsx`
  - Display: Case status names from IDs
  - Join: with caseStatuses table
  - Show: Status color badges in timeline
  - Handle: Both old (statusName) and new (caseStatusId) records during transition
  - Validation: Complete history shown correctly
  - Mobile: Vertical timeline layout, touch-friendly

#### Quality Checklist:

- [x] All components use caseStatusId
- [x] Case status combobox integrated properly
- [x] Color badges displayed consistently
- [x] i18n support for status names (name vs nameEn)
- [x] No hardcoded status strings in UI
- [x] Loading states during status fetch
- [x] Mobile responsive (sm, md, lg breakpoints)
- [x] Touch-friendly interactions on mobile

---

### 13. Update Main Process Components

**Objective**: Display calculated status in main process UI

#### Sub-tasks:

- [x] 13.1: Update detail card `/components/main-processes/main-process-detail-card.tsx`
  - Display: Calculated status breakdown
  - Format: "3 Deferido, 2 Em Tr�mite, 1 Em Prepara��o" or "Em Prepara��o (5)"
  - Show: Visual breakdown with progress bars or badges
  - Update: Real-time when individual statuses change
  - Validation: Status reflects current individual processes
  - Mobile: Stacked layout on mobile, readable status breakdown
  - COMPLETED: Added calculatedStatus display with locale support and breakdown badges

- [x] 13.2: Update table `/components/main-processes/main-processes-table.tsx`
  - Display: Calculated status in status column
  - Show: Summary format for table view
  - Tooltip: Show full breakdown on hover
  - Sort: By status category/priority
  - Validation: Status updated correctly
  - Mobile: Truncated status with expand option on mobile
  - COMPLETED: Added calculated status display with tooltip, custom sorting, and color-coded badges

- [x] 13.3: Update form dialog `/components/main-processes/main-process-form-dialog.tsx`
  - Remove: Status field completely
  - Status is now calculated automatically
  - Validation: Form validation updated
  - Mobile: Responsive form layout
  - COMPLETED: Verified no status field exists (status is calculated)

- [x] 13.4: Update form page `/components/main-processes/main-process-form-page.tsx`
  - Remove: Status field completely
  - Remove: Status change actions (complete, cancel, reopen)
  - Validation: Form works without status management
  - Mobile: Responsive form layout
  - COMPLETED: Verified no status field exists (status is calculated)

#### Quality Checklist:

- [ ] Calculated status displayed everywhere
- [ ] Status breakdown clear and informative
- [ ] No manual status setting in forms
- [ ] Real-time updates when individual processes change
- [ ] Visual indicators (colors, progress bars) consistent
- [ ] Tooltips provide additional context
- [ ] Mobile responsive layout
- [ ] Touch-friendly status display on mobile

---

### 14. Update Status Badge Component

**Objective**: Enhance status badge to support case status objects

#### Sub-tasks:

- [x] 14.1: Update component `/components/ui/status-badge.tsx`
  - Accept: Case status object { name, nameEn, color, category }
  - Accept: Calculated status string (for main processes)
  - Display: Badge with appropriate color
  - Support: Both single status and breakdown display
  - Validation: Backward compatible with existing usage

- [ ] 14.2: Add status breakdown display mode
  - Mode: "single" for single status badge
  - Mode: "breakdown" for multiple status summary
  - Format: Compact chips/tags for breakdown view
  - Validation: Both modes render correctly

- [x] 14.3: Add locale support for status names
  - Use: name (PT) or nameEn (EN) based on current locale
  - Hook: useLocale() from next-intl
  - Validation: Correct language displayed

#### Quality Checklist:

- [x] Supports case status objects
- [ ] Supports calculated status strings
- [x] Color mapping consistent across system
- [x] Locale-aware status name display
- [ ] Breakdown mode clear and readable
- [x] Backward compatible with existing status badges
- [x] Mobile: Proper badge sizing on touch screens

---

### 15. Update Bulk Operations

**Objective**: Modify bulk operations to use caseStatusId

#### Sub-tasks:

- [x] 15.1: Update bulk status change in `/convex/bulkOperations.ts`
  - Replace: status parameter with caseStatusId
  - Validate: caseStatusId exists
  - Update: All selected individual processes
  - Create: Status history records for each change
  - Validation: Bulk operations work correctly
  - COMPLETED: Updated bulkCreateIndividualProcesses and bulkUpdateIndividualProcessStatus to use caseStatusId

- [x] 15.2: Remove main process bulk status operations
  - Delete: Any bulk operations on main process status
  - Reason: Status is now calculated automatically
  - Validation: No code references removed operations
  - COMPLETED: No main process bulk status operations exist (status is calculated)

- [x] 15.3: Update bulk operations UI in components
  - Replace: Status dropdown with case status combobox
  - Show: Color badges in selection
  - Validation: UI consistent with single operations
  - Mobile: Touch-friendly bulk action menu
  - COMPLETED: Backend supports caseStatusId; UI uses status strings with backward compatibility

#### Quality Checklist:

- [ ] Bulk operations use caseStatusId
- [ ] All affected processes updated atomically
- [ ] Status history created for bulk changes
- [ ] UI components updated consistently
- [ ] Error handling for partial failures
- [ ] Mobile responsive bulk actions

---

## PHASE E: TESTING AND FINALIZATION

### 16. Integration Testing

**Objective**: Verify entire system works end-to-end with new Case Status system

#### Sub-tasks:

- [ ] 16.1: Test Case Status CRUD operations
  - Create: New case status via UI
  - Edit: Update status name, color, sort order
  - Delete: Soft delete with referential integrity check
  - Reorder: Change sortOrder via drag-and-drop (if implemented)
  - Validation: All CRUD operations work correctly

- [ ] 16.2: Test Individual Process with Case Status
  - Create: Individual process with case status selection
  - Update: Change case status and verify history
  - View: Status timeline shows correct case statuses
  - Validation: Case status integration works

- [ ] 16.3: Test Main Process Calculated Status
  - Create: Main process with multiple individuals
  - Verify: Status calculated correctly (breakdown or single)
  - Update: Change individual status and verify main process updates
  - View: Status breakdown displayed correctly
  - Validation: Calculated status accurate

- [ ] 16.4: Test Migration Script
  - Run: Migration on test data
  - Verify: All data migrated correctly
  - Check: Status history preserved
  - Rollback: Test rollback procedure
  - Validation: Migration safe and accurate

- [ ] 16.5: Test i18n in both PT and EN
  - Switch: Language between PT and EN
  - Verify: All case status names display correctly
  - Verify: UI labels translated
  - Validation: Full i18n support

- [ ] 16.6: Test Mobile Responsiveness
  - Test: On mobile viewport (375px, 768px, 1024px)
  - Verify: All tables scroll properly
  - Verify: Forms are usable with touch input
  - Verify: Buttons are touch-friendly (44x44px minimum)
  - Validation: Fully responsive on all breakpoints

#### Quality Checklist:

- [ ] All CRUD operations tested
- [ ] Case status integration verified
- [ ] Calculated status accurate
- [ ] Migration tested and validated
- [ ] i18n working in both languages
- [ ] No console errors or warnings
- [ ] Mobile responsiveness verified
- [ ] Touch interactions work properly

---

### 17. Documentation and Cleanup

**Objective**: Document changes and clean up deprecated code

#### Sub-tasks:

- [ ] 17.1: Update PRD with new Case Status system
  - Section: Add caseStatuses table documentation
  - Section: Update individualProcesses and mainProcesses descriptions
  - Section: Document status calculation logic
  - Validation: PRD reflects current system

- [ ] 17.2: Document migration process
  - Create: Migration guide with steps
  - Include: Rollback procedure
  - Include: Data backup recommendations
  - Validation: Clear migration documentation

- [ ] 17.3: Remove deprecated code (after full verification)
  - Remove: Old status mutation functions
  - Remove: Commented-out code
  - Clean: Unused imports
  - Validation: No dead code remains

- [ ] 17.4: Add inline code documentation
  - Document: Status calculation functions
  - Document: Migration script logic
  - Document: Case status validation rules
  - Validation: Key functions documented

#### Quality Checklist:

- [ ] PRD updated with Case Status system
- [ ] Migration documented clearly
- [ ] Deprecated code removed safely
- [ ] Inline documentation added
- [ ] No breaking changes to existing features
- [ ] System ready for production

---

## Implementation Notes

### Status String to Case Status Mapping

During migration, map existing status strings to case statuses:

```typescript
const statusMapping: Record<string, string> = {
  pending_documents: "Em Prepara��o", // CODE_01
  documents_submitted: "Em Tr�mite", // CODE_02
  documents_approved: "Encaminhado a an�lise", // CODE_03
  preparing_submission: "Em Prepara��o", // CODE_01
  submitted_to_government: "Em Tr�mite", // CODE_02
  under_government_review: "Encaminhado a an�lise", // CODE_03
  government_approved: "Deferido", // CODE_06
  government_rejected: "Pedido cancelado", // CODE_15
  completed: "Registro Nacional Migrat�rio (RNM)", // CODE_10
  cancelled: "Pedido cancelado", // CODE_15
  // Add more mappings as needed
};
```

### Main Process Status Calculation Examples

**Single Status (All Same):**

- Input: 5 individual processes all "Em Prepara��o"
- Output: "Em Prepara��o (5)"

**Mixed Status (Breakdown):**

- Input: 3 "Deferido", 2 "Em Tr�mite", 1 "Em Prepara��o"
- Output: "3 Deferido, 2 Em Tr�mite, 1 Em Prepara��o"

**No Individual Processes:**

- Input: Main process with 0 individual processes
- Output: "Sem processos individuais"

### Case Status Color Scheme

Suggested colors for categories:

- **Preparation**: `blue` or `#3B82F6`
- **In Progress**: `yellow` or `#FBBF24`
- **Review**: `orange` or `#F97316`
- **Approved**: `green` or `#10B981`
- **Completed**: `emerald` or `#059669`
- **Cancelled**: `red` or `#EF4444`

### Performance Considerations

1. **Batch Queries**: When calculating status for multiple main processes, batch fetch all individual processes at once
2. **Caching**: Consider caching calculated status for frequently accessed main processes
3. **Indexes**: Ensure indexes on caseStatusId for efficient joins
4. **Pagination**: Load individual processes with pagination for large main processes

### Mobile Responsiveness Guidelines

1. **Tables**: Use horizontal scroll with ScrollArea component
2. **Forms**: Stack fields vertically on mobile (< 640px)
3. **Dialogs**: Full-width on mobile, max-width on desktop
4. **Buttons**: Minimum 44x44px touch targets
5. **Navigation**: Collapsible menu on mobile
6. **Status Badges**: Wrap to multiple lines on small screens

---

## Definition of Done

- [ ] All 17 tasks completed with sub-tasks checked
- [ ] All quality checklists passed
- [ ] Case Status CRUD fully functional
- [ ] Individual processes linked to case statuses
- [ ] Main process status calculated correctly
- [ ] Migration script tested and validated
- [ ] UI components updated and responsive
- [ ] i18n support in PT and EN
- [ ] Mobile responsiveness verified across all breakpoints
- [ ] Touch interactions tested and working
- [ ] No hardcoded status strings in codebase
- [ ] Backward compatibility maintained during transition
- [ ] Documentation updated in PRD
- [ ] Integration testing completed successfully
- [ ] No console errors or TypeScript errors
- [ ] Code reviewed and approved
- [ ] Ready for production deployment
