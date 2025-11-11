# TODO: Replace Email Column with Website Column in Companies Table

## Context

In the Companies page table, we need to hide the "E-mail" column and replace it with a "Website" column. This involves modifying the table column definitions in the companies-table.tsx component. The data model already supports both fields, so this is primarily a UI change.

## Related PRD Sections

- Section 4.1: Database Schema - COMPANIES table includes both `website` and `email` fields
- Section 10.4: companies table schema confirms both fields exist

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and confirm file locations for this change

#### Sub-tasks:

- [x] 0.1: Review `/ai_docs/prd.md` for project architecture and folder structure
  - Validation: Confirmed component location pattern
  - Output: Components are in `/components/companies/` directory

- [x] 0.2: Identify the exact file that needs modification
  - Validation: Located the table component file
  - Output: `/Users/elberrd/Documents/Development/clientes/casys4/components/companies/companies-table.tsx`

- [x] 0.3: Check for existing data model support for website field
  - Validation: Confirmed Company interface includes `website?: string`
  - Output: Website field already exists in Company interface (line 39) and is already supported in validation schema

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Data model supports the required field (website)
- [x] No duplicate functionality will be created

### 1. Modify Companies Table Column Definitions

**Objective**: Replace the email column with website column in the companies table component

#### Sub-tasks:

- [x] 1.1: Open `/Users/elberrd/Documents/Development/clientes/casys4/components/companies/companies-table.tsx`
  - Validation: File is accessible and readable
  - Dependencies: None

- [x] 1.2: Locate the email column definition (currently lines 135-143)
  - Validation: Found the column definition object with accessorKey "email"
  - Dependencies: Task 1.1 complete

- [x] 1.3: Replace the email column with website column
  - Change `accessorKey` from "email" to "website"
  - Update the header title from `t('email')` to `t('website')`
  - Update the cell renderer to display `row.original.website` instead of `row.original.email`
  - Add fallback to show '-' when website is empty, similar to other optional fields
  - Validation: Code compiles without errors and follows existing column pattern
  - Dependencies: Task 1.2 complete

#### Quality Checklist:

- [x] TypeScript types are correct (website field already exists in Company interface)
- [x] Column follows the same pattern as other columns (taxId, phoneNumber)
- [x] i18n key `t('website')` is used (already exists in translations)
- [x] Proper null/undefined handling with fallback display
- [x] Code follows clean code principles
- [x] Mobile responsiveness maintained (table already responsive)

### 2. Verify Translation Keys Exist

**Objective**: Ensure i18n translation keys are properly configured for the website column

#### Sub-tasks:

- [x] 2.1: Verify English translation key exists
  - Check `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Confirm "Companies.website" exists
  - Validation: Translation key found (already exists at line with "website": "Website")
  - Dependencies: None

- [x] 2.2: Verify Portuguese translation key exists
  - Check `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Confirm "Companies.website" exists
  - Validation: Translation key exists in Portuguese translations
  - Dependencies: None

#### Quality Checklist:

- [x] English translation key exists and is properly formatted
- [x] Portuguese translation key exists and is properly formatted
- [x] Translation keys follow existing naming conventions
- [x] No missing translation warnings in console

### 3. Test the Changes

**Objective**: Verify the table displays correctly with the new website column

#### Sub-tasks:

- [x] 3.1: Start the development server and navigate to Companies page
  - Command: `npm run dev` (or equivalent)
  - Navigate to `/[locale]/companies`
  - Validation: Page loads without errors
  - Dependencies: Tasks 1.3, 2.1, 2.2 complete

- [x] 3.2: Verify website column is visible in the table
  - Check that "Website" header appears in the table
  - Check that "Email" column is no longer visible
  - Validation: Column headers display correctly
  - Dependencies: Task 3.1 complete

- [x] 3.3: Test website data display
  - Verify companies with website URLs display correctly
  - Verify companies without websites show fallback value ('-')
  - Click on website values to ensure they are properly formatted
  - Validation: Website values display as expected
  - Dependencies: Task 3.2 complete

- [x] 3.4: Test mobile responsiveness
  - Open browser developer tools
  - Test table display at mobile breakpoints (sm: 640px, md: 768px)
  - Ensure table scrolls horizontally if needed
  - Verify column visibility toggle works
  - Validation: Table remains usable on mobile devices
  - Dependencies: Task 3.3 complete

- [x] 3.5: Test sorting and filtering
  - Click website column header to sort
  - Use global filter to search for website values
  - Validation: Sorting and filtering work correctly
  - Dependencies: Task 3.4 complete

#### Quality Checklist:

- [x] No console errors or warnings
- [x] Website column displays in correct position (where email was)
- [x] Email column is no longer visible
- [x] Data displays correctly for all companies
- [x] Fallback value ('-') shows for empty websites
- [x] Mobile responsiveness works (sm, md, lg breakpoints)
- [x] Sorting functionality works on website column
- [x] Global search includes website values
- [x] Column visibility toggle includes website option

## Implementation Notes

### Key Technical Considerations:

1. **No Data Model Changes Required**: The Company interface already includes the `website` field (line 39), so no schema changes are needed.

2. **Existing Validation**: The validation schema in `/lib/validations/companies.ts` already handles website URLs with proper validation (line 20).

3. **Translation Keys**: Both English and Portuguese translation files already contain the "website" key in the Companies section.

4. **Column Position**: The email column is currently positioned between phoneNumber and isActive columns. The website column will replace it in the same position.

5. **Data Rendering Pattern**: Follow the same pattern as other optional text fields like `phoneNumber` and `taxId` - display the value if present, otherwise show '-'.

6. **No Breaking Changes**: This is purely a UI change that doesn't affect the data model, API, or other components.

### Files to be Modified:

1. `/Users/elberrd/Documents/Development/clientes/casys4/components/companies/companies-table.tsx` (lines 135-143)

### Files to Verify (No Changes Needed):

1. `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/companies.ts` - Already has website validation
2. `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json` - Already has website translation
3. `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json` - Already has website translation

## Definition of Done

- [x] All tasks completed
- [x] All quality checklists passed
- [x] Email column is hidden/removed from the table
- [x] Website column is visible in the table in the same position
- [x] Website data displays correctly for all companies
- [x] Empty websites show fallback value ('-')
- [x] Column sorting works on website field
- [x] Column filtering includes website values
- [x] Mobile responsiveness verified (sm, md, lg breakpoints)
- [x] No console errors or TypeScript errors
- [x] Translation keys work in both English and Portuguese
- [x] Code follows existing patterns and conventions
