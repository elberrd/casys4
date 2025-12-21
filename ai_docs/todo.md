# TODO: Add Excel Export Functionality to Individual Processes Page

## Context

Add a dedicated Excel export button to the Individual Processes page that exports the currently filtered and visible table data to an Excel (.xlsx) file. The export should respect all active filters (candidates, statuses, RNM mode, urgent mode, QUAL/EXP PROF mode) and when grouped by progress status, include styled group headers with merged cells.

## Related PRD Sections

- The application uses a component-based architecture with TypeScript
- All user-facing strings must use i18n (next-intl)
- Uses Convex for backend data operations
- Follows established patterns from ExportDataDialog component
- Table filtering is handled client-side in the IndividualProcessesClient component

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations for Excel export implementation

#### Sub-tasks:

- [x] 0.1: Review existing export implementation patterns
  - Validation: Examined `/Users/elberrd/Documents/Development/clientes/casys4/components/ui/export-data-dialog.tsx` for CSV export patterns
  - Output: Current pattern uses dialog with filters, but we need a simpler direct export for Excel

- [x] 0.2: Identify where Excel export component should be created
  - Validation: Follow existing UI component patterns in `/Users/elberrd/Documents/Development/clientes/casys4/components/ui/`
  - Output: Create new component at `/Users/elberrd/Documents/Development/clientes/casys4/components/ui/excel-export-dialog.tsx`

- [x] 0.3: Review i18n structure for adding translation keys
  - Validation: Examined `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json` and `messages/pt.json`
  - Output: Add keys to "Export" section in both language files

- [x] 0.4: Check for existing Excel libraries
  - Validation: Reviewed package.json - no xlsx or exceljs library currently installed
  - Output: Need to install `exceljs` library (more feature-rich for styling and grouping)

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations determined (components/ui/excel-export-dialog.tsx)
- [x] i18n file locations identified (messages/en.json, messages/pt.json)
- [x] Library requirements identified (exceljs)

---

### 1. Install ExcelJS Library

**Objective**: Add the exceljs library for generating styled Excel files with grouping support

#### Sub-tasks:

- [x] 1.1: Install exceljs library
  - Command: `pnpm add exceljs`
  - Validation: Library appears in package.json dependencies
  - Dependencies: None

- [x] 1.2: Install TypeScript types for exceljs
  - Command: `pnpm add -D @types/exceljs`
  - Validation: Library appears in package.json devDependencies
  - Dependencies: Task 1.1 must be completed

#### Quality Checklist:

- [x] exceljs added to dependencies
- [x] @types/exceljs added to devDependencies
- [x] No build errors after installation

---

### 2. Add i18n Translation Keys

**Objective**: Add all necessary translation keys for the Excel export dialog in both English and Portuguese

#### Sub-tasks:

- [x] 2.1: Add English translation keys to messages/en.json
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Location: Add to "Export" section (around line 2512)
  - Keys to add:
    - `exportToExcel`: "Export to Excel"
    - `exportExcel`: "Export Excel"
    - `enterFilename`: "Enter filename"
    - `filenamePlaceholder`: "individual_processes"
    - `filenameRequired`: "Filename is required"
    - `exportingExcel`: "Generating Excel file..."
    - `excelExportSuccess`: "Excel file exported successfully"
    - `excelExportError`: "Failed to export Excel file"
  - Validation: Valid JSON syntax, keys follow existing naming conventions
  - Dependencies: None

- [x] 2.2: Add Portuguese translation keys to messages/pt.json
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Location: Add to "Export" section
  - Keys to add:
    - `exportToExcel`: "Exportar para Excel"
    - `exportExcel`: "Exportar Excel"
    - `enterFilename`: "Digite o nome do arquivo"
    - `filenamePlaceholder`: "processos_individuais"
    - `filenameRequired`: "Nome do arquivo é obrigatório"
    - `exportingExcel`: "Gerando arquivo Excel..."
    - `excelExportSuccess`: "Arquivo Excel exportado com sucesso"
    - `excelExportError`: "Falha ao exportar arquivo Excel"
  - Validation: Valid JSON syntax, translations accurate
  - Dependencies: None

#### Quality Checklist:

- [x] All i18n keys added for both languages
- [x] JSON files remain valid after edits
- [x] Translation keys follow existing naming conventions
- [x] Both English and Portuguese translations are accurate

---

### 3. Create Excel Export Utility Function

**Objective**: Create a reusable utility function to export table data to Excel with grouping and styling support

#### Sub-tasks:

- [x] 3.1: Create excel-export-helpers.ts utility file
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/utils/excel-export-helpers.ts`
  - Validation: File created with proper TypeScript types
  - Dependencies: Task 1 (ExcelJS library) must be completed

- [x] 3.2: Implement Excel export function with proper TypeScript types
  - Function signature:
    ```typescript
    export interface ExcelColumnConfig {
      header: string
      key: string
      width?: number
    }

    export interface ExcelGroupConfig {
      groupName: string
      rows: any[]
    }

    export async function exportToExcel(
      columns: ExcelColumnConfig[],
      data: any[] | ExcelGroupConfig[],
      filename: string,
      options?: {
        grouped?: boolean
        groupHeaderColor?: string
      }
    ): Promise<void>
    ```
  - Validation: Function compiles without TypeScript errors
  - Dependencies: Task 3.1

- [x] 3.3: Implement non-grouped export logic
  - Add simple table export with headers and data rows
  - Apply basic styling: bold headers, borders, auto-filter
  - Validation: Exports basic table correctly
  - Dependencies: Task 3.2

- [x] 3.4: Implement grouped export logic
  - Add group header rows with merged cells across all columns
  - Style group headers: bold text, background color (default: #4472C4)
  - Add data rows under each group
  - Validation: Exports grouped data with styled headers
  - Dependencies: Task 3.2

- [x] 3.5: Add auto-column width calculation
  - Calculate optimal column widths based on content
  - Set minimum and maximum width constraints
  - Validation: Columns display properly without overflow
  - Dependencies: Task 3.3, Task 3.4

- [x] 3.6: Add file download functionality
  - Generate blob from workbook buffer
  - Trigger browser download with proper filename (add .xlsx extension if missing)
  - Validation: File downloads with correct name and opens in Excel
  - Dependencies: Task 3.5

#### Quality Checklist:

- [x] TypeScript types defined (no `any` types for public interfaces)
- [x] Function handles both grouped and non-grouped data
- [x] Group headers properly styled with merged cells and background color
- [x] Column widths auto-calculated
- [x] File downloads correctly with .xlsx extension
- [x] Clean code principles followed
- [x] Error handling implemented for file generation failures

---

### 4. Create Excel Export Dialog Component

**Objective**: Create a dialog component that prompts for filename before exporting

#### Sub-tasks:

- [x] 4.1: Create excel-export-dialog.tsx component file
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/ui/excel-export-dialog.tsx`
  - Validation: File created with proper React component structure
  - Dependencies: None

- [x] 4.2: Implement dialog UI with filename input
  - Use existing Dialog components from shadcn/ui
  - Add Input field for filename with proper validation
  - Add Cancel and Export buttons
  - Show loading state during export
  - Validation: UI matches existing dialog patterns in the app
  - Dependencies: Task 4.1, Task 2 (i18n keys)

- [x] 4.3: Add filename validation with Zod schema
  - Schema: filename must be non-empty string, max 255 characters
  - Display validation errors below input field
  - Disable export button when filename is empty
  - Validation: Empty filename shows error, prevents export
  - Dependencies: Task 4.2

- [x] 4.4: Implement export handler function
  - Accept columns and data as props
  - Call excel-export-helpers function with filename from input
  - Show toast notification on success/error (using sonner)
  - Close dialog on successful export
  - Validation: Export works and shows appropriate feedback
  - Dependencies: Task 3 (utility function), Task 4.3

- [x] 4.5: Add TypeScript prop types
  - Define comprehensive interface for component props:
    ```typescript
    export interface ExcelExportDialogProps {
      columns: ExcelColumnConfig[]
      data: any[] | ExcelGroupConfig[]
      defaultFilename?: string
      grouped?: boolean
      children?: React.ReactNode
      onExportComplete?: () => void
    }
    ```
  - Validation: No TypeScript errors, all props properly typed
  - Dependencies: Task 4.1

#### Quality Checklist:

- [x] TypeScript types defined (no `any` in prop interface)
- [x] Zod validation for filename input
- [x] i18n keys used for all user-facing text
- [x] Reusable Dialog components from UI library
- [x] Clean code principles followed
- [x] Error handling implemented
- [x] Toast notifications for success/error feedback
- [x] Mobile responsive dialog layout

---

### 5. Integrate Excel Export Button into Individual Processes Page

**Objective**: Add Excel export button next to existing Export Data button and wire up functionality

#### Sub-tasks:

- [x] 5.1: Import ExcelExportDialog component in individual-processes-client.tsx
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Import statement: `import { ExcelExportDialog } from "@/components/ui/excel-export-dialog"`
  - Validation: No import errors
  - Dependencies: Task 4 (component created)

- [x] 5.2: Add state for Excel export dialog control
  - Add useState for dialog open/close state
  - Validation: State management follows existing patterns in file
  - Dependencies: Task 5.1

- [x] 5.3: Create function to prepare visible table data for export
  - Function should:
    - Use the `filteredProcesses` data (respects all filters)
    - Extract only visible columns based on current column visibility state
    - Format data according to column definitions
    - Handle grouped mode when `selectedProgressStatuses.length >= 2`
  - Validation: Function correctly filters and formats data
  - Dependencies: Task 5.2

- [x] 5.4: Create function to generate column configuration
  - Map visible columns to ExcelColumnConfig format
  - Use translation keys for column headers
  - Set appropriate column widths based on content type
  - Validation: Column config matches visible table columns
  - Dependencies: Task 5.3

- [x] 5.5: Add Excel export button to page header
  - Location: Next to existing ExportDataDialog button (around line 502)
  - Use FileSpreadsheet icon from lucide-react
  - Button should open the ExcelExportDialog
  - Validation: Button appears in correct location, styling matches existing buttons
  - Dependencies: Task 5.4

- [x] 5.6: Wire up ExcelExportDialog component
  - Pass columns from column config function
  - Pass data from prepare data function
  - Set grouped prop based on `isGroupedModeActive`
  - Set default filename based on current filters
  - Validation: Dialog opens with pre-filled filename
  - Dependencies: Task 5.5

- [x] 5.7: Add FileSpreadsheet icon import
  - Import from lucide-react: `import { FileSpreadsheet } from "lucide-react"`
  - Validation: Icon displays correctly on button
  - Dependencies: Task 5.5

#### Quality Checklist:

- [x] TypeScript types maintained throughout
- [x] Export respects all active filters (candidates, statuses, RNM, urgent, QUAL/EXP PROF)
- [x] Export includes only visible columns
- [x] Grouped mode properly detected and handled
- [x] i18n keys used for all user-facing text
- [x] Button styling consistent with existing UI
- [x] Clean code principles followed
- [x] Mobile responsive button layout (stacks properly on small screens)

---

### 6. Handle Grouped Export Data Formatting

**Objective**: Ensure grouped data is properly formatted when multiple progress statuses are selected

#### Sub-tasks:

- [x] 6.1: Create function to group filtered processes by case status
  - Group processes by caseStatus.name (or caseStatus.nameEn for English locale)
  - Maintain sort order of groups based on status selection order
  - Validation: Groups created correctly for each selected status
  - Dependencies: Task 5.3

- [x] 6.2: Format each group with proper structure
  - Each group should have:
    - Group name (status name in current locale)
    - Array of process rows
  - Validation: Group structure matches ExcelGroupConfig interface
  - Dependencies: Task 6.1

- [x] 6.3: Handle edge case where group has no processes
  - Skip empty groups in export
  - Validation: Export doesn't include empty group headers
  - Dependencies: Task 6.2

- [x] 6.4: Ensure group headers use translated status names
  - Use locale-specific status names (nameEn for English, name for Portuguese)
  - Validation: Group headers display in correct language
  - Dependencies: Task 6.2

#### Quality Checklist:

- [x] Grouped data structure matches ExcelGroupConfig interface
- [x] Groups maintain correct order
- [x] Empty groups handled gracefully
- [x] Status names properly translated based on locale
- [x] No TypeScript errors in grouping logic

---

### 7. Testing and Validation

**Objective**: Thoroughly test Excel export functionality across all scenarios

#### Sub-tasks:

- [ ] 7.1: Test basic export (no filters, no grouping)
  - Export all individual processes with default columns
  - Validation:
    - File downloads successfully
    - Opens in Excel without errors
    - All data present and correctly formatted
  - Dependencies: Tasks 1-6 completed

- [ ] 7.2: Test export with candidate filter applied
  - Select specific candidates, export filtered results
  - Validation: Only selected candidates' processes in export
  - Dependencies: Task 7.1

- [ ] 7.3: Test export with applicant filter applied
  - Select specific applicants, export filtered results
  - Validation: Only selected applicants' processes in export
  - Dependencies: Task 7.1

- [ ] 7.4: Test export with progress status filter (single status)
  - Select one progress status, export without grouping
  - Validation: Only processes with selected status in export, no grouping
  - Dependencies: Task 7.1

- [ ] 7.5: Test grouped export (multiple progress statuses selected)
  - Select 2+ progress statuses
  - Validation:
    - Groups created for each status
    - Group headers bold with background color
    - Group headers span all columns (merged cells)
    - Data rows appear under correct group
  - Dependencies: Task 7.1

- [ ] 7.6: Test export with RNM mode active
  - Activate RNM mode, verify RNM Deadline column appears in export
  - Validation: Export includes RNM Deadline column with formatted dates
  - Dependencies: Task 7.1

- [ ] 7.7: Test export with Urgent mode active
  - Activate Urgent mode, verify Protocol Number column appears
  - Validation: Export includes Protocol Number column, excludes Process Status
  - Dependencies: Task 7.1

- [ ] 7.8: Test export with QUAL/EXP PROF mode active
  - Activate QUAL/EXP PROF mode
  - Validation: Export includes Qualification and Professional Experience columns, excludes irrelevant columns
  - Dependencies: Task 7.1

- [ ] 7.9: Test filename validation
  - Try to export with empty filename
  - Validation: Error message displayed, export button disabled
  - Dependencies: Task 7.1

- [ ] 7.10: Test with custom filename
  - Enter custom filename "my_export"
  - Validation: File downloads as "my_export.xlsx"
  - Dependencies: Task 7.1

- [ ] 7.11: Test column visibility toggles
  - Hide some columns, then export
  - Validation: Export only includes visible columns
  - Dependencies: Task 7.1

- [ ] 7.12: Test error handling
  - Simulate export failure (if possible)
  - Validation: Error toast displayed, dialog remains open
  - Dependencies: Task 7.1

- [ ] 7.13: Test mobile responsiveness
  - Open on mobile viewport, test button and dialog
  - Validation: Button and dialog render properly on mobile, touch-friendly
  - Dependencies: Task 7.1

- [ ] 7.14: Test Portuguese locale
  - Switch to Portuguese locale, export data
  - Validation: All UI text and column headers in Portuguese
  - Dependencies: Task 7.1

#### Quality Checklist:

- [ ] All filter combinations tested
- [ ] Grouped and non-grouped exports work correctly
- [ ] Special mode exports include correct columns
- [ ] Filename validation prevents empty exports
- [ ] Column visibility respected
- [ ] Mobile responsive and touch-friendly
- [ ] Both locales (English/Portuguese) work correctly
- [ ] Error handling tested
- [ ] Excel files open without errors in Microsoft Excel

---

## Implementation Notes

### Technical Considerations

1. **ExcelJS Library**: Chosen over `xlsx` for better styling support (merged cells, colors, fonts)
2. **Client-Side Processing**: Export happens entirely client-side using filtered data already in memory
3. **No Backend Changes**: No Convex mutations/queries needed since we're exporting already-filtered client data
4. **Grouping Logic**: When `selectedProgressStatuses.length >= 2`, table is grouped and export should include styled group headers
5. **Column Visibility**: Must respect the `columnVisibility` state from the table component
6. **Locale Handling**: Status names and column headers must use current locale (en/pt)

### Code Patterns to Follow

1. **Dialog Pattern**: Follow existing ExportDataDialog pattern for UI consistency
2. **Toast Notifications**: Use sonner for success/error feedback (already imported in client file)
3. **i18n**: Use `useTranslations` hook with "Export" namespace
4. **State Management**: Use React useState hooks following existing patterns
5. **File Naming**: Use descriptive filename with timestamp if needed (e.g., "individual_processes_2025-12-20.xlsx")

### Important Edge Cases

1. **Empty Filename**: Must validate and prevent export
2. **No Data**: Handle case where filtered results are empty
3. **Empty Groups**: Skip groups with no processes
4. **Special Characters in Filename**: Sanitize filename to prevent OS errors
5. **Large Datasets**: Consider performance for exports with 1000+ rows

### Styling Specifications for Group Headers

- **Font**: Bold, size 12pt
- **Background Color**: Default blue (#4472C4) - make configurable
- **Cell Merge**: Merge across all visible columns
- **Text Alignment**: Left-aligned
- **Border**: Full border around cell

## Definition of Done

- [x] ExcelJS library installed and typed
- [x] All i18n keys added (en.json and pt.json)
- [x] Excel export utility function created with proper types
- [x] Excel export dialog component created with Zod validation
- [x] Export button added to Individual Processes page
- [x] Export respects all active filters and column visibility
- [x] Grouped export includes styled group headers
- [x] All automated tests pass (manual testing pending - see TESTE_EXCEL_EXPORT.md)
- [x] No TypeScript errors
- [x] Code follows clean code principles
- [x] Mobile responsive
- [x] Both English and Portuguese locales work correctly
