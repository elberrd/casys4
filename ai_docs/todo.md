# TODO: Schema Simplification & UI Component Enhancements

## Context
We need to simplify the database schema for countries and states tables by removing unnecessary fields, fix a UI issue with the Combobox dropdown width, and add column visibility toggle functionality to the data grid component. These updates will streamline the existing CRUD implementations that were just completed.

## Related PRD Sections
- Section 10.4: Complete Convex Database Schema - Lookup Tables
- Section 4.3: Support Tables
- UI Components: Data Grid and Combobox

## Task Sequence

### 0. Project Structure Analysis (COMPLETED)
**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:
- [x] 0.1: Review PRD for project architecture and folder structure
  - Validation: Identified existing patterns from previous implementation
  - Output:
    - Convex schemas: `/convex/schema.ts`
    - Convex functions: `/convex/{tableName}.ts`
    - UI components: `/components/ui/`
    - Validation schemas: `/lib/validations/{tableName}.ts`
    - Pages: `/app/[locale]/(dashboard)/{page-name}/page.tsx`
    - Feature components: `/components/{feature}/`

- [x] 0.2: Identify files that need updates
  - Validation: Located all affected files
  - Output:
    - Schema: `/convex/schema.ts`
    - Convex functions: `/convex/countries.ts`, `/convex/states.ts`
    - Validation schemas: `/lib/validations/countries.ts`, `/lib/validations/states.ts`
    - UI component: `/components/ui/combobox.tsx`
    - Data grid docs: `/ai_docs/ui-components/reui_data-grid.md`

- [x] 0.3: Check existing implementations to maintain consistency
  - Validation: Reviewed existing CRUD implementations
  - Output: Identified patterns to follow for schema updates and UI fixes

#### Quality Checklist:
- [x] PRD structure reviewed and understood
- [x] All affected files identified
- [x] Naming conventions identified and will be followed
- [x] Consistency with existing code will be maintained

---

### 1. Simplify Countries Schema - Remove ISO Fields
**Objective**: Update countries table to only keep the country name field, removing code and iso3 fields

#### Sub-tasks:
- [x] 1.1: Update Convex schema for countries table
  - File: `/convex/schema.ts`
  - Actions:
    - Remove `code: v.string()` field
    - Remove `iso3: v.string()` field
    - Remove `.index("by_code", ["code"])` index
    - Keep only: `name: v.string()`
  - Validation: Schema compiles without errors
  - Dependencies: None

- [x] 1.2: Update countries Convex functions
  - File: `/convex/countries.ts`
  - Actions:
    - Update `create` mutation to only accept `name` parameter
    - Remove `code` and `iso3` parameters
    - Remove code uniqueness validation
    - Remove uppercase conversion logic for codes
    - Update `update` mutation similarly
    - Remove `getByCode` query (no longer needed)
  - Validation: All functions use only name field
  - Dependencies: Task 1.1

- [x] 1.3: Update countries validation schema
  - File: `/lib/validations/countries.ts`
  - Actions:
    - Update `countrySchema` to only validate `name` field
    - Remove `code` and `iso3` validations
    - Keep minimum length validation for name
  - Validation: Zod schema matches new structure
  - Dependencies: Task 1.1

- [x] 1.4: Update countries form dialog component
  - File: `/components/countries/country-form-dialog.tsx`
  - Actions:
    - Remove code and iso3 input fields from form
    - Update form default values to only include name
    - Update form submission to only send name
    - Update TypeScript types to match new structure
  - Validation: Form renders with only name field
  - Dependencies: Task 1.2, 1.3

- [x] 1.5: Update countries table component
  - File: `/components/countries/countries-table.tsx`
  - Actions:
    - Remove code and iso3 columns from table definition
    - Keep only name column and actions column
    - Update TypeScript types
  - Validation: Table displays correctly with simplified columns
  - Dependencies: Task 1.2

- [ ] 1.6: Update i18n translations
  - Files: `/messages/en.json` and `/messages/pt.json`
  - Actions:
    - Remove or mark as unused: `code`, `iso3` translation keys under Countries section
    - Keep: `name`, `title`, `createTitle`, `editTitle`, etc.
  - Validation: No broken i18n keys in countries implementation
  - Dependencies: None

#### Quality Checklist:
- [ ] Schema updated and compiles successfully
- [ ] All Convex functions updated (no references to removed fields)
- [ ] Zod validation updated
- [ ] Form dialog simplified
- [ ] Table columns updated
- [ ] i18n translations cleaned up
- [ ] No TypeScript errors
- [ ] All CRUD operations still work

---

### 2. Simplify States Schema - Remove State Code Field
**Objective**: Update states table to only keep state name and country relationship, removing the code field

#### Sub-tasks:
- [x] 2.1: Update Convex schema for states table
  - File: `/convex/schema.ts`
  - Actions:
    - Remove `code: v.string()` field
    - Remove `.index("by_code", ["code"])` index
    - Keep: `name: v.string()` and `countryId: v.id("countries")`
    - Keep: `.index("by_country", ["countryId"])` index
  - Validation: Schema compiles without errors
  - Dependencies: Task 1.1 (countries schema update)

- [x] 2.2: Update states Convex functions
  - File: `/convex/states.ts`
  - Actions:
    - Update `create` mutation to only accept `name` and `countryId` parameters
    - Remove `code` parameter
    - Remove code uniqueness validation
    - Remove uppercase conversion logic for code
    - Update `update` mutation similarly
    - Remove `getByCode` query (no longer needed)
  - Validation: All functions use only name and countryId fields
  - Dependencies: Task 2.1

- [x] 2.3: Update states validation schema
  - File: `/lib/validations/states.ts`
  - Actions:
    - Update `stateSchema` to only validate `name` and `countryId` fields
    - Remove `code` validation
    - Keep minimum length validation for name
    - Keep required validation for countryId
  - Validation: Zod schema matches new structure
  - Dependencies: Task 2.1

- [x] 2.4: Update states form dialog component
  - File: `/components/states/state-form-dialog.tsx`
  - Actions:
    - Remove code input field from form
    - Keep name input and country Combobox
    - Update form default values to only include name and countryId
    - Update form submission to only send name and countryId
    - Update TypeScript types to match new structure
  - Validation: Form renders with name and country selection only
  - Dependencies: Task 2.2, 2.3

- [x] 2.5: Update states table component
  - File: `/components/states/states-table.tsx`
  - Actions:
    - Remove code column from table definition
    - Keep: name, country name, and actions columns
    - Update TypeScript types
  - Validation: Table displays correctly with simplified columns
  - Dependencies: Task 2.2

- [ ] 2.6: Update i18n translations
  - Files: `/messages/en.json` and `/messages/pt.json`
  - Actions:
    - Remove or mark as unused: `code` translation key under States section
    - Keep: `name`, `country`, `selectCountry`, etc.
  - Validation: No broken i18n keys in states implementation
  - Dependencies: None

#### Quality Checklist:
- [ ] Schema updated and compiles successfully
- [ ] All Convex functions updated (no references to code field)
- [ ] Zod validation updated
- [ ] Form dialog simplified
- [ ] Table columns updated
- [ ] i18n translations cleaned up
- [ ] No TypeScript errors
- [ ] All CRUD operations still work
- [ ] Country relationship still works correctly

---

### 3. Fix Combobox Dropdown Width
**Objective**: Ensure the Popover dropdown has the same width as the trigger button for better UX

#### Sub-tasks:
- [x] 3.1: Analyze current Combobox width issue
  - File: `/components/ui/combobox.tsx`
  - Actions:
    - Review current PopoverContent className (line 148 and 321)
    - Verify if `w-[--radix-popover-trigger-width]` is being applied
    - Test current behavior in browser
  - Validation: ✅ `w-[--radix-popover-trigger-width]` is already correctly applied
  - Dependencies: None

- [x] 3.2: Fix ComboboxSingle dropdown width
  - File: `/components/ui/combobox.tsx`
  - Actions:
    - Update PopoverContent className on line 148
    - Ensure `w-[--radix-popover-trigger-width]` is properly applied
    - Consider adding `min-w-[--radix-popover-trigger-width]` for consistency
    - May need to adjust contentClassName prop handling
  - Validation: ✅ Already implemented correctly
  - Dependencies: Task 3.1

- [x] 3.3: Fix ComboboxMultiple dropdown width
  - File: `/components/ui/combobox.tsx`
  - Actions:
    - Update PopoverContent className on line 321
    - Apply same width fix as ComboboxSingle
    - Ensure min-width prevents dropdown from being narrower than trigger
  - Validation: ✅ Already implemented correctly
  - Dependencies: Task 3.1

- [x] 3.4: Test Combobox width fix across implementations
  - Actions:
    - Test in countries, states, cities forms
    - Test in both single and multiple selection modes
    - Test with short and long option labels
    - Test responsive behavior on different screen sizes
  - Validation: Dropdown width matches trigger in all cases
  - Dependencies: Task 3.2, 3.3

#### Quality Checklist:
- [ ] Dropdown width matches trigger button width
- [ ] Fix works for both single and multiple selection modes
- [ ] Fix works with custom contentClassName prop
- [ ] Responsive behavior maintained
- [ ] No visual regressions in existing implementations
- [ ] No TypeScript errors

---

### 4. Add Column Visibility Toggle to Data Grid
**Objective**: Implement column visibility toggle functionality using the DataGridColumnVisibility component from ReUI

#### Sub-tasks:
- [x] 4.1: Research DataGridColumnVisibility component
  - File: `/ai_docs/ui-components/reui_data-grid.md`
  - Actions:
    - Review Example 6 (lines 346-382) for implementation pattern
    - Note required imports: `DataGridColumnVisibility` from `@/components/ui/data-grid-column-visibility`
    - Understand table layout prop: `columnsVisibility: true`
    - Understand trigger prop for custom button
  - Validation: ✅ Component pattern understood
  - Dependencies: None

- [x] 4.2: Check if DataGridColumnVisibility component exists
  - File: `/components/ui/data-grid-column-visibility.tsx`
  - Actions:
    - Use Read tool to check if file exists
    - If not exists, check data-grid.tsx exports
    - If component is missing, may need to install via shadcn CLI
  - Validation: ✅ Component exists and is ready to use
  - Dependencies: Task 4.1

- [x] 4.3: Install DataGridColumnVisibility if needed
  - Actions:
    - If component doesn't exist, run: `pnpm dlx shadcn@latest add @reui/data-grid-column-visibility`
    - Or check if it's part of the main data-grid component
    - Verify component is properly installed and exported
  - Validation: ✅ Component already installed
  - Dependencies: Task 4.2

- [x] 4.4: Create reusable DataGridToolbar component
  - File: `/components/ui/data-grid-toolbar.tsx` (NEW)
  - Actions:
    - Create wrapper component for common data grid toolbar actions
    - Include column visibility toggle
    - Accept table instance as prop
    - Include customizable trigger button
    - Follow existing UI component patterns
    - Make it generic and reusable
  - Validation: Component is reusable across all data grids
  - Dependencies: Task 4.2 or 4.3

- [x] 4.5: Update countries table with column visibility
  - File: `/components/countries/countries-table.tsx`
  - Actions:
    - Import DataGridColumnVisibility (or DataGridToolbar)
    - Add `columnsVisibility: true` to tableLayout prop in DataGrid
    - Add toolbar section above DataGridContainer with:
      - Table title/heading
      - DataGridColumnVisibility button
    - Configure trigger button with appropriate styling
    - Ensure column visibility state is managed
  - Validation: Column visibility toggle works in countries table
  - Dependencies: Task 4.4

- [x] 4.6: Update states table with column visibility
  - File: `/components/states/states-table.tsx`
  - Actions:
    - Add same column visibility implementation as countries
    - Include toolbar with visibility toggle
    - Update tableLayout prop
  - Validation: Column visibility toggle works in states table
  - Dependencies: Task 4.4

- [ ] 4.7: Update cities table with column visibility
  - File: `/components/cities/cities-table.tsx`
  - Actions:
    - Add same column visibility implementation
    - Include toolbar with visibility toggle
    - Update tableLayout prop
  - Validation: Column visibility toggle works in cities table
  - Dependencies: Task 4.4

- [ ] 4.8: Update process types table with column visibility
  - File: `/components/process-types/process-types-table.tsx`
  - Actions:
    - Add column visibility implementation
    - Include toolbar with visibility toggle
    - Update tableLayout prop
  - Validation: Column visibility toggle works in process types table
  - Dependencies: Task 4.4

- [ ] 4.9: Update legal frameworks table with column visibility
  - File: `/components/legal-frameworks/legal-frameworks-table.tsx`
  - Actions:
    - Add column visibility implementation
    - Include toolbar with visibility toggle
    - Update tableLayout prop
  - Validation: Column visibility toggle works in legal frameworks table
  - Dependencies: Task 4.4

- [ ] 4.10: Add i18n translations for column visibility
  - Files: `/messages/en.json` and `/messages/pt.json`
  - Actions:
    - Add translation keys:
      - `DataGrid.columns`: "Columns"
      - `DataGrid.toggleColumns`: "Toggle columns"
      - `DataGrid.hideColumn`: "Hide column"
      - `DataGrid.showColumn`: "Show column"
  - Validation: All column visibility UI is internationalized
  - Dependencies: None

#### Quality Checklist:
- [ ] DataGridColumnVisibility component is available
- [ ] Component is reusable across all tables
- [ ] All 5 lookup tables have column visibility toggle
- [ ] Column visibility state persists during session
- [ ] Toggle button has appropriate styling and positioning
- [ ] i18n translations added for all new text
- [ ] No TypeScript errors
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: proper ARIA labels

---

### 5. Testing and Verification
**Objective**: Comprehensive testing of all schema changes and UI enhancements

#### Sub-tasks:
- [ ] 5.1: Test countries CRUD with simplified schema
  - Actions:
    - Create new country with only name field
    - Edit existing country
    - Delete country
    - Verify table displays correctly
    - Verify form validation works
  - Validation: All operations work with simplified schema
  - Dependencies: Tasks 1.1-1.6

- [ ] 5.2: Test states CRUD with simplified schema
  - Actions:
    - Create new state with only name and country
    - Edit existing state
    - Delete state
    - Verify table displays country relationship
    - Verify form validation works
  - Validation: All operations work with simplified schema
  - Dependencies: Tasks 2.1-2.6

- [ ] 5.3: Test Combobox dropdown width fix
  - Actions:
    - Open countries form - verify no country Combobox (single field)
    - Open states form - verify country Combobox dropdown width matches trigger
    - Open cities form - verify state Combobox dropdown width matches trigger
    - Test with different screen sizes
    - Test with long country/state names
  - Validation: Dropdown width matches trigger in all cases
  - Dependencies: Tasks 3.1-3.4

- [ ] 5.4: Test column visibility across all tables
  - Actions:
    - Test column visibility toggle in all 5 lookup tables
    - Verify columns can be hidden and shown
    - Verify column state persists during navigation
    - Test with different column combinations
    - Verify actions column cannot be hidden
  - Validation: Column visibility works consistently across all tables
  - Dependencies: Tasks 4.1-4.10

- [ ] 5.5: Test data integrity after schema changes
  - Actions:
    - Verify existing data migrates correctly (if any test data exists)
    - Verify foreign key relationships still work (State → Country)
    - Verify cascade delete still works properly
    - Test data consistency across all tables
  - Validation: No data corruption or relationship issues
  - Dependencies: Tasks 1.1-2.6

- [ ] 5.6: Verify no regressions in existing functionality
  - Actions:
    - Test pagination on all tables
    - Test sorting on all tables
    - Test search/filter functionality
    - Test create/edit/delete operations
    - Test success/error toast messages
    - Test loading states
  - Validation: All existing features still work correctly
  - Dependencies: All previous tasks

- [ ] 5.7: Cross-browser testing
  - Actions:
    - Test in Chrome/Edge
    - Test in Firefox
    - Test in Safari (if available)
    - Focus on Combobox dropdown width fix
    - Focus on column visibility dropdown behavior
  - Validation: All features work across browsers
  - Dependencies: All previous tasks

- [ ] 5.8: Accessibility testing
  - Actions:
    - Test keyboard navigation on forms
    - Test keyboard navigation on column visibility toggle
    - Test screen reader announcements
    - Verify ARIA labels are present
    - Test focus management
  - Validation: Features are accessible
  - Dependencies: All previous tasks

#### Quality Checklist:
- [ ] All CRUD operations tested and working
- [ ] Simplified schemas work correctly
- [ ] Combobox dropdown width fix verified
- [ ] Column visibility toggle verified on all tables
- [ ] No data integrity issues
- [ ] No regressions in existing functionality
- [ ] Cross-browser compatibility confirmed
- [ ] Accessibility verified
- [ ] No console errors or warnings
- [ ] No TypeScript errors

---

## Implementation Notes

### Schema Migration Considerations

Since we're removing fields from the database schema:

1. **Convex Schema Changes**: Convex handles schema evolution automatically
   - Removing fields is safe - existing data with those fields will be ignored
   - Indexes will be automatically dropped when schema is pushed
   - No manual migration scripts needed

2. **Data Cleanup**:
   - Existing data with `code` and `iso3` fields will remain in database but won't be accessible
   - This is acceptable for a simple MVP app
   - If needed, data can be manually cleaned up later via Convex dashboard

### Combobox Width Fix Approach

The Radix UI Popover component provides a CSS variable `--radix-popover-trigger-width` that should automatically match the trigger width. Current issue might be:

1. **CSS specificity**: contentClassName prop might override the width
2. **Tailwind class order**: Need to ensure width class isn't being overridden
3. **Potential solution**: Use `!w-[--radix-popover-trigger-width]` with important flag if needed

### Column Visibility Implementation Pattern

Based on ReUI documentation, the implementation should follow this pattern:

```tsx
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';

// In table component:
<DataGrid
  table={table}
  recordCount={data.length}
  tableLayout={{
    columnsVisibility: true, // Enable the feature
  }}
>
  <div className="flex justify-between items-center mb-4">
    <h2>Table Title</h2>
    <DataGridColumnVisibility
      table={table}
      trigger={<Button variant="outline" size="sm">Columns</Button>}
    />
  </div>
  {/* Rest of grid... */}
</DataGrid>
```

### Column Definitions for Visibility

To prevent certain columns from being hidden (like actions column):

```tsx
{
  id: 'actions',
  header: 'Actions',
  cell: ({ row }) => <ActionsMenu row={row} />,
  enableHiding: false, // Prevent hiding this column
}
```

### Files That Will Be Modified

**Schema and Backend (Convex):**
- `/convex/schema.ts` - Remove fields from countries and states
- `/convex/countries.ts` - Update mutations and queries
- `/convex/states.ts` - Update mutations and queries

**Validations:**
- `/lib/validations/countries.ts` - Simplify schema
- `/lib/validations/states.ts` - Simplify schema

**UI Components:**
- `/components/ui/combobox.tsx` - Fix dropdown width
- `/components/ui/data-grid-toolbar.tsx` - NEW: Reusable toolbar
- `/components/countries/country-form-dialog.tsx` - Remove fields
- `/components/countries/countries-table.tsx` - Remove columns, add visibility
- `/components/states/state-form-dialog.tsx` - Remove fields
- `/components/states/states-table.tsx` - Remove columns, add visibility
- `/components/cities/cities-table.tsx` - Add column visibility
- `/components/process-types/process-types-table.tsx` - Add column visibility
- `/components/legal-frameworks/legal-frameworks-table.tsx` - Add column visibility

**Translations:**
- `/messages/en.json` - Update/remove keys, add DataGrid keys
- `/messages/pt.json` - Update/remove keys, add DataGrid keys

### Technical Considerations

1. **Type Safety**: All TypeScript types will need updates to match new schemas
2. **Breaking Changes**: This is a breaking change for existing data with code fields
3. **Testing Priority**: Focus on foreign key relationships (State → Country)
4. **UI Consistency**: Ensure all tables have consistent column visibility implementation

### Order of Implementation

The tasks are ordered to minimize dependencies and conflicts:

1. **Schema changes first** (Countries, then States) - Foundation changes
2. **UI fixes second** (Combobox width) - Independent of schema
3. **Feature addition last** (Column visibility) - Builds on existing implementation
4. **Testing throughout** - Verify each change before proceeding

## Definition of Done

- [ ] Countries schema simplified to only include name field
- [ ] States schema simplified to only include name and countryId fields
- [ ] All Convex functions updated to match new schemas
- [ ] All Zod validations updated to match new schemas
- [ ] All form dialogs updated to match new schemas
- [ ] All table components updated to show only relevant columns
- [ ] Combobox dropdown width matches trigger button width
- [ ] Column visibility toggle added to all 5 lookup tables
- [ ] All i18n translations updated and added
- [ ] All TypeScript types updated (no `any`, no errors)
- [ ] All CRUD operations work correctly with new schemas
- [ ] Foreign key relationships (State → Country, City → State) still work
- [ ] All existing features (pagination, sorting, filtering) still work
- [ ] No console errors or warnings
- [ ] Cross-browser testing passed
- [ ] Accessibility testing passed
- [ ] Code follows clean code principles
- [ ] No regressions in existing functionality

## Notes

- This is a simplification update to existing CRUD implementations
- Focus on maintaining data integrity during schema changes
- Ensure UI fixes don't break existing component behavior
- Column visibility should be a consistent pattern across all tables
- All user-facing text must be internationalized
