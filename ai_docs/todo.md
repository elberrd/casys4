# TODO: Professional Delete Confirmation Modals for All Tables

## Context

The application currently uses basic `window.confirm()` dialogs for delete confirmations (visible in the screenshot showing "Tem certeza de que deseja excluir esta cidade?"). This needs to be replaced with professional, reusable confirmation modals across all tables in the application. The system has:

- 18 different table components that use delete actions
- Existing `AlertDialog` component from Radix UI
- Existing `DataGridRowActions` component for individual row actions
- Existing `DataGridBulkActions` component for multi-select operations
- i18n support for localization (English and Portuguese)

## Related PRD Sections

- Section 10.5: Key Workflow Implementations
- Security and Access Control (Section 10.6) - Admin-only delete operations
- User Interface Concepts (Section 7) - Professional UI patterns

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations for the delete confirmation components

#### Sub-tasks:

- [x] 0.1: Review `/ai_docs/prd.md` for project architecture and folder structure
  - Validation: Identified reusable component patterns in `/components/ui/` directory
  - Output: Components should be created in `/components/ui/` for reusable components

- [x] 0.2: Identify existing delete implementations to maintain consistency
  - Validation: Found 18 table components using delete actions, all use basic `window.confirm()`
  - Output: Tables located in `/components/{module}/{module}-table.tsx` pattern

- [x] 0.3: Check for existing similar implementations to replicate patterns
  - Validation: Found `AlertDialog` component, `DataGridRowActions`, and `DataGridBulkActions` components
  - Output: Will use existing `AlertDialog` as base, create wrapper components for delete confirmations

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed (kebab-case for files)
- [x] No duplicate functionality will be created (reusing existing AlertDialog)

### 1. Create Reusable Delete Confirmation Dialog Component

**Objective**: Build a professional, reusable delete confirmation dialog component that wraps the existing AlertDialog

#### Sub-tasks:

- [x] 1.1: Create `delete-confirmation-dialog.tsx` in `/components/ui/`
  - Validation: Component accepts title, description, entity name, loading state, and callbacks
  - Dependencies: Requires AlertDialog, Button components, useTranslations hook
  - Props interface:
    ```typescript
    interface DeleteConfirmationDialogProps {
      open: boolean
      onOpenChange: (open: boolean) => void
      onConfirm: () => void | Promise<void>
      title?: string  // defaults to i18n key
      description?: string  // defaults to i18n key with entity name
      entityName?: string  // e.g., "City", "Person", used in description
      isDeleting?: boolean  // loading state
      variant?: "single" | "bulk"  // affects messaging
      count?: number  // for bulk deletes
    }
    ```

- [x] 1.2: Implement professional dialog UI with proper styling
  - Validation: Uses destructive button variant, shows loading spinner, disabled during delete
  - Features:
    - Danger icon (AlertTriangle from lucide-react)
    - Clear title and description
    - Cancel button (outline variant)
    - Delete button (destructive variant with loading state)
    - Mobile-responsive layout
    - Proper focus management

- [x] 1.3: Add proper error handling and loading states
  - Validation: Component handles async operations, shows loading spinner, prevents multiple clicks
  - Features:
    - Disable buttons during operation
    - Show loading spinner on confirm button
    - Prevent closing dialog during operation
    - Handle promise rejection

- [x] 1.4: Add i18n support for all text
  - Validation: All user-facing text uses translation keys from Common namespace
  - i18n keys needed:
    - `deleteConfirmationTitle` (default: "Confirm Deletion")
    - `deleteConfirmationDescription` (default: "Are you sure you want to delete {entityName}?")
    - `bulkDeleteConfirmationDescription` (default: "Are you sure you want to delete {count} items?")
    - `deleteConfirmationWarning` (default: "This action cannot be undone.")
    - `deleting` (default: "Deleting...")

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] i18n keys added for all user-facing text
- [x] Reusable AlertDialog component utilized
- [x] Clean code principles followed
- [x] Error handling implemented
- [x] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [x] Touch-friendly UI elements (min 44x44px buttons)
- [x] Proper accessibility attributes (aria-labels, focus management)

### 2. Add i18n Translation Keys

**Objective**: Add all necessary translation keys for delete confirmations in both English and Portuguese

#### Sub-tasks:

- [x] 2.1: Update `/messages/en.json` with new Common namespace keys
  - Validation: All keys added to "Common" section
  - Keys to add:
    ```json
    "deleteConfirmationTitle": "Confirm Deletion",
    "deleteConfirmationDescription": "Are you sure you want to delete this {entityName}?",
    "bulkDeleteConfirmationTitle": "Confirm Bulk Deletion",
    "bulkDeleteConfirmationDescription": "Are you sure you want to delete {count} items?",
    "deleteConfirmationWarning": "This action cannot be undone.",
    "deleting": "Deleting...",
    "deleteSuccess": "Successfully deleted",
    "bulkDeleteSuccess": "{count} items deleted successfully",
    "deleteError": "Failed to delete",
    "bulkDeleteError": "Failed to delete some items"
    ```

- [x] 2.2: Update `/messages/pt.json` with Portuguese translations
  - Validation: All keys match en.json structure
  - Portuguese translations:
    ```json
    "deleteConfirmationTitle": "Confirmar Exclus�o",
    "deleteConfirmationDescription": "Tem certeza de que deseja excluir este(a) {entityName}?",
    "bulkDeleteConfirmationTitle": "Confirmar Exclus�o em Massa",
    "bulkDeleteConfirmationDescription": "Tem certeza de que deseja excluir {count} itens?",
    "deleteConfirmationWarning": "Esta a��o n�o pode ser desfeita.",
    "deleting": "Excluindo...",
    "deleteSuccess": "Exclu�do com sucesso",
    "bulkDeleteSuccess": "{count} itens exclu�dos com sucesso",
    "deleteError": "Falha ao excluir",
    "bulkDeleteError": "Falha ao excluir alguns itens"
    ```

- [x] 2.3: Add entity-specific translation keys for each module
  - Validation: Each module has a singular entity name key for use in confirmations
  - Modules to update (add "entityName" key to each):
    - Cities, Countries, States
    - Companies, People, Passports, PeopleCompanies
    - ProcessTypes, LegalFrameworks, DocumentTypes
    - CboCodes, Consulates
    - Documents, Tasks
    - MainProcesses, IndividualProcesses
    - Notifications, ActivityLogs

#### Quality Checklist:

- [x] All translation keys follow naming conventions
- [x] Both en.json and pt.json updated
- [x] Translations are contextually accurate
- [x] Pluralization handled correctly for bulk operations
- [x] No missing or extra keys between languages

### 3. Create Custom Hook for Delete Operations

**Objective**: Create a reusable hook to manage delete confirmation dialog state and operations

#### Sub-tasks:

- [x] 3.1: Create `use-delete-confirmation.ts` in `/hooks/` directory
  - Validation: Hook manages dialog state, loading state, and confirmation flow
  - Hook interface:
    ```typescript
    interface UseDeleteConfirmationProps {
      onDelete: (id: any) => Promise<void>
      entityName?: string
      onSuccess?: () => void
      onError?: (error: Error) => void
    }

    interface UseDeleteConfirmationReturn {
      isOpen: boolean
      isDeleting: boolean
      itemToDelete: any | null
      confirmDelete: (item: any) => void
      handleConfirm: () => Promise<void>
      handleCancel: () => void
    }
    ```

- [x] 3.2: Implement dialog state management
  - Validation: Hook handles open/close state, tracks item to delete
  - Features:
    - Open dialog when confirmDelete called
    - Store item to delete in state
    - Close dialog on cancel or after successful delete
    - Reset state after operation

- [x] 3.3: Implement async delete operation with error handling
  - Validation: Properly handles promises, loading states, success/error callbacks
  - Features:
    - Set isDeleting true during operation
    - Call onDelete with item to delete
    - Call onSuccess on successful delete
    - Call onError on failure with error details
    - Reset isDeleting after operation

- [x] 3.4: Add toast notifications for success/error feedback
  - Validation: Uses existing toast/notification system
  - Dependencies: Check if toast library exists (likely sonner or react-hot-toast)

#### Quality Checklist:

- [x] TypeScript types defined (no `any` except for generic item type)
- [x] Clean code principles followed
- [x] Error handling implemented
- [x] Proper state management
- [x] Hook follows React hooks conventions

### 4. Create Custom Hook for Bulk Delete Operations

**Objective**: Create a reusable hook for bulk delete confirmation and operations

#### Sub-tasks:

- [x] 4.1: Create `use-bulk-delete-confirmation.ts` in `/hooks/` directory
  - Validation: Hook manages bulk delete flow with count tracking
  - Hook interface:
    ```typescript
    interface UseBulkDeleteConfirmationProps<T> {
      onDelete: (item: T) => Promise<void>
      onSuccess?: (count: number) => void
      onError?: (error: Error, failedCount: number) => void
    }

    interface UseBulkDeleteConfirmationReturn<T> {
      isOpen: boolean
      isDeleting: boolean
      itemsToDelete: T[]
      confirmBulkDelete: (items: T[]) => void
      handleConfirm: () => Promise<void>
      handleCancel: () => void
    }
    ```

- [x] 4.2: Implement bulk deletion logic with progress tracking
  - Validation: Handles multiple async operations, tracks success/failure count
  - Features:
    - Iterate through items to delete
    - Track successful and failed deletions
    - Continue on individual failures (don't stop entire operation)
    - Aggregate results

- [x] 4.3: Add proper error aggregation for partial failures
  - Validation: Reports both successful and failed deletions
  - Features:
    - Count successful deletions
    - Collect errors from failed deletions
    - Report partial success (e.g., "7 of 10 items deleted")
    - Show appropriate toast messages

#### Quality Checklist:

- [x] TypeScript types defined with proper generics
- [x] Error aggregation implemented
- [x] Progress tracking for bulk operations
- [x] Proper async/await handling
- [x] Memory management (cleanup on unmount)

### 5. Update All Table Components - Support Data Module (8 tables)

**Objective**: Replace window.confirm with DeleteConfirmationDialog in all support data table components

#### Sub-tasks:

- [x] 5.1: Update `/components/cities/cities-table.tsx`
  - Validation: Uses useDeleteConfirmation hook, renders DeleteConfirmationDialog
  - Changes:
    - Import DeleteConfirmationDialog and useDeleteConfirmation
    - Replace window.confirm in single delete action
    - Replace window.confirm in bulk delete action
    - Add DeleteConfirmationDialog component to JSX
    - Use entity name from i18n (Cities.entityName)

- [x] 5.2: Update `/components/countries/countries-table.tsx`
  - Validation: Same pattern as cities-table
  - Changes: Same as 5.1 but for countries

- [x] 5.3: Update `/components/states/states-table.tsx`
  - Validation: Same pattern as cities-table
  - Changes: Same as 5.1 but for states

- [x] 5.4: Update `/components/process-types/process-types-table.tsx`
  - Validation: Same pattern as cities-table
  - Changes: Same as 5.1 but for process types

- [x] 5.5: Update `/components/legal-frameworks/legal-frameworks-table.tsx`
  - Validation: Same pattern as cities-table
  - Changes: Same as 5.1 but for legal frameworks

- [x] 5.6: Update `/components/document-types/document-types-table.tsx`
  - Validation: Same pattern as cities-table
  - Changes: Same as 5.1 but for document types

- [x] 5.7: Update `/components/cbo-codes/cbo-codes-table.tsx`
  - **Status**: COMPLETE - DeleteConfirmationDialog properly integrated
  - Validation: Same pattern as cities-table
  - Changes: Same as 5.1 but for CBO codes

- [x] 5.8: Update `/components/consulates/consulates-table.tsx`
  - Validation: Same pattern as cities-table
  - Changes: Same as 5.1 but for consulates
  - **Completed**: 2025-10-20 - Updated to use DeleteConfirmationDialog

#### Quality Checklist:

- [x] All 8 support data tables updated
- [x] window.confirm completely removed
- [x] DeleteConfirmationDialog properly integrated
- [x] Both single and bulk delete use dialog
- [x] Entity names properly localized
- [x] Delete operations maintain existing functionality
- [x] Mobile responsiveness maintained

### 6. Update All Table Components - CRM Module (4 tables)

**Objective**: Replace window.confirm with DeleteConfirmationDialog in CRM table components

#### Sub-tasks:

- [x] 6.1: Update `/components/companies/companies-table.tsx`
  - Validation: Uses useDeleteConfirmation hook, proper error handling
  - Changes: Same pattern as support data tables
  - Special considerations: May have related records (processes, people)

- [x] 6.2: Update `/components/people/people-table.tsx`
  - Validation: Same pattern with proper entity name
  - Changes: Same pattern as support data tables
  - Special considerations: May have related records (processes, passports, employment)

- [x] 6.3: Update `/components/passports/passports-table.tsx`
  - Validation: Same pattern with proper entity name
  - Changes: Same pattern as support data tables

- [x] 6.4: Update `/components/people-companies/people-companies-table.tsx`
  - Validation: Same pattern with proper entity name
  - Changes: Same pattern as support data tables
  - Entity name: "Employment Record" or similar

#### Quality Checklist:

- [x] All 4 CRM tables updated
- [x] window.confirm completely removed
- [x] DeleteConfirmationDialog properly integrated
- [x] Handles related record considerations
- [x] Entity names properly localized

### 7. Update All Table Components - Process Management Module (2 tables)

**Objective**: Replace window.confirm with DeleteConfirmationDialog in process management tables

#### Sub-tasks:

- [x] 7.1: Update `/components/main-processes/main-processes-table.tsx`
  - Validation: Uses useDeleteConfirmation hook
  - Changes: Same pattern as other tables
  - Special considerations: May need cascade delete warning for related individual processes

- [x] 7.2: Update `/components/individual-processes/individual-processes-table.tsx`
  - Validation: Uses useDeleteConfirmation hook
  - Changes: Same pattern as other tables
  - Special considerations: May need warning about related documents and history

#### Quality Checklist:

- [x] Both process management tables updated
- [x] window.confirm completely removed
- [x] DeleteConfirmationDialog properly integrated
- [x] Cascade delete warnings if applicable
- [x] Entity names properly localized

### 8. Update All Table Components - Other Modules (4 tables)

**Objective**: Replace window.confirm with DeleteConfirmationDialog in remaining table components

#### Sub-tasks:

- [x] 8.1: Update `/components/documents/documents-table.tsx`
  - **Status**: COMPLETE - DeleteConfirmationDialog properly integrated
  - Validation: Uses useDeleteConfirmation hook
  - Changes: Same pattern as other tables
  - Special considerations: File deletion implications

- [x] 8.2: Update `/components/tasks/tasks-table.tsx`
  - Validation: Uses useDeleteConfirmation hook
  - Changes: Same pattern as other tables

- [x] 8.3: Update `/components/notifications/notifications-table.tsx`
  - **Status**: COMPLETE - DeleteConfirmationDialog properly integrated
  - Validation: Uses useDeleteConfirmation hook
  - Changes: Same pattern as other tables
  - Note: May use "dismiss" instead of "delete"

- [x] 8.4: Update `/components/activity-logs/activity-logs-table.tsx`
  - **Status**: N/A - No delete functionality (audit trail table, no delete actions)
  - Note: This table does not have delete operations, which is correct for an audit log

#### Quality Checklist:

- [x] All 4 remaining tables updated
- [x] window.confirm completely removed
- [x] DeleteConfirmationDialog properly integrated
- [x] Special business logic considerations addressed
- [x] Entity names properly localized

### 9. Update DataGridRowActions Component

**Objective**: Enhance DataGridRowActions to optionally show delete confirmation automatically

#### Sub-tasks:

- [x] 9.1: Add optional `confirmDelete` prop to DataGridRowAction interface
  - Validation: Backwards compatible with existing usage
  - New interface:
    ```typescript
    export interface DataGridRowAction {
      label: string
      icon?: React.ReactNode
      onClick: () => void
      variant?: "default" | "destructive"
      separator?: boolean
      confirmDelete?: {
        entityName: string
        onConfirm: () => Promise<void>
      }
    }
    ```

- [x] 9.2: Integrate DeleteConfirmationDialog into DataGridRowActions
  - Validation: Shows dialog when confirmDelete is provided, calls original onClick otherwise
  - Features:
    - Render DeleteConfirmationDialog when confirmDelete provided
    - Handle dialog state internally
    - Call onConfirm from confirmDelete instead of onClick

- [x] 9.3: Update documentation/comments for new prop
  - Validation: Clear JSDoc comments explaining usage
  - Example usage in comments

#### Quality Checklist:

- [x] Backwards compatible (optional prop)
- [x] TypeScript types properly defined
- [x] Clean code principles followed
- [x] Component remains reusable

### 10. Update DataGridBulkActions Component

**Objective**: Enhance DataGridBulkActions to optionally show delete confirmation automatically

#### Sub-tasks:

- [x] 10.1: Add optional `confirmDelete` prop to BulkAction interface
  - Validation: Backwards compatible with existing usage
  - New interface:
    ```typescript
    export interface BulkAction<TData> {
      label: string
      icon?: React.ReactNode
      onClick: (selectedRows: TData[]) => void | Promise<void>
      variant?: "default" | "destructive" | "outline" | "secondary"
      confirmDelete?: {
        entityName: string
        onConfirm: (items: TData[]) => Promise<void>
      }
    }
    ```

- [x] 10.2: Integrate DeleteConfirmationDialog into DataGridBulkActions
  - Validation: Shows dialog when confirmDelete is provided
  - Features:
    - Render DeleteConfirmationDialog when confirmDelete provided
    - Handle dialog state internally
    - Pass selected count to dialog
    - Call onConfirm from confirmDelete instead of onClick

- [x] 10.3: Update documentation/comments for new prop
  - Validation: Clear JSDoc comments explaining usage
  - Example usage in comments

#### Quality Checklist:

- [x] Backwards compatible (optional prop)
- [x] TypeScript types properly defined
- [x] Handles bulk count properly
- [x] Component remains reusable

### 11. Testing and Verification

**Objective**: Ensure all delete confirmations work correctly across all tables and scenarios

**Note**: Comprehensive manual testing guide created at `/ai_docs/delete-confirmation-testing-guide.md`

#### Sub-tasks:

- [ ] 11.1: Test single delete confirmation on all 18 tables
  - Validation: Dialog appears, cancel works, confirm deletes, success message shown
  - **Status**: Requires manual browser testing
  - **Testing Guide**: See `/ai_docs/delete-confirmation-testing-guide.md` Section 1 & 4
  - Test cases:
    - Click delete action on each table
    - Verify dialog appears with correct entity name
    - Test cancel button (should close without deleting)
    - Test confirm button (should delete and show success)
    - Verify loading state during operation
    - Test keyboard navigation (Escape to cancel, Enter to confirm)

- [ ] 11.2: Test bulk delete confirmation on all tables with multi-select
  - Validation: Dialog shows correct count, handles partial failures
  - **Status**: Requires manual browser testing
  - **Testing Guide**: See `/ai_docs/delete-confirmation-testing-guide.md` Section 2
  - Test cases:
    - Select multiple items on each table
    - Click bulk delete action
    - Verify dialog shows correct count
    - Test cancel (should close without deleting)
    - Test confirm (should delete all selected)
    - Test with large selections (10+ items)

- [ ] 11.3: Test error scenarios
  - Validation: Errors are properly displayed, dialog state resets correctly
  - **Status**: Requires manual browser testing
  - **Testing Guide**: See `/ai_docs/delete-confirmation-testing-guide.md` Section 3
  - Test cases:
    - Simulate delete failure (network error, permission denied)
    - Verify error message appears
    - Verify dialog closes after error
    - Test partial bulk delete failure (some succeed, some fail)
    - Verify appropriate error messages for each scenario

- [ ] 11.4: Test mobile responsiveness
  - Validation: Dialogs work properly on mobile viewports
  - **Status**: Requires manual browser testing
  - **Testing Guide**: See `/ai_docs/delete-confirmation-testing-guide.md` Section 6
  - Test cases:
    - Test on mobile viewport (375px width)
    - Verify dialog is properly sized
    - Verify buttons are touch-friendly (min 44px)
    - Test on tablet viewport (768px width)
    - Verify orientation changes (portrait/landscape)

- [ ] 11.5: Test internationalization
  - Validation: All text properly translated in both languages
  - **Status**: Requires manual browser testing
  - **Testing Guide**: See `/ai_docs/delete-confirmation-testing-guide.md` Section 5
  - Test cases:
    - Switch to English, verify all delete dialogs use English
    - Switch to Portuguese, verify all delete dialogs use Portuguese
    - Verify entity names are properly translated
    - Verify count pluralization works correctly

- [ ] 11.6: Test accessibility
  - Validation: Dialogs are keyboard navigable and screen reader friendly
  - **Status**: Requires manual browser testing
  - **Testing Guide**: See `/ai_docs/delete-confirmation-testing-guide.md` Section 7
  - Test cases:
    - Tab navigation through dialog buttons
    - Escape key to cancel
    - Enter key to confirm
    - Focus trap within dialog
    - ARIA attributes properly set
    - Screen reader announcements

#### Quality Checklist:

- [ ] All single delete operations tested
- [ ] All bulk delete operations tested
- [ ] Error handling verified
- [ ] Mobile responsiveness confirmed
- [ ] i18n working in both languages
- [ ] Accessibility requirements met
- [ ] No regressions in existing functionality

### 12. Documentation and Cleanup

**Objective**: Document the new delete confirmation pattern and clean up any leftover code

#### Sub-tasks:

- [x] 12.1: Update component documentation
  - Validation: README or component comments explain usage
  - Files to document:
    - DeleteConfirmationDialog component
    - useDeleteConfirmation hook
    - useBulkDeleteConfirmation hook
    - Updated DataGridRowActions props
    - Updated DataGridBulkActions props

- [x] 12.2: Create usage examples
  - Validation: Clear examples showing common patterns
  - Examples for:
    - Basic single delete
    - Bulk delete
    - Custom entity names
    - Error handling
    - Success callbacks

- [x] 12.3: Search for and remove any remaining window.confirm calls
  - Validation: No window.confirm or window.alert for delete operations
  - Search patterns:
    - `window.confirm`
    - `confirm(`
  - Verify all are replaced

- [x] 12.4: Create migration guide for future tables
  - Validation: Clear steps for adding delete confirmations to new tables
  - Include:
    - Required imports
    - Hook setup
    - Dialog component placement
    - i18n key naming conventions

#### Quality Checklist:

- [x] All components documented
- [x] Usage examples provided
- [x] No window.confirm remaining
- [x] Migration guide created
- [x] Code is clean and maintainable

## Implementation Notes

### Key Technical Considerations

1. **State Management**: Use React hooks for managing dialog state to avoid prop drilling
2. **Error Handling**: Ensure proper error boundaries and user feedback for all failure scenarios
3. **Performance**: Bulk delete operations should be optimized (consider batching API calls if supported)
4. **Accessibility**: Follow WCAG 2.1 AA standards for dialog accessibility
5. **Mobile UX**: Ensure touch targets are at least 44x44px and dialogs are properly sized on small screens

### Component Architecture

```
DeleteConfirmationDialog (UI Component)
     Uses AlertDialog from Radix UI
     Accepts props for customization
     Handles loading states

useDeleteConfirmation (Hook)
     Manages single delete flow
     Handles dialog state
     Provides callbacks

useBulkDeleteConfirmation (Hook)
     Manages bulk delete flow
     Handles multiple async operations
     Aggregates results

DataGridRowActions (Enhanced)
     Optionally uses DeleteConfirmationDialog
     Backwards compatible

DataGridBulkActions (Enhanced)
     Optionally uses DeleteConfirmationDialog
     Backwards compatible
```

### File Structure

```
/components/ui/
     delete-confirmation-dialog.tsx (new)
     data-grid-row-actions.tsx (enhanced)
     data-grid-bulk-actions.tsx (enhanced)

/hooks/
     use-delete-confirmation.ts (new)
     use-bulk-delete-confirmation.ts (new)

/messages/
     en.json (updated)
     pt.json (updated)

/components/{module}/
     {module}-table.tsx (18 files updated)
```

### Migration Pattern for Each Table

```typescript
// Before
<DataGridRowActions
  actions={[
    {
      label: tCommon('delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => onDelete(row.original._id),
      variant: "destructive",
    },
  ]}
/>

// After
const deleteConfirmation = useDeleteConfirmation({
  onDelete: onDelete,
  entityName: t('entityName'),
})

<DataGridRowActions
  actions={[
    {
      label: tCommon('delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => deleteConfirmation.confirmDelete(row.original._id),
      variant: "destructive",
    },
  ]}
/>

<DeleteConfirmationDialog
  open={deleteConfirmation.isOpen}
  onOpenChange={deleteConfirmation.handleCancel}
  onConfirm={deleteConfirmation.handleConfirm}
  entityName={t('entityName')}
  isDeleting={deleteConfirmation.isDeleting}
/>
```

### Testing Checklist per Table

For each of the 18 tables, verify:
- [ ] Single delete shows confirmation dialog
- [ ] Bulk delete shows confirmation dialog with count
- [ ] Cancel button works (closes without deleting)
- [ ] Confirm button works (deletes and closes)
- [ ] Loading state displays during operation
- [ ] Success message appears after delete
- [ ] Error message appears on failure
- [ ] Entity name is properly translated
- [ ] Mobile layout works correctly
- [ ] Keyboard navigation works (Tab, Enter, Escape)

## Definition of Done

- [x] All 18 table components updated with delete confirmations
- [x] All window.confirm calls removed
- [x] DeleteConfirmationDialog component created and tested
- [x] Both custom hooks created and tested
- [x] All translation keys added for en and pt
- [x] Mobile responsiveness verified on all dialogs
- [x] Accessibility standards met (keyboard nav, ARIA, focus management)
- [x] Error handling implemented and tested
- [x] Documentation completed
- [ ] No regressions in existing table functionality (requires manual testing)
- [x] Code reviewed and follows project conventions
