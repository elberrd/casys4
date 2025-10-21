# Delete Confirmation System - Implementation Guide

## Overview

This guide documents the professional delete confirmation modal system implemented across all 18 table components in the application. The system replaces basic `window.confirm()` dialogs with a consistent, accessible, and user-friendly confirmation experience.

## Architecture

### Component Structure

```
DeleteConfirmationDialog (UI Component)
├── Uses Radix UI AlertDialog as foundation
├── Supports single and bulk delete variants
├── Full i18n support (English & Portuguese)
├── Mobile responsive with touch-friendly UI
└── Accessibility compliant (WCAG 2.1 AA)

useDeleteConfirmation (Hook)
├── Manages single item delete confirmation flow
├── Handles dialog state (open/close)
├── Executes async delete operations
├── Provides toast notifications
└── Error handling with callbacks

useBulkDeleteConfirmation (Hook)
├── Manages bulk delete confirmation flow
├── Processes multiple items sequentially
├── Tracks success/failure counts
├── Handles partial failures gracefully
└── Aggregates results for user feedback
```

### File Locations

```
/components/ui/
  └── delete-confirmation-dialog.tsx    # Reusable dialog component

/hooks/
  ├── use-delete-confirmation.ts        # Single delete hook
  └── use-bulk-delete-confirmation.ts   # Bulk delete hook

/messages/
  ├── en.json                           # English translations
  └── pt.json                           # Portuguese translations
```

## Components

### DeleteConfirmationDialog

A professional, reusable delete confirmation modal component.

**Props:**

```typescript
interface DeleteConfirmationDialogProps {
  open: boolean                          // Controls dialog visibility
  onOpenChange: (open: boolean) => void  // Callback when dialog state changes
  onConfirm: () => void | Promise<void>  // Delete confirmation handler
  title?: string                         // Custom title (optional)
  description?: string                   // Custom description (optional)
  entityName?: string                    // Entity being deleted (e.g., "city")
  isDeleting?: boolean                   // Loading state during operation
  variant?: "single" | "bulk"            // Dialog variant
  count?: number                         // Number of items (for bulk variant)
}
```

**Features:**
- Danger icon (AlertTriangle) for visual warning
- Destructive button styling
- Loading spinner during delete operation
- Prevents closing during operation
- Mobile responsive (44x44px minimum touch targets)
- Keyboard accessible (Enter to confirm, Escape to cancel)
- Full i18n support with parameter substitution

**Usage Example:**

```tsx
<DeleteConfirmationDialog
  open={deleteConfirmation.isOpen}
  onOpenChange={deleteConfirmation.handleCancel}
  onConfirm={deleteConfirmation.handleConfirm}
  entityName="city"
  isDeleting={deleteConfirmation.isDeleting}
/>
```

## Hooks

### useDeleteConfirmation

Manages single item delete confirmation state and operations.

**Interface:**

```typescript
interface UseDeleteConfirmationProps<T = unknown> {
  onDelete: (item: T) => Promise<void>  // Async delete function
  entityName?: string                    // Entity name for display
  onSuccess?: () => void                 // Success callback
  onError?: (error: Error) => void       // Error callback
}

interface UseDeleteConfirmationReturn<T = unknown> {
  isOpen: boolean                        // Dialog open state
  isDeleting: boolean                    // Operation in progress
  itemToDelete: T | null                 // Item queued for deletion
  confirmDelete: (item: T) => void       // Opens confirmation dialog
  handleConfirm: () => Promise<void>     // Executes deletion
  handleCancel: () => void               // Closes dialog
}
```

**Usage Example:**

```tsx
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"

function CitiesTable({ cities, onDelete }) {
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id) => {
      await onDelete(id)
    },
    entityName: "city",
    onSuccess: () => {
      router.refresh()
    }
  })

  return (
    <>
      <Button onClick={() => deleteConfirmation.confirmDelete(city._id)}>
        Delete
      </Button>

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName="city"
        isDeleting={deleteConfirmation.isDeleting}
      />
    </>
  )
}
```

### useBulkDeleteConfirmation

Manages bulk delete confirmation state and operations.

**Interface:**

```typescript
interface UseBulkDeleteConfirmationProps<T = unknown> {
  onDelete: (item: T) => Promise<void>           // Delete function for single item
  onSuccess?: (count: number) => void            // Success callback with count
  onError?: (error: Error, failedCount: number) => void  // Error callback
}

interface UseBulkDeleteConfirmationReturn<T = unknown> {
  isOpen: boolean                                // Dialog open state
  isDeleting: boolean                            // Operation in progress
  itemsToDelete: T[]                             // Items queued for deletion
  confirmBulkDelete: (items: T[]) => void        // Opens confirmation dialog
  handleConfirm: () => Promise<void>             // Executes bulk deletion
  handleCancel: () => void                       // Closes dialog
}
```

**Usage Example:**

```tsx
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"

function CitiesTable({ cities, onDelete }) {
  const bulkDelete = useBulkDeleteConfirmation({
    onDelete: async (city) => {
      await onDelete(city._id)
    },
    onSuccess: (count) => {
      table.resetRowSelection()
      router.refresh()
    }
  })

  return (
    <>
      <Button onClick={() => bulkDelete.confirmBulkDelete(selectedRows)}>
        Delete Selected
      </Button>

      <DeleteConfirmationDialog
        open={bulkDelete.isOpen}
        onOpenChange={bulkDelete.handleCancel}
        onConfirm={bulkDelete.handleConfirm}
        variant="bulk"
        count={bulkDelete.itemsToDelete.length}
        isDeleting={bulkDelete.isDeleting}
      />
    </>
  )
}
```

## Internationalization

All text is localized using `next-intl`. Translation keys are in the `Common` namespace.

### English Keys (en.json)

```json
{
  "Common": {
    "deleteConfirmationTitle": "Confirm Deletion",
    "deleteConfirmationDescription": "Are you sure you want to delete this {entityName}?",
    "bulkDeleteConfirmationTitle": "Confirm Bulk Deletion",
    "bulkDeleteConfirmationDescription": "Are you sure you want to delete {count} items?",
    "deleteConfirmationWarning": "This action cannot be undone.",
    "deleting": "Deleting...",
    "deleteSuccess": "Successfully deleted",
    "deleteError": "Failed to delete",
    "bulkDeleteSuccess": "{count} items deleted successfully",
    "bulkDeleteError": "Failed to delete some items"
  }
}
```

### Portuguese Keys (pt.json)

```json
{
  "Common": {
    "deleteConfirmationTitle": "Confirmar Exclusão",
    "deleteConfirmationDescription": "Tem certeza de que deseja excluir este(a) {entityName}?",
    "bulkDeleteConfirmationTitle": "Confirmar Exclusão em Massa",
    "bulkDeleteConfirmationDescription": "Tem certeza de que deseja excluir {count} itens?",
    "deleteConfirmationWarning": "Esta ação não pode ser desfeita.",
    "deleting": "Excluindo...",
    "deleteSuccess": "Excluído com sucesso",
    "deleteError": "Falha ao excluir",
    "bulkDeleteSuccess": "{count} itens excluídos com sucesso",
    "bulkDeleteError": "Falha ao excluir alguns itens"
  }
}
```

## Migration Guide for New Tables

When adding delete functionality to a new table component, follow these steps:

### 1. Add Required Imports

```tsx
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation"
```

### 2. Initialize Hooks

```tsx
function MyTable({ data, onDelete }) {
  // Single delete confirmation
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id) => {
      await onDelete(id)
    },
    entityName: "item",  // Use descriptive entity name
  })

  // Bulk delete confirmation
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item) => {
      await onDelete(item._id)
    },
    onSuccess: () => {
      table.resetRowSelection()
    },
  })

  // ... rest of component
}
```

### 3. Update Delete Actions

**Single Delete:**

```tsx
// Before
<Button onClick={() => onDelete(row.original._id)}>
  Delete
</Button>

// After
<Button onClick={() => deleteConfirmation.confirmDelete(row.original._id)}>
  Delete
</Button>
```

**Bulk Delete:**

```tsx
// Before
<Button onClick={async () => {
  if (window.confirm(`Delete ${selectedRows.length} items?`)) {
    for (const row of selectedRows) {
      await onDelete(row._id)
    }
    table.resetRowSelection()
  }
}}>
  Delete Selected
</Button>

// After
<Button onClick={() => bulkDeleteConfirmation.confirmBulkDelete(selectedRows)}>
  Delete Selected
</Button>
```

### 4. Add Dialog Components

Add these components to your JSX (typically at the end before the closing tag):

```tsx
return (
  <div>
    {/* Your table content */}

    {/* Delete confirmation dialogs */}
    <DeleteConfirmationDialog
      open={deleteConfirmation.isOpen}
      onOpenChange={deleteConfirmation.handleCancel}
      onConfirm={deleteConfirmation.handleConfirm}
      entityName="item"  // Use same entity name as in hook
      isDeleting={deleteConfirmation.isDeleting}
    />

    <DeleteConfirmationDialog
      open={bulkDeleteConfirmation.isOpen}
      onOpenChange={bulkDeleteConfirmation.handleCancel}
      onConfirm={bulkDeleteConfirmation.handleConfirm}
      variant="bulk"
      count={bulkDeleteConfirmation.itemsToDelete.length}
      isDeleting={bulkDeleteConfirmation.isDeleting}
    />
  </div>
)
```

## Best Practices

### Entity Names
- Use lowercase, singular form (e.g., "city", "person", "document")
- Should read naturally in the sentence: "Are you sure you want to delete this {entityName}?"
- Keep it concise and user-friendly

### Error Handling
- Always provide `onError` callback for production environments
- Log errors for debugging
- Show user-friendly error messages via toast notifications
- Don't expose technical error details to users

### Success Callbacks
- Use `onSuccess` to refresh data or update UI state
- Consider optimistic UI updates for better UX
- Reset selection state after bulk deletions

### Loading States
- Always show loading indicators during async operations
- Disable buttons and prevent dialog closure during deletion
- Provide clear feedback when operations complete

## Accessibility Features

- **Keyboard Navigation**:
  - Tab through buttons
  - Enter to confirm
  - Escape to cancel

- **Screen Readers**:
  - Proper ARIA labels on all interactive elements
  - Dialog role properly announced
  - Loading states announced

- **Focus Management**:
  - Focus trapped within dialog when open
  - Focus returns to trigger element on close
  - Logical tab order

- **Touch Targets**:
  - Minimum 44x44px on mobile
  - Adequate spacing between buttons
  - Responsive to all input methods

## Troubleshooting

### Dialog doesn't appear
- Verify `isOpen` state is properly connected
- Check that dialog component is rendered in JSX
- Ensure no z-index conflicts with other components

### Delete operation doesn't execute
- Verify `onConfirm` callback is connected to `handleConfirm`
- Check that `onDelete` function is properly async
- Look for errors in browser console

### Translation not working
- Verify translation keys exist in both en.json and pt.json
- Check that entity names match between hook and dialog
- Ensure `useTranslations("Common")` is properly called

### Bulk delete fails partially
- Check error aggregation in hook implementation
- Verify `onError` callback receives both error and failed count
- Ensure each item deletion is properly try-caught

## Implementation Status

✅ **Completed:**
- 18 table components updated
- All `window.confirm()` calls removed
- Full i18n support (English & Portuguese)
- Mobile responsive design
- Accessibility compliant
- Error handling implemented
- Toast notifications integrated

🎯 **Tables Implemented:**

**Support Data (8):** Cities, Countries, States, Process Types, Legal Frameworks, Document Types, CBO Codes, Consulates

**CRM (4):** Companies, People, Passports, People-Companies

**Process Management (2):** Main Processes, Individual Processes

**Other (4):** Documents, Tasks, Notifications, Activity Logs

## Version History

- **v1.0.0** (2025-10-20): Initial implementation across all 18 tables
