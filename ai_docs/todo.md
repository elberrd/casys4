# TODO: Sistema de Notas para Processos Individuais e Coletivos

## Context

Implementar um sistema completo de notas (notes) que permita aos usuarios adicionar anotacoes ricas em processos individuais e coletivos. O sistema deve incluir:
- Tabela de banco de dados "notes" no Convex
- Editor de texto rico (rich text editor) profissional
- Interface de visualizacao em formato de DataTable
- Modal para adicionar/editar notas
- Suporte para formatacao de texto (negrito, italico, cores)
- Data automatica (dia atual)
- Integracao tanto em processos individuais quanto coletivos
- Relacionamento: um processo pode ter muitas notas, cada nota pertence a um processo

## Related PRD Sections

Este sistema segue a arquitetura do projeto conforme estabelecida no schema.ts:
- Convex como banco de dados
- React Hook Form + Zod para validacao
- Next.js com App Router
- Componentes reutilizaveis em /components
- Internacionalizacao com next-intl
- UI components baseados em shadcn/ui

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review project architecture and folder structure
  - Validation: Schema.ts reviewed, component patterns identified
  - Output: Convex database + Next.js App Router + shadcn/ui components

- [x] 0.2: Identify where new files should be created based on project conventions
  - Validation: File locations follow established patterns
  - Output:
    - Database schema: /convex/schema.ts
    - Convex functions: /convex/notes.ts
    - Components: /components/notes/
    - Validations: /lib/validations/notes.ts
    - Translations: /messages/en.json e /messages/pt.json

- [x] 0.3: Check for existing similar implementations to maintain consistency
  - Validation: Reviewed individualProcessStatuses implementation as reference
  - Output: Follow pattern of Dialog components with Table display

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

---

### 1. Research and Select Rich Text Editor Library

**Objective**: Evaluate and choose the best professional rich text editor library for the project

#### Sub-tasks:

- [x] 1.1: Research professional rich text editor libraries compatible with React
  - Validation: Identify at least 3 viable options (Tiptap, Quill, Slate, Draft.js, etc.)
  - Dependencies: None
  - Options to evaluate:
    - Tiptap (recommended - modern, extensible, headless)
    - Quill (mature, feature-rich)
    - Slate (highly customizable)
    - Draft.js (Facebook's library)

- [x] 1.2: Compare features, bundle size, and maintenance status
  - Validation: Document pros/cons of each library
  - Criteria:
    - Support for bold, italic, text color
    - Active maintenance
    - TypeScript support
    - Bundle size
    - Ease of integration
    - Mobile responsiveness

- [x] 1.3: Make final selection and document rationale
  - Validation: Clear justification for chosen library
  - Recommendation: Tiptap (modern, TypeScript-first, extensible, headless UI)

- [x] 1.4: Install chosen library and its dependencies
  - Validation: Package successfully installed via pnpm
  - Command: `pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style`

#### Quality Checklist:

- [x] Library selection documented with clear rationale
- [x] Dependencies installed successfully
- [x] Library compatible with existing tech stack
- [x] TypeScript types available
- [x] Mobile responsive capabilities verified

---

### 2. Create Database Schema for Notes

**Objective**: Define the notes table in Convex schema with proper relationships and indexes

#### Sub-tasks:

- [x] 2.1: Add notes table definition to /convex/schema.ts
  - Validation: Schema follows Convex conventions and project patterns
  - Dependencies: Task 1 completed
  - Fields:
    - title: v.string() - Required note title
    - content: v.string() - Rich text content (stored as HTML or JSON)
    - date: v.string() - ISO date format YYYY-MM-DD (auto-populated with current date)
    - individualProcessId: v.optional(v.id("individualProcesses")) - Link to individual process
    - collectiveProcessId: v.optional(v.id("collectiveProcesses")) - Link to collective process
    - createdBy: v.id("users") - User who created the note
    - createdAt: v.number() - Timestamp of creation
    - updatedAt: v.number() - Timestamp of last update
    - isActive: v.optional(v.boolean()) - Soft delete flag

- [x] 2.2: Add appropriate indexes for efficient querying
  - Validation: Indexes cover common query patterns
  - Required indexes:
    - by_individualProcess: ["individualProcessId"]
    - by_collectiveProcess: ["collectiveProcessId"]
    - by_createdBy: ["createdBy"]
    - by_date: ["date"]
    - by_active: ["isActive"]
    - by_individualProcess_date: ["individualProcessId", "date"]
    - by_collectiveProcess_date: ["collectiveProcessId", "date"]

- [x] 2.3: Add validation constraint to ensure note belongs to either individual OR collective process
  - Validation: Business logic enforced at application level
  - Note: One of individualProcessId or collectiveProcessId must be present, but not both

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] Proper relationships established (one-to-many)
- [x] Indexes optimize query performance
- [x] Field names follow camelCase convention
- [x] Schema change tested in Convex dashboard
- [x] Data integrity constraints documented

---

### 3. Create Convex Backend Functions for Notes

**Objective**: Implement CRUD operations and queries for notes in /convex/notes.ts

#### Sub-tasks:

- [x] 3.1: Create query to list notes for a process (individual or collective)
  - Validation: Query returns notes with user information enriched
  - Dependencies: Task 2 completed
  - Function: `list` query
  - Parameters:
    - individualProcessId?: Id<"individualProcesses">
    - collectiveProcessId?: Id<"collectiveProcesses">
  - Access control: Admins see all, clients see only their company's notes

- [x] 3.2: Create query to get a single note by ID
  - Validation: Returns null if not found, includes creator info
  - Function: `get` query
  - Parameters: id: Id<"notes">
  - Returns: Note with enriched user data

- [x] 3.3: Create mutation to add a new note
  - Validation: Validates input with Zod schema, sets current date automatically
  - Function: `create` mutation
  - Parameters:
    - title: string
    - content: string (HTML/JSON from rich text editor)
    - individualProcessId?: Id<"individualProcesses">
    - collectiveProcessId?: Id<"collectiveProcesses">
  - Validation: Exactly one of individualProcessId or collectiveProcessId must be provided
  - Sets: date (auto), createdBy (current user), createdAt, updatedAt, isActive: true

- [x] 3.4: Create mutation to update an existing note
  - Validation: Only creator or admin can update
  - Function: `update` mutation
  - Parameters:
    - id: Id<"notes">
    - title?: string
    - content?: string
  - Updates: updatedAt timestamp

- [x] 3.5: Create mutation to delete a note (soft delete)
  - Validation: Only creator or admin can delete
  - Function: `remove` mutation
  - Parameters: id: Id<"notes">
  - Implementation: Sets isActive to false

- [x] 3.6: Add activity logging for all note operations
  - Validation: Creates activity log entries for create/update/delete
  - Uses: existing activityLogs system
  - Entity type: "notes"

#### Quality Checklist:

- [x] TypeScript types defined for all functions (no `any`)
- [x] Zod validation implemented for inputs
- [x] Access control properly enforced
- [x] Error handling implemented
- [x] Activity logging integrated
- [x] Functions follow existing Convex patterns in the project
- [x] Comments and JSDoc added for clarity

---

### 4. Create Zod Validation Schemas

**Objective**: Define validation schemas for note forms in /lib/validations/notes.ts

#### Sub-tasks:

- [x] 4.1: Create schema for creating a note
  - Validation: Follows existing validation patterns in the project
  - Dependencies: Task 3 in progress
  - Schema fields:
    - title: z.string().min(1).max(200)
    - content: z.string().min(1) - Rich text content
    - individualProcessId: z.string().optional()
    - collectiveProcessId: z.string().optional()
  - Custom validation: Ensure one and only one process ID is provided

- [x] 4.2: Create schema for updating a note
  - Validation: All fields optional except ID
  - Schema fields:
    - id: z.string()
    - title: z.string().min(1).max(200).optional()
    - content: z.string().min(1).optional()

- [x] 4.3: Export TypeScript types from schemas
  - Validation: Type inference working correctly
  - Export types: CreateNoteInput, UpdateNoteInput

#### Quality Checklist:

- [x] Zod schemas properly defined
- [x] TypeScript types inferred correctly
- [x] Validation messages are clear and user-friendly
- [x] Custom validation logic implemented
- [x] Schemas exported for use in components

---

### 5. Create Rich Text Editor Component

**Objective**: Build a reusable rich text editor component using the selected library

#### Sub-tasks:

- [x] 5.1: Create /components/ui/rich-text-editor.tsx component
  - Validation: Component renders and handles text input
  - Dependencies: Task 1 completed
  - Props:
    - value: string (HTML/JSON content)
    - onChange: (value: string) => void
    - placeholder?: string
    - className?: string
    - disabled?: boolean

- [x] 5.2: Implement toolbar with formatting options
  - Validation: All formatting options work correctly
  - Features required:
    - Bold button
    - Italic button
    - Text color picker
    - Clear formatting button
  - Toolbar should be sticky/fixed at top of editor on mobile

- [x] 5.3: Configure editor extensions and styling
  - Validation: Editor matches project's design system
  - Styling: Use Tailwind classes, match shadcn/ui aesthetic
  - Extensions: StarterKit, Color, TextStyle

- [x] 5.4: Add mobile responsiveness
  - Validation: Editor works well on mobile devices
  - Features:
    - Touch-friendly buttons (min 44x44px)
    - Responsive toolbar layout
    - Proper scrolling behavior
    - Works on sm, md, lg breakpoints

- [x] 5.5: Handle empty states and validation
  - Validation: Error states displayed properly
  - Features:
    - Show error border when invalid
    - Display validation messages
    - Handle empty content

#### Quality Checklist:

- [x] Component is fully typed with TypeScript (no `any`)
- [x] Reusable and configurable via props
- [x] Mobile responsive (sm, md, lg breakpoints)
- [x] Touch-friendly UI elements (min 44x44px)
- [x] Follows project's component patterns
- [x] Accessible (keyboard navigation, ARIA labels)
- [x] Styling consistent with shadcn/ui components

---

### 6. Create Notes Data Table Component

**Objective**: Build a table component to display notes list in /components/notes/notes-table.tsx

#### Sub-tasks:

- [x] 6.1: Create notes table component structure
  - Validation: Component renders with proper layout
  - Dependencies: Task 3 completed
  - Uses: shadcn/ui Table components
  - Props:
    - notes: Array of note objects with enriched data
    - onEdit?: (noteId: Id<"notes">) => void
    - onDelete?: (noteId: Id<"notes">) => void
    - isLoading?: boolean

- [x] 6.2: Define table columns
  - Validation: All columns display correct data
  - Columns:
    - Date (formatted, sortable)
    - Title
    - Preview (first 100 chars of content, stripped of HTML)
    - Created By (user name)
    - Actions (Edit/Delete buttons)

- [x] 6.3: Add sorting and filtering capabilities
  - Validation: Sorting works correctly
  - Features:
    - Sort by date (default: newest first)
    - Sort by title
    - Optional search/filter by title

- [x] 6.4: Add mobile responsive layout
  - Validation: Table works on all screen sizes
  - Mobile (sm): Card-based layout instead of table
  - Tablet (md): Condensed table
  - Desktop (lg+): Full table
  - All touch targets min 44x44px

- [x] 6.5: Implement loading and empty states
  - Validation: States display appropriately
  - Loading: Skeleton loaders
  - Empty: Friendly message encouraging adding first note

- [x] 6.6: Add action buttons (Edit/Delete) with proper permissions
  - Validation: Only authorized users see action buttons
  - Permissions: Creator or admin can edit/delete
  - Confirm dialog before delete

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] Table component is reusable
- [x] Mobile responsive (sm, md, lg breakpoints)
- [x] Touch-friendly UI elements (min 44x44px)
- [x] Loading states implemented
- [x] Empty states with helpful messaging
- [x] Proper error handling
- [x] i18n keys used for all user-facing text

---

### 7. Create Add/Edit Note Modal Component

**Objective**: Build a modal dialog for creating and editing notes in /components/notes/note-form-dialog.tsx

#### Sub-tasks:

- [x] 7.1: Create dialog component structure
  - Validation: Dialog opens/closes correctly
  - Dependencies: Task 4, 5 completed
  - Uses: shadcn/ui Dialog component
  - Props:
    - open: boolean
    - onOpenChange: (open: boolean) => void
    - noteId?: Id<"notes"> (if editing)
    - individualProcessId?: Id<"individualProcesses">
    - collectiveProcessId?: Id<"collectiveProcesses">
    - onSuccess?: () => void

- [x] 7.2: Implement form with React Hook Form + Zod validation
  - Validation: Form validation works correctly
  - Uses: useForm hook with zodResolver
  - Schema: from /lib/validations/notes.ts
  - Fields:
    - Date (auto-filled, read-only display showing current date)
    - Title (Input)
    - Content (RichTextEditor component)

- [x] 7.3: Configure modal to be larger than default
  - Validation: Modal provides enough space for editor
  - Size: sm:max-w-[800px] lg:max-w-[900px]
  - Height: max-h-[90vh] with scroll for content

- [x] 7.4: Implement save functionality
  - Validation: Creates or updates note successfully
  - Uses: Convex mutations from task 3
  - Success: Shows toast, closes dialog, refreshes data
  - Error: Shows error toast, keeps dialog open

- [x] 7.5: Pre-fill form when editing existing note
  - Validation: Form loads with correct data when editing
  - Query: Fetch note data when noteId provided
  - Loading state while fetching

- [x] 7.6: Add mobile responsive layout
  - Validation: Modal works well on mobile
  - Mobile: Full screen on sm breakpoint
  - Tablet/Desktop: Fixed width modal
  - Editor toolbar responsive

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] Zod validation implemented
- [x] React Hook Form integration working
- [x] Rich text editor integrated
- [x] Date auto-populated with current date
- [x] Mobile responsive (sm, md, lg breakpoints)
- [x] Touch-friendly UI elements
- [x] Error handling implemented
- [x] Loading states for async operations
- [x] i18n keys for all user-facing text
- [x] Success/error feedback via toasts

---

### 8. Create Notes Section Component for Individual Process Detail Page

**Objective**: Build a section component to display and manage notes in individual process view

#### Sub-tasks:

- [x] 8.1: Create /components/notes/process-notes-section.tsx (reusable for both process types)
  - Validation: Component renders in process detail page
  - Dependencies: Task 6, 7 completed
  - Props:
    - individualProcessId?: Id<"individualProcesses">
    - collectiveProcessId?: Id<"collectiveProcesses">

- [x] 8.2: Implement notes list with "Add Note" button
  - Validation: UI matches project design patterns
  - Layout: Card with header (title + add button) and NotesTable in content
  - Uses: NotesTable component from task 6
  - Button: Opens NoteFormDialog

- [x] 8.3: Integrate with Convex queries
  - Validation: Real-time updates work via Convex reactivity
  - Query: api.notes.list with individualProcessId filter
  - Auto-refresh: Convex handles real-time updates

- [x] 8.4: Add loading and empty states
  - Validation: States display correctly
  - Loading: Skeleton in card
  - Empty: Message like "No notes yet. Add your first note to keep track of important information."

- [x] 8.5: Wire up Edit and Delete actions
  - Validation: Actions work correctly
  - Edit: Opens NoteFormDialog with noteId
  - Delete: Confirmation dialog, then calls mutation
  - Success feedback via toasts

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] Component follows project Card patterns
- [x] Real-time updates working
- [x] Mobile responsive
- [x] Loading and empty states
- [x] CRUD operations functional
- [x] i18n keys used for all text
- [x] Error handling implemented

---

### 9. Create Notes Section Component for Collective Process Detail Page

**Objective**: Build a section component to display and manage notes in collective process view

#### Sub-tasks:

- [x] 9.1: Create /components/notes/process-notes-section.tsx (REUSED from task 8)
  - Validation: Component renders in collective process detail page
  - Dependencies: Task 6, 7 completed
  - Props:
    - collectiveProcessId: Id<"collectiveProcesses">
  - Implementation: Same component reused with collectiveProcessId prop

- [x] 9.2: Implement notes list with "Add Note" button
  - Validation: UI matches project design patterns
  - Same as task 8.2, uses collectiveProcessId prop

- [x] 9.3: Integrate with Convex queries
  - Validation: Real-time updates work
  - Query: api.notes.list with collectiveProcessId filter

- [x] 9.4: Add loading and empty states
  - Validation: States display correctly
  - Same patterns as task 8.4

- [x] 9.5: Wire up Edit and Delete actions
  - Validation: Actions work correctly
  - Same patterns as task 8.5

#### Quality Checklist:

- [x] TypeScript types defined (no `any`)
- [x] Component follows project Card patterns
- [x] Real-time updates working
- [x] Mobile responsive
- [x] Loading and empty states
- [x] CRUD operations functional
- [x] i18n keys used for all text
- [x] Error handling implemented

---

### 10. Integrate Notes Section into Individual Process Detail Page

**Objective**: Add the notes section to the individual process detail page

#### Sub-tasks:

- [x] 10.1: Import ProcessNotesSection component
  - Validation: Component imported correctly
  - Dependencies: Task 8 completed
  - File: /app/[locale]/(dashboard)/individual-processes/[id]/page.tsx

- [x] 10.2: Add ProcessNotesSection to the page layout
  - Validation: Section appears in correct position
  - Position: Above Activity History section
  - Pass processId, currentUserId, and isAdmin props

- [x] 10.3: Test notes functionality in individual process context
  - Validation: All CRUD operations work
  - Test: Create, read, update, delete notes
  - Verify: Real-time updates, permissions, mobile responsiveness

#### Quality Checklist:

- [x] Component integrated successfully
- [x] Notes section positioned correctly (above Activity History)
- [x] All CRUD operations working
- [x] Real-time updates verified
- [x] Mobile responsive layout
- [x] No console errors
- [x] i18n working correctly

---

### 11. Integrate Notes Section into Collective Process Detail Page

**Objective**: Add the notes section to the collective process detail page

#### Sub-tasks:

- [x] 11.1: Import ProcessNotesSection component
  - Validation: Component imported correctly
  - Dependencies: Task 9 completed
  - File: /app/[locale]/(dashboard)/collective-processes/[id]/page.tsx

- [x] 11.2: Add ProcessNotesSection to the page layout
  - Validation: Section appears in correct position
  - Position: Above Activity History section (replaced old static notes display)
  - Pass collectiveProcessId, currentUserId, and isAdmin props

- [x] 11.3: Test notes functionality in collective process context
  - Validation: All CRUD operations work
  - Test: Create, read, update, delete notes
  - Verify: Real-time updates, permissions, mobile responsiveness

#### Quality Checklist:

- [x] Component integrated successfully
- [x] Notes section positioned correctly (above Activity History)
- [x] All CRUD operations working
- [x] Real-time updates verified
- [x] Mobile responsive layout
- [x] No console errors
- [x] i18n working correctly

---

### 12. Add Internationalization (i18n) Support

**Objective**: Add all necessary translation keys for English and Portuguese

#### Sub-tasks:

- [x] 12.1: Add English translations to /messages/en.json
  - Validation: All keys present and correct
  - Dependencies: Tasks 5-9 completed
  - Keys added under "Notes" section: title, addNote, editNote, deleteNote, noteTitle, noteContent, noteDate, createdBy, noNotes, noteAdded, noteUpdated, noteDeleted, noteError, deleteNoteConfirm, contentPlaceholder, titlePlaceholder, actions, preview, addNoteDescription, editNoteDescription

- [x] 12.2: Add Portuguese translations to /messages/pt.json
  - Validation: All keys present and correctly translated
  - Keys added under "Notes" section with proper Portuguese translations

- [x] 12.3: Verify all components use translation keys
  - Validation: No hardcoded strings in components
  - Review: All components from tasks 5-9
  - Pattern: Use useTranslations('Notes') hook

#### Quality Checklist:

- [x] All English translations added
- [x] All Portuguese translations added
- [x] Translations are accurate and natural
- [x] No hardcoded strings in components
- [x] Translation keys follow project naming conventions
- [x] Pluralization handled where needed
- [x] Special characters properly escaped

---

### 13. Testing and Quality Assurance

**Objective**: Comprehensive testing of the notes system

#### Sub-tasks:

- [ ] 13.1: Test CRUD operations in individual processes
  - Validation: All operations work correctly
  - Test cases:
    - Create note in individual process
    - View note in table
    - Edit note and verify update
    - Delete note with confirmation
    - Verify note shows in correct process only

- [ ] 13.2: Test CRUD operations in collective processes
  - Validation: All operations work correctly
  - Test cases:
    - Create note in collective process
    - View note in table
    - Edit note and verify update
    - Delete note with confirmation
    - Verify note shows in correct process only

- [ ] 13.3: Test rich text editor functionality
  - Validation: All formatting options work
  - Test:
    - Bold text
    - Italic text
    - Text color
    - Mixed formatting
    - Copy/paste formatted text
    - Clear formatting

- [ ] 13.4: Test mobile responsiveness
  - Validation: All features work on mobile
  - Test on breakpoints: sm (640px), md (768px), lg (1024px)
  - Verify:
    - Modal full-screen on mobile
    - Table switches to cards on mobile
    - Touch targets are 44x44px minimum
    - Editor toolbar responsive
    - Scrolling works correctly

- [ ] 13.5: Test permissions and access control
  - Validation: Users can only access/modify notes they should
  - Test:
    - Admin can see all notes
    - Client sees only their company's notes
    - Only creator or admin can edit/delete
    - Proper error messages for unauthorized actions

- [ ] 13.6: Test real-time updates
  - Validation: Changes appear immediately without refresh
  - Test:
    - Create note in one tab, verify appears in another
    - Edit note, verify updates across tabs
    - Delete note, verify removed across tabs

- [ ] 13.7: Test internationalization
  - Validation: Both languages work correctly
  - Test:
    - Switch between English and Portuguese
    - Verify all text is translated
    - No missing translation keys
    - Dates formatted correctly for locale

- [ ] 13.8: Test error scenarios
  - Validation: Errors handled gracefully
  - Test:
    - Network error during save
    - Invalid data submission
    - Unauthorized access attempts
    - Empty required fields
    - Very long content

#### Quality Checklist:

- [ ] All CRUD operations tested and working
- [ ] Rich text editor fully functional
- [ ] Mobile responsive on all breakpoints
- [ ] Touch-friendly interface verified
- [ ] Permissions enforced correctly
- [ ] Real-time updates working
- [ ] Both languages tested
- [ ] Error handling verified
- [ ] No console errors or warnings
- [ ] Performance is acceptable

---

### 14. Documentation and Code Review

**Objective**: Document the implementation and prepare for code review

#### Sub-tasks:

- [ ] 14.1: Add JSDoc comments to all new functions
  - Validation: All exported functions documented
  - Include:
    - Function purpose
    - Parameters and their types
    - Return type
    - Example usage where helpful

- [ ] 14.2: Update type definitions if needed
  - Validation: All types properly exported
  - Ensure: No `any` types used
  - Export: All reusable types from appropriate files

- [ ] 14.3: Review code for consistency with project patterns
  - Validation: Code follows established conventions
  - Check:
    - Naming conventions
    - Component structure
    - File organization
    - Import ordering
    - Error handling patterns

- [ ] 14.4: Verify all quality checklist items completed
  - Validation: All previous quality checkboxes checked
  - Review: Each task's quality checklist
  - Fix: Any remaining issues

#### Quality Checklist:

- [ ] All functions documented with JSDoc
- [ ] TypeScript types properly defined
- [ ] Code follows project conventions
- [ ] All previous quality checklists completed
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Code is readable and maintainable

---

## Implementation Notes

### Rich Text Editor Selection Rationale
- **Recommended: Tiptap**
  - Pros: Modern, TypeScript-first, headless (full control over UI), extensible, active maintenance
  - Cons: Slightly larger learning curve
  - Perfect for: Projects requiring custom UI and long-term maintainability

### Database Design Decisions
- **Content Storage**: Store rich text as HTML string for simplicity
- **Soft Delete**: Use isActive flag instead of hard delete for audit trail
- **Relationship**: Optional individualProcessId OR collectiveProcessId (exclusive)
- **Indexes**: Optimized for common queries (by process, by date)

### Component Architecture
- **Reusability**: Rich text editor is a standalone UI component
- **Separation**: Table and Form Dialog are separate components
- **Integration**: Section components tie everything together for each process type

### Mobile Responsiveness Strategy
- **Breakpoints**: sm (640px), md (768px), lg (1024px+)
- **Table**: Cards on mobile, full table on desktop
- **Modal**: Full screen on mobile, fixed width on desktop
- **Touch Targets**: Minimum 44x44px for all interactive elements
- **Toolbar**: Sticky/fixed positioning with responsive layout

### Access Control
- **Admin**: Full access to all notes
- **Client**: Access only to notes of processes belonging to their company
- **Creator**: Can edit/delete their own notes
- **Enforcement**: At Convex function level

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] Rich text editor library installed and configured
- [ ] Database schema created with proper indexes
- [ ] Convex backend functions implemented
- [ ] Validation schemas created
- [ ] All UI components built and styled
- [ ] Notes integrated in both individual and collective process pages
- [ ] Internationalization complete (English + Portuguese)
- [ ] Mobile responsive on all breakpoints (sm, md, lg)
- [ ] Touch-friendly UI (44x44px minimum tap targets)
- [ ] Comprehensive testing completed
- [ ] Documentation added
- [ ] Code reviewed for quality and consistency
- [ ] No TypeScript errors or ESLint warnings
- [ ] Real-time updates working via Convex
- [ ] Access control properly enforced
- [ ] All CRUD operations functional
- [ ] Error handling robust
- [ ] User feedback implemented (toasts, loading states)
