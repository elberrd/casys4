# TODO: CPF Duplicate Validation with Real-time Feedback

## Context

When adding or editing a person in the people table, the CPF field must be unique - no two people can have the same CPF. The system should validate CPF uniqueness after the user completes entering the full CPF number (11 digits), not during typing. Visual feedback should display a green check mark () if the CPF is available, or an X with a message showing which user is already using that CPF if it's taken.

This is a Convex backend application using React Hook Form, Zod validation, and shadcn/ui components.

## Related PRD Sections

- **Section 4.2 - people table**: CPF field is optional but must be unique when provided (schema line 77, index on line 94)
- **Section 10.4 - people table schema**: Documents the CPF field structure and indexing

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the current project structure and determine correct file/folder locations for CPF validation implementation

#### Sub-tasks:

- [x] 0.1: Review existing CPF implementation files
  - Validation: Found `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/people.ts` with CPF validation schema
  - Validation: Found `/Users/elberrd/Documents/Development/clientes/casys4/lib/utils/document-masks.ts` with CPF formatting and validation utilities
  - Validation: Found `/Users/elberrd/Documents/Development/clientes/casys4/components/ui/cpf-input.tsx` custom CPF input component
  - Output: CPF validation logic exists, need to add duplicate checking

- [x] 0.2: Review people form components that need modification
  - Validation: Found `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-form-dialog.tsx` (modal form)
  - Validation: Found `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-form-page.tsx` (full page form)
  - Output: Both components use the same CPFInput component and personSchema validation

- [x] 0.3: Review Convex backend structure
  - Validation: Found `/Users/elberrd/Documents/Development/clientes/casys4/convex/people.ts` with CRUD operations
  - Validation: Schema has `by_cpf` index on people table (schema.ts line 94)
  - Output: Need to create new query function for CPF duplicate checking in `/Users/elberrd/Documents/Development/clientes/casys4/convex/people.ts`

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Existing CPF validation patterns identified
- [x] Database index confirmed for efficient CPF queries

---

### 1. Create Convex Query for CPF Duplicate Check

**Objective**: Implement a Convex query function that checks if a CPF is already in use by another person

**File**: `/Users/elberrd/Documents/Development/clientes/casys4/convex/people.ts`

#### Sub-tasks:

- [x] 1.1: Add new query function `checkCpfDuplicate`
  - Implementation: Create query that accepts `cpf` and optional `excludePersonId` parameters
  - Implementation: Use `by_cpf` index to efficiently query for existing person with that CPF
  - Implementation: Return object with `{ isAvailable: boolean, existingPerson?: { _id, fullName } }`
  - Validation: Query should return `isAvailable: true` if CPF not found or belongs to excludePersonId
  - Validation: Query should return `isAvailable: false` with existingPerson details if duplicate found
  - Dependencies: Must clean CPF input using cleanDocumentNumber before querying (store without formatting)

- [x] 1.2: Add access control to the query
  - Implementation: Use `getCurrentUserProfile(ctx)` to get current user
  - Implementation: Admin users can check any CPF
  - Implementation: Client users should only check for CPFs (may need to restrict or allow all)
  - Validation: Query respects role-based access control
  - Dependencies: Task 1.1 must be complete

- [x] 1.3: Handle edge cases
  - Implementation: Return available if CPF is empty or undefined
  - Implementation: Clean CPF input (remove formatting) before database query
  - Implementation: Case-insensitive comparison (CPF should only contain digits)
  - Validation: Empty CPF returns available
  - Validation: Formatted and unformatted CPF both work correctly

#### Quality Checklist:

- [x] TypeScript types defined for query parameters and return value
- [x] Query uses indexed field (by_cpf) for performance
- [x] Access control implemented (admin/client roles)
- [x] Edge cases handled (empty, formatted input, self-exclusion)
- [x] Clean code principles followed
- [x] Error handling implemented

---

### 2. Create Custom Hook for CPF Validation

**Objective**: Create a reusable React hook that provides CPF duplicate checking with debouncing

**File**: `/Users/elberrd/Documents/Development/clientes/casys4/hooks/use-cpf-validation.ts` (new file)

#### Sub-tasks:

- [x] 2.1: Create `useCpfValidation` custom hook
  - Implementation: Accept parameters: `cpf: string`, `personId?: Id<"people">`, `enabled?: boolean`
  - Implementation: Use `useQuery` from Convex to call `api.people.checkCpfDuplicate`
  - Implementation: Implement debouncing (wait 500ms after user stops typing)
  - Implementation: Only trigger query when CPF has 11 digits (complete)
  - Validation: Hook returns `{ isChecking: boolean, isAvailable: boolean | null, existingPerson: { _id, fullName } | null }`
  - Dependencies: Task 1 (Convex query) must be complete

- [x] 2.2: Implement validation state logic
  - Implementation: Return `null` for isAvailable when CPF is incomplete (< 11 digits)
  - Implementation: Return `null` when CPF is empty
  - Implementation: Return loading state while query is in progress
  - Implementation: Cache results to avoid unnecessary re-queries
  - Validation: Hook doesn't trigger validation until 11 digits entered
  - Validation: Loading state accurately reflects query status

- [x] 2.3: Add debounce functionality
  - Implementation: Use `useDebouncedValue` or similar to debounce CPF input
  - Implementation: 500ms delay after last change before triggering query
  - Validation: Query is not triggered on every keystroke
  - Validation: Query triggers after user stops typing

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] Proper debouncing implemented (500ms)
- [x] Hook follows React hooks best practices
- [x] Efficient query triggering (only when complete CPF entered)
- [x] Clean code principles followed
- [x] Proper dependency management in useEffect/useMemo

---

### 3. Create CPF Validation Feedback Component

**Objective**: Create a visual feedback component showing green check or red X with message

**File**: `/Users/elberrd/Documents/Development/clientes/casys4/components/ui/cpf-validation-feedback.tsx` (new file)

#### Sub-tasks:

- [x] 3.1: Create `CpfValidationFeedback` component
  - Implementation: Accept props: `isChecking: boolean`, `isAvailable: boolean | null`, `existingPerson: { _id, fullName } | null`
  - Implementation: Render nothing when `isAvailable` is null (incomplete CPF)
  - Implementation: Render loading spinner when `isChecking` is true
  - Implementation: Render green check () with success message when `isAvailable` is true
  - Implementation: Render red X with error message when `isAvailable` is false
  - Validation: Component displays correct icon for each state
  - Validation: Component is responsive on mobile devices

- [x] 3.2: Add i18n support for messages
  - Implementation: Use `useTranslations` hook for all user-facing text
  - Implementation: Add translation keys to `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Implementation: Add translation keys to `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Implementation: Messages include: "CPF available", "CPF already in use by {personName}", "Checking..."
  - Validation: All text uses i18n keys
  - Validation: Translations exist in both EN and PT
  - Dependencies: Task 3.1 must be complete

- [x] 3.3: Style the component
  - Implementation: Use Tailwind CSS for styling
  - Implementation: Green check: success color, appropriate icon size
  - Implementation: Red X: destructive color, appropriate icon size
  - Implementation: Show person name as clickable link (optional: opens person detail modal)
  - Implementation: Ensure mobile-friendly tap targets (min 44x44px for links)
  - Validation: Component looks good on all screen sizes (sm, md, lg breakpoints)
  - Validation: Colors match design system
  - Validation: Icons are clear and visible

#### Quality Checklist:

- [x] TypeScript types defined for all props
- [x] i18n implemented for all user-facing strings
- [x] Component is fully responsive (mobile, tablet, desktop)
- [x] Touch-friendly UI elements (min 44x44px)
- [x] Reusable component pattern followed
- [x] Accessibility considered (ARIA labels, semantic HTML)
- [x] Clean code principles followed

---

### 4. Integrate CPF Validation into Person Forms

**Objective**: Add CPF validation feedback to both person form components (dialog and page)

**Files**:
- `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-form-dialog.tsx`
- `/Users/elberrd/Documents/Development/clientes/casys4/components/people/person-form-page.tsx`

#### Sub-tasks:

- [x] 4.1: Update person-form-dialog.tsx
  - Implementation: Import `useCpfValidation` hook
  - Implementation: Import `CpfValidationFeedback` component
  - Implementation: Watch CPF field value using `form.watch('cpf')`
  - Implementation: Call `useCpfValidation` hook with watched CPF value and personId (for edit mode)
  - Implementation: Add `CpfValidationFeedback` component below CPF input field
  - Validation: Feedback appears when 11 digits entered
  - Validation: Feedback updates when CPF changes
  - Validation: Feedback doesn't appear for incomplete CPF
  - Dependencies: Tasks 2 and 3 must be complete

- [x] 4.2: Update person-form-page.tsx
  - Implementation: Same integration as person-form-dialog.tsx
  - Implementation: Ensure consistent behavior between dialog and page forms
  - Validation: Both forms show identical validation behavior
  - Dependencies: Task 4.1 must be complete

- [x] 4.3: Add form-level validation to prevent submission
  - Implementation: Check `isAvailable` state before allowing form submission
  - Implementation: If CPF is taken, show error toast and prevent submission
  - Implementation: Use existing toast system for error messages
  - Implementation: Disable submit button when CPF validation is in progress
  - Validation: Cannot submit form with duplicate CPF
  - Validation: Clear error message displayed
  - Validation: Submit button properly disabled during validation

- [x] 4.4: Handle edge cases in forms
  - Implementation: Allow saving without CPF (optional field)
  - Implementation: When editing, allow saving with same person's current CPF
  - Implementation: Clear validation state when CPF field is cleared
  - Validation: Edit mode excludes current person from duplicate check
  - Validation: Empty CPF doesn't trigger validation
  - Validation: Form behaves correctly in create vs edit modes

#### Quality Checklist:

- [x] Both form components updated consistently
- [x] Form validation prevents duplicate CPF submission
- [x] i18n used for all error messages
- [x] Loading states handled properly
- [x] Edit mode correctly excludes current person
- [x] Mobile responsiveness maintained
- [x] Clean code principles followed

---

### 5. Update Backend Validation (Defense in Depth)

**Objective**: Add server-side CPF duplicate validation in Convex mutations as a safety net

**File**: `/Users/elberrd/Documents/Development/clientes/casys4/convex/people.ts`

#### Sub-tasks:

- [x] 5.1: Add CPF duplicate check to `create` mutation
  - Implementation: Before inserting, check if CPF already exists
  - Implementation: Use `by_cpf` index to query existing people
  - Implementation: If duplicate found, throw error with person's name
  - Implementation: Clean CPF (remove formatting) before checking
  - Validation: Cannot create person with duplicate CPF
  - Validation: Error message is clear and includes existing person's name
  - Dependencies: None (standalone backend validation)

- [x] 5.2: Add CPF duplicate check to `update` mutation
  - Implementation: Before updating, check if CPF is taken by another person
  - Implementation: Exclude current person ID from duplicate check
  - Implementation: Use `by_cpf` index for efficient query
  - Implementation: Throw error if duplicate found
  - Validation: Cannot update to duplicate CPF
  - Validation: Can update person keeping their own CPF
  - Validation: Error message is descriptive

- [x] 5.3: Add i18n error messages for backend errors
  - Implementation: Ensure error messages are localized or use error codes
  - Implementation: Frontend can translate error codes to user-friendly messages
  - Validation: Error messages are clear in both EN and PT
  - Dependencies: Tasks 5.1 and 5.2 must be complete

#### Quality Checklist:

- [x] TypeScript types used correctly
- [x] Database queries use proper indexes
- [x] Clean CPF before comparing (digits only)
- [x] Error messages are descriptive and localized
- [x] Defense-in-depth: both client and server validation
- [x] Clean code principles followed
- [x] Proper error handling implemented

---

### 6. Add Translation Keys

**Objective**: Add all necessary i18n translation keys for CPF validation feature

**Files**:
- `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
- `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`

#### Sub-tasks:

- [x] 6.1: Add English translations (en.json)
  - Implementation: Add under "People" namespace:
    - `cpfAvailable`: "CPF available"
    - `cpfInUseBy`: "CPF already in use by {name}"
    - `cpfChecking`: "Checking CPF..."
    - `cpfDuplicateError`: "This CPF is already registered to another person"
    - `cpfValidationInProgress`: "Please wait while we validate the CPF"
  - Validation: All keys follow existing naming conventions
  - Validation: Messages are clear and user-friendly

- [x] 6.2: Add Portuguese translations (pt.json)
  - Implementation: Add under "People" namespace:
    - `cpfAvailable`: "CPF dispon�vel"
    - `cpfInUseBy`: "CPF j� est� em uso por {name}"
    - `cpfChecking`: "Verificando CPF..."
    - `cpfDuplicateError`: "Este CPF j� est� cadastrado para outra pessoa"
    - `cpfValidationInProgress`: "Aguarde enquanto validamos o CPF"
  - Validation: All keys match English keys exactly
  - Validation: Translations are accurate and natural

- [x] 6.3: Verify translation interpolation works
  - Implementation: Test that {name} placeholder is correctly replaced
  - Validation: Person name appears correctly in error message
  - Dependencies: Tasks 6.1 and 6.2 must be complete

#### Quality Checklist:

- [x] All translation keys added to both language files
- [x] Key names follow project conventions
- [x] Interpolation syntax correct ({name})
- [x] Translations are natural and user-friendly
- [x] No missing translations
- [x] Consistent terminology across messages

---

### 7. Testing and Quality Assurance

**Objective**: Thoroughly test the CPF duplicate validation feature across all scenarios

#### Sub-tasks:

- [ ] 7.1: Test create person flow
  - Testing: Create person with new unique CPF - should show green check and allow save
  - Testing: Create person with existing CPF - should show red X and prevent save
  - Testing: Create person without CPF - should allow save (optional field)
  - Testing: Type incomplete CPF - should not show validation feedback
  - Testing: Complete typing CPF - should show feedback after 500ms delay
  - Validation: All create scenarios work correctly
  - Dependencies: All previous tasks must be complete

- [ ] 7.2: Test edit person flow
  - Testing: Edit person keeping same CPF - should show green check (or no validation)
  - Testing: Edit person changing to new unique CPF - should show green check
  - Testing: Edit person changing to duplicate CPF - should show red X and prevent save
  - Testing: Edit person removing CPF - should allow save
  - Validation: Edit mode correctly excludes current person from duplicate check
  - Validation: All edit scenarios work correctly

- [ ] 7.3: Test edge cases
  - Testing: Paste formatted CPF (123.456.789-00) - should work correctly
  - Testing: Paste unformatted CPF (12345678900) - should work correctly
  - Testing: Type CPF quickly - debouncing should work (no query on every keystroke)
  - Testing: Change CPF before validation completes - should cancel previous query
  - Testing: Submit form while validation in progress - should be prevented
  - Validation: All edge cases handled gracefully
  - Validation: No console errors or warnings

- [ ] 7.4: Test mobile responsiveness
  - Testing: Test on mobile viewport (sm breakpoint)
  - Testing: Validation feedback is visible and readable
  - Testing: Touch targets are appropriately sized (min 44x44px)
  - Testing: Form layout works well on small screens
  - Validation: Feature is fully functional on mobile
  - Validation: UI is touch-friendly

- [ ] 7.5: Test internationalization
  - Testing: Switch language to English - all messages in English
  - Testing: Switch language to Portuguese - all messages in Portuguese
  - Testing: Person name appears correctly in "CPF in use by {name}" message
  - Validation: All text is properly localized
  - Validation: No untranslated strings visible

- [ ] 7.6: Test backend validation (defense in depth)
  - Testing: Bypass frontend validation (browser dev tools) and submit duplicate CPF
  - Testing: Backend should reject with appropriate error
  - Testing: Error message is displayed to user
  - Validation: Backend validation works independently of frontend
  - Validation: System is secure against client-side bypass

#### Quality Checklist:

- [ ] All test scenarios pass
- [ ] No console errors or warnings
- [ ] Feature works on all browsers (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verified (sm, md, lg breakpoints)
- [ ] i18n works correctly in both languages
- [ ] Backend validation provides defense in depth
- [ ] User experience is smooth and intuitive
- [ ] Performance is acceptable (debouncing prevents excessive queries)

---

## Implementation Notes

### Technical Considerations

1. **Debouncing**: Use 500ms debounce to prevent excessive queries while user is typing
2. **CPF Format**: Always clean CPF (remove formatting) before database queries for consistent comparison
3. **Index Usage**: The `by_cpf` index on people table ensures efficient duplicate checking
4. **Edit Mode**: When editing, pass `personId` to exclude current person from duplicate check
5. **Optional Field**: CPF is optional, so empty values should always pass validation
6. **Real-time Feedback**: Validation should trigger automatically when 11 digits are entered, not on form submit

### Performance Optimization

- Use indexed query (`by_cpf`) for fast lookups
- Debounce queries to reduce backend load
- Cache validation results to avoid redundant queries
- Only trigger validation when CPF is complete (11 digits)

### Security Considerations

- Client-side validation is for UX only
- Backend validation provides the actual security (defense in depth)
- Both create and update mutations must validate CPF uniqueness
- Access control ensures users can only check CPFs within their permissions

### User Experience

- Clear visual feedback (green check = available, red X = taken)
- Informative error messages including who is using the CPF
- No validation feedback while typing (wait for complete CPF)
- Smooth loading states during validation
- Mobile-friendly interface with proper touch targets

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] Backend query for CPF duplicate check implemented
- [ ] Custom hook for CPF validation created
- [ ] Visual feedback component implemented
- [ ] Both form components updated with validation
- [ ] Backend mutations updated with duplicate checks
- [ ] All translation keys added (EN and PT)
- [ ] Comprehensive testing completed
- [ ] No console errors or warnings
- [ ] Feature works on mobile devices
- [ ] i18n fully functional
- [ ] Code reviewed for quality and best practices
- [ ] Performance is acceptable (debouncing works)
- [ ] Security validated (backend defense in depth)
