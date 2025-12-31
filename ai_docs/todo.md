# TODO: Rename "Função" to "Cargo" in People Table and Add New "Função" Field to Individual Process

## Context

This task involves TWO completely separate and independent changes:

1. **People Table**: Rename the existing field "Função" (funcao) to "Cargo" - This refers to a person's position/role in their company
2. **Individual Process Form**: Add a NEW field called "Função" that appears BEFORE the CBO field when editing - This is a completely different field with no relation to the people table field

These are two distinct fields in different contexts and must be treated separately.

## Related PRD Sections

Database schema at `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
- People table has `funcao` field (line 95)
- Individual processes table will need a new `funcao` field added

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review project architecture for people and individual processes
  - Validation: Identified the following key files:
    - Schema: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
    - People backend: `/Users/elberrd/Documents/Development/clientes/casys4/convex/people.ts`
    - Individual processes backend: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
    - People forms: `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-form-*.tsx`
    - Individual process form: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
    - People table: `/Users/elberrd/Documents/Development/clientes/casys4/components/people/people-table.tsx`
    - Translations: `/Users/elberrd/Documents/Development/clientes/casys4/messages/{en,pt}.json`
  - Output: File paths documented

- [x] 0.2: Identify all files referencing "funcao" in people context
  - Validation: Found references in:
    - person-form-dialog.tsx (lines 94, 144, 164, 213, 497, 500, 502)
    - person-form-page.tsx (lines 83, 117, 166, 456, 459, 461)
    - person-detail-view.tsx (lines 255, 272, 275, 277)
  - Output: List of files to update for people table rename

- [x] 0.3: Identify CBO field location in individual process form
  - Validation: CBO field found at line 1173-1191 in individual-process-form-page.tsx
  - Output: New "Função" field must be inserted BEFORE line 1173

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

---

### 1. Update People Table Schema and Backend (Rename funcao to cargo)

**Objective**: Rename the database field from "funcao" to "cargo" in the people table schema and backend

#### Sub-tasks:

- [x] 1.1: Update database schema for people table
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Action: Rename `funcao: v.optional(v.string())` to `cargo: v.optional(v.string())` (line 95)
  - Validation: Schema compiles without errors
  - Dependencies: None

- [x] 1.2: Update people.ts backend mutations (create/update)
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/people.ts`
  - Action: Update mutation arguments and field references from `funcao` to `cargo`
  - Lines to update: 329, 386 (function arguments), 444 (replacement object)
  - Validation: Convex functions compile without errors
  - Dependencies: 1.1 must be complete

#### Quality Checklist:

- [ ] Database schema updated correctly
- [ ] All backend mutations updated
- [ ] TypeScript types compile without errors
- [ ] No references to old field name in backend

---

### 2. Update People Table Frontend Components (Rename funcao to cargo)

**Objective**: Update all people form and display components to use "cargo" instead of "funcao"

#### Sub-tasks:

- [x] 2.1: Update person-form-dialog.tsx
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-form-dialog.tsx`
  - Action: Replace all instances of `funcao` with `cargo`:
    - Line 94: default value `funcao: ""` → `cargo: ""`
    - Line 144: form reset `funcao: person.funcao` → `cargo: person.cargo`
    - Line 164: default values `funcao: ""` → `cargo: ""`
    - Line 213: submission data `funcao: data.funcao` → `cargo: data.cargo`
    - Line 497: form field name `name="funcao"` → `name="cargo"`
    - Line 500: label `{t('funcao')}` → `{t('cargo')}`
    - Line 502: placeholder `{t('funcaoPlaceholder')}` → `{t('cargoPlaceholder')}`
  - Validation: Form compiles and renders correctly
  - Dependencies: 1.2 must be complete

- [x] 2.2: Update person-form-page.tsx
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-form-page.tsx`
  - Action: Replace all instances of `funcao` with `cargo`:
    - Line 83: default value `funcao: ""` → `cargo: ""`
    - Line 117: form reset `funcao: person.funcao ?? ""` → `cargo: person.cargo ?? ""`
    - Line 166: submission data `funcao: data.funcao` → `cargo: data.cargo`
    - Line 456: form field name `name="funcao"` → `name="cargo"`
    - Line 459: label `{t('funcao')}` → `{t('cargo')}`
    - Line 461: placeholder `{t('funcaoPlaceholder')}` → `{t('cargoPlaceholder')}`
  - Validation: Form compiles and renders correctly
  - Dependencies: 1.2 must be complete

- [x] 2.3: Update person-detail-view.tsx
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-detail-view.tsx`
  - Action: Replace all instances of `funcao` with `cargo`:
    - Line 255: condition `person.funcao` → `person.cargo`
    - Line 272: condition `person.funcao` → `person.cargo`
    - Line 275: label `{t("funcao")}` → `{t("cargo")}`
    - Line 277: display `{person.funcao}` → `{person.cargo}`
  - Validation: Detail view displays correctly
  - Dependencies: 1.2 must be complete

#### Quality Checklist:

- [ ] All form components updated
- [ ] All display components updated
- [ ] TypeScript types are correct
- [ ] No TypeScript errors
- [ ] Forms compile and render correctly

---

### 3. Update i18n Translations for People Table (funcao → cargo)

**Objective**: Update translation keys from "funcao" to "cargo" for Portuguese and English

#### Sub-tasks:

- [x] 3.1: Update Portuguese translations (pt.json)
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Action: Update translation keys:
    - Line 979: Change key from `"funcao": "Função"` to `"cargo": "Cargo"`
    - Line 980: Change key from `"funcaoPlaceholder": "ex: Gerente de Projeto, Líder de Equipe"` to `"cargoPlaceholder": "ex: Gerente de Projeto, Líder de Equipe"`
  - Validation: Translation keys match component usage
  - Dependencies: 2.1, 2.2, 2.3 must be complete

- [x] 3.2: Update English translations (en.json)
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Action: Update translation keys:
    - Line 980: Change key from `"funcao": "Function/Role"` to `"cargo": "Position"`
    - Line 981: Change key from `"funcaoPlaceholder": "e.g., Project Manager, Team Lead"` to `"cargoPlaceholder": "e.g., Project Manager, Team Lead"`
  - Validation: Translation keys match component usage
  - Dependencies: 2.1, 2.2, 2.3 must be complete

#### Quality Checklist:

- [ ] Portuguese translations updated
- [ ] English translations updated
- [ ] Translation keys match all component references
- [ ] No missing translation warnings in console

---

### 4. Add New "Função" Field to Individual Process Schema

**Objective**: Add a completely new "funcao" field to the individualProcesses table (separate from people table)

#### Sub-tasks:

- [x] 4.1: Update database schema for individualProcesses table
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Action: Add new field to individualProcesses table (after line 273, before cboId):
    ```typescript
    funcao: v.optional(v.string()), // Função field for individual process (different from people.cargo)
    ```
  - Validation: Schema compiles without errors
  - Dependencies: Tasks 1, 2, 3 must be complete to avoid naming conflicts

- [x] 4.2: Update individualProcesses.ts create mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Action: Add funcao parameter to create mutation:
    - Add to args (after line 472): `funcao: v.optional(v.string())`
    - Add to insert (after line 542): `funcao: args.funcao,`
  - Validation: Create mutation compiles without errors
  - Dependencies: 4.1 must be complete

- [x] 4.3: Update individualProcesses.ts update mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Action: Add funcao parameter to update mutation:
    - Add to args (after line 816): `funcao: v.optional(v.string())`
    - Add to updates (after line 899): `if (args.funcao !== undefined) updates.funcao = args.funcao;`
  - Validation: Update mutation compiles without errors
  - Dependencies: 4.1 must be complete

#### Quality Checklist:

- [ ] Database schema includes new funcao field for individualProcesses
- [ ] Create mutation handles funcao field
- [ ] Update mutation handles funcao field
- [ ] TypeScript types compile without errors
- [ ] No conflicts with people.cargo field

---

### 5. Add Zod Validation for New Individual Process Função Field

**Objective**: Add validation schema for the new funcao field in individual processes

#### Sub-tasks:

- [x] 5.1: Update individualProcesses validation schema
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/individualProcesses.ts`
  - Action: Add funcao field to schema (after line 63, before cboId):
    ```typescript
    funcao: z.string().optional().or(z.literal("")),
    ```
  - Validation: Schema compiles and validates correctly
  - Dependencies: 4.1 must be complete

#### Quality Checklist:

- [ ] Zod schema includes funcao field
- [ ] Validation allows optional strings
- [ ] TypeScript types infer correctly
- [ ] No validation errors

---

### 6. Add Função Field to Individual Process Form UI

**Objective**: Add the new "Função" form field BEFORE the CBO field in the individual process edit form

#### Sub-tasks:

- [x] 6.1: Update form default values
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Action: Add funcao to default values (after line 112):
    ```typescript
    funcao: "",
    ```
  - Validation: Form initializes correctly
  - Dependencies: 5.1 must be complete

- [x] 6.2: Update form reset for existing process
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Action: Add funcao to form reset (after line 255):
    ```typescript
    funcao: individualProcess.funcao ?? "",
    ```
  - Validation: Form loads existing data correctly
  - Dependencies: 5.1 must be complete

- [x] 6.3: Add funcao to form updates section
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Action: Add funcao to updates check (after line 310):
    ```typescript
    if (currentValues.funcao !== (individualProcess.funcao ?? "")) {
      updates.funcao = individualProcess.funcao ?? ""
    }
    ```
  - Validation: Form updates sync correctly
  - Dependencies: 5.1 must be complete

- [x] 6.4: Add funcao to form reset for new process
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Action: Add funcao to default values (after line 381):
    ```typescript
    funcao: "",
    ```
  - Validation: New process form initializes correctly
  - Dependencies: 5.1 must be complete

- [x] 6.5: Add funcao to form submission
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Action: Add funcao to submit data (after line 469):
    ```typescript
    funcao: data.funcao || undefined,
    ```
  - Validation: Form submission includes funcao field
  - Dependencies: 5.1 must be complete

- [x] 6.6: Add FormField component BEFORE CBO field
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Action: Insert new FormField BEFORE line 1173 (the CBO Code Field comment):
    ```tsx
    {/* Função Field - New field for Individual Process */}
    <FormField
      control={form.control}
      name="funcao"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("funcao")}</FormLabel>
          <FormControl>
            <Input placeholder={t("funcaoPlaceholder")} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    ```
  - Validation: Field appears BEFORE CBO field in the form
  - Dependencies: 5.1 must be complete

#### Quality Checklist:

- [ ] Form default values include funcao
- [ ] Form reset includes funcao for existing and new processes
- [ ] Form updates check includes funcao
- [ ] Form submission includes funcao
- [ ] UI field appears BEFORE CBO field
- [ ] Field is properly styled and responsive
- [ ] No TypeScript errors

---

### 7. Add i18n Translations for New Individual Process Função Field

**Objective**: Add translation keys for the new "Função" field in individual processes (separate from people cargo translations)

#### Sub-tasks:

- [x] 7.1: Add Portuguese translations for individual process funcao
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Action: Add new translation keys under IndividualProcesses section (around line 1311):
    ```json
    "funcao": "Função",
    "funcaoPlaceholder": "ex: Desenvolvedor, Analista",
    ```
  - Note: These are DIFFERENT from the people.cargo translations
  - Validation: Translation keys work in individual process form
  - Dependencies: 6.6 must be complete

- [x] 7.2: Add English translations for individual process funcao
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Action: Add new translation keys under IndividualProcesses section:
    ```json
    "funcao": "Function",
    "funcaoPlaceholder": "e.g., Developer, Analyst",
    ```
  - Note: These are DIFFERENT from the people.cargo translations
  - Validation: Translation keys work in individual process form
  - Dependencies: 6.6 must be complete

#### Quality Checklist:

- [ ] Portuguese translations added for IndividualProcesses.funcao
- [ ] English translations added for IndividualProcesses.funcao
- [ ] Translations are in correct namespace (IndividualProcesses, not People)
- [ ] No translation key conflicts between People.cargo and IndividualProcesses.funcao
- [ ] No missing translation warnings in console

---

### 8. Testing and Validation

**Objective**: Comprehensive testing to ensure both changes work correctly and independently

#### Sub-tasks:

- [ ] 8.1: Test people table "Cargo" field
  - Test creating a new person with cargo value
  - Test editing an existing person's cargo
  - Test viewing person details showing cargo
  - Test that people table displays cargo column correctly
  - Validation: All CRUD operations work for people.cargo field
  - Dependencies: All tasks 1-3 must be complete

- [ ] 8.2: Test individual process "Função" field
  - Test creating a new individual process with funcao value
  - Test editing an existing individual process funcao
  - Test that funcao appears BEFORE CBO field in form
  - Test that funcao field saves and loads correctly
  - Validation: All CRUD operations work for individualProcesses.funcao field
  - Dependencies: All tasks 4-7 must be complete

- [ ] 8.3: Test i18n translations
  - Switch to Portuguese locale and verify:
    - People forms show "Cargo" label
    - Individual process form shows "Função" label before CBO
  - Switch to English locale and verify:
    - People forms show "Position" label
    - Individual process form shows "Function" label before CBO
  - Validation: All translations display correctly in both locales
  - Dependencies: Tasks 3 and 7 must be complete

- [ ] 8.4: Test data independence
  - Create a person with cargo = "Gerente"
  - Create an individual process for that person with funcao = "Analista"
  - Verify both fields are independent and display correctly
  - Validation: Changing one field doesn't affect the other
  - Dependencies: All previous tasks must be complete

- [ ] 8.5: Test mobile responsiveness
  - Test people form on mobile (sm breakpoint)
  - Test individual process form on mobile (sm breakpoint)
  - Verify both cargo and funcao fields are touch-friendly (min 44x44px)
  - Validation: Forms work correctly on mobile devices
  - Dependencies: All previous tasks must be complete

#### Quality Checklist:

- [ ] People.cargo field works correctly in all contexts
- [ ] IndividualProcesses.funcao field works correctly in all contexts
- [ ] Both fields are completely independent
- [ ] i18n translations work for both fields
- [ ] No data conflicts or cross-contamination
- [ ] Mobile responsiveness verified
- [ ] No console errors or warnings

---

## Implementation Notes

### Critical Distinctions

1. **Two Completely Different Fields**:
   - `people.cargo`: Person's position/role in their company (formerly called "funcao")
   - `individualProcesses.funcao`: Process-specific function (new field, unrelated to people.cargo)

2. **Translation Namespaces**:
   - People translations under `People` namespace: `People.cargo`, `People.cargoPlaceholder`
   - Individual process translations under `IndividualProcesses` namespace: `IndividualProcesses.funcao`, `IndividualProcesses.funcaoPlaceholder`

3. **Order of Operations**:
   - Complete ALL people table changes (tasks 1-3) FIRST
   - Then complete ALL individual process changes (tasks 4-7)
   - This prevents naming conflicts and confusion

4. **Field Positioning**:
   - The new `funcao` field MUST appear BEFORE the CBO field (line 1173)
   - This is a specific requirement from the user

### Potential Issues

- **Naming Confusion**: Be extremely careful not to confuse `people.cargo` with `individualProcesses.funcao`
- **Translation Conflicts**: Ensure translation keys are properly namespaced to avoid conflicts
- **Database Migration**: The schema changes will require database migration (Convex handles this automatically)

### Testing Strategy

1. Test people table changes in isolation first
2. Test individual process changes in isolation second
3. Test both together to ensure no conflicts
4. Test i18n in both locales
5. Test on mobile devices

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] People table "funcao" successfully renamed to "cargo"
- [ ] Individual process has new "funcao" field before CBO
- [ ] Both fields work independently
- [ ] i18n translations correct for both fields
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Mobile responsive
- [ ] All tests passing
