# TODO: Add Input Masks for CNPJ and CPF Fields

## Context

The application currently accepts CNPJ (company tax ID) and CPF (individual tax ID) inputs as plain text fields without input masks. Users need to manually format these fields, which can lead to inconsistent data entry and validation issues. This feature will add automatic formatting masks to all CNPJ and CPF input fields throughout the application using the Brazilian format standards:

- **CPF Format**: 000.000.000-00 (11 digits)
- **CNPJ Format**: 00.000.000/0000-00 (14 digits)

## Related PRD Sections

From `/ai_docs/prd.md`:
- Section 10.4: Database Schema - `people` table has `cpf` field
- Section 10.4: Database Schema - `companies` table has `taxId` field (CNPJ)
- The system is a Next.js application with React Hook Form for form management
- Uses Zod for validation schemas
- Implements i18n for user-facing text

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and identify all CNPJ/CPF input locations

#### Sub-tasks:

- [x] 0.1: Review project architecture and folder structure
  - Validation: Identified component patterns in `/components` directory
  - Output: Form components follow pattern: `[entity]-form-dialog.tsx` and `[entity]-form-page.tsx`

- [x] 0.2: Identify all files with CPF/CNPJ input fields
  - Validation: Found 6 files with CPF fields and 4 files with taxId (CNPJ) fields
  - Output:
    - **CPF fields**: person-form-dialog.tsx, person-form-page.tsx, person-detail-view.tsx, people-table.tsx, bulk-import-people-dialog.tsx, bulk-create-individual-process-dialog.tsx
    - **CNPJ fields**: company-form-dialog.tsx, company-form-page.tsx, companies-table.tsx, company-view-modal.tsx

- [x] 0.3: Review validation schemas for CNPJ/CPF
  - Validation: Found existing validation in `/lib/validations/people.ts` and `/lib/validations/companies.ts`
  - Output: CPF has regex validation, CNPJ (taxId) has basic string validation

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] All form components identified
- [x] No duplicate functionality will be created

### 1. Install and Configure Input Mask Library

**Objective**: Set up the input mask library that will be used for formatting CNPJ and CPF fields

#### Sub-tasks:

- [x] 1.1: Install react-input-mask library
  - Command: `pnpm add react-input-mask @types/react-input-mask`
  - Validation: Library appears in package.json dependencies ✓
  - Note: This library is lightweight, works well with React Hook Form, and supports dynamic masks

- [x] 1.2: Create utility functions for CNPJ/CPF formatting and validation
  - File: `/lib/utils/document-masks.ts` ✓
  - Validation: Functions properly format and clean CNPJ/CPF values ✓
  - Content includes:
    - `formatCPF(value: string): string` - Formats to 000.000.000-00 ✓
    - `formatCNPJ(value: string): string` - Formats to 00.000.000/0000-00 ✓
    - `cleanDocumentNumber(value: string): string` - Removes formatting characters ✓
    - `getCPFMask(): string` - Returns "999.999.999-99" ✓
    - `getCNPJMask(): string` - Returns "99.999.999/9999-99" ✓
    - `isValidCPF(cpf: string): boolean` - Validates CPF with check digits ✓
    - `isValidCNPJ(cnpj: string): boolean` - Validates CNPJ with check digits ✓

#### Quality Checklist:

- [x] Library installed successfully ✓
- [x] TypeScript types installed ✓
- [x] Utility functions created with proper TypeScript types ✓
- [x] Functions handle edge cases (empty strings, partial inputs) ✓
- [x] Functions properly clean and format values ✓

### 2. Create Reusable Masked Input Components

**Objective**: Create wrapper components for masked inputs that integrate with React Hook Form

#### Sub-tasks:

- [ ] 2.1: Create CPF masked input component
  - File: `/components/ui/cpf-input.tsx`
  - Validation: Component works with React Hook Form Controller
  - Features:
    - Uses react-input-mask with CPF mask (999.999.999-99)
    - Integrates with FormControl from shadcn/ui
    - Accepts standard Input props
    - Properly forwards ref for React Hook Form
    - Shows formatted value while typing
    - Returns cleaned value (digits only) to form

- [ ] 2.2: Create CNPJ masked input component
  - File: `/components/ui/cnpj-input.tsx`
  - Validation: Component works with React Hook Form Controller
  - Features:
    - Uses react-input-mask with CNPJ mask (99.999.999/9999-99)
    - Integrates with FormControl from shadcn/ui
    - Accepts standard Input props
    - Properly forwards ref for React Hook Form
    - Shows formatted value while typing
    - Returns cleaned value (digits only) to form

#### Quality Checklist:

- [ ] Components follow existing UI component patterns
- [ ] TypeScript types defined (no `any`)
- [ ] Components are properly exported
- [ ] Components work with React Hook Form's Controller
- [ ] Visual styling matches existing Input component
- [ ] Mobile responsive (works on touch devices)

### 3. Update Validation Schemas

**Objective**: Update Zod validation schemas to work with both formatted and unformatted input

#### Sub-tasks:

- [ ] 3.1: Update CPF validation in people schema
  - File: `/lib/validations/people.ts`
  - Validation: Schema accepts both formatted (000.000.000-00) and unformatted (00000000000) CPF
  - Changes:
    - Update cpfRegex to accept both formats
    - Add proper validation error messages
    - Use utility function for CPF validation with check digits
    - Transform formatted input to clean format before storage

- [ ] 3.2: Update CNPJ validation in companies schema
  - File: `/lib/validations/companies.ts`
  - Validation: Schema accepts both formatted (00.000.000/0000-00) and unformatted (00000000000000) CNPJ
  - Changes:
    - Add cnpjRegex validation
    - Add proper validation error messages
    - Use utility function for CNPJ validation with check digits
    - Transform formatted input to clean format before storage

- [ ] 3.3: Update bulk operations validation
  - File: `/lib/validations/bulk-operations.ts`
  - Validation: Bulk import schemas handle both formatted and unformatted documents
  - Changes:
    - Update CPF validation in bulkImportPeopleSchema
    - Ensure CSV import can handle both formats

#### Quality Checklist:

- [ ] Zod schemas properly validate formatted input
- [ ] Zod schemas properly validate unformatted input
- [ ] Check digit validation implemented (Brazilian standard)
- [ ] i18n keys added for validation error messages
- [ ] Schemas transform formatted to unformatted before storage
- [ ] Edge cases handled (empty, partial input)

### 4. Implement Masks in Person Form Components

**Objective**: Replace plain Input with CPF masked input in all person form components

#### Sub-tasks:

- [ ] 4.1: Update PersonFormDialog component
  - File: `/components/people/person-form-dialog.tsx`
  - Line: 232-244 (CPF field)
  - Changes:
    - Import CPFInput component
    - Replace `<Input placeholder="000.000.000-00" {...field} />` with `<CPFInput {...field} />`
    - Ensure form submission cleans the value
  - Validation: CPF field shows mask while typing, submits clean value

- [ ] 4.2: Update PersonFormPage component
  - File: `/components/people/person-form-page.tsx`
  - Line: 214-226 (CPF field)
  - Changes:
    - Import CPFInput component
    - Replace Input with CPFInput
    - Ensure form submission cleans the value
  - Validation: CPF field shows mask while typing, submits clean value

- [ ] 4.3: Update BulkImportPeopleDialog display (optional enhancement)
  - File: `/components/main-processes/bulk-import-people-dialog.tsx`
  - Line: 270 (CPF display in table)
  - Changes:
    - Use formatCPF utility to display CPF in table
  - Validation: CPF values display formatted in preview table

- [ ] 4.4: Update BulkCreateIndividualProcessDialog display (optional enhancement)
  - File: `/components/main-processes/bulk-create-individual-process-dialog.tsx`
  - Line: 356-360 (CPF badge display)
  - Changes:
    - Use formatCPF utility to display CPF in badge
  - Validation: CPF values display formatted in selection list

#### Quality Checklist:

- [ ] CPFInput component used in all person forms
- [ ] Form submission sends cleaned CPF (digits only)
- [ ] Form loading properly displays formatted CPF from existing data
- [ ] Validation errors display correctly
- [ ] Mobile responsive input works properly
- [ ] No console errors or warnings

### 5. Implement Masks in Company Form Components

**Objective**: Replace plain Input with CNPJ masked input in all company form components

#### Sub-tasks:

- [ ] 5.1: Update CompanyFormDialog component
  - File: `/components/companies/company-form-dialog.tsx`
  - Line: 182-194 (taxId field)
  - Changes:
    - Import CNPJInput component
    - Replace `<Input placeholder="00.000.000/0000-00" {...field} />` with `<CNPJInput {...field} />`
    - Ensure form submission cleans the value
  - Validation: CNPJ field shows mask while typing, submits clean value

- [ ] 5.2: Update CompanyFormPage component
  - File: `/components/companies/company-form-page.tsx`
  - Line: 167-179 (taxId field)
  - Changes:
    - Import CNPJInput component
    - Replace Input with CNPJInput
    - Ensure form submission cleans the value
  - Validation: CNPJ field shows mask while typing, submits clean value

#### Quality Checklist:

- [ ] CNPJInput component used in all company forms
- [ ] Form submission sends cleaned CNPJ (digits only)
- [ ] Form loading properly displays formatted CNPJ from existing data
- [ ] Validation errors display correctly
- [ ] Mobile responsive input works properly
- [ ] No console errors or warnings

### 6. Update Display Components (Tables and View Modals)

**Objective**: Format CNPJ/CPF values for display in tables and view modals

#### Sub-tasks:

- [ ] 6.1: Update PeopleTable to display formatted CPF
  - File: `/components/people/people-table.tsx`
  - Changes:
    - Import formatCPF utility
    - Format CPF column values using formatCPF()
    - Handle undefined/null values gracefully
  - Validation: CPF displays formatted in table (000.000.000-00)

- [ ] 6.2: Update PersonDetailView to display formatted CPF
  - File: `/components/people/person-detail-view.tsx`
  - Changes:
    - Import formatCPF utility
    - Format CPF display using formatCPF()
    - Handle undefined/null values gracefully
  - Validation: CPF displays formatted in detail view

- [ ] 6.3: Update CompaniesTable to display formatted CNPJ
  - File: `/components/companies/companies-table.tsx`
  - Changes:
    - Import formatCNPJ utility
    - Format taxId column values using formatCNPJ()
    - Handle undefined/null values gracefully
  - Validation: CNPJ displays formatted in table (00.000.000/0000-00)

- [ ] 6.4: Update CompanyViewModal to display formatted CNPJ
  - File: `/components/companies/company-view-modal.tsx`
  - Changes:
    - Import formatCNPJ utility
    - Format taxId display using formatCNPJ()
    - Handle undefined/null values gracefully
  - Validation: CNPJ displays formatted in view modal

#### Quality Checklist:

- [ ] All table displays show formatted CNPJ/CPF
- [ ] All view modals show formatted CNPJ/CPF
- [ ] Empty/null values handled gracefully (show "-" or empty)
- [ ] No console errors with malformed data
- [ ] Mobile responsive display

### 7. Add i18n Translation Keys

**Objective**: Add translation keys for validation messages and field labels

#### Sub-tasks:

- [ ] 7.1: Add English translations
  - File: `/messages/en.json`
  - Changes:
    - Add validation error messages for invalid CPF
    - Add validation error messages for invalid CNPJ
    - Example keys:
      - `People.invalidCpfFormat`: "Invalid CPF format. Use 000.000.000-00"
      - `People.invalidCpfChecksum`: "Invalid CPF check digits"
      - `Companies.invalidCnpjFormat`: "Invalid CNPJ format. Use 00.000.000/0000-00"
      - `Companies.invalidCnpjChecksum`: "Invalid CNPJ check digits"
  - Validation: English messages display correctly

- [ ] 7.2: Add Portuguese translations
  - File: `/messages/pt.json`
  - Changes:
    - Add Portuguese validation error messages
    - Example keys:
      - `People.invalidCpfFormat`: "Formato de CPF inválido. Use 000.000.000-00"
      - `People.invalidCpfChecksum`: "Dígitos verificadores do CPF inválidos"
      - `Companies.invalidCnpjFormat`: "Formato de CNPJ inválido. Use 00.000.000/0000-00"
      - `Companies.invalidCnpjChecksum`: "Dígitos verificadores do CNPJ inválidos"
  - Validation: Portuguese messages display correctly

#### Quality Checklist:

- [ ] All i18n keys added to both en.json and pt.json
- [ ] Keys follow existing naming conventions
- [ ] Messages are clear and user-friendly
- [ ] Validation components use i18n keys

### 8. Update Database Handling

**Objective**: Ensure database properly stores and retrieves cleaned CNPJ/CPF values

#### Sub-tasks:

- [ ] 8.1: Review Convex people mutations
  - File: `/convex/people.ts`
  - Validation: Mutations store CPF without formatting characters
  - Changes (if needed):
    - Add server-side cleaning of CPF values
    - Ensure consistent storage format (digits only)

- [ ] 8.2: Review Convex companies mutations
  - File: `/convex/companies.ts`
  - Validation: Mutations store CNPJ without formatting characters
  - Changes (if needed):
    - Add server-side cleaning of CNPJ values
    - Ensure consistent storage format (digits only)

- [ ] 8.3: Review bulk operations mutations
  - File: `/convex/bulkOperations.ts`
  - Validation: Bulk import properly cleans and stores document numbers
  - Changes (if needed):
    - Add cleaning logic for imported CPF/CNPJ values
    - Handle both formatted and unformatted imports

#### Quality Checklist:

- [ ] Database stores values without formatting (digits only)
- [ ] Server-side validation for data integrity
- [ ] No breaking changes to existing data
- [ ] Bulk operations handle both formats

### 9. Testing and Validation

**Objective**: Thoroughly test all input mask implementations across different scenarios

#### Sub-tasks:

- [ ] 9.1: Test CPF input in person forms
  - Test cases:
    - Type CPF with mask appearing automatically
    - Submit form with valid CPF
    - Submit form with invalid CPF (check validation error)
    - Edit existing person with CPF
    - Leave CPF field empty (optional field)
    - Copy-paste formatted CPF
    - Copy-paste unformatted CPF
  - Validation: All test cases pass without errors

- [ ] 9.2: Test CNPJ input in company forms
  - Test cases:
    - Type CNPJ with mask appearing automatically
    - Submit form with valid CNPJ
    - Submit form with invalid CNPJ (check validation error)
    - Edit existing company with CNPJ
    - Leave CNPJ field empty (optional field)
    - Copy-paste formatted CNPJ
    - Copy-paste unformatted CNPJ
  - Validation: All test cases pass without errors

- [ ] 9.3: Test bulk import with CPF values
  - Test cases:
    - Import CSV with formatted CPF values
    - Import CSV with unformatted CPF values
    - Import CSV with mixed formats
    - Import CSV with invalid CPF values (check error handling)
  - Validation: All formats processed correctly, errors reported properly

- [ ] 9.4: Test display components
  - Test cases:
    - CPF displays formatted in people table
    - CPF displays formatted in person detail view
    - CNPJ displays formatted in companies table
    - CNPJ displays formatted in company view modal
    - Empty/null values display correctly
  - Validation: All display components show proper formatting

- [ ] 9.5: Test mobile responsiveness
  - Test cases:
    - CPF input on mobile device (iOS/Android)
    - CNPJ input on mobile device (iOS/Android)
    - Keyboard appears correctly for numeric input
    - Touch targets are adequate size (44x44px minimum)
  - Validation: Works smoothly on mobile devices

- [ ] 9.6: Test data integrity
  - Test cases:
    - Verify stored CPF values in database (digits only)
    - Verify stored CNPJ values in database (digits only)
    - Verify existing data still loads correctly
    - Verify exports contain properly formatted values
  - Validation: Data stored consistently, no corruption

#### Quality Checklist:

- [ ] All form inputs work correctly with masks
- [ ] Validation messages display properly
- [ ] No console errors or warnings
- [ ] Mobile responsive and touch-friendly
- [ ] Data stored correctly in database (cleaned format)
- [ ] Display components show formatted values
- [ ] Bulk import handles multiple formats
- [ ] Edge cases handled gracefully

### 10. Documentation and Code Review

**Objective**: Document the implementation and ensure code quality

#### Sub-tasks:

- [ ] 10.1: Add JSDoc comments to utility functions
  - File: `/lib/utils/document-masks.ts`
  - Validation: All functions have clear documentation
  - Content:
    - Function purpose
    - Parameter descriptions
    - Return value descriptions
    - Usage examples

- [ ] 10.2: Add comments to masked input components
  - Files: `/components/ui/cpf-input.tsx`, `/components/ui/cnpj-input.tsx`
  - Validation: Components have clear usage documentation
  - Content:
    - Component purpose
    - Props documentation
    - Integration instructions with React Hook Form

- [ ] 10.3: Update this TODO document with completion notes
  - File: `/ai_docs/todo-input-masks.md`
  - Validation: Document reflects actual implementation
  - Content:
    - Mark all tasks as completed
    - Note any deviations from plan
    - Document any issues encountered and solutions

#### Quality Checklist:

- [ ] All utility functions documented
- [ ] All components documented
- [ ] Code follows project conventions
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Clean code principles followed

## Implementation Notes

### Technical Decisions

1. **Library Choice**: Using `react-input-mask` because:
   - Lightweight and widely used
   - Works seamlessly with React Hook Form
   - Supports dynamic masks
   - Good TypeScript support
   - No conflicting dependencies with existing stack

2. **Data Storage**: Store cleaned values (digits only) in database because:
   - Consistent data format
   - Easier for backend processing
   - Reduces storage size
   - Simplifies querying and filtering
   - Display formatting happens on the frontend

3. **Validation Strategy**: Two-tier validation:
   - Format validation (regex) - quick client-side check
   - Check digit validation - proper Brazilian CPF/CNPJ algorithm
   - Both formatted and unformatted input accepted

4. **Component Architecture**: Create separate CPFInput and CNPJInput components rather than a generic MaskedInput because:
   - Each has specific validation rules
   - Better type safety
   - Clearer component naming
   - Easier maintenance

### Brazilian CPF/CNPJ Validation Rules

**CPF (Cadastro de Pessoas Físicas)**:
- 11 digits total
- Format: 000.000.000-00
- Last 2 digits are check digits calculated using modulo 11 algorithm
- Cannot be all same digits (000.000.000-00, 111.111.111-11, etc.)

**CNPJ (Cadastro Nacional de Pessoas Jurídicas)**:
- 14 digits total
- Format: 00.000.000/0000-00
- Last 2 digits are check digits calculated using modulo 11 algorithm
- Cannot be all same digits

### Edge Cases to Handle

1. **Partial Input**: User typing should show mask progressively
2. **Paste Operations**: Should accept both formatted and unformatted pasted values
3. **Backspace/Delete**: Should work naturally with mask
4. **Empty Values**: Optional fields should allow empty submission
5. **Invalid Characters**: Should prevent non-numeric input
6. **Existing Data**: Should properly format unformatted data from database
7. **CSV Import**: Should handle various input formats from different sources

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] All test cases passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No console errors in browser
- [ ] Mobile responsive on iOS and Android
- [ ] Works in both light and dark themes
- [ ] i18n translations complete for EN and PT
- [ ] Documentation complete
- [ ] Code reviewed and approved
- [ ] Successfully tested with real data
- [ ] No regressions in existing functionality
