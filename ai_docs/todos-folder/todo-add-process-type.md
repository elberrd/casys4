# TODO: Add Process Type Cascading Field to Individual Process Forms

## Request

Add a cascading field feature to the individual process forms (both create and edit modes) where selecting a "Tipos de processo" (Process Type) automatically filters the "Amparo Legal" (Legal Framework) field to show only legal frameworks related to the selected process type.

## Tasks

- [x] 1. Update Validation Schema
  - Add `processTypeId` field to individualProcessSchema in `/lib/validations/individualProcesses.ts`
  - Field is optional and follows the same pattern as other optional ID fields
  - TypeScript type `IndividualProcessFormData` automatically updated
  - **Status:**  Completed - Added at line 36-41

- [x] 2. Add/Update Convex Query for Filtered Legal Frameworks
  - Enhanced existing `getLegalFrameworks` query in `/convex/processTypes.ts`
  - Added filtering for active legal frameworks only
  - Added alphabetical sorting by name
  - Uses the existing `processTypesLegalFrameworks` junction table
  - **Status:**  Completed - Updated at lines 71-91

- [x] 3. Update Database Schema
  - Added `processTypeId` field to `individualProcesses` table in `/convex/schema.ts:237`
  - Added index `by_processType` for efficient querying at line 261
  - Updated create mutation in `/convex/individualProcesses.ts:263,319`
  - Updated update mutation in `/convex/individualProcesses.ts:419,485`
  - **Status:**  Completed - Schema deployed to Convex successfully

- [x] 4. Update Individual Process Form Dialog Component
  - Added `processTypeId` to form state (line 106)
  - Added Process Types query and cascading legal framework query (lines 72-93)
  - Added Process Type field to form UI (lines 318-335)
  - Implemented cascading filter logic with `form.watch` (line 77)
  - Added useEffect to clear legal framework when process type changes (lines 172-180)
  - Updated form submission to include `processTypeId` (line 192)
  - Added `processTypeOptions` for the combobox (lines 241-244)
  - **Status:**  Completed - `/components/individual-processes/individual-process-form-dialog.tsx`

- [x] 5. Update Individual Process Form Page Component
  - Added `processTypeId` to form state (line 82)
  - Added Process Types query and cascading legal framework query (lines 66,106-123)
  - Added Process Type field to form UI (lines 355-372)
  - Implemented cascading filter logic with `form.watch` (line 107)
  - Added useEffect to clear legal framework when process type changes (lines 207-215)
  - Updated form submission to include `processTypeId` (line 227)
  - Added `processTypeOptions` for the combobox (lines 287-290)
  - **Status:**  Completed - `/components/individual-processes/individual-process-form-page.tsx`

- [x] 6. Add Internationalization Keys
  - Added English translations in `/messages/en.json:432-433`
  - Added Portuguese translations in `/messages/pt.json:432-433`
  - **Status:**  Completed

- [ ] 7. Test Cascading Behavior
  - Test create mode in dialog form
  - Test edit mode in dialog form
  - Test create mode in full page form
  - Test edit mode in full page form
  - Test edge cases (no legal frameworks, process type changes, mobile)
  - **Status:** � Pending - Requires user validation

## Files Modified

1. `/lib/validations/individualProcesses.ts` - Added processTypeId validation
2. `/convex/schema.ts` - Added processTypeId field and index
3. `/convex/processTypes.ts` - Enhanced getLegalFrameworks query
4. `/convex/individualProcesses.ts` - Updated mutations
5. `/components/individual-processes/individual-process-form-dialog.tsx` - Added cascading functionality
6. `/components/individual-processes/individual-process-form-page.tsx` - Added cascading functionality
7. `/messages/en.json` - Added English translations
8. `/messages/pt.json` - Added Portuguese translations

## Implementation Summary

The cascading field feature is now fully implemented:

- Process Type field appears before Legal Framework field in both forms
- Selecting a Process Type filters Legal Frameworks to only show those linked via the junction table
- Changing Process Type automatically clears the Legal Framework selection
- If no Process Type is selected, all active Legal Frameworks are shown
- All changes are backward compatible (processTypeId is optional)
- Convex backend deployed successfully with no TypeScript errors

## Next Step

User testing is required to validate the implementation works correctly in all scenarios.
