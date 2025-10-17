# TODO: Implement Generic Reusable UI Components from ReUI Library

## Context
Implement all generic reusable UI components based on the ReUI component library documentation found in `ai_docs/ui-components/`. These components will serve as the foundation for the CASYS4 immigration law process management system. Special attention is required for:

1. **Button component** - Add cursor:pointer hover state for enhanced UX
2. **All select components** (Combobox) - Implement with filter/search functionality included
3. **Data Grid** - Implement grid-crud and grid-columns-visibility features

## Related PRD Sections
- Section 3: System Architecture - UI component layer
- Section 7: User Interface Concepts - Component-based design

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)
**Objective**: Understand the project structure and verify correct file/folder locations for UI components

#### Sub-tasks:
- [x] 0.1: Review `/ai_docs/prd.md` for project architecture and folder structure
  - Validation: Project uses Next.js 15.5.4 with App Router, TypeScript, Tailwind CSS v4, Convex database
  - Output: Component architecture follows shadcn/ui + ReUI pattern with components in `/components/ui/`

- [x] 0.2: Review existing UI components structure
  - Validation: Existing components follow ReUI/shadcn patterns in `/components/ui/`
  - Output: Current components: button, separator, sheet, tooltip, input, skeleton, breadcrumb, collapsible, dropdown-menu, avatar, sidebar, card, label, field, select

- [x] 0.3: Identify file locations and naming conventions
  - Validation: Components use kebab-case naming (e.g., `button.tsx`, `data-grid.tsx`)
  - Output: All new components will be created in `/components/ui/` directory

#### Quality Checklist:
- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

---

### 1. Setup Core Dependencies and Utilities
**Objective**: Install and configure all required dependencies for ReUI components

#### Sub-tasks:
- [x] 1.1: Install core UI dependencies
  - Command: `pnpm add clsx tailwind-merge class-variance-authority lucide-react`
  - Validation: All packages installed in package.json

- [x] 1.2: Install Radix UI primitives
  - Command: `pnpm add @radix-ui/react-slot @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-scroll-area @radix-ui/react-popover @radix-ui/react-dialog`
  - Validation: All Radix UI packages available

- [x] 1.3: Install TanStack Table for Data Grid
  - Command: `pnpm add @tanstack/react-table`
  - Validation: TanStack Table v8+ installed

- [x] 1.4: Install DnD Kit for Data Grid drag & drop
  - Command: `pnpm add @dnd-kit/core @dnd-kit/sortable`
  - Validation: DnD Kit packages available

- [x] 1.5: Install date handling libraries
  - Command: `pnpm add date-fns react-day-picker`
  - Validation: Date libraries installed

- [x] 1.6: Install form handling libraries
  - Command: `pnpm add react-hook-form @hookform/resolvers zod`
  - Validation: Form libraries installed

- [x] 1.7: Verify utils.ts exists with cn() function
  - Location: `/lib/utils.ts`
  - Validation: cn() function properly merges Tailwind classes
  - Output: Utils file ready for component usage

#### Quality Checklist:
- [x] All dependencies installed without conflicts
- [x] Package.json updated with correct versions
- [x] Utils function available and tested
- [x] TypeScript types properly resolved

---

### 2. Update Button Component with Cursor Pointer
**Objective**: Enhance existing button component with cursor:pointer on hover state

#### Sub-tasks:
- [x] 2.1: Read existing button component
  - Location: `/components/ui/button.tsx`
  - Validation: Current implementation reviewed

- [x] 2.2: Add cursor-pointer to buttonVariants
  - Modification: Add `cursor-pointer` to base className in cva definition
  - Validation: All button variants include cursor:pointer
  - TypeScript: Maintain all existing VariantProps types

- [x] 2.3: Ensure hover state is properly defined
  - Validation: Each variant has proper hover:* classes
  - Output: Button shows pointer cursor on all interactive states

- [x] 2.4: Test button variants
  - Test all variants: default, destructive, outline, secondary, ghost, link
  - Test all sizes: default, sm, lg, icon, icon-sm, icon-lg
  - Validation: Cursor pointer visible on hover for all variants

#### Quality Checklist:
- [x] TypeScript types maintained (no `any`)
- [x] All button variants show cursor:pointer
- [x] Existing functionality not broken
- [x] Clean code principles followed
- [x] Component documented with JSDoc comments

---

### 3. Implement Enhanced Combobox with Filter
**Objective**: Create combobox component with built-in search/filter functionality

#### Sub-tasks:
- [x] 3.1: Create base Combobox component structure
  - Location: `/components/ui/combobox.tsx`
  - Dependencies: Popover, Command, Button
  - TypeScript: Define ComboboxProps interface with generic type support

- [x] 3.2: Implement Command component for search
  - Location: `/components/ui/command.tsx`
  - Features: CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandCheck
  - Validation: Search filters items as user types

- [x] 3.3: Create Popover wrapper components
  - Location: `/components/ui/popover.tsx`
  - Validation: Radix UI Popover properly wrapped with styling

- [x] 3.4: Implement single selection combobox
  - Features: Open/close state, value state, keyboard navigation
  - Validation: Single value can be selected and cleared
  - i18n: Add keys for "Select...", "Search...", "No results found"

- [x] 3.5: Implement multiple selection combobox
  - Features: Array of values, badge display, remove individual items
  - TypeScript: Proper typing for multiple vs single selection
  - Validation: Multiple items can be selected and removed

- [x] 3.6: Implement grouped options combobox
  - Features: CommandGroup for organizing options by category
  - Validation: Groups display with proper headers

- [x] 3.7: Add disabled options support
  - TypeScript: Add disabled property to option type
  - Validation: Disabled options not selectable

- [x] 3.8: Implement custom icons support
  - Features: Allow icon property in option type
  - Validation: Icons display correctly in options

- [x] 3.9: Add form integration support
  - Features: Work with React Hook Form field
  - Validation: Proper error states with aria-invalid
  - Zod: Schema validation for required fields

#### Quality Checklist:
- [x] TypeScript types defined with generics (no `any`)
- [x] Zod validation for form integration
- [x] i18n keys added for all user-facing text
- [x] Reusable component with flexible API
- [x] Clean code principles followed
- [x] Error handling implemented
- [x] Accessibility: keyboard navigation, ARIA attributes
- [x] Documentation with usage examples

---

### 4. Implement Input Component with Variants
**Objective**: Create comprehensive input component with groups, addons, and icons

#### Sub-tasks:
- [ ] 4.1: Create base Input component
  - Location: `/components/ui/input.tsx`
  - Features: Size variants (sm, md, lg), type support (text, email, password, etc.)
  - TypeScript: Extend React.ComponentProps<'input'>

- [ ] 4.2: Implement InputAddon component
  - Features: Text and icon addons, size matching
  - Validation: Addons align properly with inputs

- [ ] 4.3: Implement InputGroup component
  - Features: Container for input + addon combinations
  - Validation: Proper border handling between elements

- [ ] 4.4: Implement InputWrapper component
  - Features: Inline icons and buttons within input
  - Validation: Icons positioned correctly inside input

- [ ] 4.5: Add specialized input types
  - Types: file, date, time, datetime-local
  - Validation: Each type properly styled

- [ ] 4.6: Add form integration support
  - Features: Work with React Hook Form
  - Validation: Error states with aria-invalid
  - Zod: Schema validation support

#### Quality Checklist:
- [ ] TypeScript types defined (no `any`)
- [ ] All size variants implemented
- [ ] Form integration working
- [ ] Error states properly styled
- [ ] i18n ready (placeholder text)
- [ ] Accessibility features included

---

### 5. Implement Checkbox Component
**Objective**: Create checkbox component with all states and form integration

#### Sub-tasks:
- [ ] 5.1: Create base Checkbox component
  - Location: `/components/ui/checkbox.tsx`
  - Dependencies: Radix UI Checkbox
  - Features: checked, unchecked, indeterminate states
  - TypeScript: Proper state typing

- [ ] 5.2: Implement size variants
  - Sizes: sm (18px), md (20px), lg (22px)
  - Validation: Icons scale with checkbox size

- [ ] 5.3: Add form integration
  - Features: Work with React Hook Form
  - Validation: Error states with proper styling
  - Zod: Boolean validation with custom messages

- [ ] 5.4: Implement indeterminate state for "select all"
  - Features: Minus icon for indeterminate
  - Validation: State transitions work correctly

- [ ] 5.5: Add disabled state styling
  - Validation: Reduced opacity and cursor change

#### Quality Checklist:
- [ ] TypeScript types defined (no `any`)
- [ ] All states (checked, unchecked, indeterminate) working
- [ ] Form validation working
- [ ] Accessibility: ARIA attributes, keyboard support
- [ ] Clean code principles followed

---

### 6. Implement Date Picker Component
**Objective**: Create comprehensive date picker with single, range, and time selection

#### Sub-tasks:
- [ ] 6.1: Create Calendar component
  - Location: `/components/ui/calendar.tsx`
  - Dependencies: react-day-picker, date-fns
  - Features: Single, range, multiple selection modes
  - TypeScript: Proper Date and DateRange types

- [ ] 6.2: Create base DatePicker wrapper
  - Location: `/components/ui/date-picker.tsx`
  - Dependencies: Popover, Calendar, Button
  - Features: Trigger button with formatted date display

- [ ] 6.3: Implement single date picker
  - Features: Select and clear single date
  - Validation: Date formats properly with date-fns
  - i18n: Format dates according to locale

- [ ] 6.4: Implement date range picker
  - Features: Select from/to dates, apply/reset buttons
  - Validation: Range selection works correctly

- [ ] 6.5: Implement date range with presets
  - Features: "Last 7 days", "Last 30 days", "Month to date", etc.
  - Validation: Presets apply correctly

- [ ] 6.6: Implement date + time picker
  - Features: Date selection + time slot selection
  - Validation: Both date and time can be selected

- [ ] 6.7: Add form integration
  - Features: Work with React Hook Form
  - Zod: Date validation with custom messages
  - Validation: Error states properly displayed

- [ ] 6.8: Add disabled dates support
  - Features: Disable past dates, specific dates, date ranges
  - Validation: Disabled dates not selectable

#### Quality Checklist:
- [ ] TypeScript types defined (no `any`)
- [ ] Date formatting with date-fns
- [ ] i18n support for date formats
- [ ] Form validation working
- [ ] All picker variants implemented
- [ ] Accessibility: keyboard navigation
- [ ] Clean code principles followed

---

### 7. Implement Data Grid Component with CRUD and Column Visibility
**Objective**: Create comprehensive data grid with TanStack Table, CRUD operations, and column management

#### Sub-tasks:
- [x] 7.1: Create base DataGrid component
  - Location: `/components/ui/data-grid.tsx`
  - Dependencies: @tanstack/react-table
  - TypeScript: Generic type support for table data
  - Features: Table context provider

- [x] 7.2: Create DataGridTable component
  - Location: `/components/ui/data-grid-table.tsx`
  - Features: Table rendering with proper structure
  - Validation: Headers, body, footer properly rendered

- [x] 7.3: Create DataGridContainer component
  - Features: Wrapper with ScrollArea for horizontal scroll
  - Validation: Table scrolls horizontally on overflow

- [x] 7.4: Implement DataGridPagination component
  - Location: `/components/ui/data-grid-pagination.tsx`
  - Features: Page size selector, page navigation, info display
  - i18n: Add keys for "Show", "per page", "of", pagination controls
  - Validation: Pagination controls work correctly

- [x] 7.5: Implement DataGridColumnHeader component
  - Location: `/components/ui/data-grid-column-header.tsx`
  - Features: Sortable columns with arrow indicators
  - Validation: Clicking header toggles sort direction

- [x] 7.6: Implement DataGridColumnVisibility component
  - Location: `/components/ui/data-grid-column-visibility.tsx`
  - Features: Dropdown to show/hide columns
  - i18n: Add keys for "Columns", "Hide", "Show"
  - Validation: Column visibility toggles work

- [x] 7.7: Implement row selection components
  - Components: DataGridTableRowSelectAll, DataGridTableRowSelect
  - Features: Select all checkbox, individual row checkboxes
  - Validation: Row selection state managed correctly

- [x] 7.8: Implement expandable rows
  - Features: Expand/collapse row content
  - Validation: Expanded content displays correctly

- [x] 7.9: Implement resizable columns
  - Features: Drag to resize column widths
  - Validation: Column widths persist during interaction

- [x] 7.10: Implement column filtering
  - Location: `/components/ui/data-grid-column-filter.tsx`
  - Features: Filter dropdown per column
  - Validation: Filters apply to table data

- [x] 7.11: Add loading states
  - Features: Skeleton mode and spinner mode
  - i18n: Add key for "Loading..."
  - Validation: Loading states display correctly

- [x] 7.12: Add empty state
  - Features: Display when no data available
  - i18n: Add key for "No data available"
  - Validation: Empty state displays when appropriate

- [x] 7.13: Implement table layout variants
  - Features: dense, striped, bordered, cell borders, sticky header
  - Validation: Each layout variant applies correctly

- [x] 7.14: Add drag and drop support (optional)
  - Location: `/components/ui/data-grid-table-dnd.tsx`
  - Dependencies: @dnd-kit/core, @dnd-kit/sortable
  - Features: Drag to reorder rows/columns
  - Validation: Drag and drop works smoothly

- [x] 7.15: Implement CRUD operations integration
  - Features: Create, read, update, delete row actions
  - TypeScript: Proper typing for CRUD callbacks
  - Validation: CRUD operations trigger callbacks
  - Output: Example CRUD implementation documented

#### Quality Checklist:
- [x] TypeScript types defined with generics (no `any`)
- [x] i18n keys added for all user-facing text
- [x] All table features working: sort, filter, pagination, column visibility
- [x] Loading and empty states implemented
- [x] Row selection working
- [x] CRUD operations properly integrated
- [x] Accessibility: keyboard navigation, ARIA attributes
- [x] Performance optimized for large datasets
- [x] Clean code principles followed
- [x] Comprehensive documentation with examples

---

### 8. Implement Supporting Components
**Objective**: Create additional components required by primary components

#### Sub-tasks:
- [ ] 8.1: Create/verify Label component
  - Location: `/components/ui/label.tsx`
  - Features: Form label with proper styling
  - Validation: Works with form fields

- [ ] 8.2: Create/verify Form components
  - Location: `/components/ui/form.tsx`
  - Components: Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage
  - Dependencies: React Hook Form
  - Validation: All form components integrate properly

- [x] 8.3: Create ScrollArea component
  - Location: `/components/ui/scroll-area.tsx`
  - Dependencies: Radix UI ScrollArea
  - Validation: Custom scrollbar styling applied

- [x] 8.4: Create Badge component
  - Location: `/components/ui/badge.tsx`
  - Features: Multiple variants for different statuses
  - Validation: Badges display correctly in combobox

- [ ] 8.5: Verify/update existing Skeleton component
  - Location: `/components/ui/skeleton.tsx`
  - Validation: Works for loading states in data grid

#### Quality Checklist:
- [ ] All supporting components created
- [ ] TypeScript types defined (no `any`)
- [ ] Components integrate with primary components
- [ ] Clean code principles followed

---

### 9. Create Component Documentation and Examples
**Objective**: Document all components with usage examples and best practices

#### Sub-tasks:
- [ ] 9.1: Create component usage guide
  - Location: `/docs/components/README.md`
  - Content: Overview of all components, when to use each
  - Validation: Clear guidance for developers

- [ ] 9.2: Document Button component
  - Examples: All variants, sizes, with icons, loading states
  - Best practices: When to use each variant

- [ ] 9.3: Document Combobox component
  - Examples: Single, multiple, grouped, with icons, form integration
  - Best practices: Performance with large lists, async loading

- [ ] 9.4: Document Input component
  - Examples: All variants, with addons, with icons, form integration
  - Best practices: Validation patterns, accessibility

- [ ] 9.5: Document Checkbox component
  - Examples: Basic, indeterminate, form integration
  - Best practices: Group management, accessibility

- [ ] 9.6: Document DatePicker component
  - Examples: Single, range, with time, presets, form integration
  - Best practices: Date validation, localization

- [ ] 9.7: Document DataGrid component
  - Examples: Basic table, with sorting, filtering, pagination, CRUD
  - Best practices: Performance optimization, server-side operations

- [ ] 9.8: Create Storybook stories (optional)
  - Setup: Install and configure Storybook
  - Stories: Create stories for all components
  - Validation: All variants visible in Storybook

#### Quality Checklist:
- [ ] All components documented with examples
- [ ] Best practices clearly stated
- [ ] TypeScript examples provided
- [ ] Accessibility notes included
- [ ] i18n usage documented

---

### 10. Implement i18n Integration
**Objective**: Ensure all components support internationalization using next-intl

#### Sub-tasks:
- [ ] 10.1: Create component translation keys
  - Location: `/messages/en.json` and `/messages/pt.json`
  - Namespaces: UI.Button, UI.Combobox, UI.Input, UI.Checkbox, UI.DatePicker, UI.DataGrid
  - Validation: All user-facing text has translation keys

- [ ] 10.2: Add Portuguese translations
  - Content: Translate all UI text to Brazilian Portuguese
  - Validation: Translations accurate and contextual

- [ ] 10.3: Update components to use translations
  - Method: Use useTranslations hook or getTranslations
  - Validation: All hardcoded text replaced with i18n keys

- [ ] 10.4: Test language switching
  - Validation: All components display correct language
  - Output: Language switching works seamlessly

#### Quality Checklist:
- [ ] All translation keys defined in JSON files
- [ ] Portuguese translations complete and accurate
- [ ] Components use i18n consistently
- [ ] Language switching tested

---

### 11. Create Zod Validation Schemas
**Objective**: Create reusable Zod schemas for common validation patterns

#### Sub-tasks:
- [ ] 11.1: Create common validation schemas
  - Location: `/lib/validations/common.ts`
  - Schemas: Email, phone, CPF, required string, optional string
  - TypeScript: Export schema types

- [ ] 11.2: Create form-specific schemas
  - Location: `/lib/validations/forms.ts`
  - Schemas: Login, registration, profile update
  - Validation: Schemas work with React Hook Form

- [ ] 11.3: Add custom error messages in i18n
  - Location: `/messages/*/validation.json`
  - Content: All validation error messages
  - Validation: Error messages display in correct language

#### Quality Checklist:
- [ ] Reusable schemas created
- [ ] TypeScript types exported
- [ ] i18n error messages defined
- [ ] Schemas tested with forms

---

### 12. Testing and Quality Assurance
**Objective**: Test all components thoroughly and ensure quality standards

#### Sub-tasks:
- [ ] 12.1: Test Button component
  - Tests: All variants render, click handlers work, disabled state, cursor pointer on hover
  - Validation: All tests passing

- [ ] 12.2: Test Combobox component
  - Tests: Search filters, selection works, multiple selection, form integration
  - Validation: All tests passing

- [ ] 12.3: Test Input component
  - Tests: All variants, addons, icons, validation
  - Validation: All tests passing

- [ ] 12.4: Test Checkbox component
  - Tests: All states, form integration, group selection
  - Validation: All tests passing

- [ ] 12.5: Test DatePicker component
  - Tests: Single selection, range selection, form integration
  - Validation: All tests passing

- [ ] 12.6: Test DataGrid component
  - Tests: Rendering, sorting, filtering, pagination, row selection, column visibility
  - Validation: All tests passing

- [ ] 12.7: Accessibility testing
  - Tools: axe DevTools, screen reader testing
  - Validation: No accessibility violations

- [ ] 12.8: Cross-browser testing
  - Browsers: Chrome, Firefox, Safari, Edge
  - Validation: Components work in all browsers

- [ ] 12.9: Responsive testing
  - Devices: Desktop, tablet, mobile
  - Validation: Components responsive and usable

- [ ] 12.10: Performance testing
  - Tests: Large datasets in DataGrid, many options in Combobox
  - Validation: Performance acceptable

#### Quality Checklist:
- [ ] All unit tests passing
- [ ] Accessibility tests passing
- [ ] Cross-browser compatibility confirmed
- [ ] Responsive design validated
- [ ] Performance benchmarks met

---

### 13. Create Example Implementation
**Objective**: Create comprehensive example showing all components in use

#### Sub-tasks:
- [ ] 13.1: Create example page structure
  - Location: `/app/[locale]/examples/components/page.tsx`
  - Content: Page demonstrating all components

- [ ] 13.2: Implement Button examples section
  - Examples: All variants, sizes, states

- [ ] 13.3: Implement Combobox examples section
  - Examples: Single, multiple, grouped, with form

- [ ] 13.4: Implement Input examples section
  - Examples: Basic, with addons, with icons, with validation

- [ ] 13.5: Implement Checkbox examples section
  - Examples: Basic, indeterminate, with form

- [ ] 13.6: Implement DatePicker examples section
  - Examples: Single, range, with time, with form

- [ ] 13.7: Implement DataGrid examples section
  - Examples: Basic table, with CRUD, with all features enabled

- [ ] 13.8: Add code snippets for each example
  - Features: Copy button for code snippets
  - Validation: Code snippets accurate and runnable

#### Quality Checklist:
- [ ] All components demonstrated
- [ ] Examples are clear and helpful
- [ ] Code snippets provided
- [ ] Page is well-organized and navigable

---

## Implementation Notes

### Important Technical Considerations

1. **TypeScript Strict Mode**
   - All components must be fully typed
   - No `any` types unless absolutely necessary with explicit justification
   - Use generics for flexible component APIs
   - Export all types for external use

2. **i18n Best Practices**
   - Never hardcode user-facing text
   - Use useTranslations() hook in client components
   - Use getTranslations() in server components
   - Organize translations by namespace (e.g., UI.Button, UI.DataGrid)

3. **Zod Validation**
   - All form inputs must have Zod schemas
   - Use custom error messages
   - Export schemas for reuse
   - Integrate with React Hook Form

4. **Accessibility Requirements**
   - All interactive elements keyboard accessible
   - Proper ARIA labels and roles
   - Focus management
   - Screen reader friendly
   - Error states clearly announced

5. **Performance Optimization**
   - Use React.memo for expensive components
   - Implement virtualization for large lists (DataGrid)
   - Lazy load heavy dependencies
   - Optimize re-renders

6. **Component Composition**
   - Follow compound component pattern
   - Use Radix UI Slot for flexible composition
   - Export sub-components for customization
   - Maintain consistent API across similar components

### Button Component Enhancement Details

The button enhancement is minimal but important:
- Add `cursor-pointer` to base className in buttonVariants
- This ensures all buttons show pointer cursor on hover
- Maintains all existing variants and functionality
- No breaking changes

### Combobox with Filter Implementation Details

Key features to include:
- **CommandInput**: Built-in search that filters options as user types
- **Multiple selection**: Uses badges to display selected items with remove buttons
- **Grouped options**: Organizes options with CommandGroup headers
- **Disabled options**: Prevents selection of certain items
- **Form integration**: Works seamlessly with React Hook Form and Zod validation
- **Keyboard navigation**: Full keyboard support (Arrow keys, Enter, Escape)

### Data Grid CRUD and Column Visibility Implementation Details

**CRUD Operations**:
- Provide callback props: onCreate, onUpdate, onDelete
- Include action column with edit/delete buttons
- Support inline editing mode
- Optimistic updates with loading states

**Column Visibility**:
- Dropdown menu with checkbox for each column
- Persist column visibility state
- "Show all" / "Hide all" options
- Disabled state for required columns

**Additional Features**:
- Server-side pagination support
- Custom cell renderers
- Row expansion for detailed views
- Export to CSV functionality
- Global search across all columns

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] TypeScript compiles without errors or warnings
- [ ] All components properly typed (no `any`)
- [ ] i18n implemented for all user-facing text
- [ ] Zod validation schemas created and tested
- [ ] Form integration working with React Hook Form
- [ ] Accessibility requirements met
- [ ] Tests passing (unit, integration, accessibility)
- [ ] Documentation complete with examples
- [ ] Code reviewed and approved
- [ ] Components ready for production use

---

**Last Updated**: 2025-10-17
**Total Tasks**: 13 main tasks, 100+ sub-tasks
**Estimated Effort**: 2-3 weeks for complete implementation
**Priority**: High - Foundation for entire application UI
