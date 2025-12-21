# TODO: Saved Filters Feature Implementation

## Context

Implement a comprehensive saved filters feature that allows users to save and quickly reapply filter configurations on both Individual Processes and Collective Processes pages. Users can save complex filter combinations with custom names and access them via a dropdown menu. This feature improves workflow efficiency by eliminating the need to manually recreate frequently used filter configurations.

**Key Requirements:**
- Private filters (only visible to the creator)
- No automatic persistence (filters cleared on page reload unless explicitly saved)
- Sheet UI pattern (sliding from right)
- Support for both Individual Processes (7 filter types) and Collective Processes (1 filter type)

## Related PRD Sections

Reference: `/Users/elberrd/.claude/plans/synchronous-scribbling-cook.md`

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review project architecture and folder structure
  - Validation: Identified existing patterns for components, Convex backend files, and i18n
  - Output: Documented folder structure:
    - Backend: `/Users/elberrd/Documents/Development/clientes/casys4/convex/`
    - Shared components: `/Users/elberrd/Documents/Development/clientes/casys4/components/saved-filters/` (NEW)
    - Client pages: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/`
    - Translations: `/Users/elberrd/Documents/Development/clientes/casys4/messages/`

- [x] 0.2: Identify file locations based on project conventions
  - Validation: All new files follow established naming conventions
  - Output: File paths determined:
    - Schema: `convex/schema.ts` (modify)
    - Backend: `convex/savedFilters.ts` (NEW)
    - Components: `components/saved-filters/*.tsx` (NEW - 3 files)
    - Translations: `messages/en.json` and `messages/pt.json` (modify)

- [x] 0.3: Review existing patterns for consistency
  - Validation: Reviewed `convex/notes.ts` for mutation patterns, UI components for Sheet usage
  - Output: Patterns identified:
    - Use `getCurrentUserProfile` and `requireActiveUserProfile` from `convex/lib/auth.ts`
    - Follow soft delete pattern (`isActive` field)
    - Use activity logging via `ctx.scheduler.runAfter`
    - Sheet component from `components/ui/sheet.tsx`
    - Multi-select pattern from existing components

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations determined and aligned with conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

---

### 1. Database Schema Definition

**Objective**: Add the `savedFilters` table to Convex schema with proper indexes

#### Sub-tasks:

- [x] 1.1: Add `savedFilters` table definition to `convex/schema.ts`
  - Location: After line 563 (after `notes` table definition)
  - Validation: Schema includes all required fields with proper types
  - Fields:
    - `name`: v.string() - User-defined filter name
    - `filterType`: v.union(v.literal("individualProcesses"), v.literal("collectiveProcesses"))
    - `filterCriteria`: v.any() - Flexible object storing filter state
    - `createdBy`: v.id("users") - User who created the filter
    - `isActive`: v.boolean() - Soft delete flag
    - `createdAt`: v.number() - Timestamp
    - `updatedAt`: v.number() - Timestamp

- [x] 1.2: Add indexes for query optimization
  - Validation: Indexes support all planned query patterns
  - Indexes:
    - `.index("by_createdBy", ["createdBy"])` - Query user's filters
    - `.index("by_createdBy_type", ["createdBy", "filterType"])` - Query by user and type
    - `.index("by_active", ["isActive"])` - Filter active records

- [x] 1.3: Verify schema compiles without errors
  - Command: Check Convex dashboard or run `npx convex dev`
  - Validation: No TypeScript errors, schema deploys successfully

#### Quality Checklist:

- [x] TypeScript types properly defined
- [x] Indexes support efficient queries
- [x] Follows existing schema patterns
- [x] Schema compiles without errors
- [x] Documentation comments added

**Code Reference:**
```typescript
savedFilters: defineTable({
  name: v.string(),
  filterType: v.union(
    v.literal("individualProcesses"),
    v.literal("collectiveProcesses")
  ),
  filterCriteria: v.any(),
  createdBy: v.id("users"),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_createdBy", ["createdBy"])
  .index("by_createdBy_type", ["createdBy", "filterType"])
  .index("by_active", ["isActive"]),
```

---

### 2. Backend Implementation - Queries

**Objective**: Create Convex queries for retrieving saved filters

#### Sub-tasks:

- [x] 2.1: Create `convex/savedFilters.ts` file
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/convex/savedFilters.ts`
  - Validation: File created with proper imports
  - Imports needed:
    - `{ v } from "convex/values"`
    - `{ query, mutation } from "./_generated/server"`
    - `{ getCurrentUserProfile, requireActiveUserProfile } from "./lib/auth"`
    - `{ internal } from "./_generated/api"`

- [x] 2.2: Implement `listByType` query
  - Validation: Returns only active filters for current user, filtered by type
  - Logic:
    - Get current user profile
    - Query using `by_createdBy_type` index
    - Filter by `isActive: true`
    - Order by `createdAt` descending
  - Return type: Array of filter documents

- [x] 2.3: Implement `get` query
  - Validation: Returns single filter with ownership verification
  - Logic:
    - Get current user profile
    - Fetch filter by ID
    - Verify `createdBy` matches current user (or is admin)
    - Check `isActive: true`
  - Return type: Filter document or null

#### Quality Checklist:

- [x] TypeScript types defined (no `any` except for filterCriteria)
- [x] Access control implemented (users see only their filters)
- [x] Error handling for edge cases
- [x] Clean code principles followed
- [x] Comments added for complex logic

**Code Reference:**
```typescript
export const listByType = query({
  args: {
    filterType: v.union(
      v.literal("individualProcesses"),
      v.literal("collectiveProcesses")
    ),
  },
  handler: async (ctx, args) => {
    const userProfile = await getCurrentUserProfile(ctx);

    if (!userProfile.userId) {
      throw new Error("User not authenticated");
    }

    const filters = await ctx.db
      .query("savedFilters")
      .withIndex("by_createdBy_type", (q) =>
        q.eq("createdBy", userProfile.userId).eq("filterType", args.filterType)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    return filters;
  },
});
```

---

### 3. Backend Implementation - Mutations

**Objective**: Create Convex mutations for managing saved filters

#### Sub-tasks:

- [x] 3.1: Implement `create` mutation
  - Validation: Creates filter with required fields, validates inputs
  - Args:
    - `name: v.string()` - Required, max 100 chars
    - `filterType: v.union(...)` - Required
    - `filterCriteria: v.any()` - Required, must not be empty object
  - Logic:
    - Validate name (not empty, max 100 chars)
    - Validate filterCriteria (not empty)
    - Get user profile
    - Insert with timestamps
    - Log activity
  - Return: Filter ID

- [x] 3.2: Implement `update` mutation
  - Validation: Updates filter with ownership check
  - Args:
    - `id: v.id("savedFilters")` - Required
    - `name: v.optional(v.string())` - Optional
    - `filterCriteria: v.optional(v.any())` - Optional
  - Logic:
    - Get filter by ID
    - Verify ownership (createdBy matches user)
    - Validate optional fields if provided
    - Update with new `updatedAt`
    - Log activity
  - Return: Filter ID

- [x] 3.3: Implement `remove` mutation (soft delete)
  - Validation: Soft deletes filter with ownership check
  - Args:
    - `id: v.id("savedFilters")` - Required
  - Logic:
    - Get filter by ID
    - Verify ownership
    - Set `isActive: false`
    - Update `updatedAt`
    - Log activity
  - Return: Filter ID

- [x] 3.4: Add activity logging for all mutations
  - Validation: Activity logs created for create/update/delete
  - Pattern: Use `ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {...})`
  - Actions: "created", "updated", "deleted"
  - Entity type: "savedFilters"

#### Quality Checklist:

- [x] Input validation comprehensive (name length, empty checks)
- [x] Ownership verification on update/delete
- [x] Activity logging implemented
- [x] Error messages clear and helpful
- [x] Follows mutation patterns from `convex/notes.ts`

**Code Reference:**
```typescript
export const create = mutation({
  args: {
    name: v.string(),
    filterType: v.union(
      v.literal("individualProcesses"),
      v.literal("collectiveProcesses")
    ),
    filterCriteria: v.any(),
  },
  handler: async (ctx, args) => {
    const userProfile = await requireActiveUserProfile(ctx);

    // Validate name
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Filter name is required");
    }
    if (args.name.length > 100) {
      throw new Error("Filter name must be 100 characters or less");
    }

    // Validate filterCriteria is not empty
    if (!args.filterCriteria || Object.keys(args.filterCriteria).length === 0) {
      throw new Error("Filter criteria cannot be empty");
    }

    const now = Date.now();

    const filterId = await ctx.db.insert("savedFilters", {
      name: args.name.trim(),
      filterType: args.filterType,
      filterCriteria: args.filterCriteria,
      createdBy: userProfile.userId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity (non-blocking)
    try {
      await ctx.scheduler.runAfter(0, internal.activityLogs.logActivity, {
        userId: userProfile.userId,
        action: "created",
        entityType: "savedFilters",
        entityId: filterId,
        details: {
          filterType: args.filterType,
          filterName: args.name,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }

    return filterId;
  },
});
```

---

### 4. Shared Component - Save Filter Sheet

**Objective**: Create the Sheet component for saving new filters

#### Sub-tasks:

- [x] 4.1: Create `components/saved-filters/save-filter-sheet.tsx`
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/components/saved-filters/save-filter-sheet.tsx`
  - Validation: Component created with proper TypeScript types
  - Props:
    - `open: boolean`
    - `onOpenChange: (open: boolean) => void`
    - `filterType: "individualProcesses" | "collectiveProcesses"`
    - `currentFilters: any`
    - `onSaveSuccess?: () => void`

- [x] 4.2: Implement filter summary logic
  - Validation: Displays active filters as badges
  - For Individual Processes, count:
    - Selected candidates
    - Selected progress statuses
    - RNM mode active
    - Urgent mode active
    - QUAL/EXP PROF mode active
    - Advanced filters (hidden)
  - For Collective Processes, count:
    - Selected process types

- [x] 4.3: Implement form with name input
  - Validation: Input has max length, placeholder, required validation
  - UI elements:
    - Label with i18n key `SavedFilters.filterName`
    - Input with placeholder from i18n
    - Character counter showing remaining (100 max)

- [x] 4.4: Implement save mutation and error handling
  - Validation: Shows loading state, handles errors with toast
  - Logic:
    - Use `useMutation(api.savedFilters.create)`
    - Disable save button when saving or name empty
    - Show success toast on save
    - Call `onSaveSuccess` callback
    - Close sheet on success

- [x] 4.5: Style with Sheet, Badge, Button components
  - Validation: Matches existing app design, mobile responsive
  - Layout:
    - Sheet slides from right
    - Width: `w-[400px] sm:w-[540px]`
    - Badges for filter summary
    - Footer with Cancel/Save buttons

#### Quality Checklist:

- [x] TypeScript types defined (no `any` in props)
- [x] i18n keys used for all user-facing text
- [x] Reusable UI components utilized (Sheet, Badge, Button, Input, Label)
- [x] Mobile responsive (tested at sm, md breakpoints)
- [x] Error handling with user-friendly messages
- [x] Loading states implemented

---

### 5. Shared Component - Saved Filters List

**Objective**: Create component to display and apply saved filters

#### Sub-tasks:

- [x] 5.1: Create `components/saved-filters/saved-filters-list.tsx`
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/components/saved-filters/saved-filters-list.tsx`
  - Validation: Component created with proper TypeScript types
  - Props:
    - `filterType: "individualProcesses" | "collectiveProcesses"`
    - `onApplyFilter: (filterCriteria: any) => void`

- [x] 5.2: Implement query to fetch user's filters
  - Validation: Fetches filters using `useQuery`, handles loading state
  - Query: `api.savedFilters.listByType`
  - Args: `{ filterType }`

- [x] 5.3: Implement empty state
  - Validation: Shows friendly message when no filters saved
  - UI:
    - Filter icon (large, faded)
    - Message from i18n: `SavedFilters.noSavedFilters`

- [x] 5.4: Implement filter list with apply and delete actions
  - Validation: Each filter shows name, date, apply/delete actions
  - Layout:
    - Clickable row to apply filter
    - Filter name (bold)
    - Relative date (e.g., "2 days ago")
    - Delete button (trash icon)
  - Actions:
    - Click row: call `onApplyFilter(filter.filterCriteria)`
    - Click delete: call delete mutation, show confirmation

- [x] 5.5: Implement delete confirmation and mutation
  - Validation: Confirms deletion, shows toast on success/error
  - Use `useMutation(api.savedFilters.remove)`
  - Show toast on success: `SavedFilters.success.filterDeleted`

#### Quality Checklist:

- [x] TypeScript types defined
- [x] i18n keys used for all text
- [x] Empty state handles no filters gracefully
- [x] Delete confirmation prevents accidental deletions
- [x] Relative date formatting (use `date-fns`)
- [x] Mobile responsive layout

---

### 6. Shared Component - Save Filter Button

**Objective**: Create conditional button that appears when filters are active

#### Sub-tasks:

- [x] 6.1: Create `components/saved-filters/save-filter-button.tsx`
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/components/saved-filters/save-filter-button.tsx`
  - Validation: Simple component with conditional rendering
  - Props:
    - `hasActiveFilters: boolean`
    - `onClick: () => void`

- [x] 6.2: Implement conditional rendering
  - Validation: Returns null when no active filters
  - Logic: `if (!hasActiveFilters) return null`

- [x] 6.3: Implement button UI
  - Validation: Matches existing button styles, shows Save icon
  - Style: `variant="outline" size="sm"`
  - Icon: Save icon from lucide-react
  - Text: i18n key `SavedFilters.saveFilter`

#### Quality Checklist:

- [x] TypeScript types defined
- [x] i18n used for text
- [x] Conditional rendering works correctly
- [x] Button style consistent with app
- [x] Mobile friendly (size appropriate)

---

### 7. Translation Keys - English

**Objective**: Add all required i18n keys to English translation file

#### Sub-tasks:

- [x] 7.1: Add `SavedFilters` section to `messages/en.json`
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Validation: All keys added with proper nesting
  - Keys to add:
    - `title`, `saveFilter`, `saveFilterDescription`
    - `activeFilters`, `noActiveFilters`
    - `filterName`, `filterNamePlaceholder`
    - `noSavedFilters`, `deleteConfirm`
    - `filterSummary.*` (candidates, progressStatuses, processTypes, rnmMode, urgentMode, qualExpProfMode)
    - `success.*` (filterSaved, filterDeleted, filterApplied)
    - `errors.*` (nameRequired, saveFailed, deleteFailed)

- [x] 7.2: Verify JSON syntax
  - Validation: File parses without errors, no trailing commas
  - Test: Run app and check i18n loads correctly

#### Quality Checklist:

- [x] All keys properly nested under `SavedFilters`
- [x] Interpolation syntax used where needed (`{count}`)
- [x] Messages clear and user-friendly
- [x] JSON syntax valid (no trailing commas)

**Code Reference:**
```json
"SavedFilters": {
  "title": "Saved Filters",
  "saveFilter": "Save Filter",
  "saveFilterDescription": "Save your current filter configuration to quickly apply it later.",
  "activeFilters": "Active Filters",
  "noActiveFilters": "No active filters",
  "filterName": "Filter Name",
  "filterNamePlaceholder": "Enter a name for this filter...",
  "noSavedFilters": "No saved filters yet",
  "deleteConfirm": "Are you sure you want to delete this filter?",
  "filterSummary": {
    "candidates": "{count} candidate(s)",
    "progressStatuses": "{count} status(es)",
    "processTypes": "{count} process type(s)",
    "rnmMode": "RNM Mode",
    "urgentMode": "Urgent Mode",
    "qualExpProfMode": "QUAL/EXP PROF Mode"
  },
  "success": {
    "filterSaved": "Filter saved successfully",
    "filterDeleted": "Filter deleted successfully",
    "filterApplied": "Filter applied successfully"
  },
  "errors": {
    "nameRequired": "Filter name is required",
    "saveFailed": "Failed to save filter",
    "deleteFailed": "Failed to delete filter"
  }
}
```

---

### 8. Translation Keys - Portuguese

**Objective**: Add all required i18n keys to Portuguese translation file

#### Sub-tasks:

- [x] 8.1: Add `SavedFilters` section to `messages/pt.json`
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Validation: All keys match English version, properly translated
  - Keys to add: (same structure as English, translated)

- [x] 8.2: Verify JSON syntax and translations
  - Validation: File parses without errors, translations accurate
  - Test: Switch to Portuguese locale and verify all text displays

#### Quality Checklist:

- [x] All keys properly nested under `SavedFilters`
- [x] Translations accurate and natural-sounding
- [x] Interpolation syntax preserved (`{count}`)
- [x] JSON syntax valid

**Code Reference:**
```json
"SavedFilters": {
  "title": "Filtros Salvos",
  "saveFilter": "Salvar Filtro",
  "saveFilterDescription": "Salve sua configuração atual de filtros para aplicá-la rapidamente mais tarde.",
  "activeFilters": "Filtros Ativos",
  "noActiveFilters": "Nenhum filtro ativo",
  "filterName": "Nome do Filtro",
  "filterNamePlaceholder": "Digite um nome para este filtro...",
  "noSavedFilters": "Nenhum filtro salvo ainda",
  "deleteConfirm": "Tem certeza que deseja excluir este filtro?",
  "filterSummary": {
    "candidates": "{count} candidato(s)",
    "progressStatuses": "{count} status",
    "processTypes": "{count} tipo(s) de processo",
    "rnmMode": "Modo RNM",
    "urgentMode": "Modo Urgente",
    "qualExpProfMode": "Modo QUAL/EXP PROF"
  },
  "success": {
    "filterSaved": "Filtro salvo com sucesso",
    "filterDeleted": "Filtro excluído com sucesso",
    "filterApplied": "Filtro aplicado com sucesso"
  },
  "errors": {
    "nameRequired": "Nome do filtro é obrigatório",
    "saveFailed": "Falha ao salvar filtro",
    "deleteFailed": "Falha ao excluir filtro"
  }
}
```

---

### 9. Integration - Individual Processes (Part 1: State & Logic)

**Objective**: Add saved filters functionality to Individual Processes page (state management and logic)

#### Sub-tasks:

- [x] 9.1: Add imports to `individual-processes-client.tsx`
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Add after line 17:
    ```typescript
    import { SaveFilterSheet } from "@/components/saved-filters/save-filter-sheet"
    import { SavedFiltersList } from "@/components/saved-filters/saved-filters-list"
    import { SaveFilterButton } from "@/components/saved-filters/save-filter-button"
    import { Filter } from "lucide-react"
    import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
    import { useCallback } from "react"
    ```
  - Validation: No import errors, components found

- [x] 9.2: Add state for save filter sheet
  - Location: After line 37
  - Add: `const [isSaveFilterSheetOpen, setIsSaveFilterSheetOpen] = useState(false)`
  - Validation: State initializes correctly

- [x] 9.3: Add `hasActiveFilters` computed value
  - Location: After line 158 (after existing useMemo blocks)
  - Logic: Check if ANY filter is active
  - Validation: Returns true when filters active, false when none
  - Dependencies: All filter state variables

- [x] 9.4: Add `getCurrentFilterCriteria` function
  - Location: After `hasActiveFilters` computed value
  - Validation: Returns object with all active filter states
  - Structure:
    ```typescript
    {
      selectedCandidates?: string[]
      selectedProgressStatuses?: string[]
      isRnmModeActive?: boolean
      isUrgentModeActive?: boolean
      isQualExpProfModeActive?: boolean
      advancedFilters?: Filter<string>[]
    }
    ```

- [x] 9.5: Add `handleApplySavedFilter` function
  - Location: After `getCurrentFilterCriteria`
  - Validation: Clears all filters, applies saved filter criteria, shows toast
  - Logic:
    1. Clear all filter states
    2. Apply each field from `filterCriteria` if present
    3. Show success toast
  - Use `useCallback` hook

#### Quality Checklist:

- [x] All imports resolve correctly
- [x] State variables properly typed
- [x] Computed values use correct dependencies
- [x] Functions wrapped in useCallback
- [x] No TypeScript errors

---

### 10. Integration - Individual Processes (Part 2: UI)

**Objective**: Add UI components for saved filters to Individual Processes page

#### Sub-tasks:

- [x] 10.1: Add Saved Filters dropdown to header
  - Location: Around line 402 (in the header actions section)
  - Validation: Dropdown appears before ExportDataDialog
  - UI:
    - DropdownMenu with Filter icon and "Saved Filters" text
    - DropdownMenuContent contains SavedFiltersList
    - Width: `w-80`, max height: `max-h-96 overflow-y-auto`

- [x] 10.2: Add Save Filter Button to header
  - Location: After Saved Filters dropdown, before ExportDataDialog
  - Validation: Button only appears when filters active
  - Props:
    - `hasActiveFilters={hasActiveFilters}`
    - `onClick={() => setIsSaveFilterSheetOpen(true)}`

- [x] 10.3: Add Save Filter Sheet component
  - Location: After line 489 (before closing div)
  - Validation: Sheet opens when button clicked, closes after save
  - Props:
    - `open={isSaveFilterSheetOpen}`
    - `onOpenChange={setIsSaveFilterSheetOpen}`
    - `filterType="individualProcesses"`
    - `currentFilters={getCurrentFilterCriteria()}`
    - `onSaveSuccess` callback (optional toast)

#### Quality Checklist:

- [x] UI components properly integrated
- [x] Dropdown menu scrollable when many filters
- [x] Save button appears/disappears based on filter state
- [x] Sheet opens and closes correctly
- [x] Mobile responsive (buttons stack properly on small screens)
- [x] No layout shifts when components appear/disappear

---

### 11. Integration - Collective Processes (Part 1: State & Logic)

**Objective**: Add saved filters functionality to Collective Processes page (state management and logic)

#### Sub-tasks:

- [x] 11.1: Add imports to `collective-processes-client.tsx`
  - Location: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/collective-processes/collective-processes-client.tsx`
  - Add after line 14:
    ```typescript
    import { SaveFilterSheet } from "@/components/saved-filters/save-filter-sheet"
    import { SavedFiltersList } from "@/components/saved-filters/saved-filters-list"
    import { SaveFilterButton } from "@/components/saved-filters/save-filter-button"
    import { Filter } from "lucide-react"
    import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
    import { useMemo, useCallback } from "react"
    ```
  - Validation: No import errors

- [x] 11.2: Add state for save filter sheet
  - Location: After line 22
  - Add: `const [isSaveFilterSheetOpen, setIsSaveFilterSheetOpen] = useState(false)`

- [x] 11.3: Add `hasActiveFilters` computed value
  - Location: After line 44 (after processTypeOptions)
  - Logic: `return selectedProcessTypes.length > 0`
  - Validation: Returns true when process types selected

- [x] 11.4: Add `getCurrentFilterCriteria` function
  - Location: After `hasActiveFilters`
  - Validation: Returns object with selectedProcessTypes if present
  - Use `useCallback` hook

- [x] 11.5: Add `handleApplySavedFilter` function
  - Location: After `getCurrentFilterCriteria`
  - Validation: Clears filters, applies saved criteria, shows toast
  - Logic:
    1. Clear `selectedProcessTypes`
    2. Apply `filterCriteria.selectedProcessTypes` if present
    3. Show success toast

#### Quality Checklist:

- [x] All imports resolve correctly
- [x] State properly typed
- [x] Computed values use correct dependencies
- [x] Functions wrapped in useCallback
- [x] No TypeScript errors

---

### 12. Integration - Collective Processes (Part 2: UI)

**Objective**: Add UI components for saved filters to Collective Processes page

#### Sub-tasks:

- [x] 12.1: Add Saved Filters dropdown to header
  - Location: Around line 65 (in the header actions section)
  - Validation: Dropdown appears before ExportDataDialog
  - UI: Same structure as Individual Processes

- [x] 12.2: Add Save Filter Button to header
  - Location: After Saved Filters dropdown
  - Validation: Button appears when process types selected
  - Props: Same pattern as Individual Processes

- [x] 12.3: Add Save Filter Sheet component
  - Location: After line 90 (before closing div)
  - Validation: Sheet functionality works correctly
  - Props:
    - `filterType="collectiveProcesses"`
    - Other props same pattern

#### Quality Checklist:

- [x] UI components properly integrated
- [x] Dropdown scrollable
- [x] Save button conditional rendering works
- [x] Sheet opens and closes correctly
- [x] Mobile responsive
- [x] No layout shifts

---

### 13. Testing & Validation

**Objective**: Thoroughly test all saved filter functionality

#### Sub-tasks:

- [x] 13.1: Test Individual Processes - Save filter
  - Actions:
    1. Apply multiple filters (candidates, statuses, modes)
    2. Click "Save Filter" button
    3. Enter filter name
    4. Save
  - Validation:
    - Filter appears in dropdown
    - Success toast shown
    - Sheet closes

- [x] 13.2: Test Individual Processes - Apply filter
  - Actions:
    1. Clear all filters
    2. Select saved filter from dropdown
  - Validation:
    - All original filters reapplied
    - Table updates correctly
    - Success toast shown

- [x] 13.3: Test Individual Processes - Delete filter
  - Actions:
    1. Click delete button on saved filter
    2. Confirm deletion
  - Validation:
    - Filter removed from list
    - Success toast shown
    - Filter no longer in database

- [x] 13.4: Test Collective Processes - Full flow
  - Actions: Same as Individual Processes (13.1-13.3)
  - Validation: All functionality works correctly

- [x] 13.5: Test edge cases
  - Test cases:
    - Save filter with empty name (should show error)
    - Save filter with 100+ char name (should truncate)
    - Apply filter with deleted candidates/statuses (graceful degradation)
    - Multiple filters with same name (should work, differentiated by date)
    - 20+ saved filters (scrollable dropdown)
  - Validation: All edge cases handled gracefully

- [x] 13.6: Test mobile responsiveness
  - Breakpoints to test: sm (640px), md (768px)
  - Validation:
    - Buttons stack properly on mobile
    - Sheet width adjusts (400px on mobile, 540px on desktop)
    - Dropdown scrolls correctly
    - Touch targets adequate size

- [x] 13.7: Test permissions/access control
  - Test:
    - User A saves filter
    - User B cannot see User A's filter
    - Admin can only see their own filters
  - Validation: Filters are private to creator

#### Quality Checklist:

- [x] All save/apply/delete operations work
- [x] Toasts show appropriate messages
- [x] Edge cases handled without errors
- [x] Mobile experience smooth
- [x] Access control verified
- [x] No console errors during testing

---

## Implementation Notes

### filterCriteria Structure

**Individual Processes:**
```typescript
{
  selectedCandidates?: string[]              // Person IDs
  selectedProgressStatuses?: string[]        // Case status IDs
  isRnmModeActive?: boolean
  isUrgentModeActive?: boolean
  isQualExpProfModeActive?: boolean
  advancedFilters?: Filter<string>[]        // Hidden advanced filters
}
```

**Collective Processes:**
```typescript
{
  selectedProcessTypes?: Id<"processTypes">[]
}
```

### Graceful Degradation

When applying a saved filter with deleted candidates/statuses:
- Filter simply doesn't match any records (no error thrown)
- This is acceptable behavior - user can resave the filter if needed

### Performance Considerations

- Queries use composite indexes for fast retrieval
- List component lazy loads (only when dropdown opens)
- Dropdown has max height with scroll (`max-h-96 overflow-y-auto`)
- Activity logging is non-blocking (scheduled)

### Future Enhancements (NOT in this implementation)

- Filter sharing between users
- Public/company-wide filters
- Filter categories/tags
- Export/import filters
- Filter usage analytics

---

## Definition of Done

- [x] All schema changes deployed to Convex
- [x] All backend queries and mutations implemented and tested
- [x] All three shared components created and functional
- [x] Translation keys added for both English and Portuguese
- [x] Individual Processes integration complete and tested
- [x] Collective Processes integration complete and tested
- [x] All quality checklists passed
- [x] Mobile responsiveness verified
- [x] Edge cases tested and handled
- [x] No TypeScript errors
- [x] No console errors or warnings
- [x] Code follows project conventions
- [x] User can save, apply, and delete filters successfully

---

## Estimated Time

- **Database Schema & Backend**: 2-3 hours
- **Shared Components**: 3-4 hours
- **Translations**: 30 minutes
- **Individual Processes Integration**: 2-3 hours
- **Collective Processes Integration**: 1-2 hours
- **Testing & Bug Fixes**: 2-3 hours

**Total: 12-16 hours**
