# TODO: Add Process Date Field and Split Applicant into Company/User Fields

## Context

This task involves three main enhancements to the individual processes system:

1. **Add dateProcess field**: A new date field that should appear first in forms and pre-fill with today's date when creating new processes
2. **Split Applicant field**: Replace the single "applicantId" field with two separate fields:
   - Company Applicant (companyApplicantId): Select a company
   - User Applicant (userApplicantId): Select a person filtered by the selected company
3. **Cascading filtering**: When a company is selected, the User Applicant field should only show people with current relationships to that company

All these fields should be **optional** (not required).

## Related PRD Sections

- Database Schema: `/convex/schema.ts` - individualProcesses table
- Individual Process Mutations: `/convex/individualProcesses.ts`
- Form Components:
  - Dialog form: `/components/individual-processes/individual-process-form-dialog.tsx`
  - Page form: `/components/individual-processes/individual-process-form-page.tsx`
- Validation: `/lib/validations/individualProcesses.ts`
- i18n: `/messages/en.json` and `/messages/pt.json`

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review existing individual process schema and field structure
  - Validation: Confirmed schema location at `/convex/schema.ts`
  - Output: individualProcesses table has existing applicantId field (optional), needs dateProcess field and split into companyApplicantId/userApplicantId

- [x] 0.2: Identify form components that need updating
  - Validation: Found two form components:
    - `/components/individual-processes/individual-process-form-dialog.tsx` (dialog version)
    - `/components/individual-processes/individual-process-form-page.tsx` (full-page version)
  - Output: Both forms need field ordering updates and new field additions

- [x] 0.3: Check existing applicant implementation
  - Validation: Found `/components/individual-processes/applicant-selector.tsx` component
  - Output: Component uses `api.people.listPeopleWithCompanies` query - need to create new components for company and filtered user selection

- [x] 0.4: Review peopleCompanies relationship structure
  - Validation: Reviewed `/convex/peopleCompanies.ts` and schema
  - Output: peopleCompanies has indexes by_person, by_company, and isCurrent flag for filtering

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

---

### 1. Update Database Schema

**Objective**: Add dateProcess field and split applicantId into two fields in the individualProcesses table

#### Sub-tasks:

- [x] 1.1: Add dateProcess field to schema
  - File: `/convex/schema.ts`
  - Add field: `dateProcess: v.optional(v.string())` in individualProcesses table
  - Position: Add after mainProcessId (line ~232) to maintain logical ordering
  - Validation: Field is optional string type (ISO date format YYYY-MM-DD)

- [x] 1.2: Add companyApplicantId and userApplicantId fields to schema
  - File: `/convex/schema.ts`
  - Add fields:
    - `companyApplicantId: v.optional(v.id("companies"))`
    - `userApplicantId: v.optional(v.id("people"))`
  - Position: Replace or add alongside existing applicantId field
  - Validation: Both fields are optional references to their respective tables

- [x] 1.3: Add indexes for new fields
  - File: `/convex/schema.ts`
  - Add indexes:
    - `.index("by_companyApplicant", ["companyApplicantId"])`
    - `.index("by_userApplicant", ["userApplicantId"])`
  - Position: After existing indexes for individualProcesses
  - Validation: Indexes support efficient querying by company and user applicant

- [x] 1.4: Mark applicantId as deprecated (keep for backward compatibility)
  - File: `/convex/schema.ts`
  - Add comment: `applicantId: v.optional(v.id("people")), // DEPRECATED: Split into companyApplicantId and userApplicantId`
  - Validation: Field remains in schema but marked for future removal

#### Quality Checklist:

- [x] All new fields are optional (not required)
- [x] Field types match expected data (string for date, ID references for relationships)
- [x] Indexes added for performance optimization
- [x] Comments document deprecated fields
- [x] Schema follows existing naming conventions

---

### 2. Update Backend Mutations and Queries

**Objective**: Update individualProcesses mutations to handle new fields with proper validation

#### Sub-tasks:

- [x] 2.1: Update create mutation to handle dateProcess
  - File: `/convex/individualProcesses.ts`
  - Add parameter: `dateProcess: v.optional(v.string())` to args (line ~344)
  - Add default value logic: If not provided, set to current date in ISO format
  - Insert field in mutation: Include dateProcess in insert operation (line ~400)
  - Validation: Pre-fills with today's date when creating new process if not specified

- [x] 2.2: Update create mutation to handle split applicant fields
  - File: `/convex/individualProcesses.ts`
  - Add parameters to args:
    - `companyApplicantId: v.optional(v.id("companies"))`
    - `userApplicantId: v.optional(v.id("people"))`
  - Remove or deprecate: Keep applicantId parameter for backward compatibility
  - Insert fields: Add both new fields to insert operation
  - Validation: Both fields are optional and can be undefined

- [x] 2.3: Update update mutation to handle dateProcess
  - File: `/convex/individualProcesses.ts`
  - Add parameter: `dateProcess: v.optional(v.string())` to args (line ~501)
  - Add conditional update: `if (args.dateProcess !== undefined) updates.dateProcess = args.dateProcess`
  - Validation: Allows updating the process date

- [x] 2.4: Update update mutation to handle split applicant fields
  - File: `/convex/individualProcesses.ts`
  - Add parameters to args:
    - `companyApplicantId: v.optional(v.id("companies"))`
    - `userApplicantId: v.optional(v.id("people"))`
  - Add conditional updates for both fields
  - Keep applicantId for backward compatibility
  - Validation: Both fields can be updated independently

- [x] 2.5: Update query enrichment to include new fields
  - File: `/convex/individualProcesses.ts`
  - Update get query (line ~210): Add fetching of companyApplicant and enrichment
  - Update list query (line ~18): Add fetching of companyApplicant if needed for display
  - Enrich response with company details when companyApplicantId exists
  - Validation: Queries return complete data including new relationships

- [x] 2.6: Create query to fetch people by company for cascading filter
  - File: `/convex/people.ts` (or create new file if needed)
  - Create query: `listPeopleByCompany` with args: `{ companyId: v.id("companies") }`
  - Query logic: Fetch from peopleCompanies where companyId matches and isCurrent = true
  - Return: Array of people with current relationship to specified company
  - Validation: Respects role-based access control, only returns people user has permission to see

#### Quality Checklist:

- [x] All new fields are optional in mutations
- [x] Default date pre-fill logic implemented for dateProcess
- [x] Backward compatibility maintained for applicantId
- [x] Query enrichment provides full data for UI display
- [x] New cascade query respects access control
- [x] Error handling implemented for edge cases

---

### 3. Update Form Validation Schema

**Objective**: Add validation for new fields in the Zod schema

#### Sub-tasks:

- [x] 3.1: Add dateProcess to validation schema
  - File: `/lib/validations/individualProcesses.ts`
  - Add field: `dateProcess: z.string().optional().or(z.literal(""))`
  - Position: Add near top of schema after mainProcessId
  - Validation: Accepts ISO date string or empty string

- [x] 3.2: Add companyApplicantId and userApplicantId to validation schema
  - File: `/lib/validations/individualProcesses.ts`
  - Add fields:
    ```typescript
    companyApplicantId: z
      .custom<Id<"companies">>((val) => typeof val === "string", {
        message: "Invalid company applicant ID",
      })
      .optional()
      .or(z.literal("")),
    userApplicantId: z
      .custom<Id<"people">>((val) => typeof val === "string", {
        message: "Invalid user applicant ID",
      })
      .optional()
      .or(z.literal(""))
    ```
  - Keep applicantId for backward compatibility (mark as deprecated in comment)
  - Validation: Both fields accept valid IDs or empty strings

- [x] 3.3: Update TypeScript type inference
  - File: `/lib/validations/individualProcesses.ts`
  - Type: `IndividualProcessFormData` will automatically include new fields
  - Validation: TypeScript compilation succeeds without errors

#### Quality Checklist:

- [x] All new fields marked as optional in Zod schema
- [x] Field types match expected data structures
- [x] Validation messages are clear and helpful
- [x] TypeScript types properly inferred from schema

---

### 4. Add i18n Translations

**Objective**: Add translation keys for new fields in both English and Portuguese

#### Sub-tasks:

- [x] 4.1: Add English translations
  - File: `/messages/en.json`
  - Section: "IndividualProcesses"
  - Add keys:
    ```json
    "dateProcess": "Process Date",
    "selectDateProcess": "Select process date",
    "companyApplicant": "Company Applicant",
    "selectCompanyApplicant": "Select company applicant",
    "userApplicant": "User Applicant",
    "selectUserApplicant": "Select user applicant",
    "selectCompanyFirst": "Please select a company first",
    "companyHasNoUsers": "This company has no associated users",
    "clearCompanyApplicant": "Clear company selection",
    "clearUserApplicant": "Clear user selection"
    ```
  - Validation: Keys follow existing naming convention

- [x] 4.2: Add Portuguese translations
  - File: `/messages/pt.json`
  - Section: "IndividualProcesses"
  - Add keys:
    ```json
    "dateProcess": "Data do Processo",
    "selectDateProcess": "Selecione a data do processo",
    "companyApplicant": "Empresa Requerente",
    "selectCompanyApplicant": "Selecione a empresa requerente",
    "userApplicant": "Usuário Requerente",
    "selectUserApplicant": "Selecione o usuário requerente",
    "selectCompanyFirst": "Por favor, selecione uma empresa primeiro",
    "companyHasNoUsers": "Esta empresa não possui usuários associados",
    "clearCompanyApplicant": "Limpar seleção de empresa",
    "clearUserApplicant": "Limpar seleção de usuário"
    ```
  - Validation: Translations are accurate and contextually appropriate

#### Quality Checklist:

- [x] All user-facing strings use i18n
- [x] Translation keys added to both en.json and pt.json
- [x] Key naming follows established conventions
- [x] Translations are contextually accurate

---

### 5. Create New UI Components

**Objective**: Create selector components for company applicant and filtered user applicant

#### Sub-tasks:

- [x] 5.1: Create CompanyApplicantSelector component
  - File: `/components/individual-processes/company-applicant-selector.tsx`
  - Purpose: Select a company for the applicant
  - Props:
    ```typescript
    {
      value: string
      onChange: (value: string) => void
      disabled?: boolean
    }
    ```
  - Query: Use `api.companies.listActive` to fetch all active companies
  - UI: Combobox with search, clear button, company name as label
  - Validation: Component is reusable and follows existing selector pattern

- [x] 5.2: Create UserApplicantSelector component
  - File: `/components/individual-processes/user-applicant-selector.tsx`
  - Purpose: Select a person filtered by company
  - Props:
    ```typescript
    {
      companyId: string | undefined
      value: string
      onChange: (value: string) => void
      disabled?: boolean
    }
    ```
  - Query: Use new `api.people.listPeopleByCompany` when companyId provided
  - Conditional logic: Show "Select company first" message when companyId is empty
  - Show "No users found" when company has no associated people
  - UI: Combobox with search, clear button, person name as label
  - Validation: Component properly handles empty states and filtering

#### Quality Checklist:

- [x] Components follow existing selector pattern (like ApplicantSelector, PassportSelector)
- [x] Props are properly typed with TypeScript
- [x] Clear buttons implemented for both selectors
- [x] Empty states handled with appropriate messages
- [x] Components are accessible and user-friendly
- [x] Respects access control via queries

---

### 6. Update Individual Process Form Dialog

**Objective**: Add new fields to the dialog form with proper ordering and cascading logic

#### Sub-tasks:

- [ ] 6.1: Add dateProcess field as first field in Required Fields section
  - File: `/components/individual-processes/individual-process-form-dialog.tsx`
  - Position: Add immediately after "Required Fields" heading (before mainProcessId)
  - Field type: FormField with Input type="date"
  - Default value: Pre-fill with current date for new processes: `new Date().toISOString().split('T')[0]`
  - Label: Use `t("dateProcess")`
  - Validation: Field is optional, shows as date picker

- [ ] 6.2: Add companyApplicantId field
  - File: `/components/individual-processes/individual-process-form-dialog.tsx`
  - Position: Add in Required Fields section (can be after legalFrameworkId or in Optional section)
  - Component: Use new CompanyApplicantSelector component
  - Default value: Empty string for new processes, existing value for edit
  - Label: Use `t("companyApplicant")`
  - Validation: Field is optional

- [ ] 6.3: Add userApplicantId field with cascading logic
  - File: `/components/individual-processes/individual-process-form-dialog.tsx`
  - Position: Add immediately after companyApplicantId
  - Component: Use new UserApplicantSelector component with companyId prop
  - Watch companyApplicantId: `const selectedCompanyId = form.watch("companyApplicantId")`
  - Pass to component: `companyId={selectedCompanyId}`
  - Clear userApplicant when company changes: useEffect to reset when company changes
  - Label: Use `t("userApplicant")`
  - Validation: Field is optional, properly filtered by selected company

- [ ] 6.4: Update form reset logic to include new fields
  - File: `/components/individual-processes/individual-process-form-dialog.tsx`
  - Update useEffect that handles form.reset()
  - Add new fields to reset object with proper default values
  - Validation: Form properly initializes and resets with new fields

- [ ] 6.5: Update form submission to include new fields
  - File: `/components/individual-processes/individual-process-form-dialog.tsx`
  - Update onSubmit function to include dateProcess, companyApplicantId, userApplicantId
  - Clean optional fields: Convert empty strings to undefined
  - Validation: Form submits all new fields correctly

#### Quality Checklist:

- [ ] dateProcess appears as first field in form
- [ ] Date field pre-fills with today's date for new processes
- [ ] Company and user applicant fields properly positioned
- [ ] Cascading filter logic works correctly
- [ ] Clear button clears dependent field (user when company cleared)
- [ ] All fields are optional (not required)
- [ ] Form validation passes
- [ ] TypeScript types are correct
- [ ] Mobile responsive layout maintained

---

### 7. Update Individual Process Form Page

**Objective**: Add new fields to the full-page form with proper ordering and cascading logic

#### Sub-tasks:

- [ ] 7.1: Add dateProcess field as first field in Required Fields section
  - File: `/components/individual-processes/individual-process-form-page.tsx`
  - Position: Add immediately after "Required Fields" heading (line ~419, before mainProcessId)
  - Field type: FormField with Input type="date"
  - Default value: Pre-fill with current date for new processes: `new Date().toISOString().split('T')[0]`
  - Label: Use `t("dateProcess")`
  - Validation: Field is optional, shows as date picker

- [ ] 7.2: Add companyApplicantId field
  - File: `/components/individual-processes/individual-process-form-page.tsx`
  - Position: Add in Required Fields section (after processTypeId and before personId works well)
  - Component: Use new CompanyApplicantSelector component
  - Default value: Empty string for new processes, existing value for edit
  - Label: Use `t("companyApplicant")`
  - Validation: Field is optional

- [ ] 7.3: Add userApplicantId field with cascading logic
  - File: `/components/individual-processes/individual-process-form-page.tsx`
  - Position: Add immediately after companyApplicantId (before personId)
  - Component: Use new UserApplicantSelector component with companyId prop
  - Watch companyApplicantId: `const selectedCompanyId = form.watch("companyApplicantId")`
  - Pass to component: `companyId={selectedCompanyId}`
  - Clear userApplicant when company changes: useEffect to reset when company changes
  - Label: Use `t("userApplicant")`
  - Validation: Field is optional, properly filtered by selected company

- [ ] 7.4: Update form initialization logic to include new fields
  - File: `/components/individual-processes/individual-process-form-page.tsx`
  - Update useEffect that handles form initialization (line ~127-245)
  - Add new fields to both initial load and update logic
  - Handle pre-filling dateProcess on create
  - Validation: Form properly initializes with new fields from server data

- [ ] 7.5: Update form submission to include new fields
  - File: `/components/individual-processes/individual-process-form-page.tsx`
  - Update onSubmit function (line ~292) to include dateProcess, companyApplicantId, userApplicantId
  - Clean optional fields: Convert empty strings to undefined
  - Validation: Form submits all new fields correctly

- [ ] 7.6: Add useEffect to clear userApplicantId when companyApplicantId changes
  - File: `/components/individual-processes/individual-process-form-page.tsx`
  - Create useEffect watching selectedCompanyId
  - Logic: When company changes (and not initial load), clear userApplicantId
  - Validation: Dependent field properly resets when parent selection changes

#### Quality Checklist:

- [ ] dateProcess appears as first field in form
- [ ] Date field pre-fills with today's date for new processes
- [ ] Company and user applicant fields properly positioned
- [ ] Cascading filter logic works correctly (user filtered by company)
- [ ] Clear button clears dependent field
- [ ] All fields are optional (not required)
- [ ] Form validation passes
- [ ] TypeScript types are correct
- [ ] Mobile responsive layout maintained (sm, md, lg breakpoints)
- [ ] Touch-friendly elements (min 44x44px)

---

### 8. Update Query to Support New Relationships

**Objective**: Ensure queries properly fetch and enrich company applicant data

#### Sub-tasks:

- [ ] 8.1: Create listPeopleByCompany query in people.ts
  - File: `/convex/people.ts`
  - Query name: `listPeopleByCompany`
  - Args: `{ companyId: v.id("companies") }`
  - Logic:
    - Query peopleCompanies by_company index for matching companyId
    - Filter to only current relationships (isCurrent = true)
    - Fetch person details for each relationship
    - Apply role-based access control (clients only see their company's people)
  - Return: Array of people with { _id, fullName } minimum
  - Validation: Query is efficient using index, respects permissions

- [ ] 8.2: Update individualProcesses.get to enrich companyApplicant
  - File: `/convex/individualProcesses.ts`
  - Add to Promise.all (line ~219): Fetch companyApplicant company details
  - Enrich response: Include company object with name when companyApplicantId exists
  - Keep userApplicant enrichment: Already enriches applicant (now userApplicant)
  - Validation: Response includes all necessary data for display

- [ ] 8.3: Update individualProcesses.list to include companyApplicant if needed
  - File: `/convex/individualProcesses.ts`
  - Evaluate: Determine if list view needs company applicant display
  - Add to Promise.all (line ~96) if needed for table display
  - Validation: Query performance remains acceptable

#### Quality Checklist:

- [ ] listPeopleByCompany query uses proper index
- [ ] Query respects role-based access control
- [ ] Response data is properly typed
- [ ] Query performance is optimized
- [ ] Enrichment provides all necessary display data

---

### 9. Handle Backward Compatibility and Migration

**Objective**: Ensure existing data continues to work and provide migration path

#### Sub-tasks:

- [ ] 9.1: Keep applicantId field in schema marked as deprecated
  - File: `/convex/schema.ts`
  - Comment: Add deprecation notice explaining split into two fields
  - Keep index: Maintain by_applicant index for existing queries
  - Validation: Existing data remains accessible

- [ ] 9.2: Update existing applicant references in codebase
  - Files: Search for `applicantId` usage across codebase
  - Update queries: Ensure they handle both old and new field structure
  - Validation: No breaking changes to existing functionality

- [ ] 9.3: Consider data migration strategy (optional, future task)
  - Note: Create migration script if needed to copy applicantId data
  - Strategy: Could populate companyApplicantId and userApplicantId from applicantId
  - Use peopleCompanies to determine company from existing applicantId
  - Validation: Document migration approach for future implementation

#### Quality Checklist:

- [ ] Backward compatibility maintained
- [ ] Deprecated fields properly documented
- [ ] No breaking changes to existing functionality
- [ ] Migration strategy documented if needed

---

### 10. Testing and Validation

**Objective**: Ensure all changes work correctly across different scenarios

#### Sub-tasks:

- [ ] 10.1: Test creating new individual process with all scenarios
  - Test: Create process with dateProcess field (should pre-fill)
  - Test: Create process with company applicant only
  - Test: Create process with both company and user applicant
  - Test: Create process with neither applicant field (all optional)
  - Validation: All scenarios save correctly to database

- [ ] 10.2: Test editing existing individual process
  - Test: Edit process and change dateProcess
  - Test: Edit process and add/change company applicant
  - Test: Edit process and add/change user applicant
  - Test: Edit process and clear applicant fields
  - Validation: Changes persist correctly

- [ ] 10.3: Test cascading filter logic
  - Test: Select company, verify user dropdown filters correctly
  - Test: Change company, verify user dropdown updates and clears previous selection
  - Test: Clear company, verify user dropdown shows "select company first" message
  - Test: Select company with no associated people, verify appropriate empty message
  - Validation: Cascading logic works smoothly without errors

- [ ] 10.4: Test field ordering in forms
  - Test: Verify dateProcess appears first in both dialog and page forms
  - Test: Verify company and user applicant fields appear in correct order
  - Test: Verify all fields are properly labeled with i18n
  - Validation: Field order matches requirements

- [ ] 10.5: Test access control and permissions
  - Test: As admin, verify can select any company and users
  - Test: As client, verify only see their company in dropdowns
  - Test: As client, verify only see people from their company
  - Validation: Access control works correctly

- [ ] 10.6: Test mobile responsiveness
  - Test: Open forms on mobile viewport (sm breakpoint)
  - Test: Verify all fields are accessible and usable
  - Test: Verify date picker works on mobile
  - Test: Verify combobox dropdowns work on mobile
  - Validation: Forms are fully functional on mobile devices

#### Quality Checklist:

- [ ] All creation scenarios work correctly
- [ ] All editing scenarios work correctly
- [ ] Cascading filter works smoothly
- [ ] Field ordering is correct
- [ ] Access control is enforced
- [ ] Mobile responsiveness verified
- [ ] No console errors or warnings
- [ ] Data persists correctly to database

---

## Implementation Notes

### Technical Considerations

1. **Date Format**: Use ISO date format (YYYY-MM-DD) for dateProcess field to ensure consistency across locales
2. **Pre-fill Logic**: Implement date pre-fill in the form default values, not in the backend mutation
3. **Cascading Dependency**: Clear userApplicantId whenever companyApplicantId changes to maintain data integrity
4. **Performance**: Use database indexes for efficient querying by company
5. **Access Control**: All queries must respect role-based access control via getCurrentUserProfile

### Migration Strategy

The existing `applicantId` field should be kept for backward compatibility. A future migration could:
1. Read existing applicantId values
2. Look up the person's current company via peopleCompanies
3. Populate companyApplicantId with the company
4. Populate userApplicantId with the person
5. Mark applicantId as null after migration

This migration is not required immediately as the system will work with new data structure for new processes.

### Component Reusability

The new CompanyApplicantSelector and UserApplicantSelector components follow the same pattern as existing selectors (ApplicantSelector, PassportSelector) and can be reused in other parts of the application if needed.

## Definition of Done

- [ ] All sub-tasks completed
- [ ] All quality checklists passed
- [ ] Database schema updated with new fields
- [ ] Backend mutations handle new fields correctly
- [ ] Form components display fields in correct order
- [ ] Cascading filter logic works correctly
- [ ] All fields are optional (not required)
- [ ] i18n translations added for both languages
- [ ] Tests pass for all scenarios
- [ ] Mobile responsiveness verified
- [ ] No TypeScript errors
- [ ] No console errors or warnings
- [ ] Documentation updated
- [ ] Code reviewed
