# TODO: Add Urgent Flag Feature to Individual Processes

## Context

Add an "urgent" field to individual processes with the following features:
1. Database field to track urgent status
2. Toggle flag icon in the processes table (red when urgent)
3. Small professional flag icon in the edit page (top right)
4. Urgent filter button similar to the existing RNM filter

This feature will help users quickly identify and filter urgent individual processes in the system.

## Related PRD Sections

This feature extends the individual processes management system. It follows similar patterns to:
- The RNM filter toggle implementation (lines 118-119, 736-761 in `individual-processes-table.tsx`)
- The existing database schema for `individualProcesses` in `convex/schema.ts` (lines 259-308)
- The `isRnmModeActive` state management in `individual-processes-client.tsx` (line 34)

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review project architecture for individual processes
  - Validation: Database schema located in `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Validation: Backend mutations in `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Validation: Table component in `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Validation: Client page in `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Validation: Edit page in `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/[id]/edit/page.tsx`
  - Output: Identified all file locations for this feature

- [x] 0.2: Identify i18n message file locations
  - Validation: English messages in `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Validation: Portuguese messages in `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Output: Will add urgent-related i18n keys to IndividualProcesses section

- [x] 0.3: Review existing urgent field patterns
  - Validation: Found `isUrgent` field already exists in `collectiveProcesses` schema (line 244)
  - Validation: RNM filter toggle pattern in table component can be replicated
  - Output: Will follow same boolean field pattern and filter implementation

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

### 1. Add Database Field for Urgent Status

**Objective**: Add the `urgent` boolean field to the individualProcesses table schema

#### Sub-tasks:

- [x] 1.1: Update Convex schema to add `urgent` field
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Location: In `individualProcesses` table definition (around line 259-308)
  - Add: `urgent: v.optional(v.boolean())`
  - Validation: Field added after existing optional fields, before timestamps
  - Dependencies: None

- [x] 1.2: Add index for urgent field for efficient filtering
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Location: In `individualProcesses` indexes section (after line 308)
  - Add: `.index("by_urgent", ["urgent"])`
  - Validation: Index added following existing index pattern
  - Dependencies: Task 1.1 must be completed first

- [x] 1.3: Update TypeScript interface in table component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Location: `IndividualProcess` interface (around lines 41-95)
  - Add: `urgent?: boolean`
  - Validation: Field added to interface definition
  - Dependencies: Task 1.1 must be completed first

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Schema follows existing conventions (optional boolean)
- [ ] Index added for query performance
- [ ] Clean code principles followed
- [ ] Naming consistent with existing fields

### 2. Update Backend Mutations for Urgent Field

**Objective**: Modify create and update mutations to handle the urgent field

#### Sub-tasks:

- [x] 2.1: Add urgent parameter to create mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Location: `create` mutation args (around line 422-453)
  - Add: `urgent: v.optional(v.boolean())`
  - Add to insert: `urgent: args.urgent`
  - Validation: Parameter added and used in insert statement
  - Dependencies: Task 1.1 completed

- [x] 2.2: Add urgent parameter to update mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Location: `update` mutation args (around line 756-786)
  - Add: `urgent: v.optional(v.boolean())`
  - Add to updates: `if (args.urgent !== undefined) updates.urgent = args.urgent`
  - Validation: Parameter added and conditionally updated
  - Dependencies: Task 1.1 completed

- [x] 2.3: Add urgent to createFromExisting mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Location: `createFromExisting` mutation insert (around line 638-662)
  - Note: DO NOT copy urgent status from source process (start fresh as non-urgent)
  - Validation: New processes start as non-urgent by default
  - Dependencies: Task 1.1 completed

#### Quality Checklist:

- [ ] All mutations handle the urgent field
- [ ] Default values are appropriate (undefined/false)
- [ ] Backward compatibility maintained
- [ ] Error handling implemented
- [ ] Code follows existing mutation patterns

### 3. Add Urgent Toggle Column to Table

**Objective**: Add a flag icon column that toggles urgent status with visual feedback

#### Sub-tasks:

- [x] 3.1: Create new column definition for urgent flag
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Location: In columns array (around line 214-681), add after "processTypeIndicator" column
  - Add column with:
    - `accessorKey: "urgent"`
    - `id: "urgent"`
    - Header with icon (Flag from lucide-react)
    - Cell with clickable flag icon that changes color based on urgent status
  - Validation: Column displays flag icon, red when urgent, gray when not urgent
  - Dependencies: Task 1.3 completed

- [x] 3.2: Implement toggle mutation call in flag click handler
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Location: In flag icon onClick handler
  - Implementation:
    - Import `useMutation` from convex/react
    - Import `api` from convex
    - Create mutation hook: `const updateProcess = useMutation(api.individualProcesses.update)`
    - On click: Toggle urgent status via mutation
    - Add `stopPropagation()` to prevent row click
  - Validation: Clicking flag toggles urgent status in database
  - Dependencies: Task 2.2, 3.1 completed

- [x] 3.3: Add visual styling for urgent flag
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Location: In flag column cell render
  - Styling:
    - Red flag when urgent: `text-red-500`
    - Gray flag when not urgent: `text-muted-foreground`
    - Hover effect: `hover:scale-110 transition-transform`
    - Cursor: `cursor-pointer`
  - Validation: Visual feedback is clear and professional
  - Dependencies: Task 3.1 completed

- [x] 3.4: Add i18n tooltips for urgent flag
  - Files:
    - `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
    - `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Location: In `IndividualProcesses` section (around line 570-610)
  - Add keys:
    - `"urgentFlagLabel": "Urgent"` / `"urgentFlagLabel": "Urgente"`
    - `"markAsUrgent": "Mark as urgent"` / `"markAsUrgent": "Marcar como urgente"`
    - `"unmarkAsUrgent": "Unmark as urgent"` / `"unmarkAsUrgent": "Desmarcar como urgente"`
  - Validation: Tooltips display correct text in both languages
  - Dependencies: Task 3.1 completed

#### Quality Checklist:

- [ ] Column properly positioned in table
- [ ] Flag icon from lucide-react imported
- [ ] Tooltip component used for accessibility
- [ ] Click handler prevents row click event
- [ ] Visual feedback is immediate and clear
- [ ] i18n keys added for both languages
- [ ] Mobile responsive (flag visible on all breakpoints)
- [ ] Touch-friendly (adequate tap target size)

### 4. Add Urgent Flag to Edit Page Header

**Objective**: Add a small, professional flag icon in the top right of the edit page

#### Sub-tasks:

- [ ] 4.1: Add urgent flag display to IndividualProcessFormPage component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Location: Need to review this file to find the header section
  - Implementation:
    - Add flag icon in top-right corner of the form header
    - Use same toggle mutation as table
    - Show current urgent status
    - Make it clickable to toggle
  - Validation: Flag appears in top right, professional styling
  - Dependencies: Task 2.2 completed

- [ ] 4.2: Style the flag for professional appearance
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Styling:
    - Small size (h-5 w-5)
    - Absolute positioning in top right
    - Red when urgent, gray when not
    - Subtle shadow for depth
    - Smooth transition on state change
  - Validation: Looks professional and polished
  - Dependencies: Task 4.1 completed

- [ ] 4.3: Add tooltip explaining urgent status
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-page.tsx`
  - Implementation: Wrap flag in Tooltip component with i18n text
  - Validation: Tooltip shows on hover
  - Dependencies: Task 3.4, 4.1 completed

#### Quality Checklist:

- [ ] Flag positioned correctly (top right)
- [ ] Professional styling applied
- [ ] Click handler works correctly
- [ ] Tooltip provides clear feedback
- [ ] Visual consistency with table flag
- [ ] Mobile responsive layout
- [ ] Touch-friendly interaction

### 5. Add Urgent Filter Button to Table

**Objective**: Add a filter toggle button similar to RNM filter that shows only urgent processes

#### Sub-tasks:

- [x] 5.1: Add urgent mode state to client component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: Add state after `isRnmModeActive` (around line 34)
  - Add: `const [isUrgentModeActive, setIsUrgentModeActive] = useState(false)`
  - Validation: State added following existing pattern
  - Dependencies: None

- [x] 5.2: Update filteredProcesses logic to include urgent filter
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: In `filteredProcesses` useMemo (around lines 148-298)
  - Add: Filter logic that shows only urgent processes when mode is active
  - Implementation:
    ```typescript
    // After applying candidate filter
    if (isUrgentModeActive) {
      result = result.filter((process) => process.urgent === true)
    }
    ```
  - Validation: Only urgent processes shown when filter active
  - Dependencies: Task 1.3, 5.1 completed

- [x] 5.3: Add urgent filter button to table toolbar
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-processes-table.tsx`
  - Location: In toolbar section (around lines 735-761), add after RNM button
  - Implementation:
    - Import Flag icon from lucide-react
    - Add props: `isUrgentModeActive?: boolean`, `onUrgentModeToggle?: () => void`
    - Create button similar to RNM button style
    - Red styling when active, outline when inactive
  - Validation: Button appears next to RNM filter
  - Dependencies: Task 5.1 completed

- [x] 5.4: Pass urgent filter props from client to table
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`
  - Location: In `IndividualProcessesTable` component usage (around lines 395-408)
  - Add props:
    - `isUrgentModeActive={isUrgentModeActive}`
    - `onUrgentModeToggle={() => setIsUrgentModeActive(!isUrgentModeActive)}`
  - Validation: Props passed correctly
  - Dependencies: Task 5.1, 5.3 completed

- [x] 5.5: Add i18n keys for urgent filter
  - Files:
    - `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
    - `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Location: In `IndividualProcesses` section
  - Add keys:
    - `"urgentModeEnable": "Enable urgent filter: show only urgent processes"` / `"urgentModeEnable": "Ativar filtro de urgentes: mostrar apenas processos urgentes"`
    - `"urgentModeDisable": "Disable urgent filter: show all processes"` / `"urgentModeDisable": "Desativar filtro de urgentes: mostrar todos os processos"`
  - Validation: Tooltips work in both languages
  - Dependencies: Task 5.3 completed

#### Quality Checklist:

- [ ] Filter state managed correctly
- [ ] Filter logic is efficient
- [ ] Button styled consistently with RNM button
- [ ] Red color indicates active state clearly
- [ ] Tooltip provides helpful information
- [ ] i18n keys added for both languages
- [ ] Mobile responsive button layout
- [ ] Touch-friendly button size

### 6. Testing and Quality Assurance

**Objective**: Ensure all functionality works correctly and meets quality standards

#### Sub-tasks:

- [ ] 6.1: Test database field updates
  - Validation: Urgent field saves correctly on create
  - Validation: Urgent field updates correctly on edit
  - Validation: Urgent field defaults to undefined/false for new processes
  - Validation: createFromExisting does not copy urgent status
  - Dependencies: All backend tasks completed

- [ ] 6.2: Test table flag toggle
  - Validation: Flag icon appears in table
  - Validation: Clicking flag toggles urgent status
  - Validation: Visual feedback is immediate
  - Validation: Row click doesn't trigger when clicking flag
  - Validation: Tooltip shows correct text
  - Dependencies: Task 3 completed

- [ ] 6.3: Test edit page flag
  - Validation: Flag appears in top right of edit page
  - Validation: Clicking flag toggles urgent status
  - Validation: Style is professional and polished
  - Validation: Works on mobile devices
  - Dependencies: Task 4 completed

- [ ] 6.4: Test urgent filter button
  - Validation: Button appears in table toolbar
  - Validation: Clicking button filters to urgent processes only
  - Validation: Clicking again shows all processes
  - Validation: Button styling indicates active/inactive state
  - Validation: Works with other filters (candidate, RNM)
  - Dependencies: Task 5 completed

- [ ] 6.5: Test mobile responsiveness
  - Validation: Flag column visible on mobile
  - Validation: Flag tap target is adequate (min 44x44px)
  - Validation: Filter buttons work on mobile
  - Validation: Edit page flag accessible on mobile
  - Dependencies: All UI tasks completed

- [ ] 6.6: Test internationalization
  - Validation: All tooltips work in English
  - Validation: All tooltips work in Portuguese
  - Validation: No hardcoded strings
  - Dependencies: All i18n tasks completed

#### Quality Checklist:

- [ ] All functionality tested manually
- [ ] Edge cases considered and handled
- [ ] Mobile responsiveness verified
- [ ] Internationalization complete
- [ ] No console errors or warnings
- [ ] Performance is acceptable

## Implementation Notes

### Technical Considerations

1. **Database Schema**: Follow the same pattern as `isUrgent` in `collectiveProcesses` - use optional boolean field
2. **Visual Design**: Use lucide-react's `Flag` icon for consistency
3. **Color Scheme**: Red for urgent (destructive variant), gray for not urgent (muted)
4. **Filter Pattern**: Follow exact same pattern as RNM filter for consistency
5. **State Management**: Use React useState for filter toggle, useMutation for urgent updates
6. **Touch Targets**: Ensure minimum 44x44px for mobile usability

### Icon Usage

```tsx
import { Flag } from "lucide-react"

// In column cell
<Flag className={cn(
  "h-4 w-4 cursor-pointer transition-transform hover:scale-110",
  row.original.urgent ? "text-red-500" : "text-muted-foreground"
)} />

// In filter button (when active)
<Flag className="h-4 w-4 text-white" />
```

### Filter Button Styling Pattern

Follow the RNM button pattern (lines 739-754 in individual-processes-table.tsx):
- Active: Red background, white text, pulse animation
- Inactive: Outline variant, red on hover
- Include animated indicator dot when active

## Definition of Done

- [ ] Database field added to schema with index
- [ ] All mutations handle urgent field correctly
- [ ] Flag toggle column works in table
- [ ] Flag toggle appears in edit page (top right)
- [ ] Urgent filter button works like RNM filter
- [ ] All i18n keys added for both languages
- [ ] Mobile responsive across all components
- [ ] Touch-friendly UI elements
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Professional visual appearance
- [ ] Feature tested end-to-end
