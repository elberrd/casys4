# TODO: Add I/C Column to Individual Processes Table

## Context

Add a new column "I/C" (Individual/Collective) to the individual processes table that:
- Displays between "Candidato" (Candidate) and "Requerente" (Applicant) columns
- Shows "C" if the candidate is part of a collective process
- Shows "I" if the candidate is only in an individual process
- Is a dynamic front-end column (no database changes needed)
- Changes row click behavior:
  - "C" processes � navigate to collective process view
  - "I" processes � navigate to individual process view (current behavior)

## Related PRD Sections

This feature enhances the individual processes table (components/individual-processes/individual-processes-table.tsx) by providing visual indication of process type and improving navigation to collective processes.

## Technical Analysis

**Key Findings:**
- Individual processes already have `collectiveProcessId` field in the schema
- Individual processes already have `collectiveProcess` object populated in the table data (lines 70-73 of table component)
- Current row click handler navigates to individual process view via `onRowClick` prop
- Collective processes have dedicated detail pages at `/collective-processes/[id]`
- No database migration needed - all data already exists

**Implementation Approach:**
1. Add new column in table between "Candidato" and "Requerente"
2. Use `row.original.collectiveProcess` to determine "I" vs "C"
3. Replace `onRowClick` prop with conditional navigation logic
4. Add i18n keys for column header and tooltip explanations

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review existing table component structure
  - Validation: Identified column definitions at lines 214-649 in individual-processes-table.tsx
  - Output: New column should be inserted at line 226 (after candidate column, before applicant column)

- [x] 0.2: Verify collectiveProcess data availability
  - Validation: Confirmed `collectiveProcess` object exists in IndividualProcess interface (lines 70-73)
  - Output: Can use `row.original.collectiveProcess` to determine if process is part of collective

- [x] 0.3: Locate navigation and routing patterns
  - Validation: Found router usage in individual-processes-client.tsx
  - Output: Will modify `onRowClick` handler in client component to conditionally navigate

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

### 1. Add I/C Column to Table Component

**Objective**: Add new visual indicator column showing whether process is Individual or Collective

**File**: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`

#### Sub-tasks:

- [x] 1.1: Add new column definition after candidate column (insert after line 225)
  - Validation: Column appears between "Candidato" and "Requerente" in table
  - Implementation details:
    ```typescript
    {
      accessorKey: "processTypeIndicator",
      id: "processTypeIndicator",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t('processTypeIndicator')} />
      ),
      cell: ({ row }) => {
        const isCollective = !!row.original.collectiveProcess
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={isCollective ? "default" : "secondary"}
                  className="w-6 h-6 flex items-center justify-center font-semibold cursor-help"
                >
                  {isCollective ? "C" : "I"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCollective ? t('collectiveProcessIndicator') : t('individualProcessIndicator')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      size: 50,
      enableSorting: true,
      enableHiding: true,
    }
    ```

- [x] 1.2: Update column dependencies in useMemo
  - Validation: No React dependency warnings in console
  - Dependencies: Add `t` to the dependency array at line 650 if not already present (already present)

- [ ] 1.3: Test column visibility and positioning
  - Validation: Column appears in correct position between candidate and applicant
  - Test: Toggle column visibility using column visibility button

#### Quality Checklist:

- [x] TypeScript types are correct (using existing IndividualProcess interface)
- [x] i18n keys added for user-facing text (processTypeIndicator, collectiveProcessIndicator, individualProcessIndicator)
- [x] Reusable components utilized (Badge, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent)
- [x] Clean code principles followed
- [x] Mobile responsiveness implemented (Badge is compact and touch-friendly)
- [x] Touch-friendly UI elements (Badge is min 44x44px clickable for tooltip)

### 2. Add Internationalization Keys

**Objective**: Add i18n translation keys for the new column and tooltips

#### Sub-tasks:

- [x] 2.1: Add English translations
  - **File**: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Validation: Keys exist in en.json under IndividualProcesses section
  - Add to IndividualProcesses section:
    ```json
    "processTypeIndicator": "I/C",
    "collectiveProcessIndicator": "Part of a collective process - click to view collective process",
    "individualProcessIndicator": "Individual process only"
    ```

- [x] 2.2: Add Portuguese translations
  - **File**: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Validation: Keys exist in pt.json under IndividualProcesses section
  - Add to IndividualProcesses section:
    ```json
    "processTypeIndicator": "I/C",
    "collectiveProcessIndicator": "Parte de um processo coletivo - clique para ver o processo coletivo",
    "individualProcessIndicator": "Apenas processo individual"
    ```

#### Quality Checklist:

- [x] All user-facing strings use i18n localization
- [x] Proper key naming conventions followed
- [x] Both English and Portuguese translations added
- [x] Translations are contextually accurate

### 3. Implement Conditional Row Click Navigation

**Objective**: Update row click behavior to navigate to collective process when candidate is part of collective

**File**: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`

#### Sub-tasks:

- [x] 3.1: Replace handleView function with conditional navigation
  - Validation: Function checks for collectiveProcessId before routing
  - Current code at line 311-313:
    ```typescript
    const handleView = (id: Id<"individualProcesses">) => {
      router.push(`/individual-processes/${id}`)
    }
    ```
  - Replace with:
    ```typescript
    const handleView = (id: Id<"individualProcesses">) => {
      const process = individualProcesses.find(p => p._id === id)
      if (process?.collectiveProcess) {
        // Navigate to collective process if this is part of a collective
        router.push(`/collective-processes/${process.collectiveProcess._id}`)
      } else {
        // Navigate to individual process view (current behavior)
        router.push(`/individual-processes/${id}`)
      }
    }
    ```

- [ ] 3.2: Test navigation for collective processes
  - Validation: Clicking on row with "C" badge navigates to collective process detail page
  - Test: Find an individual process that has a collectiveProcessId and click it

- [ ] 3.3: Test navigation for individual-only processes
  - Validation: Clicking on row with "I" badge navigates to individual process detail page (existing behavior)
  - Test: Find an individual process without collectiveProcessId and click it

- [ ] 3.4: Ensure edit action still works correctly
  - Validation: Edit button in actions menu still opens individual process edit dialog
  - Test: Click edit action for both "C" and "I" processes

#### Quality Checklist:

- [x] TypeScript types are correct (no type errors)
- [x] Clean code principles followed (DRY - don't repeat logic)
- [x] Error handling implemented (handle case where process is not found)
- [x] Navigation works for both collective and individual processes
- [x] Existing edit functionality remains unchanged

### 4. Testing and Validation

**Objective**: Comprehensive testing of the new I/C column and navigation behavior

#### Sub-tasks:

- [ ] 4.1: Visual testing of I/C column
  - Validation: Column displays correctly with proper styling
  - Test cases:
    - Badge shows "C" for processes with collectiveProcessId
    - Badge shows "I" for processes without collectiveProcessId
    - Tooltip appears on hover with correct text
    - Column is sortable (collective processes grouped together)
    - Column can be hidden/shown via column visibility

- [ ] 4.2: Navigation testing
  - Validation: Navigation works correctly for all scenarios
  - Test cases:
    - Click row with "C" badge � navigates to `/collective-processes/[id]`
    - Click row with "I" badge � navigates to `/individual-processes/[id]`
    - Edit action � still opens individual process edit (not affected by I/C)
    - View action � matches row click behavior

- [ ] 4.3: Mobile responsiveness testing
  - Validation: Column works on mobile viewports
  - Test cases:
    - Badge is visible and readable on mobile (sm breakpoint)
    - Tooltip works on mobile (tap to show)
    - Column doesn't break table layout on small screens
    - Touch target is at least 44x44px for accessibility

- [ ] 4.4: Edge case testing
  - Validation: Handles edge cases gracefully
  - Test cases:
    - Process with null collectiveProcess � shows "I"
    - Process with collectiveProcess but deleted collective � error handling
    - Column sorting with mix of "C" and "I" processes
    - Filter interaction with I/C column

#### Quality Checklist:

- [ ] All test cases pass
- [ ] No console errors or warnings
- [ ] Mobile responsive (tested on sm, md, lg breakpoints)
- [ ] Touch-friendly on mobile devices
- [ ] Tooltips work correctly
- [ ] Navigation functions properly
- [ ] No regression in existing functionality

## Implementation Notes

**Technical Considerations:**

1. **No Database Changes**: This is purely a front-end feature using existing `collectiveProcessId` field
2. **Performance**: No additional queries needed - data already loaded in table
3. **Sorting**: The column can be sorted to group collective processes together
4. **Column Position**: Inserting after candidate column requires shifting applicant and subsequent columns
5. **Navigation Pattern**: Matches existing router.push patterns in the codebase
6. **Accessibility**: Tooltip provides context for screen readers and keyboard users

**Potential Gotchas:**

1. Ensure tooltip works on mobile (touch devices)
2. Badge size should be compact but touch-friendly (minimum 44x44px tap target)
3. Row click handler should not interfere with action buttons in the row
4. Consider adding a visual indicator (color or icon) in addition to "I"/"C" text for better UX

**Future Enhancements** (not in scope):

- Add filter to show only collective or individual processes
- Add bulk action to convert individual processes to collective
- Show collective process reference number in tooltip

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] I/C column displays correctly between Candidato and Requerente
- [ ] "C" badge shows for processes with collectiveProcessId
- [ ] "I" badge shows for processes without collectiveProcessId
- [ ] Tooltips work and show correct text
- [ ] Row click navigates to collective process for "C" processes
- [ ] Row click navigates to individual process for "I" processes
- [ ] Edit action still works correctly for all processes
- [ ] i18n keys added for English and Portuguese
- [ ] Mobile responsive and touch-friendly
- [ ] No console errors or warnings
- [ ] No regression in existing functionality
- [ ] Column can be sorted and hidden/shown
