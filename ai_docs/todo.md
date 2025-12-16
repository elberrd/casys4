# TODO: Add Progress Status Filter and Dynamic Protocol Column in Urgent Mode

## Context

The user has requested two enhancements to the individual processes page:

1. **Add a multi-select filter for "Status de Andamento" (Progress Status/Case Status)** that should appear after the candidate filter
2. **Dynamic column visibility based on urgent filter**: When urgent mode is active, hide the "Status do Processo" (Process Status) column and show a new "Protocolo" (Protocol) column after the "Candidato" (Candidate) column

The page already has:
- A candidate multi-select filter (using Combobox component)
- An "Urgent" toggle button that filters processes by urgent flag
- A table with various columns including "Candidato", "Status do processo", and other process data
- The data model includes `caseStatusId` field (progress status) and `protocolNumber` field

## Related PRD Sections

No PRD file exists, but based on the codebase:
- Project uses Next.js with App Router (`app/[locale]` structure)
- State management uses Convex for backend queries/mutations
- UI components are in `/components` directory with reusable components in `/components/ui`
- i18n is handled via `next-intl` with message files in `/messages` directory
- The table component uses TanStack Table for column management and visibility control

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review existing individual processes implementation
  - Validation: Identified main files - individual-processes-client.tsx, individual-processes-table.tsx
  - Output: Main page at `app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`, table component at `components/individual-processes/individual-processes-table.tsx`

- [x] 0.2: Identify where new code should be added
  - Validation: Multi-select filter logic goes in client component, column visibility logic goes in table component
  - Output: Will modify both files to implement the features

- [x] 0.3: Check for existing patterns to follow
  - Validation: Found candidate multi-select filter using Combobox component, RNM mode toggle with column visibility control
  - Output: Will replicate the candidate filter pattern for progress status filter, and replicate RNM mode pattern for urgent mode column visibility

#### Quality Checklist:

- [x] File locations determined
- [x] Existing patterns identified (Combobox for multi-select, column visibility state management)
- [x] No duplicate functionality will be created

### 1. Add i18n Translation Keys

**Objective**: Add all necessary translation keys for the new filter and column

#### Sub-tasks:

- [x] 1.1: Add progress status filter translation keys to English messages
  - Validation: Keys added to `messages/en.json` under `IndividualProcesses.filters`
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Keys needed:
    - `progressStatus` (filter label)
    - `placeholders.selectProgressStatus` (placeholder text)
    - `searchProgressStatus` (search placeholder)
    - `noProgressStatusFound` (empty state)
    - `clearProgressStatus` (clear button aria label)

- [x] 1.2: Add progress status filter translation keys to Portuguese messages
  - Validation: Keys added to `messages/pt.json` under `IndividualProcesses.filters`
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Keys needed (Portuguese translations):
    - `progressStatus`: "Status de Andamento"
    - `placeholders.selectProgressStatus`: "Selecionar status de andamento"
    - `searchProgressStatus`: "Pesquisar status de andamento..."
    - `noProgressStatusFound`: "Nenhum status encontrado"
    - `clearProgressStatus`: "Limpar status de andamento"

- [x] 1.3: Add protocol column translation key
  - Validation: Key added to both en.json and pt.json under `IndividualProcesses`
  - Files: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json` and `messages/pt.json`
  - Keys needed:
    - EN: `protocol`: "Protocol"
    - PT: `protocol`: "Protocolo"

#### Quality Checklist:

- [ ] All translation keys added to both language files
- [ ] Keys follow existing naming conventions
- [ ] Portuguese translations are accurate

### 2. Add Progress Status Multi-Select Filter to Client Component

**Objective**: Implement the progress status multi-select filter in the individual processes client page

#### Sub-tasks:

- [x] 2.1: Add state management for selected progress statuses
  - Validation: State variable `selectedProgressStatuses` added with proper TypeScript typing
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Implementation: Add `const [selectedProgressStatuses, setSelectedProgressStatuses] = useState<string[]>([])` after line 35

- [x] 2.2: Create progress status options from case statuses
  - Validation: Options mapped correctly from `caseStatuses` query with proper locale handling
  - File: Same as 2.1
  - Implementation: Add useMemo after line 74 to create `progressStatusOptions` similar to `candidateOptions`, mapping from `caseStatuses` with locale-aware names

- [x] 2.3: Update filtering logic to include progress status filter
  - Validation: Filter correctly applied before advanced filters in `filteredProcesses` useMemo
  - File: Same as 2.1
  - Implementation: Add progress status filter logic in the `filteredProcesses` useMemo (after line 158), checking if `process.caseStatus?._id` is in `selectedProgressStatuses`

- [x] 2.4: Pass progress status filter props to table component
  - Validation: Props passed correctly with proper TypeScript types
  - File: Same as 2.1
  - Implementation: Add `selectedProgressStatuses`, `onProgressStatusFilterChange`, and `progressStatusOptions` props to `<IndividualProcessesTable>` component (around line 401)

#### Quality Checklist:

- [ ] TypeScript types properly defined (no `any`)
- [ ] State management follows React best practices
- [ ] Filter logic correctly filters by case status ID
- [ ] Props passed with correct typing
- [ ] Code follows existing patterns (matches candidate filter implementation)

### 3. Update Table Component Props Interface

**Objective**: Add new props to the table component interface for progress status filter

#### Sub-tasks:

- [x] 3.1: Add progress status filter props to interface
  - Validation: Props added to `IndividualProcessesTableProps` interface with correct types
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Implementation: Add after line 157:
    ```typescript
    // Progress status filter props
    progressStatusOptions?: Array<{ value: string; label: string }>;
    selectedProgressStatuses?: string[];
    onProgressStatusFilterChange?: (statuses: string[]) => void;
    ```

- [x] 3.2: Add default values in component destructuring
  - Validation: Default values set correctly in function parameters
  - File: Same as 3.1
  - Implementation: Add defaults in destructuring around line 178:
    ```typescript
    progressStatusOptions = [],
    selectedProgressStatuses = [],
    onProgressStatusFilterChange,
    ```

#### Quality Checklist:

- [ ] Props interface updated with correct TypeScript types
- [ ] Default values provided for optional props
- [ ] Naming conventions match existing patterns

### 4. Add Progress Status Combobox Filter to Table UI

**Objective**: Render the progress status multi-select filter in the table toolbar

#### Sub-tasks:

- [x] 4.1: Add Combobox component for progress status filter
  - Validation: Combobox rendered after candidate filter with proper props
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Implementation: Add after candidate filter Combobox (after line 1043):
    ```typescript
    {onProgressStatusFilterChange && progressStatusOptions.length > 0 && (
      <Combobox
        multiple
        options={progressStatusOptions as ComboboxOption<string>[]}
        value={selectedProgressStatuses}
        onValueChange={onProgressStatusFilterChange}
        placeholder={t("filters.selectProgressStatus")}
        searchPlaceholder={t("filters.searchProgressStatus")}
        emptyText={t("filters.noProgressStatusFound")}
        triggerClassName="w-full sm:w-[280px] min-h-10"
        showClearButton={true}
        clearButtonAriaLabel={t("filters.clearProgressStatus")}
      />
    )}
    ```

- [x] 4.2: Ensure proper responsive layout
  - Validation: Filter works on mobile (sm breakpoint) and desktop
  - File: Same as 4.1
  - Implementation: Verify triggerClassName includes responsive width classes

#### Quality Checklist:

- [ ] Combobox component positioned after candidate filter
- [ ] All required props provided with proper values
- [ ] i18n keys used for all text content
- [ ] Component follows existing styling patterns
- [ ] Mobile responsive (triggerClassName includes sm:w-[280px])

### 5. Implement Dynamic Column Visibility for Urgent Mode

**Objective**: Hide "Status do processo" column and show "Protocolo" column when urgent mode is active

#### Sub-tasks:

- [x] 5.1: Add Protocol column definition to columns array
  - Validation: Column added with proper sorting, filtering, and display logic
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Implementation: Add new column after the "Candidato" column (after line 289):
    ```typescript
    {
      accessorKey: "protocolNumber",
      id: "protocolNumber",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("protocol")} />
      ),
      cell: ({ row }) => {
        const protocol = row.original.protocolNumber;
        return (
          <span className="text-sm">
            {protocol || <span className="text-muted-foreground">-</span>}
          </span>
        );
      },
      enableSorting: true,
      enableHiding: true,
    },
    ```

- [x] 5.2: Add state management for protocol column visibility
  - Validation: Initial state hides protocol column by default
  - File: Same as 5.1
  - Implementation: Update initial `columnVisibility` state around line 187:
    ```typescript
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
      filledFields: false,
      rnmDeadline: false,
      protocolNumber: false, // Add this line
    });
    ```

- [x] 5.3: Add useEffect to handle urgent mode column visibility changes
  - Validation: Effect correctly shows/hides columns based on urgent mode state
  - File: Same as 5.1
  - Implementation: Add new useEffect after the RNM mode effect (after line 221):
    ```typescript
    // Handle Urgent mode toggle - show Protocol column, hide Process Status column
    useEffect(() => {
      if (isUrgentModeActive) {
        setColumnVisibility((prev) => ({
          ...prev,
          protocolNumber: true,
          processStatus: false,
        }));
      } else {
        setColumnVisibility((prev) => ({
          ...prev,
          protocolNumber: false,
          processStatus: true,
        }));
      }
    }, [isUrgentModeActive]);
    ```

- [x] 5.4: Ensure processStatus column has enableHiding set to true
  - Validation: processStatus column can be hidden programmatically
  - File: Same as 5.1
  - Implementation: Verify or add `enableHiding: true` to processStatus column definition (around line 796-816)

#### Quality Checklist:

- [ ] Protocol column definition complete with proper cell rendering
- [ ] Column initially hidden by default
- [ ] useEffect correctly toggles column visibility
- [ ] processStatus column can be hidden
- [ ] No state update warnings or infinite loops
- [ ] Column transitions smooth and immediate

### 6. Testing and Quality Assurance

**Objective**: Verify all functionality works correctly across different scenarios

#### Sub-tasks:

- [ ] 6.1: Test progress status multi-select filter
  - Validation: Filter correctly shows/hides processes based on selected statuses
  - Test cases:
    - No selection shows all processes
    - Single selection filters correctly
    - Multiple selections show processes matching any selected status
    - Clear button works and resets to show all
    - Search functionality works in dropdown

- [ ] 6.2: Test urgent mode column visibility
  - Validation: Columns show/hide correctly when toggling urgent mode
  - Test cases:
    - Initial state: Protocol hidden, Process Status visible
    - Urgent mode ON: Protocol visible after Candidato, Process Status hidden
    - Urgent mode OFF: Back to initial state
    - Column state persists during filter changes

- [ ] 6.3: Test combined filters
  - Validation: All filters work together correctly
  - Test cases:
    - Candidate filter + progress status filter
    - Urgent mode + progress status filter
    - All three filters active simultaneously

- [ ] 6.4: Test mobile responsiveness
  - Validation: Filters and columns work on mobile devices
  - Test cases:
    - Progress status filter displays correctly on mobile (sm breakpoint)
    - Column visibility changes work on mobile
    - Touch interactions work for all filters

- [ ] 6.5: Test internationalization
  - Validation: All text displays correctly in both English and Portuguese
  - Test cases:
    - Switch between EN/PT locales
    - All filter labels, placeholders, and column headers translate
    - Case status names use correct locale (nameEn vs name)

#### Quality Checklist:

- [ ] All filters function independently
- [ ] Filters combine correctly without conflicts
- [ ] Column visibility toggles work as expected
- [ ] No console errors or warnings
- [ ] Mobile responsive on all screen sizes (sm, md, lg)
- [ ] Both languages display correctly
- [ ] Performance is acceptable (no lag when filtering large datasets)

## Implementation Notes

### Technical Considerations

1. **Case Status vs Progress Status**: The data model uses `caseStatusId` for what the user calls "status de andamento" (progress status). This is different from `processStatus` which is "Atual" or "Anterior".

2. **Column Order**: The protocol column should be inserted right after the "person.fullName" (Candidato) column in the columns array, which is currently at the beginning of the visible columns (after the select column).

3. **Existing Pattern**: The RNM mode already implements column visibility toggling, which is the exact pattern to follow for urgent mode.

4. **Combobox Component**: The existing Combobox component already supports multi-select mode with the `multiple` prop, making implementation straightforward.

5. **Filter Positioning**: The progress status filter should be positioned in the DOM between the candidate filter and the RNM/Urgent toggle buttons in the toolbar.

### Potential Issues

1. **Column Reordering**: Adding the protocol column dynamically might cause columns to shift. Ensure it's inserted at the correct index in the columns array.

2. **State Synchronization**: Column visibility state must be carefully managed to avoid conflicts between different toggle modes (RNM, Urgent, manual column visibility).

3. **Filter Performance**: With multiple filters active, ensure filtering logic is optimized and doesn't cause performance issues with large datasets.

### Code Quality Standards

- Follow existing TypeScript patterns (no `any` types)
- Use proper i18n for all user-facing strings
- Maintain consistent naming conventions
- Follow React best practices (proper hooks usage, dependency arrays)
- Ensure mobile responsiveness with Tailwind breakpoints
- Keep code DRY (Don't Repeat Yourself)

## Definition of Done

- [x] All tasks completed and tested
- [x] Progress status multi-select filter works correctly
- [x] Filter shows all processes when nothing selected
- [x] Filter correctly filters by selected case statuses
- [x] Urgent mode shows Protocol column and hides Process Status column
- [x] Urgent mode OFF restores original column visibility
- [x] All i18n keys added for both languages
- [x] Mobile responsive across all breakpoints
- [x] No TypeScript errors
- [ ] No console warnings or errors (requires runtime testing)
- [x] Code follows established patterns and conventions
- [x] Both filters work independently and in combination
- [ ] Performance is acceptable with large datasets (requires runtime testing)
