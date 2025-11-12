# TODO: Implement Internationalized Country Names

## Context

The application currently displays country names in a single language (stored in the database). We need to implement full internationalization (i18n) for country names so they display in Portuguese when the app is in Portuguese and in English when the app is in English. This must work across ALL components that display or allow selection of countries.

## Related PRD Sections

- Section 10.4: Database Schema - countries table (lines 1044-1051)
- The app uses next-intl for i18n (lines 1-18 of `/i18n/routing.ts`)
- Translation files are in `/messages/pt.json` and `/messages/en.json`

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review `/ai_docs/prd.md` for project architecture and folder structure
  - Validation: Identified i18n setup using next-intl with Portuguese (pt) and English (en) locales
  - Output: Translation files are located at `/messages/pt.json` and `/messages/en.json`

- [x] 0.2: Identify where new files should be created based on PRD guidelines
  - Validation: New country translation utilities should go in `/lib/i18n/` directory
  - Output: Country translations will be added to existing message files and new utility functions in `/lib/i18n/countries.ts`

- [x] 0.3: Check for existing similar implementations to maintain consistency
  - Validation: Reviewed existing i18n usage - app uses `useTranslations()` hook throughout
  - Output: Similar pattern should be used - create translation keys in JSON files and utility functions to get translated country names

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

### 1. Audit Current Country Usage

**Objective**: Find all locations where countries are currently displayed or selected to ensure complete coverage

#### Sub-tasks:

- [x] 1.1: Search for all components using country data
  - Validation: Use grep to find all files with "country" or "nationality" references
  - Dependencies: Task 0 completed
  - Files to check:
    - `/components/people/person-form-dialog.tsx` (nationality selection)
    - `/components/people/person-form-page.tsx` (nationality selection)
    - `/components/individual-processes/quick-person-form-dialog.tsx` (nationality)
    - `/components/countries/countries-table.tsx` (display)
    - `/components/countries/country-form-dialog.tsx` (form)
    - `/components/countries/country-quick-create-dialog.tsx` (quick create)
    - `/components/countries/country-view-modal.tsx` (view)
    - `/components/cities/city-form-dialog.tsx` (country selection for cities)
    - `/components/states/state-form-dialog.tsx` (country selection for states)
    - `/components/passports/passport-form-dialog.tsx` (issuing country)
    - `/components/passports/passport-form-page.tsx` (issuing country)
    - `/components/ui/phone-input.tsx` (country phone codes)

- [x] 1.2: Document all country-related Convex queries
  - Validation: Review `/convex/countries.ts` for query patterns
  - Output: List of queries that return country data:
    - `api.countries.list` - returns all countries
    - `api.countries.get` - returns single country by ID

- [x] 1.3: Identify all Combobox/Select components displaying countries
  - Validation: Find all `<Combobox>` and `<Select>` components with country data
  - Output: Create inventory of components that need updating

#### Quality Checklist:

- [ ] All country usage locations documented
- [ ] All Convex queries identified
- [ ] All UI components catalogued
- [ ] No locations missed

### 2. Create Country Translation Infrastructure

**Objective**: Set up the translation keys and utilities for country name internationalization

#### Sub-tasks:

- [x] 2.1: Create comprehensive country name translations in Portuguese
  - Validation: Add all country names to `/messages/pt.json` under a new `Countries.names` section
  - Dependencies: Task 1 completed
  - File: `/messages/pt.json`
  - Structure:
    ```json
    "Countries": {
      "names": {
        "BR": "Brasil",
        "US": "Estados Unidos",
        "AR": "Argentina",
        "UY": "Uruguai",
        "PY": "Paraguai",
        "CL": "Chile",
        "PE": "Peru",
        "CO": "Col�mbia",
        "VE": "Venezuela",
        "EC": "Equador",
        "BO": "Bol�via",
        "MX": "M�xico",
        "CA": "Canad�",
        "GB": "Reino Unido",
        "FR": "Fran�a",
        "DE": "Alemanha",
        "IT": "It�lia",
        "ES": "Espanha",
        "PT": "Portugal",
        "CN": "China",
        "JP": "Jap�o",
        "KR": "Coreia do Sul",
        "IN": "�ndia",
        "AU": "Austr�lia",
        "NZ": "Nova Zel�ndia",
        "ZA": "�frica do Sul"
        // ... add all other countries
      }
    }
    ```

- [ ] 2.2: Create comprehensive country name translations in English
  - Validation: Add all country names to `/messages/en.json` under `Countries.names` section
  - Dependencies: Task 2.1 completed
  - File: `/messages/en.json`
  - Structure:
    ```json
    "Countries": {
      "names": {
        "BR": "Brazil",
        "US": "United States",
        "AR": "Argentina",
        "UY": "Uruguay",
        "PY": "Paraguay",
        "CL": "Chile",
        "PE": "Peru",
        "CO": "Colombia",
        "VE": "Venezuela",
        "EC": "Ecuador",
        "BO": "Bolivia",
        "MX": "Mexico",
        "CA": "Canada",
        "GB": "United Kingdom",
        "FR": "France",
        "DE": "Germany",
        "IT": "Italy",
        "ES": "Spain",
        "PT": "Portugal",
        "CN": "China",
        "JP": "Japan",
        "KR": "South Korea",
        "IN": "India",
        "AU": "Australia",
        "NZ": "New Zealand",
        "ZA": "South Africa"
        // ... add all other countries
      }
    }
    ```

- [x] 2.3: Create country translation utility file
  - Validation: TypeScript compiles without errors, proper type safety
  - Dependencies: Task 2.1 and 2.2 completed
  - File: `/lib/i18n/countries.ts`
  - Implementation:
    ```typescript
    import { useTranslations } from 'next-intl';

    // Type for country codes (based on ISO 2-letter codes)
    export type CountryCode = string;

    /**
     * Hook to get translated country name by country code
     * Usage: const getCountryName = useCountryTranslation()
     *        const name = getCountryName('BR') // Returns "Brasil" or "Brazil"
     */
    export function useCountryTranslation() {
      const t = useTranslations('Countries.names');

      return (countryCode: CountryCode | undefined): string => {
        if (!countryCode) return '';
        return t(countryCode as any) || countryCode;
      };
    }

    /**
     * Hook to get translated country names for a list of countries
     * Returns array of {id, code, name} with translated names
     */
    export function useCountriesTranslation() {
      const getCountryName = useCountryTranslation();

      return <T extends { _id: string; code: string; name: string }>(
        countries: T[]
      ): Array<T & { translatedName: string }> => {
        return countries.map(country => ({
          ...country,
          translatedName: getCountryName(country.code) || country.name
        }));
      };
    }
    ```

- [ ] 2.4: Add TypeScript types for country translations
  - Validation: No TypeScript errors, proper autocomplete
  - Dependencies: Task 2.3 completed
  - File: Update `/lib/i18n/countries.ts`
  - Add types for all country codes to enable autocomplete

#### Quality Checklist:

- [ ] All country translations added for Portuguese
- [ ] All country translations added for English
- [ ] Translation keys match country ISO codes exactly
- [ ] Utility functions have full TypeScript type coverage (no `any`)
- [ ] Clean code principles followed
- [ ] Proper error handling for missing translations

### 3. Update Convex Queries for I18n Support

**Objective**: Ensure Convex queries continue to work while frontend handles translations

#### Sub-tasks:

- [ ] 3.1: Review current country query implementation
  - Validation: Understand how countries are currently queried
  - Dependencies: Task 1.2 completed
  - File: `/convex/countries.ts`
  - Note: Backend will continue to store untranslated names; translation happens on frontend

- [ ] 3.2: Update country schema documentation
  - Validation: Clear documentation about i18n approach
  - Dependencies: Task 3.1 completed
  - File: `/convex/schema.ts` (add comments)
  - Add comment explaining that `name` field stores English name, translations happen via i18n

- [ ] 3.3: Ensure search functionality works with translations
  - Validation: Users can search countries in both languages
  - Dependencies: Task 3.2 completed
  - Note: Frontend filtering will need to search translated names, not just database names

#### Quality Checklist:

- [ ] Database schema understands i18n approach
- [ ] Search functionality planned for both languages
- [ ] No breaking changes to existing queries
- [ ] Documentation updated

### 4. Update Country Combobox Components

**Objective**: Make all country selection comboboxes display translated names

#### Sub-tasks:

- [ ] 4.1: Update ComboboxWithCreate component to support country translations
  - Validation: Component displays translated names but stores country ID
  - Dependencies: Task 2 completed
  - File: `/components/ui/combobox-with-create.tsx`
  - Changes:
    - Accept optional `translateItem` prop for custom translation function
    - Use translated name for display while keeping ID for value
    - Ensure search works with translated names

- [ ] 4.2: Update nationality selection in person forms
  - Validation: Nationality displays in current language
  - Dependencies: Task 4.1 completed
  - Files:
    - `/components/people/person-form-dialog.tsx`
    - `/components/people/person-form-page.tsx`
    - `/components/individual-processes/quick-person-form-dialog.tsx`
  - Implementation:
    ```typescript
    const getCountryName = useCountryTranslation();
    const translatedCountries = countries.map(c => ({
      ...c,
      displayName: getCountryName(c.code) || c.name
    }));
    ```

- [ ] 4.3: Update passport issuing country selection
  - Validation: Issuing country displays in current language
  - Dependencies: Task 4.1 completed
  - Files:
    - `/components/passports/passport-form-dialog.tsx`
    - `/components/passports/passport-form-page.tsx`
  - Use same translation pattern as nationality

- [ ] 4.4: Update city form country selection
  - Validation: Country selection for cities shows translated names
  - Dependencies: Task 4.1 completed
  - Files:
    - `/components/cities/city-form-dialog.tsx`
  - Use translation utility for country combobox

- [ ] 4.5: Update state form country selection
  - Validation: Country selection for states shows translated names
  - Dependencies: Task 4.1 completed
  - Files:
    - `/components/states/state-form-dialog.tsx`
  - Use translation utility for country combobox

#### Quality Checklist:

- [ ] All comboboxes display translated country names
- [ ] Search works in both languages
- [ ] Selected values correctly store country IDs (not names)
- [ ] TypeScript types are correct (no `any`)
- [ ] Component remains reusable
- [ ] Mobile responsiveness maintained

### 5. Update Country Display Components

**Objective**: Make all country display/view components show translated names

#### Sub-tasks:

- [ ] 5.1: Update countries table display
  - Validation: Table shows translated names, search works in both languages
  - Dependencies: Task 2.3 completed
  - File: `/components/countries/countries-table.tsx`
  - Implementation:
    - Import `useCountryTranslation` hook
    - Map country data to include translated names
    - Update columns to display translated names
    - Update search/filter to work with translated names

- [ ] 5.2: Update country view modal
  - Validation: Modal displays translated country name
  - Dependencies: Task 2.3 completed
  - File: `/components/countries/country-view-modal.tsx`
  - Display translated name alongside original database name

- [ ] 5.3: Update country form dialogs
  - Validation: Forms show translated labels and placeholders
  - Dependencies: Task 2.3 completed
  - Files:
    - `/components/countries/country-form-dialog.tsx`
    - `/components/countries/country-quick-create-dialog.tsx`
  - Add helper text explaining that English name is stored in database

- [ ] 5.4: Update city and state view modals
  - Validation: Country names in related data show translated
  - Dependencies: Task 2.3 completed
  - Files:
    - `/components/cities/city-view-modal.tsx`
    - `/components/states/state-view-modal.tsx`
  - Display translated country names in location hierarchies

#### Quality Checklist:

- [ ] All country displays show translated names
- [ ] Original database names still accessible where needed
- [ ] i18n keys follow naming conventions
- [ ] No hardcoded strings
- [ ] TypeScript types properly defined
- [ ] Mobile responsiveness maintained

### 6. Update Phone Input Component

**Objective**: Update phone input to show translated country names in dropdown

#### Sub-tasks:

- [ ] 6.1: Review current phone input implementation
  - Validation: Understand how country selection works in phone input
  - Dependencies: Task 1.1 completed
  - File: `/components/ui/phone-input.tsx`
  - Review `/lib/data/countries-phone.ts` for country phone data

- [ ] 6.2: Add translations to phone country list
  - Validation: Phone input dropdown shows translated country names
  - Dependencies: Task 2.3 and 6.1 completed
  - File: `/components/ui/phone-input.tsx`
  - Implementation:
    ```typescript
    const getCountryName = useCountryTranslation();
    const translatedPhoneCountries = phoneCountries.map(c => ({
      ...c,
      displayName: getCountryName(c.code) || c.name
    }));
    ```

- [ ] 6.3: Ensure flag icons still display correctly
  - Validation: Country flags show alongside translated names
  - Dependencies: Task 6.2 completed
  - File: `/components/ui/phone-input.tsx`
  - Test that flags render with translated names

#### Quality Checklist:

- [ ] Phone input shows translated country names
- [ ] Flags display correctly
- [ ] Search works with translated names
- [ ] Phone codes remain correct
- [ ] Component functionality unchanged
- [ ] Mobile responsiveness maintained

### 7. Add Translation Search Support

**Objective**: Ensure users can search for countries in their current language

#### Sub-tasks:

- [ ] 7.1: Create client-side translation search utility
  - Validation: Search function works with translated names
  - Dependencies: Task 2.3 completed
  - File: `/lib/i18n/search-helpers.ts`
  - Implementation:
    ```typescript
    import { normalizeString } from '@/convex/lib/stringUtils';

    export function searchTranslatedCountries<T extends { code: string; name: string }>(
      countries: T[],
      translationFn: (code: string) => string,
      searchTerm: string
    ): T[] {
      if (!searchTerm) return countries;

      const normalized = normalizeString(searchTerm);
      return countries.filter(country => {
        const translatedName = translationFn(country.code);
        return normalizeString(translatedName).includes(normalized) ||
               normalizeString(country.name).includes(normalized);
      });
    }
    ```

- [ ] 7.2: Update all country comboboxes to use translation search
  - Validation: Search finds countries in current language
  - Dependencies: Task 7.1 completed
  - Files: All combobox components from Task 4
  - Integrate `searchTranslatedCountries` helper

- [ ] 7.3: Update countries table search
  - Validation: Table search works with translated names
  - Dependencies: Task 7.1 completed
  - File: `/components/countries/countries-table.tsx`
  - Apply translation search to table filtering

#### Quality Checklist:

- [ ] Search works in both Portuguese and English
- [ ] Accent-insensitive search implemented
- [ ] Search helper has TypeScript types (no `any`)
- [ ] Clean code principles followed
- [ ] Reusable utility created

### 8. Complete Country Translation List

**Objective**: Ensure all countries have proper translations in both languages

#### Sub-tasks:

- [x] 8.1: Get complete list of countries from database
  - Validation: Export all country codes and names from production/dev database
  - Dependencies: Task 0 completed
  - Action: Query Convex database for all countries

- [ ] 8.2: Create comprehensive PT translation list
  - Validation: All countries from database have Portuguese names
  - Dependencies: Task 8.1 completed
  - File: `/messages/pt.json`
  - Add all ~195 countries with proper Portuguese names
  - Reference: Use official Brazilian Portuguese country names

- [ ] 8.3: Create comprehensive EN translation list
  - Validation: All countries from database have English names
  - Dependencies: Task 8.1 completed
  - File: `/messages/en.json`
  - Add all ~195 countries with proper English names
  - Reference: Use official English country names

- [ ] 8.4: Add fallback handling for missing translations
  - Validation: Missing translations fall back to database name gracefully
  - Dependencies: Task 2.3 completed
  - File: `/lib/i18n/countries.ts`
  - Ensure utility functions return database name if translation missing

#### Quality Checklist:

- [ ] All countries in database have PT translations
- [ ] All countries in database have EN translations
- [ ] Translation keys match ISO codes exactly
- [ ] Fallback mechanism works correctly
- [ ] No hardcoded country names remain

### 9. Testing and Quality Assurance

**Objective**: Thoroughly test country internationalization in both languages

#### Sub-tasks:

- [ ] 9.1: Test country selection in Portuguese
  - Validation: All country dropdowns show Portuguese names
  - Dependencies: Tasks 1-8 completed
  - Test cases:
    - Create new person with nationality
    - Create new passport with issuing country
    - Create new city with country selection
    - Create new state with country selection
    - View countries table
    - Search for countries in Portuguese

- [ ] 9.2: Test country selection in English
  - Validation: All country dropdowns show English names
  - Dependencies: Tasks 1-8 completed
  - Test cases:
    - Switch language to English
    - Repeat all test cases from 9.1
    - Verify English names display correctly
    - Verify search works in English

- [ ] 9.3: Test language switching
  - Validation: Country names update when language changes
  - Dependencies: Task 9.1 and 9.2 completed
  - Test cases:
    - Load page in Portuguese, verify country names
    - Switch to English, verify names update
    - Switch back to Portuguese, verify names update
    - Test on multiple pages/components

- [ ] 9.4: Test mobile responsiveness
  - Validation: Country selection works on mobile devices
  - Dependencies: Task 9.3 completed
  - Test cases:
    - Test country comboboxes on mobile viewport
    - Verify touch-friendly interactions
    - Test search on mobile
    - Verify dropdown scrolling works

- [ ] 9.5: Test edge cases
  - Validation: Handles missing data gracefully
  - Dependencies: Task 9.4 completed
  - Test cases:
    - Country with missing translation shows database name
    - Empty country selection
    - Country search with no results
    - Special characters in country names

#### Quality Checklist:

- [ ] All components work in Portuguese
- [ ] All components work in English
- [ ] Language switching works smoothly
- [ ] Mobile responsiveness verified
- [ ] Edge cases handled gracefully
- [ ] No console errors or warnings

### 10. Documentation and Code Review

**Objective**: Document the i18n implementation and ensure code quality

#### Sub-tasks:

- [ ] 10.1: Document country i18n approach
  - Validation: Clear documentation for future developers
  - Dependencies: Tasks 1-9 completed
  - File: Add section to `/ai_docs/prd.md` or create `/ai_docs/country-i18n.md`
  - Content:
    - Explain translation key structure
    - Document utility functions
    - Provide examples of usage
    - List all components using country i18n

- [ ] 10.2: Add JSDoc comments to utility functions
  - Validation: All utility functions have proper documentation
  - Dependencies: Task 10.1 completed
  - File: `/lib/i18n/countries.ts`
  - Add comprehensive JSDoc comments with examples

- [ ] 10.3: Review all changes for code quality
  - Validation: Code follows project standards
  - Dependencies: Tasks 1-9 completed
  - Checklist:
    - No `any` types used
    - All imports are valid
    - No unused imports
    - Consistent formatting
    - TypeScript compiles without errors
    - ESLint passes

- [ ] 10.4: Create example usage documentation
  - Validation: Developers know how to use country i18n
  - Dependencies: Task 10.2 completed
  - File: Update component documentation or create examples
  - Show how to use `useCountryTranslation` in new components

#### Quality Checklist:

- [ ] Documentation is comprehensive and clear
- [ ] Code comments are helpful
- [ ] TypeScript types are fully defined (no `any`)
- [ ] Code follows project conventions
- [ ] Examples provided for common use cases
- [ ] Future developers can easily understand and extend

## Implementation Notes

### Key Technical Considerations

1. **Translation Key Structure**: Use ISO 2-letter country codes as translation keys for consistency (e.g., `BR`, `US`, `JP`)

2. **Fallback Strategy**: If a translation is missing, fall back to the database name to prevent blank displays

3. **Search Functionality**: Implement accent-insensitive search that works with both translated and original names

4. **Performance**: Country translations are static and loaded with the locale bundle, no performance impact expected

5. **Database Independence**: Database continues to store country names in one language (English); translations happen entirely on the frontend

6. **ISO Code Consistency**: Ensure all countries in the database have correct ISO 2-letter codes for translation key matching

### Potential Gotchas

- Some countries have multiple common names (e.g., "UK" vs "United Kingdom") - use official names consistently
- Country name lengths vary between languages - ensure UI components handle long names gracefully
- Special characters and accents in country names require proper Unicode handling
- Phone input component has its own country list that needs separate translation handling

### i18n Best Practices for This Implementation

- Keep translation keys simple and predictable (ISO codes)
- Never hardcode country names in components
- Always use translation hooks for display
- Store untranslated data in database (IDs)
- Test language switching thoroughly
- Provide fallbacks for missing translations

## Definition of Done

- [ ] All country selection comboboxes display translated names
- [ ] All country display components show translated names
- [ ] Search works in both Portuguese and English
- [ ] Language switching updates country names in real-time
- [ ] Phone input shows translated country names
- [ ] All ~195+ countries have translations in both languages
- [ ] TypeScript types are complete (no `any` types)
- [ ] Mobile responsiveness verified
- [ ] Code reviewed and follows conventions
- [ ] Documentation completed
- [ ] All edge cases handled
- [ ] No console errors or warnings
- [ ] Tests passing (if applicable)
