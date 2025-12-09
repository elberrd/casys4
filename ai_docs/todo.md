# TODO: Add Creation Date to Tasks Table and Rename Fields

## Context

The user wants to enhance the tasks table and task modal with the following changes:
1. Add a creation date column to the tasks table
2. Display the creation date in the task modal (edit mode) as read-only
3. Verify that the `createdAt` field already exists in the database schema
4. Rename the "t�tulo" field to "nome tarefa" (task name)
5. Rename the "descri��o" field to "notas" (notes)

## Related PRD Sections

Based on the schema analysis:
- The `tasks` table in `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts` already has a `createdAt: v.number()` field (line 452)
- The task form dialog is located at `/Users/elberrd/Documents/Development/clientes/casys4/components/tasks/task-form-dialog.tsx`
- The tasks table component is at `/Users/elberrd/Documents/Development/clientes/casys4/components/tasks/tasks-table.tsx`
- Translation keys are in `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and confirm file locations

#### Sub-tasks:

- [x] 0.1: Review database schema to verify `createdAt` field exists
  - Validation: Confirmed `createdAt: v.number()` exists in tasks table (schema.ts line 452)
  - Output: Field already exists - no database changes needed

- [x] 0.2: Identify files that need modifications
  - Validation: Confirmed exact file paths
  - Output:
    - `/Users/elberrd/Documents/Development/clientes/casys4/components/tasks/tasks-table.tsx` (table display)
    - `/Users/elberrd/Documents/Development/clientes/casys4/components/tasks/task-form-dialog.tsx` (modal form)
    - `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json` (translations)
    - `/Users/elberrd/Documents/Development/clientes/casys4/convex/tasks.ts` (query enrichment - already returns createdAt)

- [x] 0.3: Check existing translation patterns
  - Validation: Reviewed pt.json translation structure
  - Output: Follow existing patterns in "Tasks" namespace (lines 1037-1107)

#### Quality Checklist:

- [x] Schema verified - `createdAt` field exists
- [x] File locations confirmed
- [x] Translation patterns identified
- [x] No architectural changes needed

### 1. Update Translation Keys

**Objective**: Update i18n translation keys to rename fields and add new labels

#### Sub-tasks:

- [x] 1.1: Update Portuguese translations in `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Add new translation key: `"taskName": "Nome Tarefa"` in the "Tasks" section
  - Add new translation key: `"notes": "Notas"` in the "Tasks" section
  - Add new translation key: `"createdAt": "Data de Cria��o"` in the "Tasks" section
  - Add new translation key: `"createdAtReadOnly": "Data de cria��o (somente leitura)"` in the "Tasks" section
  - Validation: Keys added to "Tasks" namespace around line 1037
  - Dependencies: None

- [x] 1.2: Verify Common translations don't need updates
  - Check if "Common.title" and "Common.description" are still used elsewhere
  - Validation: Ensure no breaking changes to shared translations
  - Dependencies: Task 1.1

#### Quality Checklist:

- [x] New translation keys added for "taskName", "notes", and "createdAt"
- [x] i18n keys follow existing naming conventions
- [x] No duplicate keys created
- [x] Portuguese translations are grammatically correct

### 2. Add Creation Date Column to Tasks Table

**Objective**: Display creation date column in the tasks table component

#### Sub-tasks:

- [x] 2.1: Update Task interface in `/Users/elberrd/Documents/Development/clientes/casys4/components/tasks/tasks-table.tsx`
  - Ensure Task interface includes `createdAt: number` field (already present in type - line 41)
  - Validation: TypeScript type includes createdAt field
  - Dependencies: None

- [x] 2.2: Add creation date column definition to the columns array
  - Add new column after "assignedToUser" column and before "collectiveProcess" column
  - Use `format` from `date-fns` to display date in dd/MM/yyyy format
  - Column should be sortable using DataGridColumnHeader
  - Import required: `import { format } from "date-fns"`
  - Validation: Column displays formatted date, is sortable
  - Dependencies: Task 2.1
  - Code location: Around line 205 in tasks-table.tsx

- [x] 2.3: Format the createdAt timestamp correctly
  - Convert Unix timestamp (milliseconds) to Date object
  - Format as dd/MM/yyyy using date-fns
  - Handle null/undefined cases gracefully
  - Validation: Dates display correctly in Brazilian format
  - Dependencies: Task 2.2

#### Quality Checklist:

- [x] TypeScript types include createdAt field
- [x] Column displays creation date in dd/MM/yyyy format
- [x] Column is sortable
- [x] Null/undefined values handled gracefully
- [x] Mobile responsive (column may be hidden on small screens via column visibility)
- [x] No `any` types used

### 3. Update Task Form Dialog - Add Read-Only Creation Date

**Objective**: Display creation date in task edit modal as read-only field

#### Sub-tasks:

- [x] 3.1: Add creation date field to task form dialog in edit mode
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/tasks/task-form-dialog.tsx`
  - Add field only when `isEditing` is true (similar to status field pattern around line 341)
  - Use FormField with disabled/read-only Input component
  - Display formatted date (dd/MM/yyyy) using date-fns format
  - Position after status field, before "Assigned To" field
  - Validation: Field only shows in edit mode, displays correct date, is read-only
  - Dependencies: None
  - Code location: Around line 370 (after status field)

- [x] 3.2: Format the creation date display
  - Convert `existingTask.createdAt` (number timestamp) to formatted date string
  - Use date-fns format function: `format(new Date(existingTask.createdAt), "dd/MM/yyyy '�s' HH:mm")`
  - Include time for better precision
  - Validation: Date and time display correctly
  - Dependencies: Task 3.1

- [x] 3.3: Add FormDescription to explain the field
  - Add helpful description: "Esta data � automaticamente registrada quando a tarefa � criada"
  - Use t() function for translation if adding to translations file
  - Validation: Description is clear and helpful
  - Dependencies: Task 3.1

#### Quality Checklist:

- [x] Creation date only shows in edit mode (not create mode)
- [x] Field is read-only (disabled attribute or read-only Input)
- [x] Date formatted correctly with time (dd/MM/yyyy �s HH:mm)
- [x] Translation key used for field label
- [x] FormDescription provides clear context
- [x] Mobile responsive layout maintained

### 4. Update Task Form Dialog - Rename Fields

**Objective**: Rename "t�tulo" to "nome tarefa" and "descri��o" to "notas" in the task form

#### Sub-tasks:

- [x] 4.1: Update title field label to use new translation key
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/tasks/task-form-dialog.tsx`
  - Change `<FormLabel>{tCommon("title")}</FormLabel>` to `<FormLabel>{t("taskName")}</FormLabel>`
  - Update around line 230
  - Keep placeholder as is or update to `{t("titlePlaceholder")}` if it exists
  - Validation: Label displays "Nome Tarefa"
  - Dependencies: Task 1.1

- [x] 4.2: Update description field label to use new translation key
  - Change `<FormLabel>{tCommon("description")}</FormLabel>` to `<FormLabel>{t("notes")}</FormLabel>`
  - Update around line 249
  - Update placeholder to `{t("notesPlaceholder")}` or create new placeholder text
  - Validation: Label displays "Notas"
  - Dependencies: Task 1.1

- [x] 4.3: Update form schema field names in documentation/comments
  - The actual field names in the schema remain `title` and `description` (database fields)
  - Only labels change, not field names
  - Validation: Database fields unchanged, only UI labels updated
  - Dependencies: Tasks 4.1, 4.2

#### Quality Checklist:

- [x] Title field label shows "Nome Tarefa" instead of "T�tulo"
- [x] Description field label shows "Notas" instead of "Descri��o"
- [x] All translation keys reference the Tasks namespace
- [x] No breaking changes to API or database fields
- [x] Field validation still works correctly

### 5. Update Tasks Table Column Headers

**Objective**: Update column headers in tasks table to use new field names

#### Sub-tasks:

- [x] 5.1: Update title column header in tasks table
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/tasks/tasks-table.tsx`
  - Change column header from `t('title')` to `t('taskName')`
  - Update around line 155
  - Validation: Column header displays "Nome Tarefa"
  - Dependencies: Task 1.1

- [x] 5.2: Verify no other references to old field names in table
  - Search for any hardcoded "T�tulo" or "Descri��o" references
  - Ensure consistent naming throughout the component
  - Validation: All labels use new translation keys
  - Dependencies: Task 5.1

#### Quality Checklist:

- [x] Table column header shows "Nome Tarefa"
- [x] All references use translation keys (no hardcoded strings)
- [x] Sorting still works correctly
- [x] Mobile responsive layout maintained

### 6. Testing and Validation

**Objective**: Verify all changes work correctly across different scenarios

#### Sub-tasks:

- [x] 6.1: Test tasks table display
  - Verify creation date column appears in table
  - Verify dates are formatted correctly (dd/MM/yyyy)
  - Verify column is sortable by creation date
  - Test with tasks that have different creation dates
  - Validation: All dates display and sort correctly

- [x] 6.2: Test task form in create mode
  - Verify "Nome Tarefa" and "Notas" labels appear
  - Verify creation date field does NOT appear in create mode
  - Test form submission works correctly
  - Validation: Create functionality unchanged

- [x] 6.3: Test task form in edit mode
  - Verify "Nome Tarefa" and "Notas" labels appear
  - Verify creation date field appears and is read-only
  - Verify creation date displays correct date/time
  - Test that creation date cannot be modified
  - Validation: Edit mode shows all expected fields correctly

- [x] 6.4: Test mobile responsiveness
  - Test table on mobile viewport (sm breakpoint)
  - Test form dialog on mobile
  - Verify creation date column can be hidden via column visibility toggle
  - Validation: All features work on mobile devices

- [x] 6.5: Test internationalization
  - Verify all new labels use i18n keys
  - Test that changing language would work (if multi-language support exists)
  - Validation: No hardcoded Portuguese strings remain

#### Quality Checklist:

- [x] Creation date column works in tasks table
- [x] Field renaming works in form dialog
- [x] Read-only creation date appears in edit mode only
- [x] All functionality tested on desktop and mobile
- [x] No console errors or TypeScript errors
- [x] No regression in existing functionality

## Implementation Notes

### Important Considerations:

1. **Database Field Names**: The actual database field names (`title`, `description`, `createdAt`) remain unchanged. Only the UI labels are being updated.

2. **Date Formatting**: The `createdAt` field is stored as a Unix timestamp (number of milliseconds). Use `date-fns` format function to convert:
   ```typescript
   import { format } from "date-fns"
   format(new Date(task.createdAt), "dd/MM/yyyy")
   ```

3. **Read-Only Field**: Use the `disabled` prop on the Input component to make the creation date field read-only in edit mode.

4. **Column Visibility**: The new creation date column should be toggleable via the DataGridColumnVisibility component (already implemented in the table).

5. **Translation Namespace**: All new translation keys should be added to the "Tasks" namespace in pt.json, not "Common", to maintain proper organization.

6. **Backward Compatibility**: Since we're only changing labels (not field names), there's no need to update any API calls or database queries.

## Definition of Done

- [x] All tasks completed
- [x] All quality checklists passed
- [x] Creation date column appears in tasks table with proper formatting
- [x] Creation date appears as read-only in task edit modal
- [x] "T�tulo" renamed to "Nome Tarefa" throughout
- [x] "Descri��o" renamed to "Notas" throughout
- [x] All translations use i18n keys
- [x] Mobile responsive layout maintained
- [x] No TypeScript errors
- [x] No console errors
- [x] Manual testing completed on desktop and mobile
- [x] No regression in existing task functionality
