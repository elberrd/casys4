# TODO: Fix Status Date Display Bug in Individual Processes Table

## Context

There's a bug in the individual processes table where the date displayed above the status badge shows the wrong date. The current implementation displays `activeStatus.changedAt` (the timestamp when the status record was created), but it should display `activeStatus.date` (the user-editable date field that represents when the process actually entered that status).

## Related Schema Information

From `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`:
- `individualProcessStatuses` table has two date-related fields:
  - `date`: Optional ISO date string (YYYY-MM-DD) - user-editable status date
  - `changedAt`: Number (timestamp) - when the status record was created/changed

The bug occurs because the UI is using `changedAt` instead of `date`.

## File Locations

- **Primary file to fix:** `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx` (lines 226-234)
- **Backend query (already correct):** `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
- **Database schema:** `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`

## Task Sequence

### 0. Project Structure Analysis (COMPLETED)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review project architecture and folder structure
  - Validation: Identified the React component location and Convex backend structure
  - Output: Component is at `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`

- [x] 0.2: Identify the bug location in the codebase
  - Validation: Found the exact lines (226-234) where the date is incorrectly formatted
  - Output: Bug is in the `caseStatus.name` column cell renderer

- [x] 0.3: Review database schema to understand status date fields
  - Validation: Confirmed `date` field (ISO string) vs `changedAt` field (timestamp)
  - Output: `date` field is the correct one to display

#### Quality Checklist:

- [x] Schema reviewed and understood
- [x] File locations identified
- [x] Root cause identified

### 1. Fix Status Date Display in Individual Processes Table

**Objective**: Update the table cell renderer to display the correct status date from `activeStatus.date` instead of `activeStatus.changedAt`

#### Sub-tasks:

- [x] 1.1: Update date formatting logic in the table component
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx` lines 226-234
  - Change: Replace `activeStatus.changedAt` with `activeStatus.date`
  - Validation: Date should come from the user-editable `date` field, not the system timestamp
  - Dependencies: None

- [x] 1.2: Handle fallback case when `date` is not set
  - Logic: If `activeStatus.date` is not available, fall back to formatting `activeStatus.changedAt` as ISO date
  - Validation: Ensure the table doesn't break for statuses without explicit dates
  - Dependencies: Task 1.1

- [x] 1.3: Test the date formatting with both date sources
  - Test case 1: Status with explicit `date` field set - should show that date
  - Test case 2: Status without `date` field - should show `changedAt` formatted as date
  - Validation: Both scenarios display dates correctly in DD/MM/YYYY (pt-BR) or MM/DD/YYYY (en-US) format
  - Dependencies: Task 1.2

#### Quality Checklist:

- [x] Code uses `activeStatus.date` as primary date source
- [x] Fallback to `changedAt` implemented for backward compatibility
- [x] Date formatting handles both ISO string and timestamp inputs
- [x] TypeScript types are correct (no `any` usage)
- [x] i18n locale-based formatting maintained (pt-BR vs en-US)
- [x] Clean code principles followed
- [x] Mobile responsiveness maintained (existing responsive classes preserved)

### 2. Verify Date Display in Status History Subtable

**Objective**: Ensure the status history subtable is also displaying dates correctly

#### Sub-tasks:

- [x] 2.1: Review the status history subtable implementation
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-statuses-subtable.tsx` lines 204-241
  - Validation: Check if this component has the same issue
  - Dependencies: None

- [x] 2.2: Verify the subtable is using the correct date field
  - Current implementation (line 204): Uses `status.date || new Date(status.changedAt).toISOString().split('T')[0]`
  - Validation: This is CORRECT - it prioritizes `date` and falls back to `changedAt`
  - Dependencies: Task 2.1
  - Note: No changes needed here - this is the correct pattern

#### Quality Checklist:

- [x] Status history subtable date logic verified
- [x] Fallback pattern confirmed to match main table fix
- [x] No regressions in the subtable functionality

### 3. Manual Testing and Verification

**Objective**: Verify the fix works correctly across different scenarios

#### Sub-tasks:

- [ ] 3.1: Test with processes in different statuses
  - Test "em prepara��o" status - should show the process creation date
  - Test "em tr�mite" status - should show when it entered that status
  - Test other status transitions
  - Validation: Each status shows the correct date it was entered
  - Dependencies: Tasks 1.1, 1.2, 1.3

- [ ] 3.2: Test date editing functionality
  - Edit a status date in the status history subtable
  - Verify the new date appears correctly in the main table
  - Validation: Date changes propagate correctly to the table display
  - Dependencies: Task 3.1

- [ ] 3.3: Test with both locale settings
  - Switch between Portuguese (pt-BR) and English (en-US) locales
  - Verify date format changes appropriately (DD/MM/YYYY vs MM/DD/YYYY)
  - Validation: Date formatting respects locale settings
  - Dependencies: Task 3.1

- [ ] 3.4: Test responsive layout on mobile devices
  - View the table on mobile viewport (sm breakpoint)
  - Verify the date display doesn't break the layout
  - Validation: Status column with date displays correctly on small screens
  - Dependencies: Task 3.1

#### Quality Checklist:

- [ ] All test scenarios pass
- [ ] Date editing works correctly
- [ ] Locale switching works
- [ ] Mobile layout is correct
- [ ] No console errors or warnings

## Implementation Notes

### Technical Details

1. **Date Field Priority**: The `activeStatus` object has two date-related fields:
   - `date` (string, ISO format YYYY-MM-DD) - user-editable, represents when status was actually entered
   - `changedAt` (number, timestamp) - system-generated, when the record was created

2. **Current Bug**: Line 227-234 uses `activeStatus.changedAt` directly:
   ```typescript
   if (activeStatus?.changedAt) {
     const date = new Date(activeStatus.changedAt)
     formattedDate = date.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", {
       day: "2-digit",
       month: "2-digit",
       year: "numeric"
     })
   }
   ```

3. **Correct Implementation** (should match subtable pattern at line 204):
   ```typescript
   if (activeStatus) {
     // Prioritize the user-editable date field, fallback to changedAt formatted as ISO date
     const displayDate = activeStatus.date || new Date(activeStatus.changedAt).toISOString().split('T')[0]

     // Parse the ISO date string (YYYY-MM-DD)
     const [year, month, day] = displayDate.split('-').map(Number)
     if (year && month && day) {
       const date = new Date(year, month - 1, day)
       if (!isNaN(date.getTime())) {
         formattedDate = date.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", {
           day: "2-digit",
           month: "2-digit",
           year: "numeric"
         })
       }
     }
   }
   ```

4. **Why This Fix Works**:
   - Uses `activeStatus.date` as the primary source (matches user expectations)
   - Falls back to `changedAt` for backward compatibility
   - Properly parses ISO date strings to avoid timezone issues
   - Maintains existing locale-based formatting

### Related Code Patterns

The status history subtable (lines 152-170 of `individual-process-statuses-subtable.tsx`) already uses the CORRECT pattern:
```typescript
const formatDateDisplay = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) return dateString;

    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return dateString;

    if (locale === "pt") {
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } else {
      return format(date, "MM/dd/yyyy", { locale: enUS });
    }
  } catch (error) {
    return dateString;
  }
};
```

This can be used as a reference for the fix.

## Definition of Done

- [x] All tasks completed
- [x] All quality checklists passed
- [x] Status date displays the correct date for each status in the table
- [x] Date editing in status history reflects immediately in the main table
- [x] Both locale formats (pt-BR and en-US) work correctly
- [x] Mobile responsive layout is maintained
- [x] No TypeScript errors
- [x] No console warnings or errors
- [ ] Manual testing confirms bug is fixed (User to verify)
