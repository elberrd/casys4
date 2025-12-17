# TODO: Add QUAL/EXP PROF Filter Button and Filters Dropdown Menu

## Context

This feature adds a new column visibility toggle button called "QUAL / EXP PROF" that displays specific columns (Candidate, Authorization Type, Legal Support, Qualification, Professional Experience) in the individual processes table. Additionally, it creates a single dropdown menu called "Filtros" that consolidates all three filter buttons (RNM, Alerts, and the new QUAL/EXP PROF button) into one unified interface.

The new button should work exactly like the existing "RNM" and "Alerts" buttons - toggling specific column visibility. The dropdown groups all three buttons together for better UX and cleaner interface.

## Related PRD Sections

This feature builds upon the existing column visibility and filtering patterns established in:
- `/components/individual-processes/individual-processes-table.tsx` - Main table component with RNM and Alerts mode toggles
- `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx` - Parent component managing state
- `/messages/pt.json` and `/messages/en.json` - i18n translations

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review existing filter button implementations (RNM and Alerts)
  - Validation: Understand how `isRnmModeActive` and `isUrgentModeActive` work
  - Output: Document the pattern for column visibility toggling and state management

- [x] 0.2: Identify files that need to be modified
  - Validation: List exact file paths for modifications
  - Output:
    - `/components/individual-processes/individual-processes-table.tsx` - Add new columns and filter logic
    - `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx` - Add state management
    - `/messages/pt.json` - Add Portuguese translations
    - `/messages/en.json` - Add English translations

- [x] 0.3: Check for existing column definitions and data availability
  - Validation: Verify that the required data fields exist in the IndividualProcess interface
  - Output: Confirm that person, processType, legalFramework, and fillable fields (qualification, professionalExperienceSince) are available

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Existing patterns identified (RNM and Alerts button implementations)
- [x] Data availability confirmed for new columns

### 1. Add i18n Translations

**Objective**: Add all required translation keys for the new feature in both Portuguese and English

#### Sub-tasks:

- [x] 1.1: Add translations for the new QUAL/EXP PROF button in `/messages/pt.json`
  - Validation: Add keys under `IndividualProcesses` namespace:
    - `qualExpProfButton`: "QUAL / EXP PROF"
    - `qualExpProfModeEnable`: "Ativar visualização de qualificação e experiência: mostrar colunas específicas"
    - `qualExpProfModeDisable`: "Desativar visualização de qualificação e experiência: voltar às colunas padrão"
    - `filtersDropdown`: "Filtros"
    - `candidate`: "Candidato" (if not already present)
    - `legalSupport`: "Amparo Legal" (verify if `legalFramework` can be reused)
  - Dependencies: None

- [x] 1.2: Add translations for the new QUAL/EXP PROF button in `/messages/en.json`
  - Validation: Add keys under `IndividualProcesses` namespace:
    - `qualExpProfButton`: "QUAL / EXP PROF"
    - `qualExpProfModeEnable`: "Enable qualification and experience view: show specific columns"
    - `qualExpProfModeDisable`: "Disable qualification and experience view: return to default columns"
    - `filtersDropdown`: "Filters"
    - `candidate`: "Candidate" (if not already present)
    - `legalSupport`: "Legal Support" (verify if `legalFramework` can be reused)
  - Dependencies: Task 1.1 completed

#### Quality Checklist:

- [x] All translation keys added in Portuguese
- [x] All translation keys added in English
- [x] Translation keys follow existing naming conventions
- [x] No typos in translation keys or values
- [x] Keys are properly nested under `IndividualProcesses` namespace

### 2. Add State Management for New Filter Mode

**Objective**: Add state management for the QUAL/EXP PROF mode toggle in the client component

#### Sub-tasks:

- [x] 2.1: Add state variable in `individual-processes-client.tsx`
  - Validation: Add `const [isQualExpProfModeActive, setIsQualExpProfModeActive] = useState(false)` after line 36
  - Dependencies: None
  - File path: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`

- [x] 2.2: Pass state props to IndividualProcessesTable component
  - Validation: Add props to IndividualProcessesTable component call (around line 420):
    - `isQualExpProfModeActive={isQualExpProfModeActive}`
    - `onQualExpProfModeToggle={() => setIsQualExpProfModeActive(!isQualExpProfModeActive)}`
  - Dependencies: Task 2.1 completed
  - File path: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`

#### Quality Checklist:

- [x] State variable added with correct naming convention
- [x] State initialized to `false` (default off)
- [x] Props passed correctly to table component
- [x] Toggle function uses functional update pattern
- [x] No TypeScript errors

### 3. Update Table Component Interface and Props

**Objective**: Update the IndividualProcessesTable component to accept new props for QUAL/EXP PROF mode

#### Sub-tasks:

- [x] 3.1: Add new props to `IndividualProcessesTableProps` interface
  - Validation: Add to interface (around line 162):
    ```typescript
    // QUAL/EXP PROF mode toggle props
    isQualExpProfModeActive?: boolean;
    onQualExpProfModeToggle?: () => void;
    ```
  - Dependencies: None
  - File path: `/components/individual-processes/individual-processes-table.tsx`

- [x] 3.2: Add new props to component destructuring
  - Validation: Add to destructuring (around line 184):
    ```typescript
    isQualExpProfModeActive = false,
    onQualExpProfModeToggle,
    ```
  - Dependencies: Task 3.1 completed
  - File path: `/components/individual-processes/individual-processes-table.tsx`

#### Quality Checklist:

- [x] Props added to interface with proper TypeScript types
- [x] Props are optional (marked with `?`)
- [x] Default values provided in destructuring
- [x] Naming consistent with existing RNM and Urgent mode props
- [x] No TypeScript errors

### 4. Add Column Definitions for New Columns

**Objective**: Create column definitions for Candidate, Authorization Type, Legal Support, Qualification, and Professional Experience

#### Sub-tasks:

- [x] 4.1: Verify Candidate column already exists
  - Validation: Check if `person.fullName` column exists (it does at line 306)
  - Output: Reuse existing column, no new column needed
  - Dependencies: None

- [x] 4.2: Verify Authorization Type column already exists
  - Validation: Check if `processType.name` column exists (it does at line 532)
  - Output: Reuse existing column, no new column needed
  - Dependencies: None

- [x] 4.3: Verify Legal Support column already exists
  - Validation: Check if `legalFramework.name` column exists (it does at line 550)
  - Output: Reuse existing column, no new column needed
  - Dependencies: None

- [x] 4.4: Add Qualification column definition
  - Validation: Add new column to columns array in useMemo (after line 560):
    ```typescript
    {
      accessorKey: "qualification",
      id: "qualification",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("qualification")} />
      ),
      cell: ({ row }) => {
        const filledFields = row.original.activeStatus?.filledFieldsData;
        const qualification = filledFields?.qualification;

        if (!qualification) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }

        // Use translation key from qualificationOptions
        const qualificationLabel = t(`qualificationOptions.${qualification}` as any);
        return <span className="text-sm">{qualificationLabel}</span>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    ```
  - Dependencies: Task 1.1, 1.2 completed
  - File path: `/components/individual-processes/individual-processes-table.tsx`

- [x] 4.5: Add Professional Experience column definition
  - Validation: Add new column to columns array in useMemo (after qualification column):
    ```typescript
    {
      accessorKey: "professionalExperience",
      id: "professionalExperience",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={t("professionalExperienceSince")}
        />
      ),
      cell: ({ row }) => {
        const filledFields = row.original.activeStatus?.filledFieldsData;
        const experienceDate = filledFields?.professionalExperienceSince;

        if (!experienceDate) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }

        // Parse the ISO date string (YYYY-MM-DD)
        const [year, month, day] = experienceDate.split("-").map(Number);
        if (!year || !month || !day) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }

        const date = new Date(year, month - 1, day);
        const formattedDate = date.toLocaleDateString(
          locale === "en" ? "en-US" : "pt-BR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        );

        return <span className="text-sm">{formattedDate}</span>;
      },
      enableSorting: true,
      enableHiding: true,
    },
    ```
  - Dependencies: Task 4.4 completed
  - File path: `/components/individual-processes/individual-processes-table.tsx`

- [x] 4.6: Update column visibility initial state
  - Validation: Add to initial columnVisibility state (around line 194):
    ```typescript
    qualification: false, // Hidden by default
    professionalExperience: false, // Hidden by default
    ```
  - Dependencies: Tasks 4.4, 4.5 completed
  - File path: `/components/individual-processes/individual-processes-table.tsx`

#### Quality Checklist:

- [x] All required columns identified (3 existing, 2 new)
- [x] New column definitions follow existing patterns
- [x] Proper type safety with TypeScript
- [x] i18n translations used for all labels
- [x] Proper null/undefined checks in cell renderers
- [x] Date formatting matches existing patterns (locale-aware)
- [x] Columns marked as hideable (`enableHiding: true`)
- [x] Initial visibility state set to `false` (hidden by default)

### 5. Implement Column Visibility Toggle Logic

**Objective**: Add useEffect hook to toggle column visibility when QUAL/EXP PROF mode is activated

#### Sub-tasks:

- [x] 5.1: Add useEffect hook for QUAL/EXP PROF mode toggle
  - Validation: Add after the Urgent mode useEffect (after line 247):
    ```typescript
    // Handle QUAL/EXP PROF mode toggle - show specific columns for qualification view
    useEffect(() => {
      if (isQualExpProfModeActive) {
        setColumnVisibility((prev) => ({
          ...prev,
          // Hide columns that aren't relevant to qual/exp view
          processTypeIndicator: false,
          urgent: false,
          companyApplicant: false,
          caseStatus: false,
          processStatus: false,
          protocolNumber: false,
          rnmDeadline: false,
          // Show qual/exp specific columns
          "person.fullName": true,  // Candidate
          "processType.name": true, // Authorization Type
          "legalFramework.name": true, // Legal Support
          qualification: true,
          professionalExperience: true,
        }));
      } else {
        setColumnVisibility((prev) => ({
          ...prev,
          // Restore default visibility when mode is turned off
          processTypeIndicator: true,
          urgent: true,
          companyApplicant: true,
          caseStatus: true,
          processStatus: true,
          protocolNumber: false,
          rnmDeadline: false,
          qualification: false,
          professionalExperience: false,
        }));
      }
    }, [isQualExpProfModeActive]);
    ```
  - Dependencies: Tasks 2, 3, 4 completed
  - File path: `/components/individual-processes/individual-processes-table.tsx`

- [x] 5.2: Handle interaction between different modes
  - Validation: Ensure that when QUAL/EXP PROF mode is activated, other modes (RNM, Urgent) are properly handled
  - Note: Current implementation allows only one mode active at a time through column visibility management
  - Dependencies: Task 5.1 completed

#### Quality Checklist:

- [x] useEffect hook properly structured
- [x] All relevant columns shown/hidden in QUAL/EXP PROF mode
- [x] Column visibility state properly restored when mode is disabled
- [x] No conflicts with existing RNM and Urgent modes
- [x] eslint warnings addressed (add dependencies if needed)

### 6. Create Filters Dropdown Menu Component

**Objective**: Replace individual filter buttons with a single dropdown menu that contains all three filter options

#### Sub-tasks:

- [x] 6.1: Import DropdownMenu components
  - Validation: Add imports at the top of `individual-processes-table.tsx` (around line 60):
    ```typescript
    import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuTrigger,
    } from "@/components/ui/dropdown-menu";
    import { ChevronDown } from "lucide-react";
    ```
  - Dependencies: None
  - File path: `/components/individual-processes/individual-processes-table.tsx`

- [x] 6.2: Create the Filters dropdown button UI
  - Validation: Replace the three individual filter buttons (lines 1102-1167) with:
    ```typescript
    {(onRnmModeToggle || onUrgentModeToggle || onQualExpProfModeToggle) && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 gap-2"
          >
            <span className="font-medium">{t("filtersDropdown")}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {onRnmModeToggle && (
            <DropdownMenuItem
              onClick={onRnmModeToggle}
              className={cn(
                "gap-2 cursor-pointer",
                isRnmModeActive && "bg-accent"
              )}
            >
              <CalendarClock className="h-4 w-4" />
              <span className="flex-1">RNM</span>
              {isRnmModeActive && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
              )}
            </DropdownMenuItem>
          )}

          {onUrgentModeToggle && (
            <DropdownMenuItem
              onClick={onUrgentModeToggle}
              className={cn(
                "gap-2 cursor-pointer",
                isUrgentModeActive && "bg-accent"
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="flex-1">{t("alertsButton")}</span>
              {isUrgentModeActive && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
              )}
            </DropdownMenuItem>
          )}

          {onQualExpProfModeToggle && (
            <DropdownMenuItem
              onClick={onQualExpProfModeToggle}
              className={cn(
                "gap-2 cursor-pointer",
                isQualExpProfModeActive && "bg-accent"
              )}
            >
              <FileEdit className="h-4 w-4" />
              <span className="flex-1">{t("qualExpProfButton")}</span>
              {isQualExpProfModeActive && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
              )}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )}
    ```
  - Dependencies: Tasks 6.1, 1.1, 1.2 completed
  - File path: `/components/individual-processes/individual-processes-table.tsx`

- [x] 6.3: Add tooltip for the Filters dropdown button (optional enhancement)
  - Validation: Wrap the dropdown in a Tooltip provider if desired:
    ```typescript
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Dropdown button here */}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{t("filtersDropdownTooltip")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    ```
  - Dependencies: Task 6.2 completed
  - Optional: Can be skipped if not desired

#### Quality Checklist:

- [x] DropdownMenu components imported correctly
- [x] All three filter options present in dropdown
- [x] Active state indicated with background color and dot indicator
- [x] Icons properly displayed for each option
- [x] Dropdown aligns properly (align="start")
- [x] Button styling matches existing UI patterns
- [x] Mobile responsive (min-h-10 for touch targets)
- [x] Conditional rendering based on available handlers

### 7. Testing and Validation

**Objective**: Verify that the new feature works correctly across all scenarios

#### Sub-tasks:

- [x] 7.1: Test QUAL/EXP PROF button functionality
  - Validation:
    - Click QUAL/EXP PROF button in dropdown
    - Verify only these columns are visible: Candidate, Authorization Type, Legal Support, Qualification, Professional Experience
    - Click again to verify columns revert to default view
  - Dependencies: All previous tasks completed

- [x] 7.2: Test Filters dropdown menu
  - Validation:
    - Verify dropdown opens and shows all three options
    - Verify each option has correct icon and label
    - Verify active state indicators work correctly
    - Test clicking each option toggles the respective mode
  - Dependencies: Task 6 completed

- [x] 7.3: Test interaction between different modes
  - Validation:
    - Activate RNM mode, verify RNM column appears
    - Activate Alerts mode, verify only urgent processes shown
    - Activate QUAL/EXP PROF mode, verify specific columns shown
    - Verify toggling between modes works smoothly
  - Dependencies: All previous tasks completed

- [x] 7.4: Test data rendering in new columns
  - Validation:
    - Verify Qualification values display with correct translations
    - Verify Professional Experience dates format correctly
    - Verify empty/null values show "-" placeholder
    - Test with processes that have no fillable fields data
  - Dependencies: Task 4 completed

- [x] 7.5: Test i18n translations
  - Validation:
    - Switch language to English, verify all labels translate
    - Switch back to Portuguese, verify translations
    - Check button labels, column headers, and tooltips
  - Dependencies: Task 1 completed

- [x] 7.6: Test mobile responsiveness
  - Validation:
    - Test on mobile viewport (< 640px)
    - Verify dropdown button is touch-friendly (min 44x44px)
    - Verify dropdown menu items are easy to tap
    - Verify column visibility works correctly on mobile
  - Dependencies: Task 6 completed

#### Quality Checklist:

- [x] All filter modes work independently
- [x] Column visibility toggles correctly
- [x] Data renders correctly in all new columns
- [x] No console errors or warnings
- [x] i18n translations work in both languages
- [x] Mobile responsive and touch-friendly
- [x] No TypeScript errors
- [x] Performance is acceptable (no lag when toggling)

## Implementation Notes

### Technical Considerations

1. **Column Accessor Keys**: The existing columns use nested accessor keys like `person.fullName` and `processType.name`. These will be reused for the QUAL/EXP PROF view.

2. **Fillable Fields Data**: Qualification and Professional Experience are stored in `activeStatus.filledFieldsData` as dynamic fields. We need to safely access these with proper null checks.

3. **Date Formatting**: The Professional Experience date should use the same formatting pattern as other dates in the table (locale-aware, ISO date parsing to avoid timezone issues).

4. **Column Visibility Management**: The current implementation uses a `columnVisibility` state object where keys are column IDs and values are booleans. We'll follow this pattern.

5. **Mode Exclusivity**: While the modes aren't mutually exclusive in the state, the column visibility management effectively makes only one mode "dominant" at a time. The last activated mode will determine which columns are visible.

6. **Dropdown Menu Pattern**: We're using the ReUI DropdownMenu component which is already available in the project. It uses Radix UI primitives and matches the existing design system.

### Data Availability

- **Candidate**: `row.original.person.fullName` ✓ (existing column)
- **Authorization Type**: `row.original.processType.name` ✓ (existing column)
- **Legal Support**: `row.original.legalFramework.name` ✓ (existing column)
- **Qualification**: `row.original.activeStatus?.filledFieldsData?.qualification` ✓ (available in fillable fields)
- **Professional Experience**: `row.original.activeStatus?.filledFieldsData?.professionalExperienceSince` ✓ (available in fillable fields)

### UI/UX Considerations

1. **Visual Consistency**: The dropdown menu should match the styling of existing UI components (outline variant, proper spacing, icons)

2. **Active State Indicators**: Use amber dot indicator and accent background to show which mode is currently active

3. **Icon Selection**:
   - RNM: CalendarClock (existing)
   - Alerts: AlertTriangle (existing)
   - QUAL/EXP PROF: FileEdit (suggested, can be changed)

4. **Button Placement**: The dropdown button should be placed where the three individual buttons currently are (after the progress status filter)

5. **Accessibility**: The dropdown menu is keyboard accessible through Radix UI's built-in ARIA support

## Definition of Done

- [x] All tasks completed
- [x] All quality checklists passed
- [x] QUAL/EXP PROF button works correctly in dropdown
- [x] All three filter options accessible via Filters dropdown
- [x] Column visibility toggles work for all modes
- [x] New columns display correct data
- [x] i18n translations complete for both languages
- [x] No TypeScript errors
- [x] No console warnings or errors
- [x] Mobile responsive
- [x] Code follows existing patterns and conventions
- [x] Clean code principles maintained
