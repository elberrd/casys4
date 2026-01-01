# TODO: Add Authorization Type and Legal Framework Multi-Select Filters

## Context

Add two new multi-select filters to the Individual Processes list page: "Tipo de Autorização" (Authorization Type) and "Amparo Legal" (Legal Framework). These filters must work exactly like the existing filters (Applicant, Candidate, Progress Status) - with multi-select capability using Combobox components and full integration with the save/load filter functionality.

## Related Code Locations

- **Main page component**: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
- **Table component**: `/components/individual-processes/individual-processes-table.tsx`
- **Database schema**: `/convex/schema.ts` (lines 260-318)
- **Translations**: `/messages/pt.json` and `/messages/en.json`
- **Saved filters**: Integration with existing SaveFilterSheet and SavedFiltersList components

## Current State Analysis

**Existing multi-select filters:**
- Applicant (selectedApplicants) - lines 42-43, 289-294 in individual-processes-client.tsx
- Candidate (selectedCandidates) - lines 42-43, 282-286 in individual-processes-client.tsx
- Progress Status (selectedProgressStatuses) - lines 44, 297-303 in individual-processes-client.tsx

**Data already available:**
- processTypes fetched via `api.processTypes.listActive` (line 62)
- legalFrameworks fetched via `api.legalFrameworks.listActive` (line 63)
- Both fields exist in individualProcesses schema (processTypeId, legalFrameworkId)

**Advanced filters (currently hidden):**
- Lines 789-797 in individual-processes-client.tsx show commented-out advanced Filters component
- Lines 125-147 show filter field configuration for processType and legalFramework
- These are part of the advanced filtering system, NOT the simple multi-select filters

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the existing filter implementation pattern and ensure consistency

#### Sub-tasks:

- [x] 0.1: Review existing multi-select filter implementation
  - Validation: Confirmed pattern in lines 1516-1559 of individual-processes-table.tsx
  - Output: Multi-select filters use Combobox components with state management in parent component

- [x] 0.2: Identify state management pattern for filters
  - Validation: State variables in individual-processes-client.tsx (lines 42-44)
  - Output: Each filter needs: state variable, onChange handler, options array

- [x] 0.3: Review saved filter integration pattern
  - Validation: getCurrentFilterCriteria (lines 198-208), handleApplySavedFilter (lines 210-249)
  - Output: Filters must be included in filterCriteria object for save/load functionality

- [x] 0.4: Check translation keys pattern
  - Validation: Existing filter translations in /messages/pt.json (lines 875-887)
  - Output: Need to add similar keys for Authorization Type and Legal Framework

#### Quality Checklist:

- [x] Existing filter patterns documented
- [x] State management approach identified
- [x] Save/load integration requirements clear
- [x] Translation key patterns understood

### 1. Add i18n Translation Keys

**Objective**: Add all necessary translation keys for the new filters in both Portuguese and English

#### Sub-tasks:

- [x] 1.1: Add Authorization Type filter translations to `/messages/pt.json`
  - Location: Inside `IndividualProcesses.filters` section (after line 887)
  - Keys to add:
    - `selectAuthorizationTypes`: "Filtrar por tipos de autorização..."
    - `searchAuthorizationTypes`: "Pesquisar tipos de autorização..."
    - `noAuthorizationTypesFound`: "Nenhum tipo de autorização encontrado."
    - `clearAuthorizationTypes`: "Limpar seleção de tipos de autorização"
  - Validation: Keys follow same pattern as existing filters

- [x] 1.2: Add Legal Framework filter translations to `/messages/pt.json`
  - Location: Inside `IndividualProcesses.filters` section (after Authorization Type keys)
  - Keys to add:
    - `selectLegalFrameworks`: "Filtrar por amparos legais..."
    - `searchLegalFrameworks`: "Pesquisar amparos legais..."
    - `noLegalFrameworksFound`: "Nenhum amparo legal encontrado."
    - `clearLegalFrameworks`: "Limpar seleção de amparos legais"
  - Validation: Keys follow same pattern as existing filters

- [x] 1.3: Add Authorization Type filter translations to `/messages/en.json`
  - Location: Inside `IndividualProcesses.filters` section
  - Keys to add:
    - `selectAuthorizationTypes`: "Filter by authorization types..."
    - `searchAuthorizationTypes`: "Search authorization types..."
    - `noAuthorizationTypesFound`: "No authorization types found."
    - `clearAuthorizationTypes`: "Clear authorization type selection"
  - Validation: Translations are accurate and consistent

- [x] 1.4: Add Legal Framework filter translations to `/messages/en.json`
  - Location: Inside `IndividualProcesses.filters` section
  - Keys to add:
    - `selectLegalFrameworks`: "Filter by legal frameworks..."
    - `searchLegalFrameworks`: "Search legal frameworks..."
    - `noLegalFrameworksFound`: "No legal frameworks found."
    - `clearLegalFrameworks`: "Clear legal framework selection"
  - Validation: Translations are accurate and consistent

#### Quality Checklist:

- [x] All translation keys added to pt.json
- [x] All translation keys added to en.json
- [x] Keys follow existing naming conventions
- [x] Translations are grammatically correct

### 2. Add State Management for New Filters

**Objective**: Add state variables and handlers for the new filters in the client component

#### Sub-tasks:

- [x] 2.1: Add state variables for Authorization Type filter
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: After line 44 (after selectedProgressStatuses)
  - Code to add:
    ```typescript
    const [selectedAuthorizationTypes, setSelectedAuthorizationTypes] = useState<string[]>([])
    ```
  - Validation: State variable follows naming convention of existing filters

- [x] 2.2: Add state variables for Legal Framework filter
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: After Authorization Type state (previous step)
  - Code to add:
    ```typescript
    const [selectedLegalFrameworks, setSelectedLegalFrameworks] = useState<string[]>([])
    ```
  - Validation: State variable follows naming convention of existing filters

- [x] 2.3: Create options arrays for Authorization Type
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: After progressStatusOptions useMemo (after line 104)
  - Code to add:
    ```typescript
    const authorizationTypeOptions = useMemo(() => {
      return processTypes
        .map((pt) => ({
          value: pt._id,
          label: locale === "en" && pt.nameEn ? pt.nameEn : pt.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }, [processTypes, locale])
    ```
  - Validation: Options are properly formatted and sorted

- [x] 2.4: Create options arrays for Legal Framework
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: After Authorization Type options
  - Code to add:
    ```typescript
    const legalFrameworkOptions = useMemo(() => {
      return legalFrameworks
        .map((lf) => ({
          value: lf._id,
          label: lf.name,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    }, [legalFrameworks])
    ```
  - Validation: Options are properly formatted and sorted

#### Quality Checklist:

- [x] State variables declared with proper TypeScript types
- [x] Options arrays use useMemo for performance
- [x] Options are sorted alphabetically
- [x] Locale-aware labels for Authorization Types (nameEn support)

### 3. Update Filtering Logic

**Objective**: Add filtering logic for the new filters in the filteredProcesses useMemo

#### Sub-tasks:

- [x] 3.1: Add Authorization Type filtering logic
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: Inside filteredProcesses useMemo, after line 303 (after progress status filter)
  - Code to add:
    ```typescript
    // Apply authorization type multi-select filter
    if (selectedAuthorizationTypes.length > 0) {
      result = result.filter((process) => {
        const processTypeId = process.processType?._id
        return processTypeId && selectedAuthorizationTypes.includes(processTypeId)
      })
    }
    ```
  - Validation: Filter follows same pattern as other multi-select filters
  - Dependencies: Add selectedAuthorizationTypes to useMemo dependencies (line 449)

- [x] 3.2: Add Legal Framework filtering logic
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: After Authorization Type filter (previous step)
  - Code to add:
    ```typescript
    // Apply legal framework multi-select filter
    if (selectedLegalFrameworks.length > 0) {
      result = result.filter((process) => {
        const legalFrameworkId = process.legalFramework?._id
        return legalFrameworkId && selectedLegalFrameworks.includes(legalFrameworkId)
      })
    }
    ```
  - Validation: Filter follows same pattern as other multi-select filters
  - Dependencies: Add selectedLegalFrameworks to useMemo dependencies (line 449)

#### Quality Checklist:

- [x] Filtering logic handles null/undefined values correctly
- [x] Dependencies array updated in filteredProcesses useMemo
- [x] Filters are applied in logical order
- [x] Code follows existing patterns

### 4. Integrate with Saved Filters

**Objective**: Add new filters to the saved filter save/load functionality

#### Sub-tasks:

- [x] 4.1: Update hasActiveFilters check
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: Update hasActiveFilters useMemo (lines 179-189)
  - Change:
    ```typescript
    const hasActiveFilters = useMemo(() => {
      return (
        selectedCandidates.length > 0 ||
        selectedApplicants.length > 0 ||
        selectedProgressStatuses.length > 0 ||
        selectedAuthorizationTypes.length > 0 ||  // ADD THIS
        selectedLegalFrameworks.length > 0 ||      // ADD THIS
        isRnmModeActive ||
        isUrgentModeActive ||
        isQualExpProfModeActive ||
        filters.length > 0
      )
    }, [selectedCandidates, selectedApplicants, selectedProgressStatuses, selectedAuthorizationTypes, selectedLegalFrameworks, isRnmModeActive, isUrgentModeActive, isQualExpProfModeActive, filters])
    ```
  - Validation: Dependencies array includes new state variables

- [x] 4.2: Update getCurrentFilterCriteria function
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: Update getCurrentFilterCriteria callback (lines 198-208)
  - Change:
    ```typescript
    const getCurrentFilterCriteria = useCallback(() => {
      const criteria: any = {}
      if (selectedCandidates.length > 0) criteria.selectedCandidates = selectedCandidates
      if (selectedApplicants.length > 0) criteria.selectedApplicants = selectedApplicants
      if (selectedProgressStatuses.length > 0) criteria.selectedProgressStatuses = selectedProgressStatuses
      if (selectedAuthorizationTypes.length > 0) criteria.selectedAuthorizationTypes = selectedAuthorizationTypes  // ADD THIS
      if (selectedLegalFrameworks.length > 0) criteria.selectedLegalFrameworks = selectedLegalFrameworks          // ADD THIS
      if (isRnmModeActive) criteria.isRnmModeActive = true
      if (isUrgentModeActive) criteria.isUrgentModeActive = true
      if (isQualExpProfModeActive) criteria.isQualExpProfModeActive = true
      if (filters.length > 0) criteria.advancedFilters = filters
      return criteria
    }, [selectedCandidates, selectedApplicants, selectedProgressStatuses, selectedAuthorizationTypes, selectedLegalFrameworks, isRnmModeActive, isUrgentModeActive, isQualExpProfModeActive, filters])
    ```
  - Validation: Dependencies array includes new state variables

- [x] 4.3: Update handleApplySavedFilter function
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: Update handleApplySavedFilter callback (lines 210-249)
  - Changes:
    - Add to clear section (after line 218):
      ```typescript
      setSelectedAuthorizationTypes([])
      setSelectedLegalFrameworks([])
      ```
    - Add to apply section (after line 238):
      ```typescript
      if (filterCriteria.selectedAuthorizationTypes) {
        setSelectedAuthorizationTypes(filterCriteria.selectedAuthorizationTypes)
      }
      if (filterCriteria.selectedLegalFrameworks) {
        setSelectedLegalFrameworks(filterCriteria.selectedLegalFrameworks)
      }
      ```
  - Validation: Clear and apply logic matches existing filter patterns

- [x] 4.4: Update handleClearFilter function
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: Update handleClearFilter callback (lines 251-265)
  - Change: Add after line 258:
    ```typescript
    setSelectedAuthorizationTypes([])
    setSelectedLegalFrameworks([])
    ```
  - Validation: All filters are cleared when clear button is clicked

#### Quality Checklist:

- [x] New filters included in hasActiveFilters check
- [x] New filters saved in getCurrentFilterCriteria
- [x] New filters restored in handleApplySavedFilter
- [x] New filters cleared in handleClearFilter
- [x] All dependency arrays updated correctly

### 5. Add UI Components for Filters

**Objective**: Add Combobox components for the new filters in the table component

#### Sub-tasks:

- [x] 5.1: Update table component props interface
  - File: `/components/individual-processes/individual-processes-table.tsx`
  - Location: Update IndividualProcessesTableProps interface (lines 148-191)
  - Add after progressStatusOptions props (around line 179):
    ```typescript
    // Authorization Type filter props
    authorizationTypeOptions?: Array<{ value: string; label: string }>;
    selectedAuthorizationTypes?: string[];
    onAuthorizationTypeFilterChange?: (types: string[]) => void;
    // Legal Framework filter props
    legalFrameworkOptions?: Array<{ value: string; label: string }>;
    selectedLegalFrameworks?: string[];
    onLegalFrameworkFilterChange?: (frameworks: string[]) => void;
    ```
  - Validation: Props follow existing naming conventions

- [x] 5.2: Add default prop values
  - File: `/components/individual-processes/individual-processes-table.tsx`
  - Location: In component destructuring (lines 193-220)
  - Add after progressStatusOptions props (around line 212):
    ```typescript
    authorizationTypeOptions = [],
    selectedAuthorizationTypes = [],
    onAuthorizationTypeFilterChange,
    legalFrameworkOptions = [],
    selectedLegalFrameworks = [],
    onLegalFrameworkFilterChange,
    ```
  - Validation: Default values match existing pattern (empty arrays)

- [x] 5.3: Add Authorization Type Combobox component
  - File: `/components/individual-processes/individual-processes-table.tsx`
  - Location: Inside second row filter section (after line 1559, before closing div)
  - Code to add:
    ```typescript
    {onAuthorizationTypeFilterChange && authorizationTypeOptions.length > 0 && (
      <Combobox
        multiple
        options={authorizationTypeOptions as ComboboxOption<string>[]}
        value={selectedAuthorizationTypes}
        onValueChange={onAuthorizationTypeFilterChange}
        placeholder={t("filters.selectAuthorizationTypes")}
        searchPlaceholder={t("filters.searchAuthorizationTypes")}
        emptyText={t("filters.noAuthorizationTypesFound")}
        triggerClassName="min-w-[160px] max-w-[220px] w-full min-h-10"
        showClearButton={true}
        clearButtonAriaLabel={t("filters.clearAuthorizationTypes")}
      />
    )}
    ```
  - Validation: Component matches existing filter pattern exactly

- [x] 5.4: Add Legal Framework Combobox component
  - File: `/components/individual-processes/individual-processes-table.tsx`
  - Location: After Authorization Type Combobox (previous step)
  - Code to add:
    ```typescript
    {onLegalFrameworkFilterChange && legalFrameworkOptions.length > 0 && (
      <Combobox
        multiple
        options={legalFrameworkOptions as ComboboxOption<string>[]}
        value={selectedLegalFrameworks}
        onValueChange={onLegalFrameworkFilterChange}
        placeholder={t("filters.selectLegalFrameworks")}
        searchPlaceholder={t("filters.searchLegalFrameworks")}
        emptyText={t("filters.noLegalFrameworksFound")}
        triggerClassName="min-w-[160px] max-w-[220px] w-full min-h-10"
        showClearButton={true}
        clearButtonAriaLabel={t("filters.clearLegalFrameworks")}
      />
    )}
    ```
  - Validation: Component matches existing filter pattern exactly

#### Quality Checklist:

- [x] TypeScript interface updated with proper types
- [x] Props destructured with default values
- [x] Combobox components use all required props
- [x] Translation keys referenced correctly
- [x] Components are responsive (min-w, max-w, w-full classes)
- [x] Mobile responsiveness maintained (min-h-10 for touch targets)

### 6. Connect Filters to Parent Component

**Objective**: Pass filter props from client component to table component

#### Sub-tasks:

- [x] 6.1: Pass new props to IndividualProcessesTable
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: IndividualProcessesTable component usage (lines 799-844)
  - Add after progressStatusOptions props (around line 814):
    ```typescript
    authorizationTypeOptions={authorizationTypeOptions}
    selectedAuthorizationTypes={selectedAuthorizationTypes}
    onAuthorizationTypeFilterChange={setSelectedAuthorizationTypes}
    legalFrameworkOptions={legalFrameworkOptions}
    selectedLegalFrameworks={selectedLegalFrameworks}
    onLegalFrameworkFilterChange={setSelectedLegalFrameworks}
    ```
  - Validation: Props passed in consistent order with other filters

#### Quality Checklist:

- [x] All new props passed to table component
- [x] Props passed in logical order
- [x] State setters used directly as onChange handlers

### 7. Update Excel Export Functionality

**Objective**: Ensure new filters are reflected in Excel export filename generation

#### Sub-tasks:

- [x] 7.1: Review getExcelFilename function
  - File: `/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: getExcelFilename callback (lines 636-654)
  - Analysis: Current implementation adds candidate name, mode flags, and date to filename
  - Decision: No changes needed - new filters are general filters, not specific modes like RNM/Urgent
  - Validation: Excel export continues to work with filtered data

#### Quality Checklist:

- [x] Excel export filename logic reviewed
- [x] Export includes filtered data correctly
- [x] No regression in existing export functionality

### 8. Testing and Validation

**Objective**: Verify all functionality works correctly

#### Sub-tasks:

- [x] 8.1: Test Authorization Type filter
  - Manual testing steps:
    1. Load Individual Processes page
    2. Click Authorization Type filter dropdown
    3. Select one or more authorization types
    4. Verify processes are filtered correctly
    5. Clear filter and verify all processes show again
  - Validation: Filter works as expected with multi-select

- [x] 8.2: Test Legal Framework filter
  - Manual testing steps:
    1. Click Legal Framework filter dropdown
    2. Select one or more legal frameworks
    3. Verify processes are filtered correctly
    4. Clear filter and verify all processes show again
  - Validation: Filter works as expected with multi-select

- [x] 8.3: Test combined filters
  - Manual testing steps:
    1. Select multiple filters simultaneously (Authorization Type + Legal Framework + existing filters)
    2. Verify filters combine correctly (AND logic)
    3. Test various combinations
  - Validation: All filters work together correctly

- [x] 8.4: Test save filter functionality
  - Manual testing steps:
    1. Apply Authorization Type and Legal Framework filters
    2. Click "Save Filter" button
    3. Name and save the filter
    4. Clear all filters
    5. Load saved filter from dropdown
    6. Verify all filters (including new ones) are restored
  - Validation: Saved filters include new filter values

- [x] 8.5: Test edit saved filter
  - Manual testing steps:
    1. Load a saved filter
    2. Modify Authorization Type or Legal Framework selections
    3. Save filter again (update existing)
    4. Load filter again to verify changes persisted
  - Validation: Filter updates work correctly

- [x] 8.6: Test clear all filters
  - Manual testing steps:
    1. Apply all types of filters
    2. Click clear/reset button
    3. Verify all filters are cleared including new ones
  - Validation: Clear functionality works for all filters

- [x] 8.7: Test mobile responsiveness
  - Manual testing steps:
    1. Test on mobile viewport (< 640px)
    2. Verify filters are accessible and usable
    3. Check touch targets are adequate (44x44px minimum)
    4. Test filter dropdowns on mobile
  - Validation: Filters work well on mobile devices

- [x] 8.8: Test i18n translation switching
  - Manual testing steps:
    1. Switch language to English
    2. Verify all new filter labels and placeholders translate correctly
    3. Switch back to Portuguese
    4. Verify Portuguese translations show correctly
  - Validation: All translations work in both languages

#### Quality Checklist:

- [x] All individual filters tested and working
- [x] Combined filters work correctly
- [x] Save/load filter functionality works
- [x] Clear filter functionality works
- [x] Mobile responsiveness verified
- [x] i18n translations verified in both languages
- [x] No console errors or warnings
- [x] No TypeScript errors

## Implementation Notes

### Technical Considerations

1. **Filter Order**: New filters will appear after Candidate and Progress Status filters in the UI, maintaining a logical flow: Applicant → Candidate → Progress Status → Authorization Type → Legal Framework

2. **Data Availability**: Both `processTypes` and `legalFrameworks` are already being fetched via Convex queries (lines 62-64), so no additional API calls needed

3. **Performance**: Using `useMemo` for options arrays ensures they're only recalculated when source data changes, maintaining good performance

4. **Type Safety**: All new code uses proper TypeScript types, with no `any` types (filter options are typed as `Array<{ value: string; label: string }>`)

5. **Localization**: Authorization Types support bilingual labels (nameEn), Legal Frameworks currently only have Portuguese names in the database

6. **State Management**: Follows React best practices with useState for local state and useCallback for stable function references

### Potential Issues and Solutions

1. **Issue**: Legal Frameworks don't have English translations in database
   - **Solution**: Use Portuguese name for both locales (can be enhanced later by adding nameEn field to legalFrameworks schema)

2. **Issue**: Too many filters might clutter the UI
   - **Solution**: Current layout uses flex-wrap, filters will wrap to new line on smaller screens maintaining usability

3. **Issue**: Filter combinations might result in empty results
   - **Solution**: Table already handles empty state with "Nenhum resultado encontrado" message

### Mobile Responsiveness Strategy

- Combobox components use `min-w-[160px] max-w-[220px] w-full` ensuring they're:
  - Minimum 160px wide (readable on mobile)
  - Maximum 220px wide (don't dominate on larger screens)
  - Full width on very small screens (responsive)
- `min-h-10` ensures 40px minimum height = adequate touch target
- Second row of filters uses `flex-wrap` so filters stack on narrow screens

## Definition of Done

- [x] All translation keys added for both pt.json and en.json
- [x] State management implemented for both new filters
- [x] Filtering logic added and working correctly
- [x] Saved filter integration complete (save, load, clear, edit)
- [x] UI components added to table component
- [x] Props connected between client and table components
- [x] All manual testing completed successfully
- [x] Mobile responsiveness verified
- [x] i18n translations working in both languages
- [x] No TypeScript errors or warnings
- [x] Code follows existing patterns and conventions
- [x] Clean code principles maintained
- [x] No regressions in existing functionality
