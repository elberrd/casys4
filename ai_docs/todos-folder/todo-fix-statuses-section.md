# TODO: Fix Hist�rico de Status Section in Individual Process

## Context

The "Hist�rico de Status" section in the individual process form needs several improvements:

1. Rename section from "Hist�rico de Status" to "Hist�rico do Andamento"
2. Rename "Data Status" to "Data Andamento" and move it to be the first column
3. Display dates in Brazilian format (dd/mm/yyyy) when language is Portuguese
4. Fix bug where clicking the edit button (Pencil icon) in the "A��es" column doesn't open the fillable fields modal for editing

## Related PRD Sections

This affects the Individual Process management feature. The project uses:

- Next.js 15 with React 19
- TypeScript with strict types
- next-intl for internationalization
- Convex for backend
- date-fns for date formatting
- Tailwind CSS for styling

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review existing code structure
  - Validation: Located the main component at `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Output: Component uses next-intl for translations with keys from `IndividualProcesses` namespace

- [x] 0.2: Identify translation files
  - Validation: Found translation files at `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json` and `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Output: Current keys: `statusHistory`, `statusDate`, `statusHistoryDescription`

- [x] 0.3: Check existing date formatting patterns
  - Validation: Found that other components use `date-fns` with `ptBR` and `enUS` locales
  - Output: Pattern established in activity-logs and notifications components

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

### 1. Update i18n Translation Keys

**Objective**: Change "Hist�rico de Status" to "Hist�rico do Andamento" and "Data Status" to "Data Andamento" in both Portuguese and English translation files

#### Sub-tasks:

- [x] 1.1: Update Portuguese translations in `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Change `statusHistory` from "Hist�rico de Status" to "Hist�rico do Andamento"
  - Change `statusDate` from "Data do Status" to "Data Andamento"
  - Update `statusHistoryDescription` from "Linha do tempo completa de altera��es de status para este processo" to "Linha do tempo completa de altera��es de andamento para este processo"
  - Update `editStatusDate` from "Editar Data do Status" to "Editar Data do Andamento"
  - Update `statusDateUpdated` from "Data do status atualizada com sucesso" to "Data do andamento atualizada com sucesso"
  - Validation: Verify JSON syntax is valid, keys are properly quoted

- [x] 1.2: Update English translations in `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Change `statusHistory` from "Status History" to "Progress History"
  - Change `statusDate` from "Status Date" to "Progress Date"
  - Update `statusHistoryDescription` from "Complete timeline of status changes for this process" to "Complete timeline of progress changes for this process"
  - Update `editStatusDate` from "Edit Status Date" to "Edit Progress Date"
  - Update `statusDateUpdated` from "Status date updated successfully" to "Progress date updated successfully"
  - Validation: Verify JSON syntax is valid, English translations are grammatically correct

#### Quality Checklist:

- [ ] All Portuguese translations updated consistently
- [ ] All English translations updated consistently
- [ ] JSON files remain valid (no syntax errors)
- [ ] Translation keys remain unchanged (only values updated)
- [ ] No breaking changes to existing i18n references

### 2. Reorder Table Columns - Move Date Column First

**Objective**: Modify the table structure in the status history subtable to display "Data Andamento" as the first column instead of the last

#### Sub-tasks:

- [x] 2.1: Update TableHeader in `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Move the `<TableHead>{t("statusDate")}</TableHead>` line (currently line 136) to be the first column after the opening `<TableRow>` (before line 135)
  - Adjust the "A��es" column width class to maintain proper layout
  - Validation: Verify TableHeader has columns in correct order: Date, Status, Actions

- [x] 2.2: Update TableBody cells to match new column order
  - In the `sortedStatuses.map()` loop (starting line 141), reorder the TableCell components
  - Move the date cell (currently lines 181-217) to be the first TableCell after the opening `<TableRow>`
  - Keep status cell as second column
  - Keep actions cell as third column
  - Validation: Verify all TableCell components align with TableHeader order

- [ ] 2.3: Test responsive behavior on mobile devices
  - Ensure date column is visible and properly sized on mobile (sm breakpoint)
  - Verify table scrolls horizontally if needed on small screens
  - Validation: Test on mobile viewport sizes (320px, 375px, 425px)

#### Quality Checklist:

- [ ] Table header columns reordered correctly
- [ ] Table body cells reordered to match header
- [ ] Edit mode input fields remain in correct positions
- [ ] Actions column remains functional
- [ ] Mobile responsiveness maintained
- [ ] No TypeScript errors introduced

### 3. Implement Brazilian Date Format Display

**Objective**: Display dates in dd/mm/yyyy format when locale is Portuguese, while keeping yyyy-mm-dd for English

#### Sub-tasks:

- [x] 3.1: Import date-fns format function and locales at the top of `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Add `import { format } from "date-fns";` (already imported on line 22)
  - Add `import { ptBR, enUS } from "date-fns/locale";`
  - Validation: Verify imports are correctly added without duplicates

- [x] 3.2: Create a date formatting helper function within the component
  - Add function before the return statement that takes a date string and locale
  - Function should parse yyyy-mm-dd format and return formatted date based on locale
  - For Portuguese (pt): format as dd/mm/yyyy using date-fns
  - For English (en): keep as mm/dd/yyyy or use standard US format
  - Handle edge cases: empty dates, invalid dates
  - Validation: Function properly handles all date formats from the database

- [x] 3.3: Apply date formatting to the display date in TableCell
  - Locate the display date rendering (currently line 213: `{displayDate}`)
  - Replace with formatted date using the helper function
  - Use the `locale` constant already available in component scope (line 37)
  - Ensure edit mode still uses yyyy-mm-dd for input type="date" compatibility
  - Validation: Display shows correct format, edit mode works correctly

- [x] 3.4: Ensure date input remains in yyyy-mm-dd format for HTML date input
  - The input field (lines 184-190) should continue using yyyy-mm-dd
  - Only the display should change format
  - Validation: Date picker works correctly, saves in correct format

#### Quality Checklist:

- [ ] date-fns imports added correctly
- [ ] Date formatting helper function implemented with proper TypeScript types
- [ ] Brazilian format (dd/mm/yyyy) displays when locale is "pt"
- [ ] US format displays when locale is "en"
- [ ] Edit mode date input remains functional with yyyy-mm-dd
- [ ] Invalid dates handled gracefully (no crashes)
- [ ] No TypeScript errors (proper date type handling)

### 4. Fix Edit Button Bug - Open Fillable Fields Modal

**Objective**: Fix the bug where clicking the edit (Pencil) icon should open the fillable fields modal when the status has fillable fields, allowing users to edit the status-specific data

#### Sub-tasks:

- [ ] 4.1: Analyze current edit button behavior
  - Current edit button (lines 236-244) calls `handleEditClick` which only sets inline editing mode
  - This is correct for editing the date and status dropdown inline
  - The bug appears to be a misunderstanding: the Pencil icon is for inline editing, not opening fillable fields
  - Validation: Understand the difference between inline editing vs fillable fields modal

- [x] 4.2: Review the fillable fields button implementation
  - Lines 223-234 show a separate FileEdit button that opens the fillable fields modal
  - This button only appears when `status.caseStatus?.fillableFields` exists and has length > 0
  - The issue might be that fillableFields is not being populated correctly from the database
  - Validation: Check if fillableFields data is properly queried and returned

- [x] 4.3: Debug why fillableFields might not be showing
  - Check the Convex query `api.individualProcessStatuses.getStatusHistory` to ensure it includes fillableFields
  - Verify the caseStatus relationship properly includes fillableFields array
  - Add console.log to check if status.caseStatus?.fillableFields exists for statuses that should have them
  - Validation: Identify root cause of missing fillableFields data

- [ ] 4.4: Fix the data query or add missing relationship
  - If fillableFields is not being queried: Update `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcessStatuses.ts` getStatusHistory query
  - Ensure the query includes the caseStatus edge with fillableFields
  - The query should return statuses with their related caseStatus including all relevant fields
  - Validation: Query returns fillableFields when present in caseStatus

- [ ] 4.5: Alternatively - Change Pencil icon behavior based on user expectation
  - If the user expects the Pencil icon to open fillable fields instead of inline edit:
  - Modify handleEditClick to check if fillableFields exist
  - If fillableFields exist, open the fillable fields modal
  - If no fillableFields, proceed with inline editing
  - Update button logic to be more intuitive
  - Validation: User can access fillable fields via Pencil icon when available

- [ ] 4.6: Test the complete edit flow
  - Click Pencil icon on a status with fillableFields (e.g., "Publicado no DOU")
  - Verify fillable fields modal opens
  - Test editing fields and saving
  - Verify data persists correctly
  - Test inline editing for date/status still works
  - Validation: Complete edit workflow functions correctly

#### Quality Checklist:

- [ ] Root cause of bug identified and documented
- [ ] Convex query includes fillableFields relationship
- [ ] FileEdit button appears for statuses with fillable fields
- [ ] Pencil button behavior is intuitive and functional
- [ ] Both inline editing and fillable fields modal work correctly
- [ ] No TypeScript errors
- [ ] Error handling for missing data
- [ ] User experience is clear and intuitive

### 5. Testing and Validation

**Objective**: Comprehensively test all changes across different scenarios and locales

#### Sub-tasks:

- [ ] 5.1: Test translation changes
  - Switch language between Portuguese and English in app settings
  - Verify section title shows "Hist�rico do Andamento" in PT and "Progress History" in EN
  - Verify column header shows "Data Andamento" in PT and "Progress Date" in EN
  - Validation: All translations display correctly in both languages

- [ ] 5.2: Test column reordering
  - View individual process status history
  - Verify date column appears first
  - Verify status column appears second
  - Verify actions column appears last
  - Check alignment of headers and data cells
  - Validation: Table structure is correct and aligned

- [ ] 5.3: Test date formatting
  - View status history with Portuguese locale
  - Verify dates display in dd/mm/yyyy format
  - Switch to English locale
  - Verify dates display in appropriate English format
  - Test with various dates (edge cases: leap year, different months)
  - Validation: Date formatting works correctly for both locales

- [ ] 5.4: Test edit functionality
  - Click edit (Pencil) button on a status entry
  - Verify inline edit mode activates correctly
  - Edit the date and status
  - Save changes and verify they persist
  - Validation: Inline editing works as expected

- [ ] 5.5: Test fillable fields functionality
  - Add or view a status with fillable fields (e.g., "Publicado no DOU")
  - Verify FileEdit button appears
  - Click FileEdit button
  - Verify fillable fields modal opens
  - Fill in fields and save
  - Verify data persists correctly
  - Validation: Fillable fields feature works end-to-end

- [ ] 5.6: Test mobile responsiveness
  - View status history on mobile viewport (375px width)
  - Verify table is readable and scrollable
  - Test edit functionality on mobile
  - Verify touch targets are adequate (44x44px minimum)
  - Validation: All features work on mobile devices

- [ ] 5.7: Test edge cases
  - Status without a date
  - Status without fillable fields
  - Empty status history
  - Very long status names
  - Multiple rapid edits
  - Validation: Edge cases handled gracefully without crashes

#### Quality Checklist:

- [ ] All translations verified in both locales
- [ ] Table column order correct
- [ ] Date formatting works for both locales
- [ ] Inline editing functional
- [ ] Fillable fields modal functional
- [ ] Mobile responsive design works
- [ ] Edge cases handled properly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] User experience is smooth and intuitive

## Implementation Notes

### Key Files to Modify:

1. `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json` - Portuguese translations
2. `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json` - English translations
3. `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-statuses-subtable.tsx` - Main component
4. `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcessStatuses.ts` - Backend query (if fillableFields not included)

### Technical Considerations:

- The component already imports `format` from date-fns (line 22), but needs locale imports
- The `locale` constant is already available via `useLocale()` hook (line 37)
- Date inputs must remain in yyyy-mm-dd format for HTML5 date input compatibility
- The fillableFields feature uses a separate modal component (FillFieldsModal) already implemented
- The bug is likely in the data query not including fillableFields from caseStatus relationship

### Current Component Structure:

- Uses inline editing for date and status (Pencil icon)
- Uses separate FileEdit icon for fillable fields modal
- Both features are independent and should work together

### Architecture Pattern:

The component follows the established pattern:

- Uses next-intl for translations (`useTranslations`)
- Uses Convex for queries (`useQuery`)
- Uses date-fns for date operations
- Uses shadcn/ui components (Table, Button, Input, etc.)
- Follows mobile-first responsive design with Tailwind CSS

## Definition of Done

- [ ] Section renamed to "Hist�rico do Andamento" in Portuguese and "Progress History" in English
- [ ] Column renamed to "Data Andamento" in Portuguese and "Progress Date" in English
- [ ] Date column is the first column in the table
- [ ] Dates display in dd/mm/yyyy format when language is Portuguese
- [ ] Dates display in appropriate English format when language is English
- [ ] Edit (Pencil) button correctly opens fillable fields modal when status has fillable fields
- [ ] Inline editing for date and status still works correctly
- [ ] All translations consistent across the application
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Mobile responsive design maintained
- [ ] All edge cases handled gracefully
- [ ] Code follows project conventions and patterns
- [ ] Changes tested in both Portuguese and English locales
