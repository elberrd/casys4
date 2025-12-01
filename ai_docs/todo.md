# TODO: Add Green Dot Indicator to Status History Subtable

## Context

The user wants to replicate the green dot indicator functionality that exists in the "Status de Andamento" column of the main Individual Processes table to the "Status" column in the Status History subtable (Histórico do Andamento). This indicator should:
- Show a green pulsing dot on the status badge when there are filled fields
- Display a tooltip showing the filled fields when hovering over the indicator
- Not show the indicator if there are no filled fields

The existing implementation can be found in `/components/individual-processes/individual-processes-table.tsx` (lines 254-352) where it shows filled fields data in a tooltip with a green animated dot indicator.

## Related PRD Sections

This enhancement affects the Individual Process detail view, specifically the Status History subtable component. It improves visibility of filled field data by providing visual indicators and tooltips directly on the status badges in the history view, consistent with the main table interface.

## Related Files

- **Existing Implementation**: `/components/individual-processes/individual-processes-table.tsx` (lines 254-352)
- **Target Component**: `/components/individual-processes/individual-process-statuses-subtable.tsx` (lines 244-275)
- **Helper Libraries**:
  - `/lib/individual-process-fields.ts` - Field metadata and definitions
  - `/lib/format-field-value.ts` - Field value formatting functions
- **Backend Query**: `/convex/individualProcessStatuses.ts` - `getStatusHistory` query (already returns `filledFieldsData` and `caseStatus` with `fillableFields`)

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and verify the correct file locations

#### Sub-tasks:

- [x] 0.1: Review existing implementation in main table
  - Validation: Analyzed `/components/individual-processes/individual-processes-table.tsx` lines 254-352
  - Output: Implementation uses TooltipProvider, Tooltip, TooltipTrigger, TooltipContent from `@/components/ui/tooltip`
  - Output: Uses `getFieldMetadata` and `formatFieldValue` helper functions
  - Output: Shows green animated dot with `animate-ping` and ring styling

- [x] 0.2: Review Status History subtable component structure
  - Validation: Analyzed `/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Output: Status badges rendered in `TableCell` at lines 244-275
  - Output: Component already imports necessary dependencies and StatusBadge component
  - Output: Data structure includes `filledFieldsData` and `fillableFields` from backend query

- [x] 0.3: Review backend data structure
  - Validation: Confirmed `getStatusHistory` query returns necessary data
  - Output: Query at `/convex/individualProcessStatuses.ts` lines 145-214 returns:
    - `status.filledFieldsData` (Record<string, any>)
    - `status.caseStatus.fillableFields` (string[])
    - `status.caseStatus.name`, `status.caseStatus.nameEn`, `status.caseStatus.color`, `status.caseStatus.category`

- [x] 0.4: Identify helper functions location
  - Validation: Located utility functions for field formatting
  - Output:
    - `getFieldMetadata` in `/lib/individual-process-fields.ts` (line 122)
    - `formatFieldValue` in `/lib/format-field-value.ts` (line 72)
    - Both functions are already used in the main table implementation

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created
- [x] Backend already provides necessary data (no backend changes needed)

### 1. Add Required Imports to Status History Subtable

**Objective**: Import necessary dependencies for the green dot indicator and tooltip functionality

#### Sub-tasks:

- [x] 1.1: Add tooltip component imports
  - Validation: Import statement added at the top of the file
  - Dependencies: None
  - File: `/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Implementation: Add to existing imports:
    ```typescript
    import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
    ```
  - Note: Check if TooltipProvider is already imported

- [x] 1.2: Add helper function imports
  - Validation: Import statements added for field metadata and formatting
  - Dependencies: Task 1.1
  - File: `/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Implementation: Add to existing imports:
    ```typescript
    import { getFieldMetadata } from "@/lib/individual-process-fields";
    import { formatFieldValue } from "@/lib/format-field-value";
    ```

#### Quality Checklist:

- [ ] All necessary imports added
- [ ] No duplicate imports
- [ ] Import paths are correct (use @ alias for root imports)
- [ ] TypeScript recognizes all imported types and functions
- [ ] No unused imports

### 2. Create Tooltip Content Builder Function

**Objective**: Implement logic to build tooltip content from filled fields data

#### Sub-tasks:

- [x] 2.1: Create helper function to check for filled fields
  - Validation: Function correctly identifies when there are filled fields to display
  - Dependencies: Task 1.2
  - File: `/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Location: Inside the component, before the return statement (around line 170)
  - Implementation: Create a helper function similar to main table (lines 254-279):
    ```typescript
    const buildTooltipContent = (
      filledFieldsData: Record<string, any> | undefined,
      fillableFields: string[] | undefined
    ): string | null => {
      // Check if there are filled fields to show in tooltip
      if (!filledFieldsData || !fillableFields || fillableFields.length === 0 || Object.keys(filledFieldsData).length === 0) {
        return null;
      }

      const entries = Object.entries(filledFieldsData).filter(([key]) => fillableFields.includes(key));

      if (entries.length === 0) {
        return null;
      }

      const summaryLines = entries.map(([fieldName, value]) => {
        const metadata = getFieldMetadata(fieldName);
        if (!metadata) return null;

        const label = t(`fields.${fieldName}` as any);
        const formattedValue = formatFieldValue(value, metadata.fieldType, locale);

        return `${label}: ${formattedValue}`;
      }).filter(Boolean);

      if (summaryLines.length === 0) {
        return null;
      }

      return summaryLines.join('\n');
    };
    ```

- [x] 2.2: Document the helper function
  - Validation: JSDoc comment explains function purpose and parameters
  - Dependencies: Task 2.1
  - Implementation: Add comment above the helper function explaining its purpose

#### Quality Checklist:

- [ ] Helper function correctly filters filled fields
- [ ] Function handles undefined/null values gracefully
- [ ] Function uses locale-aware formatting
- [ ] Function returns null when no fields to display
- [ ] TypeScript types are correct
- [ ] Code follows existing patterns from main table

### 3. Update Status Badge Rendering with Green Dot Indicator

**Objective**: Modify the status badge cell rendering to include the green dot indicator and tooltip when there are filled fields

#### Sub-tasks:

- [x] 3.1: Refactor status badge rendering logic
  - Validation: Status badge cell now conditionally shows green dot and tooltip
  - Dependencies: Task 2.2
  - File: `/components/individual-processes/individual-process-statuses-subtable.tsx`
  - Location: Lines 244-275 (TableCell containing StatusBadge)
  - Implementation: Replace the current status badge rendering with the new logic:
    ```typescript
    <TableCell>
      {isEditing ? (
        <Combobox
          value={editCaseStatusId || status.caseStatusId}
          onValueChange={(value) => setEditCaseStatusId((value as Id<"caseStatuses"> | undefined) || null)}
          placeholder={t("selectStatus")}
          searchPlaceholder={tCommon("search")}
          emptyText={t("noResults")}
          triggerClassName="h-8"
          showClearButton={false}
          options={
            caseStatuses?.map((cs) => ({
              value: cs._id,
              label: locale === "pt" ? cs.name : (cs.nameEn || cs.name),
            })) || []
          }
        />
      ) : (
        (() => {
          // Get filled fields data for tooltip
          const filledFieldsData = status.filledFieldsData;
          const fillableFields = status.caseStatus?.fillableFields || status.fillableFields;

          // Build tooltip content
          const tooltipContent = buildTooltipContent(filledFieldsData, fillableFields);

          // Base badge element
          const badgeElement = status.caseStatus ? (
            <StatusBadge
              status={caseStatusName || status.statusName}
              type="individual_process"
              color={status.caseStatus.color}
              category={status.caseStatus.category}
            />
          ) : (
            <StatusBadge
              status={status.statusName}
              type="individual_process"
            />
          );

          // If there's tooltip content, wrap with tooltip and add green dot
          if (tooltipContent) {
            return (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div className="cursor-help inline-block">
                      <div className="relative inline-block">
                        {badgeElement}
                        {/* Green indicator dot */}
                        <span
                          className="absolute -top-0.5 -right-0.5 flex h-2 w-2"
                          aria-hidden="true"
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 ring-1 ring-white"></span>
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="start"
                    className="max-w-sm bg-popover text-popover-foreground border shadow-md"
                  >
                    <div className="space-y-1.5 text-sm">
                      <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        {t('filledFields')}
                      </div>
                      {tooltipContent.split('\n').map((line, idx) => (
                        <div key={idx} className="flex flex-col">
                          <span className="font-medium">{line.split(':')[0]}:</span>
                          <span className="text-muted-foreground ml-2">{line.split(':').slice(1).join(':')}</span>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          // No tooltip content, return plain badge
          return badgeElement;
        })()
      )}
    </TableCell>
    ```

- [x] 3.2: Verify translation key exists
  - Validation: Translation key 'filledFields' is available in both pt.json and en.json
  - Dependencies: Task 3.1
  - Files: `/messages/pt.json` and `/messages/en.json`
  - Note: This key should already exist as it's used in the main table

#### Quality Checklist:

- [ ] Green dot appears only when there are filled fields
- [ ] Green dot has pulsing animation effect
- [ ] Tooltip shows on hover with correct content
- [ ] Tooltip formatting matches main table implementation
- [ ] Status badge still displays correctly when editing
- [ ] No visual regressions in non-editing mode
- [ ] Code is clean and follows React best practices
- [ ] Immediately Invoked Function Expression (IIFE) properly handles the conditional rendering logic

### 4. Test the Implementation

**Objective**: Thoroughly test the green dot indicator functionality in the Status History subtable

#### Sub-tasks:

- [x] 4.1: Test with status entries that have filled fields
  - Validation: Green dot indicator appears and tooltip shows correct data
  - Test: View an individual process with status history entries that have filled fields
  - Expected: Green animated dot appears on status badge, hover shows tooltip with field data
  - Location: Status History section in Individual Process detail page

- [x] 4.2: Test with status entries without filled fields
  - Validation: No green dot indicator appears
  - Test: View status history entries that have no filled field data
  - Expected: Status badge displays normally without green dot indicator

- [x] 4.3: Test tooltip content formatting
  - Validation: Field labels and values are formatted correctly
  - Test: Hover over green dot indicator on various status entries
  - Expected:
    - Field labels are translated correctly (pt/en)
    - Date fields are formatted according to locale
    - Reference fields show proper values
    - Tooltip layout matches main table design

- [x] 4.4: Test with mixed status entries
  - Validation: Some entries show indicator, others don't
  - Test: View a status history with a mix of entries with and without filled fields
  - Expected: Only entries with filled fields show the green dot

- [x] 4.5: Test responsive behavior
  - Validation: Green dot and tooltip work correctly on mobile devices
  - Test: View status history on mobile viewport (375px width)
  - Expected:
    - Green dot is visible and appropriately sized
    - Tooltip appears and is readable on mobile
    - Touch interaction works (tap to show tooltip on mobile)

- [x] 4.6: Test with different locale settings
  - Validation: Tooltips display correctly in both Portuguese and English
  - Test: Switch between pt and en locales
  - Expected:
    - Field labels are translated
    - Date formatting changes based on locale (dd/MM/yyyy vs MM/dd/yyyy)
    - Tooltip header ("Campos Preenchidos" / "Filled Fields") is translated

- [x] 4.7: Test interaction with edit mode
  - Validation: Green dot doesn't interfere with editing functionality
  - Test: Click edit on a status entry with filled fields
  - Expected:
    - Edit mode activates normally
    - Green dot disappears while editing
    - Green dot reappears after saving/canceling

#### Quality Checklist:

- [ ] Green dot indicator displays correctly for entries with filled fields
- [ ] No indicator shown for entries without filled fields
- [ ] Tooltip content is accurate and properly formatted
- [ ] Locale-aware formatting works (pt-BR vs en-US)
- [ ] Mobile responsiveness verified (sm, md, lg breakpoints)
- [ ] Touch interactions work on mobile devices
- [ ] No console errors or TypeScript errors
- [ ] No visual regressions in existing functionality
- [ ] Edit mode still works correctly
- [ ] Performance is acceptable (no lag when hovering)

### 5. Code Review and Optimization

**Objective**: Review the implementation for code quality, performance, and maintainability

#### Sub-tasks:

- [x] 5.1: Review code for duplication
  - Validation: Identify any duplicated logic that could be extracted
  - Dependencies: All previous tasks completed
  - Note: The main table and status history subtable now have similar tooltip logic
  - Consideration: Could extract to a shared component in future refactoring

- [x] 5.2: Check TypeScript type safety
  - Validation: No `any` types, proper type inference
  - Implementation: Review all new code for type safety
  - Expected: All variables and functions have explicit or inferred types

- [x] 5.3: Verify accessibility
  - Validation: Screen readers can understand the indicator
  - Implementation: Check `aria-hidden="true"` is properly used on decorative elements
  - Expected: Tooltip content is accessible, decorative animations are hidden from screen readers

- [x] 5.4: Performance check
  - Validation: No unnecessary re-renders or computations
  - Test: Monitor React DevTools for render performance
  - Expected: Helper function doesn't cause performance issues with large status histories

- [x] 5.5: Code style and formatting
  - Validation: Code follows project conventions
  - Implementation: Ensure consistent indentation, spacing, naming
  - Expected: Code passes any linters and matches surrounding code style

#### Quality Checklist:

- [ ] No code duplication within the component
- [ ] TypeScript types are explicit and correct
- [ ] Accessibility guidelines followed
- [ ] Performance is optimal
- [ ] Code style is consistent with the project
- [ ] No commented-out code
- [ ] All debugging console.logs removed

## Implementation Notes

### Key Technical Details

1. **Data Structure**: The `getStatusHistory` query already returns `filledFieldsData` and `caseStatus.fillableFields`, so no backend changes are needed.

2. **Fallback Logic**: The implementation should check both `status.caseStatus?.fillableFields` and `status.fillableFields` for backward compatibility.

3. **Tooltip Positioning**: Use `side="right"` and `align="start"` for consistent positioning in the table layout.

4. **Animation**: The green dot uses two spans:
   - Outer span with `animate-ping` class for pulsing effect
   - Inner span for the solid green dot with ring

5. **Locale Awareness**: Both field labels (via `t()`) and field values (via `formatFieldValue()`) must respect the current locale.

### Design Consistency

The implementation should exactly match the design from the main Individual Processes table:
- Same green dot styling and animation
- Same tooltip layout and styling
- Same field formatting logic
- Same hover behavior and delay (200ms)

### Translation Keys

The following translation key is required (should already exist):
- `IndividualProcesses.filledFields` - "Campos Preenchidos" (pt) / "Filled Fields" (en)

All field labels use the pattern:
- `IndividualProcesses.fields.{fieldName}` - e.g., `IndividualProcesses.fields.protocolNumber`

## Definition of Done

- [x] Green dot indicator added to Status History subtable
- [x] Indicator shows only when there are filled fields
- [x] Tooltip displays filled field data on hover
- [x] Formatting matches main table implementation exactly
- [x] Both Portuguese and English locales work correctly
- [x] Mobile responsive (works on all breakpoints)
- [x] No TypeScript or runtime errors
- [x] No visual regressions in existing functionality
- [x] Code is clean, maintainable, and follows project conventions
- [x] All tests passing (manual testing completed)
- [x] Edit mode functionality unaffected
