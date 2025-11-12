# TODO: Make Status History Subtable Fully Editable

## Context

The "Hist�rico de Status" (status history) subtable in individual processes currently only allows editing the date field. The requirement is to make it fully editable by adding the ability to change the Case Status as well. This change must be applied consistently across all places where this subtable appears.

Currently, the system uses a new Case Status system (stored in `caseStatuses` table) where each status has a name, nameEn (English translation), color, category, and other metadata. The status history records are stored in `individualProcessStatuses` table with a reference to `caseStatusId`.

## Related PRD Sections

- Section 10.4: Complete Convex Database Schema - individualProcessStatuses table (lines 732-771)
- Section 4.2: Core Tables Detailed - Status tracking and history (lines 244-257)
- The system uses a many-to-many relationship between individual processes and statuses, with only one status being active at a time.

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations for modifications

#### Sub-tasks:

- [x] 0.1: Review existing status history implementation
  - Validation: Confirmed that `IndividualProcessStatusesSubtable` component is located at `/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Validation: Confirmed that `StatusHistoryTimeline` component is located at `/components/individual-processes/status-history-timeline.tsx`
  - Output: Two components display status history but only the subtable needs editing capability

- [x] 0.2: Identify all locations where the status history subtable is used
  - Validation: Found usage in 2 locations:
    1. `/components/individual-processes/individual-process-form-page.tsx` - Full page form
    2. `/components/individual-processes/individual-process-form-dialog.tsx` - Dialog form
  - Validation: `/app/[locale]/(dashboard)/individual-processes/[id]/page.tsx` uses `StatusHistoryTimeline` (read-only timeline view, not the editable subtable)
  - Output: Only 2 files need to be updated to ensure subtable has proper functionality

- [x] 0.3: Review existing database schema and mutations
  - Validation: Schema at `/convex/schema.ts` shows `individualProcessStatuses` table with `caseStatusId` field (line 255)
  - Validation: Mutation `updateStatus` exists in `/convex/individualProcessStatuses.ts` (lines 314-395)
  - Validation: Currently mutation only supports updating `date`, `statusName` (deprecated), `notes`, and `isActive`
  - Output: Need to add `caseStatusId` parameter to the `updateStatus` mutation

- [x] 0.4: Check validation schemas
  - Validation: File `/lib/validations/individualProcessStatuses.ts` contains `updateStatusSchema`
  - Validation: Current schema does NOT include `caseStatusId` field (lines 42-52)
  - Output: Need to update validation schema to include `caseStatusId`

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created
- [x] All usage locations of the subtable component identified

### 1. Update Validation Schema for Case Status Editing

**Objective**: Add support for caseStatusId in the updateStatusSchema to enable status selection validation

#### Sub-tasks:

- [x] 1.1: Update updateStatusSchema in `/lib/validations/individualProcessStatuses.ts`
  - Add `caseStatusId` as an optional field to the schema
  - Use proper Zod validation for Id<"caseStatuses"> type
  - Validation: Schema should accept optional caseStatusId parameter
  - Dependencies: Must be done before updating Convex mutations

- [x] 1.2: Update TypeScript type exports
  - Ensure `UpdateStatusInput` type includes the new caseStatusId field
  - Validation: TypeScript compilation succeeds without errors
  - Dependencies: 1.1 must be completed

#### Quality Checklist:

- [x] Zod validation properly configured for caseStatusId
- [x] TypeScript types updated to reflect schema changes
- [x] No breaking changes to existing code
- [x] Validation handles both legacy (statusName) and new (caseStatusId) approaches

### 2. Update Convex Mutation to Support Case Status Changes

**Objective**: Modify the updateStatus mutation in Convex to accept and process caseStatusId updates

#### Sub-tasks:

- [x] 2.1: Update mutation arguments in `/convex/individualProcessStatuses.ts`
  - Add `caseStatusId: v.optional(v.id("caseStatuses"))` to the args in updateStatus mutation (around line 316)
  - Validation: Mutation signature accepts optional caseStatusId
  - Dependencies: 1.1 must be completed

- [x] 2.2: Implement case status update logic
  - When caseStatusId is provided, validate that it exists in the database
  - Update the status record with the new caseStatusId
  - Update the backward compatibility fields (statusName and status) from the new case status
  - Validation: When caseStatusId changes, both the new field and legacy fields are updated correctly
  - Dependencies: 2.1 must be completed

- [x] 2.3: Update the individualProcess record when status is active
  - If the status being updated is active, update the individualProcess.caseStatusId field
  - Also update the deprecated individualProcess.status field for backward compatibility
  - Validation: Active status changes propagate to the parent individualProcess record
  - Dependencies: 2.2 must be completed

- [x] 2.4: Update activity logging
  - Include caseStatusId changes in the activity log details
  - Log the old and new case status names for audit trail
  - Validation: Activity logs show complete information about status changes
  - Dependencies: 2.3 must be completed

#### Quality Checklist:

- [x] Mutation accepts caseStatusId parameter
- [x] Database validation ensures caseStatusId exists before update
- [x] Backward compatibility maintained with legacy statusName field
- [x] Active status changes update parent individualProcess record
- [x] Activity logging captures all relevant change details
- [x] Error handling covers edge cases (invalid ID, non-existent status)
- [x] TypeScript types are correct throughout the mutation

### 3. Update Subtable Component UI to Include Case Status Selector

**Objective**: Modify IndividualProcessStatusesSubtable to allow selecting a different case status when editing

#### Sub-tasks:

- [x] 3.1: Add case status query to the component
  - Import and use `api.caseStatuses.listActive` query in `/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Query active case statuses at the component level
  - Validation: Active case statuses load successfully
  - Dependencies: None

- [x] 3.2: Add state management for case status editing
  - Add `editCaseStatusId` state variable to track the selected status during edit
  - Initialize with current status when edit begins
  - Validation: State correctly tracks selected case status
  - Dependencies: 3.1 must be completed

- [x] 3.3: Add case status selector to the edit UI
  - Replace or augment the current date-only edit UI
  - Add a Select/Combobox component for choosing a case status
  - Display case status options with proper localization (use nameEn when locale is "en")
  - Show status badge with color and category for visual consistency
  - Validation: Case status selector appears when editing a row
  - Dependencies: 3.2 must be completed

- [x] 3.4: Update the save handler to include caseStatusId
  - Modify `handleSaveDate` function (rename to `handleSave` for clarity)
  - Include caseStatusId in the mutation call if it has changed
  - Validate that either date or caseStatusId (or both) have been modified
  - Validation: Save operation includes caseStatusId when provided
  - Dependencies: 3.3 and 2.4 must be completed

- [x] 3.5: Update UI layout for better editing experience
  - Consider using a dialog or popover for editing instead of inline editing
  - This provides more space for both date picker and status selector
  - Alternatively, expand the inline edit row to show both fields side by side
  - Validation: Edit UI is user-friendly and responsive on mobile devices
  - Dependencies: 3.4 must be completed

- [x] 3.6: Add cancel functionality
  - Reset both date and caseStatusId when cancel is clicked
  - Clear editing state completely
  - Validation: Cancel button properly discards changes
  - Dependencies: 3.5 must be completed

#### Quality Checklist:

- [x] Case status selector shows active statuses only
- [x] Proper i18n support (nameEn used for English locale)
- [x] Status badge displays with correct color and category
- [x] Edit UI is accessible and keyboard-navigable
- [x] Mobile responsive design (44x44px minimum touch targets)
- [x] Loading states handled appropriately
- [x] Error messages displayed clearly
- [x] TypeScript types are correct for all new state variables
- [x] No console errors or warnings

### 4. Add i18n Translation Keys

**Objective**: Add necessary translation strings for the new case status editing functionality

#### Sub-tasks:

- [x] 4.1: Add English translations to `/messages/en.json`
  - Add key for "selectStatus" if not present
  - Add "selectNewStatus" or similar for edit dialog
  - Add "caseStatusRequired" error message
  - Add "statusUpdated" success message
  - Validation: All required keys present in English
  - Dependencies: None

- [x] 4.2: Add Portuguese translations to `/messages/pt.json`
  - Mirror all keys from English file
  - Translate to Portuguese appropriately
  - Ensure consistency with existing translation patterns
  - Validation: All required keys present in Portuguese
  - Dependencies: 4.1 must be completed

- [x] 4.3: Update existing translation keys if needed
  - Review "editStatusDate" - may need to become "editStatus"
  - Update "statusDateUpdated" to "statusUpdated" for broader scope
  - Validation: Translations accurately reflect new functionality
  - Dependencies: 4.2 must be completed

#### Quality Checklist:

- [x] All new keys added to both en.json and pt.json
- [x] Translations are contextually appropriate
- [x] Naming conventions match existing keys
- [x] No duplicate keys
- [x] JSON files remain valid after changes

### 5. Update Component Usage in Form Pages

**Objective**: Ensure the subtable component works correctly in all locations where it's used

#### Sub-tasks:

- [x] 5.1: Test in individual-process-form-page.tsx
  - Open the edit page for an individual process
  - Verify the status history subtable displays correctly
  - Test editing a status (both date and case status)
  - Validation: Editing works without errors
  - Dependencies: 3.6 and 4.3 must be completed

- [x] 5.2: Test in individual-process-form-dialog.tsx
  - Open the dialog for editing an individual process
  - Verify the status history subtable displays correctly
  - Test editing a status (both date and case status)
  - Validation: Editing works in dialog context
  - Dependencies: 5.1 must be completed

- [x] 5.3: Verify role-based access control
  - Test as admin user - should be able to edit
  - Test as client user - should NOT see edit buttons
  - Validation: Only admins can edit status history
  - Dependencies: 5.2 must be completed

#### Quality Checklist:

- [x] Subtable displays correctly in full page form
- [x] Subtable displays correctly in dialog form
- [x] Edit functionality works in both contexts
- [x] Access control properly restricts client users
- [x] No UI layout issues or overlapping elements
- [x] Mobile responsiveness maintained
- [x] Loading states work correctly
- [x] Error states display properly

### 6. Test Across All Scenarios

**Objective**: Comprehensive testing to ensure the feature works correctly in all edge cases

#### Sub-tasks:

- [x] 6.1: Test basic status editing flow
  - Edit date only
  - Edit case status only
  - Edit both date and case status
  - Validation: All edit combinations work correctly
  - Dependencies: 5.3 must be completed

- [x] 6.2: Test data validation
  - Try to save without a date (should use current date or keep existing)
  - Try to save without selecting a status (should keep existing)
  - Try invalid date format (should show error)
  - Validation: Proper validation messages appear
  - Dependencies: 6.1 must be completed

- [x] 6.3: Test active status handling
  - Edit an active status
  - Verify it remains active after edit
  - Verify parent individualProcess record is updated
  - Validation: Active status updates propagate correctly
  - Dependencies: 6.2 must be completed

- [x] 6.4: Test backward compatibility
  - Verify existing status history records display correctly
  - Ensure legacy statusName field is still populated
  - Check that status field in individualProcesses is updated
  - Validation: No breaking changes to existing data
  - Dependencies: 6.3 must be completed

- [x] 6.5: Test localization
  - Switch between English and Portuguese
  - Verify status names display in correct language
  - Verify all UI labels are properly translated
  - Validation: Full i18n support working
  - Dependencies: 6.4 must be completed

- [x] 6.6: Test on different screen sizes
  - Desktop (1920px and above)
  - Laptop (1366px)
  - Tablet (768px)
  - Mobile (375px)
  - Validation: Responsive design works on all viewports
  - Dependencies: 6.5 must be completed

- [x] 6.7: Test error scenarios
  - Network failure during save
  - Invalid case status ID
  - Concurrent edits by multiple users
  - Validation: Errors handled gracefully with user feedback
  - Dependencies: 6.6 must be completed

#### Quality Checklist:

- [x] All edit combinations tested successfully
- [x] Data validation working correctly
- [x] Active status handling verified
- [x] Backward compatibility confirmed
- [x] Full localization support verified
- [x] Mobile responsive on all screen sizes
- [x] Error handling tested and working
- [x] No console errors or warnings
- [x] Performance is acceptable (no lag during edits)
- [x] Activity logs capture all changes correctly

## Implementation Notes

### Database Schema Considerations

The `individualProcessStatuses` table uses the following structure:
- `caseStatusId`: Reference to the case status (required, new field)
- `statusName`: Deprecated backward compatibility field
- `date`: User-editable ISO date (YYYY-MM-DD format)
- `isActive`: Boolean indicating if this is the current active status
- Only ONE status can be active per individualProcess at a time

### UI/UX Considerations

1. **Edit Mode**: Consider using a dialog/modal for editing rather than inline editing to provide more space for both date picker and status selector
2. **Status Display**: Show the status badge with color and category for visual consistency
3. **Localization**: Use `nameEn` when locale is "en", otherwise use `name`
4. **Touch Targets**: Ensure all interactive elements are at least 44x44px for mobile usability
5. **Loading States**: Show loading indicators while fetching case statuses
6. **Error Messages**: Use toast notifications for errors and success messages

### Access Control

- Only admin users can edit status history (already enforced by checking `userRole === "admin"`)
- The mutation `requireAdmin()` check ensures backend enforcement
- Client users can view but not edit the status history

### Backward Compatibility

The system maintains backward compatibility by:
- Keeping the deprecated `statusName` field in `individualProcessStatuses`
- Updating the deprecated `status` field in `individualProcesses`
- Both fields are automatically populated from the selected `caseStatus`

### Activity Logging

All status changes should be logged with:
- Old and new case status IDs
- Old and new case status names
- Old and new dates (if changed)
- User who made the change
- Timestamp of the change

## Definition of Done

- [x] Validation schema updated to include caseStatusId
- [x] Convex mutation updated to accept and process caseStatusId changes
- [x] Subtable component UI updated with case status selector
- [x] All i18n keys added for both English and Portuguese
- [x] Component works in both form page and dialog contexts
- [x] Role-based access control verified (admin only)
- [x] All test scenarios pass successfully
- [x] Backward compatibility maintained
- [x] Mobile responsive design verified
- [x] No TypeScript errors or console warnings (related to changes)
- [x] Activity logs capture all status changes
- [x] Code reviewed and ready for testing
- [x] Documentation updated if necessary
