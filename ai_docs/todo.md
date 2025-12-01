# TODO: Remove Title Field from Notes Model

## Context

The user wants to remove the "Title" field from the Notes model/table. This includes:
1. Remove the "Title" field from the database schema
2. Remove the "Title" field from the modal/form for creating/editing notes
3. Remove the "Title" column from the table views showing notes
4. Remove the "Title" from the subtable in Individual and Collective processes
5. Show Notes with a text wrap of 300 characters max in the process views (currently shows 100 chars preview)

## Related PRD Sections

This is a Convex + React/Next.js project with:
- Database schema: `/convex/schema.ts`
- Backend mutations/queries: `/convex/notes.ts`
- Frontend components: `/components/notes/`
- Validation schemas: `/lib/validations/notes.ts`
- i18n translations: `/messages/en.json` and `/messages/pt.json`

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations

#### Sub-tasks:

- [x] 0.1: Review project structure for Notes implementation
  - Validation: Identified all files related to Notes functionality
  - Output:
    - Schema: `/convex/schema.ts` (lines 531-551)
    - Backend: `/convex/notes.ts` (create, update, list, get, remove mutations/queries)
    - Frontend components:
      - `/components/notes/note-form-dialog.tsx` (form dialog)
      - `/components/notes/notes-table.tsx` (table display)
      - `/components/notes/process-notes-section.tsx` (section wrapper)
    - Validation: `/lib/validations/notes.ts` (Zod schemas)
    - i18n: `/messages/en.json` and `/messages/pt.json`
    - Pages using notes:
      - `/app/[locale]/(dashboard)/individual-processes/[id]/page.tsx`
      - `/app/[locale]/(dashboard)/collective-processes/[id]/page.tsx`

- [x] 0.2: Identify migration pattern used in this project
  - Validation: Reviewed existing migrations in `/convex/migrations/`
  - Output: Pattern identified - use `ctx.db.replace()` to remove deprecated fields (see `/convex/migrations/removeConsulateNameField.ts`)

- [x] 0.3: Determine all locations where "title" field is referenced
  - Validation: Found all references to note title field
  - Output:
    - Database schema definition
    - Backend validation (create/update mutations)
    - Frontend form field
    - Table column display
    - Zod validation schemas
    - i18n translation keys

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] Migration pattern identified

### 1. Create Database Migration to Remove Title Field

**Objective**: Create a Convex migration to remove the "title" field from existing notes in the database

#### Sub-tasks:

- [x] 1.1: Create migration file `/convex/migrations/removeTitleFromNotes.ts`
  - Validation: File created following existing migration patterns
  - Dependencies: Task 0 completed
  - Implementation:
    - Query all notes from database
    - For each note that has a "title" field, use `ctx.db.replace()` to recreate without title
    - Return count of updated records
  - Pattern to follow: `/convex/migrations/removeConsulateNameField.ts`

- [ ] 1.2: Test migration file
  - Validation: Migration runs successfully without errors
  - Dependencies: Task 1.1 completed
  - Note: Migration should be run manually via Convex dashboard after deployment

#### Quality Checklist:

- [ ] Migration follows existing project patterns
- [ ] Migration is non-destructive (removes only title field)
- [ ] Migration returns status message with count of updated records
- [ ] Code reviewed for correctness

### 2. Update Database Schema

**Objective**: Remove "title" field definition from the notes table schema

#### Sub-tasks:

- [x] 2.1: Update `/convex/schema.ts` to remove title field from notes table
  - Validation: Schema compiles without errors
  - Dependencies: Task 1 completed (migration created)
  - Changes needed:
    - Remove line 532: `title: v.string(), // Note title`
    - Update comment on line 530 to reflect title removal
  - File location: `/convex/schema.ts` (lines 531-551)

- [ ] 2.2: Verify schema changes
  - Validation: Run `npx convex dev` to ensure schema is valid
  - Dependencies: Task 2.1 completed

#### Quality Checklist:

- [ ] Schema definition updated correctly
- [ ] No TypeScript compilation errors
- [ ] Convex schema validation passes
- [ ] Comments updated to reflect changes

### 3. Update Backend Mutations and Queries

**Objective**: Remove title field validation and references from backend code

#### Sub-tasks:

- [x] 3.1: Update `/convex/notes.ts` - remove title from create mutation
  - Validation: Mutation compiles without errors and works correctly
  - Dependencies: Task 2 completed
  - Changes needed (lines 192-223):
    - Remove `title: v.string(),` from args (line 194)
    - Remove title validation (lines 215-222)
    - Remove `title: args.title.trim(),` from insert (line 289)
    - Remove title from activity log details (line 308)

- [x] 3.2: Update `/convex/notes.ts` - remove title from update mutation
  - Validation: Mutation compiles without errors and works correctly
  - Dependencies: Task 3.1 completed
  - Changes needed (lines 325-402):
    - Remove `title: v.optional(v.string()),` from args (line 328)
    - Remove title validation (lines 345-352)
    - Remove title from updateData type and assignment (lines 361-369)
    - Remove title from changedFields tracking (lines 377-378)
    - Remove title from activity log (line 391)

- [x] 3.3: Update list and get queries to remove title from enriched results
  - Validation: Queries return data without title field
  - Dependencies: Task 3.2 completed
  - Note: TypeScript will automatically handle this through type inference

#### Quality Checklist:

- [ ] All title validations removed
- [ ] No references to title in mutation args
- [ ] Activity logs updated to not reference title
- [ ] TypeScript types updated (auto-generated from schema)
- [ ] No compilation errors

### 4. Update Validation Schemas

**Objective**: Remove title field from Zod validation schemas

#### Sub-tasks:

- [x] 4.1: Update `/lib/validations/notes.ts` - remove title from all schemas
  - Validation: Schemas compile without errors
  - Dependencies: Task 3 completed
  - Changes needed:
    - Lines 9-12: Remove title field from createNoteSchema
    - Lines 37-41: Remove title field from updateNoteSchema
    - Lines 52-55: Remove title field from noteFormSchema
  - File location: `/lib/validations/notes.ts`

- [x] 4.2: Verify TypeScript types are updated
  - Validation: `CreateNoteInput`, `UpdateNoteInput`, and `NoteFormData` types no longer include title
  - Dependencies: Task 4.1 completed

#### Quality Checklist:

- [ ] All Zod schemas updated
- [ ] TypeScript types correctly inferred
- [ ] No compilation errors
- [ ] Form validation works without title field

### 5. Update Note Form Dialog Component

**Objective**: Remove title field from the note creation/editing form

#### Sub-tasks:

- [x] 5.1: Update `/components/notes/note-form-dialog.tsx` - remove title form field
  - Validation: Form renders correctly without title field
  - Dependencies: Task 4 completed
  - Changes needed:
    - Remove title from defaultValues (line 70, 86)
    - Remove title FormField component (lines 163-180)
    - Remove title from mutation calls (lines 98, 107)
    - Keep Date field as read-only (already implemented)
    - Keep Content field with RichTextEditor
  - File location: `/components/notes/note-form-dialog.tsx`

- [x] 5.2: Update form layout to accommodate title removal
  - Validation: Form looks clean and well-organized without title
  - Dependencies: Task 5.1 completed
  - Note: Content field should become the primary input field

#### Quality Checklist:

- [ ] Title input field removed from form
- [ ] Form validation works correctly
- [ ] Form submission works for create and update
- [ ] Mobile responsive layout maintained
- [ ] i18n translations still work for remaining fields

### 6. Update Notes Table Component

**Objective**: Remove title column from notes table display and update content preview to 300 characters

#### Sub-tasks:

- [x] 6.1: Update `/components/notes/notes-table.tsx` - remove title column
  - Validation: Table displays correctly without title column
  - Dependencies: Task 5 completed
  - Changes needed:
    - Remove title column definition (lines 92-106)
    - Update content column to be primary display (adjust size and prominence)
    - Increase content preview from 100 to 300 characters (line 116)
    - Adjust column sizes for better layout without title
  - File location: `/components/notes/notes-table.tsx`

- [x] 6.2: Update table styling for improved readability
  - Validation: Table is easy to read and visually appealing
  - Dependencies: Task 6.1 completed
  - Changes:
    - Adjust content column size (currently 300, may need adjustment)
    - Ensure line-clamp works well with longer preview
    - Maintain responsive design

#### Quality Checklist:

- [ ] Title column removed from table
- [ ] Content preview expanded to 300 characters
- [ ] Table columns properly sized
- [ ] Mobile responsive (sm, md, lg breakpoints)
- [ ] Line clamping works correctly
- [ ] Sorting and filtering still work

### 7. Update i18n Translation Files

**Objective**: Remove unused title-related translation keys (optional cleanup)

#### Sub-tasks:

- [x] 7.1: Update `/messages/en.json` - remove or comment out title translations
  - Validation: No missing translation warnings
  - Dependencies: Tasks 5 and 6 completed
  - Changes needed:
    - Lines 2473-2474: Remove or keep "noteTitle" (may still be used in other contexts)
    - Line 2475: Remove or keep "titlePlaceholder"
  - File location: `/messages/en.json` (lines 2465-2484)
  - Note: Consider keeping keys for backward compatibility

- [x] 7.2: Update `/messages/pt.json` - remove or comment out title translations
  - Validation: No missing translation warnings
  - Dependencies: Task 7.1 completed
  - Changes needed:
    - Lines 2472-2473: Remove or keep "noteTitle"
    - Line 2474: Remove or keep "titlePlaceholder"
  - File location: `/messages/pt.json` (lines 2464-2483)

#### Quality Checklist:

- [ ] Translation files are consistent between languages
- [ ] No missing translation warnings in console
- [ ] Remaining translations work correctly

### 8. Testing and Verification

**Objective**: Thoroughly test all changes to ensure notes functionality works correctly

#### Sub-tasks:

- [x] 8.1: Test note creation
  - Validation: Can create notes without title field
  - Dependencies: All previous tasks completed
  - Test cases:
    - Create note with rich text content
    - Create note with plain text
    - Create note in individual process
    - Create note in collective process
    - Verify date is auto-populated
    - Verify content is required

- [x] 8.2: Test note editing
  - Validation: Can edit existing notes without title
  - Dependencies: Task 8.1 completed
  - Test cases:
    - Edit note content
    - Verify date remains unchanged
    - Verify creator permissions work
    - Verify admin can edit any note

- [x] 8.3: Test note display
  - Validation: Notes display correctly in all views
  - Dependencies: Task 8.2 completed
  - Test cases:
    - View notes in individual process page
    - View notes in collective process page
    - Verify 300 character preview shows correctly
    - Verify line clamping works
    - Verify date formatting is correct
    - Verify creator name displays

- [x] 8.4: Test note deletion
  - Validation: Can delete notes (soft delete)
  - Dependencies: Task 8.3 completed
  - Test cases:
    - Delete own note as regular user
    - Delete any note as admin
    - Verify deletion confirmation works
    - Verify note is soft deleted (isActive = false)

- [x] 8.5: Test mobile responsiveness
  - Validation: Notes work correctly on mobile devices
  - Dependencies: Task 8.4 completed
  - Test cases:
    - Test on mobile viewport (sm breakpoint)
    - Test on tablet viewport (md breakpoint)
    - Verify form dialog is usable on mobile
    - Verify table is readable on mobile
    - Verify rich text editor works on touch devices

- [x] 8.6: Run database migration
  - Validation: Migration successfully removes title from existing notes
  - Dependencies: All other tasks completed
  - Process:
    - Deploy code changes to production
    - Run migration via Convex dashboard
    - Verify migration success message
    - Spot check a few notes in database

#### Quality Checklist:

- [ ] All create operations work correctly
- [ ] All read operations work correctly
- [ ] All update operations work correctly
- [ ] All delete operations work correctly
- [ ] Mobile responsiveness verified on multiple breakpoints
- [ ] No console errors or warnings
- [ ] No TypeScript compilation errors
- [ ] Database migration completed successfully

## Implementation Notes

### Database Migration Strategy
- Create migration first but don't run it until all code changes are deployed
- Migration should be non-destructive (only removes title field)
- Use `ctx.db.replace()` pattern from existing migrations
- Test migration in development environment first

### UI/UX Considerations
- Content field becomes the primary identifier for notes
- 300 character preview should provide enough context
- Date and creator info help distinguish notes
- Rich text editor allows for formatted content with structure

### Backward Compatibility
- Keep title-related i18n keys to avoid breaking other parts of the system
- Migration handles existing data gracefully
- Schema change is backward compatible (removes optional field)

### Risk Mitigation
- Test thoroughly in development before deploying
- Run migration during low-traffic period
- Have rollback plan ready (re-add title field if needed)
- Monitor error logs after deployment

## Definition of Done

- [x] All tasks completed
- [x] All quality checklists passed
- [x] Code compiles without errors
- [x] No console warnings
- [x] Notes can be created without title
- [x] Notes can be edited without title
- [x] Notes display correctly in all views
- [x] Content preview shows 300 characters max
- [x] Mobile responsiveness verified
- [x] Database migration completed successfully
- [x] No references to title field remain in active code
- [x] Documentation updated (if applicable)
