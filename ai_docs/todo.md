# TODO: Sistema de Documentação para Processos Individuais

## Context

Implementar um sistema completo de documentação que permite:
1. Cadastrar tipos de documento associados a amparos legais com obrigatoriedade configurável
2. Auto-popular documentos pendentes quando um processo individual é criado
3. Upload de documentos na visualização do processo (avulso, tipado ou pré-populado)
4. Conversão de documentos avulsos para tipados

## Related Documentation

- Plan file: `/Users/elberrd/.claude/plans/dynamic-hatching-breeze.md`
- Schema: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
- Project structure follows Convex + Next.js pattern with TypeScript

---

## Task Sequence

### 0. Project Structure Analysis ✓

**Objective**: Understand the project structure and determine correct file/folder locations

#### Analysis Complete:

- **Convex Backend Files**: `/Users/elberrd/Documents/Development/clientes/casys4/convex/`
  - Schema: `convex/schema.ts`
  - API functions: `convex/[tableName].ts`
  - Helper functions: `convex/lib/[helperName].ts`

- **Validations**: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/`
  - Zod schemas in camelCase: `documentTypes.ts`, `individualProcesses.ts`, etc.

- **Components**: `/Users/elberrd/Documents/Development/clientes/casys4/components/`
  - Feature folders with kebab-case: `document-types/`, `individual-processes/`, etc.
  - Components in kebab-case: `component-name.tsx`

- **Translations**: `/Users/elberrd/Documents/Development/clientes/casys4/messages/`
  - `pt.json` and `en.json`

---

### 1. Database Schema - Modify documentTypes Table

**Objective**: Add file validation fields to documentTypes table

#### Sub-tasks:

- [x] 1.1: Add `allowedFileTypes` field to documentTypes table
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add: `allowedFileTypes: v.optional(v.array(v.string()))`
  - Description: Array of file extensions like `[".pdf", ".jpg", ".png"]`
  - Validation: Field should be optional and accept string array

- [x] 1.2: Add `maxFileSizeMB` field to documentTypes table
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add: `maxFileSizeMB: v.optional(v.number())`
  - Description: Maximum file size in MB
  - Validation: Field should be optional and accept number

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Schema fields properly optional
- [ ] Consistent with existing schema patterns
- [ ] No breaking changes to existing data

---

### 2. Database Schema - Create documentTypesLegalFrameworks Junction Table

**Objective**: Create many-to-many relationship between documentTypes and legalFrameworks

#### Sub-tasks:

- [x] 2.1: Create documentTypesLegalFrameworks table definition
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add new table after `legalFrameworks` table
  - Fields:
    - `documentTypeId: v.id("documentTypes")`
    - `legalFrameworkId: v.id("legalFrameworks")`
    - `isRequired: v.boolean()` - indicates if document is required for this legal framework
    - `createdAt: v.number()`
    - `createdBy: v.id("users")`
  - Validation: All fields should be properly typed

- [x] 2.2: Add indexes to documentTypesLegalFrameworks table
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add indexes:
    - `.index("by_documentType", ["documentTypeId"])`
    - `.index("by_legalFramework", ["legalFrameworkId"])`
    - `.index("by_documentType_legalFramework", ["documentTypeId", "legalFrameworkId"])`
  - Validation: Indexes follow the same pattern as `processTypesLegalFrameworks` table

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Indexes created for optimal queries
- [ ] Consistent with existing junction table patterns (`processTypesLegalFrameworks`)
- [ ] Follows same field naming conventions

---

### 3. Database Schema - Modify documentsDelivered Table

**Objective**: Make documentsDelivered support both typed and loose documents

#### Sub-tasks:

- [x] 3.1: Change `documentTypeId` to optional in documentsDelivered
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Change: `documentTypeId: v.id("documentTypes")` to `documentTypeId: v.optional(v.id("documentTypes"))`
  - Reason: Support loose documents without type
  - Validation: Field should be optional

- [x] 3.2: Add `documentTypeLegalFrameworkId` field
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add: `documentTypeLegalFrameworkId: v.optional(v.id("documentTypesLegalFrameworks"))`
  - Description: Link to the specific document-legal framework association
  - Validation: Field should be optional

- [x] 3.3: Add `isRequired` field
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add: `isRequired: v.optional(v.boolean())`
  - Description: Indicates if this document is required (from auto-population)
  - Validation: Field should be optional

- [x] 3.4: Add `storageId` field
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Add: `storageId: v.optional(v.id("_storage"))`
  - Description: Reference to Convex file storage (if using storage API)
  - Validation: Field should be optional

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Optional fields properly marked
- [ ] No breaking changes to existing documents
- [ ] Consistent with Convex storage patterns

---

### 4. Backend API - Create documentTypesLegalFrameworks Functions

**Objective**: Create API functions to manage document type and legal framework associations

#### Sub-tasks:

- [x] 4.1: Create new file for junction table API
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypesLegalFrameworks.ts`
  - Create file with imports: `mutation`, `query`, `v` from Convex
  - Add auth helpers import
  - Validation: File created in correct location

- [x] 4.2: Implement `updateAssociations` mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypesLegalFrameworks.ts`
  - Function: Update associations for a document type
  - Parameters:
    - `documentTypeId: v.id("documentTypes")`
    - `associations: v.array(v.object({ legalFrameworkId: v.id("legalFrameworks"), isRequired: v.boolean() }))`
  - Logic:
    - Delete existing associations for this document type
    - Create new associations
    - Set `createdAt` and `createdBy` fields
  - Validation: Authenticated users only, proper error handling

- [x] 4.3: Implement `toggleAllForDocumentType` mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypesLegalFrameworks.ts`
  - Function: Mark/unmark all legal frameworks for a document type
  - Parameters:
    - `documentTypeId: v.id("documentTypes")`
    - `selectAll: v.boolean()`
    - `defaultIsRequired: v.optional(v.boolean())`
  - Logic:
    - If `selectAll: true`: Create associations for all active legal frameworks
    - If `selectAll: false`: Delete all associations for this document type
  - Validation: Authenticated users only

- [x] 4.4: Implement `listByDocumentType` query
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypesLegalFrameworks.ts`
  - Function: List all associations for a document type
  - Parameters: `documentTypeId: v.id("documentTypes")`
  - Returns: Array of associations with enriched legal framework data
  - Validation: Include only active legal frameworks

- [x] 4.5: Implement `listByLegalFramework` query
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypesLegalFrameworks.ts`
  - Function: List all document types for a legal framework
  - Parameters: `legalFrameworkId: v.id("legalFrameworks")`
  - Returns: Array of associations with enriched document type data
  - Validation: Include only active document types

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Authentication checks implemented
- [ ] Error handling for edge cases
- [ ] Consistent naming with `processTypesLegalFrameworks.ts` patterns
- [ ] Clean code principles followed

---

### 5. Backend API - Update documentTypes Functions

**Objective**: Update documentTypes API to support legal framework associations

#### Sub-tasks:

- [x] 5.1: Update `create` mutation to handle associations
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypes.ts`
  - Add parameters: `allowedFileTypes`, `maxFileSizeMB`
  - Add parameter: `associations: v.optional(v.array(v.object({ legalFrameworkId, isRequired })))`
  - Logic: After creating document type, create associations if provided
  - Validation: Transaction-safe operations

- [x] 5.2: Update `update` mutation to handle associations
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypes.ts`
  - Add parameters: `allowedFileTypes`, `maxFileSizeMB`
  - Add parameter: `associations: v.optional(v.array(v.object({ legalFrameworkId, isRequired })))`
  - Logic: Update document type fields and associations if provided
  - Validation: Transaction-safe operations

- [x] 5.3: Create `getWithLegalFrameworks` query
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypes.ts`
  - Function: Get document type with all associated legal frameworks
  - Parameters: `documentTypeId: v.id("documentTypes")`
  - Returns: Document type with enriched associations array
  - Validation: Include all fields including new ones

- [x] 5.4: Create `listByLegalFramework` query
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentTypes.ts`
  - Function: List document types associated with a legal framework
  - Parameters: `legalFrameworkId: v.id("legalFrameworks")`
  - Returns: Array of document types with `isRequired` flag
  - Validation: Only return active document types

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation for new parameters
- [ ] Error handling implemented
- [ ] Transaction safety for mutations
- [ ] Clean code principles followed

---

### 6. Backend API - Update documentsDelivered Functions

**Objective**: Create new upload functions supporting loose, typed, and pre-populated documents

#### Sub-tasks:

- [x] 6.1: Implement `uploadLoose` mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentsDelivered.ts`
  - Function: Upload document without document type
  - Parameters:
    - `individualProcessId: v.id("individualProcesses")`
    - `fileName: v.string()`
    - `fileUrl: v.string()`
    - `fileSize: v.number()`
    - `mimeType: v.string()`
    - `expiryDate: v.optional(v.string())`
  - Logic: Create document with `documentTypeId: null`, status: "uploaded"
  - Validation: Authenticated users only

- [x] 6.2: Implement `uploadWithType` mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentsDelivered.ts`
  - Function: Upload document with document type selection
  - Parameters: Same as `uploadLoose` + `documentTypeId: v.id("documentTypes")`
  - Logic:
    - Validate file type and size against document type rules
    - Create document with type, status: "uploaded"
  - Validation: File format and size validation

- [x] 6.3: Implement `assignType` mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentsDelivered.ts`
  - Function: Convert loose document to typed document
  - Parameters:
    - `documentId: v.id("documentsDelivered")`
    - `documentTypeId: v.id("documentTypes")`
  - Logic:
    - Verify document has no type assigned
    - Validate file against document type rules
    - Update document with type
  - Validation: File format and size validation, document must be loose

- [x] 6.4: Implement `uploadForPending` mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentsDelivered.ts`
  - Function: Upload file for a pre-populated document
  - Parameters:
    - `documentId: v.id("documentsDelivered")`
    - `fileName: v.string()`
    - `fileUrl: v.string()`
    - `fileSize: v.number()`
    - `mimeType: v.string()`
    - `expiryDate: v.optional(v.string())`
  - Logic:
    - Verify document exists and is "not_started" or "pending_upload"
    - Update document with file info, change status to "uploaded"
  - Validation: Document must be pre-populated

- [x] 6.5: Update `listByIndividualProcess` query (implemented as `listGroupedByCategory`)
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/documentsDelivered.ts`
  - Function: List documents grouped by category
  - Returns:
    - Required documents (pre-populated with `isRequired: true`)
    - Optional documents (pre-populated with `isRequired: false`)
    - Loose documents (no `documentTypeId`)
  - Validation: Proper grouping and enrichment

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] File validation logic implemented
- [ ] Error handling for edge cases
- [ ] Status transitions properly managed
- [ ] Clean code principles followed

---

### 7. Backend Helper - Create Document Checklist Generator

**Objective**: Auto-populate documents when creating individual process

#### Sub-tasks:

- [x] 7.1: Create or update document checklist helper file
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/lib/documentChecklist.ts`
  - If file doesn't exist, create it
  - Import necessary types and helpers
  - Validation: File created in correct location

- [x] 7.2: Implement `generateDocumentChecklistByLegalFramework` function
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/lib/documentChecklist.ts`
  - Function: Generate document checklist based on legal framework
  - Parameters:
    - `ctx: QueryCtx | MutationCtx`
    - `individualProcessId: Id<"individualProcesses">`
    - `legalFrameworkId: Id<"legalFrameworks">`
    - `userId: Id<"users">`
  - Logic:
    - Query `documentTypesLegalFrameworks` by legal framework
    - For each association, create a document in `documentsDelivered`:
      - `status: "not_started"`
      - `documentTypeId`: from association
      - `documentTypeLegalFrameworkId`: association ID
      - `isRequired`: from association
      - Leave file fields empty
  - Returns: Array of created document IDs
  - Validation: Transaction-safe, error handling

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Proper Convex context typing
- [ ] Error handling implemented
- [ ] Transaction safety
- [ ] Clean code principles followed

---

### 8. Backend API - Update individualProcesses Creation

**Objective**: Auto-populate documents when creating individual process

#### Sub-tasks:

- [x] 8.1: Import document checklist helper
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Add import: `import { generateDocumentChecklistByLegalFramework } from "./lib/documentChecklist"`
  - Validation: Import path is correct

- [x] 8.2: Call document generation in `create` mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts`
  - Location: After creating individual process record
  - Add logic:
    - If `legalFrameworkId` is provided
    - Call `await generateDocumentChecklistByLegalFramework(ctx, processId, legalFrameworkId, userId)`
  - Validation: Only call if legal framework is set

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Error handling for generator failures
- [ ] Transaction safety maintained
- [ ] No breaking changes to existing create logic
- [ ] Clean code principles followed

---

### 9. Zod Validations - Update documentTypes Schema

**Objective**: Add Zod validation for new document type fields

#### Sub-tasks:

- [x] 9.1: Add validation for `allowedFileTypes`
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documentTypes.ts`
  - Schema: `allowedFileTypes: z.array(z.string()).optional()`
  - Description: Array of file extensions
  - Validation: Array of strings, optional

- [x] 9.2: Add validation for `maxFileSizeMB`
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documentTypes.ts`
  - Schema: `maxFileSizeMB: z.number().positive().optional()`
  - Description: Maximum file size in MB
  - Validation: Positive number, optional

- [x] 9.3: Create `legalFrameworkAssociationSchema`
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documentTypes.ts`
  - Schema:
    ```typescript
    export const legalFrameworkAssociationSchema = z.object({
      legalFrameworkId: z.string(),
      isRequired: z.boolean(),
    });
    ```
  - Validation: Proper object schema

- [x] 9.4: Update `documentTypeSchema` to include associations
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documentTypes.ts`
  - Add field: `associations: z.array(legalFrameworkAssociationSchema).optional()`
  - Validation: Optional array of associations

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod schemas properly structured
- [ ] Error messages are clear
- [ ] Consistent with existing validation patterns

---

### 10. Zod Validations - Create documentsDelivered Schema

**Objective**: Create Zod validation schemas for document upload operations

#### Sub-tasks:

- [x] 10.1: Create new validation file
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documents-delivered.ts`
  - Create file with Zod import
  - Validation: File created with proper naming (kebab-case)

- [x] 10.2: Create `looseDocumentUploadSchema`
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documents-delivered.ts`
  - Schema fields:
    - `individualProcessId: z.string()`
    - `fileName: z.string().min(1)`
    - `fileUrl: z.string().url()`
    - `fileSize: z.number().positive()`
    - `mimeType: z.string()`
    - `expiryDate: z.string().optional()`
  - Validation: All required fields validated

- [x] 10.3: Create `typedDocumentUploadSchema`
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documents-delivered.ts`
  - Schema: Extend `looseDocumentUploadSchema` with `documentTypeId: z.string()`
  - Validation: Inherits from loose schema

- [x] 10.4: Create `assignDocumentTypeSchema`
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documents-delivered.ts`
  - Schema fields:
    - `documentId: z.string()`
    - `documentTypeId: z.string()`
  - Validation: Both IDs required

- [x] 10.5: Create `uploadForPendingSchema` (implemented as `pendingDocumentUploadSchema`)
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/lib/validations/documents-delivered.ts`
  - Schema fields:
    - `documentId: z.string()`
    - `fileName: z.string().min(1)`
    - `fileUrl: z.string().url()`
    - `fileSize: z.number().positive()`
    - `mimeType: z.string()`
    - `expiryDate: z.string().optional()`
  - Validation: Document ID + file fields

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod schemas properly structured
- [ ] Error messages are clear (i18n compatible)
- [ ] Consistent with existing validation patterns
- [ ] File naming follows kebab-case convention

---

### 11. Frontend Component - Legal Framework Association Section

**Objective**: Create component for managing document type associations with legal frameworks

#### Sub-tasks:

- [x] 11.1: Create component file
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/legal-framework-association-section.tsx`
  - Create new component with TypeScript
  - Import necessary UI components (Checkbox, Button, Label, etc.)
  - Validation: File created in correct location with kebab-case

- [x] 11.2: Implement component props interface
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/legal-framework-association-section.tsx`
  - Props:
    ```typescript
    interface LegalFrameworkAssociationSectionProps {
      value: Array<{ legalFrameworkId: string; isRequired: boolean }>;
      onChange: (value: Array<{ legalFrameworkId: string; isRequired: boolean }>) => void;
      disabled?: boolean;
    }
    ```
  - Validation: Proper TypeScript interface

- [x] 11.3: Implement legal frameworks list query
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/legal-framework-association-section.tsx`
  - Query: Fetch all active legal frameworks using Convex query
  - Display: List with checkboxes for each legal framework
  - Validation: Handle loading and error states

- [x] 11.4: Implement "Select All" / "Deselect All" buttons
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/legal-framework-association-section.tsx`
  - Buttons: "Marcar Todos" and "Desmarcar Todos"
  - Logic: Select/deselect all legal frameworks with `isRequired: false` default
  - Validation: Buttons trigger onChange with updated array

- [x] 11.5: Implement individual "Required" checkbox per selected framework
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/legal-framework-association-section.tsx`
  - UI: For each selected legal framework, show "Obrigatório" checkbox
  - Logic: Toggle `isRequired` flag in the associations array
  - Validation: Only show when legal framework is selected

- [x] 11.6: Add i18n support for all text
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/legal-framework-association-section.tsx`
  - Use `useTranslations()` hook
  - All labels and buttons use translation keys
  - Validation: No hardcoded strings

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] i18n keys added for user-facing text
- [ ] Reusable UI components utilized (Checkbox, Button, Label)
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [ ] Touch-friendly UI elements (min 44x44px)

---

### 12. Frontend Component - Update Document Type Form Dialog

**Objective**: Add legal framework associations to document type form

#### Sub-tasks:

- [x] 12.1: Import LegalFrameworkAssociationSection component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/document-type-form-dialog.tsx`
  - Add import for new component
  - Validation: Import path is correct

- [x] 12.2: Add `allowedFileTypes` field to form
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/document-type-form-dialog.tsx`
  - UI: Multi-select or tags input for file extensions
  - Suggested options: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.doc`, `.docx`
  - Validation: Array of strings

- [x] 12.3: Add `maxFileSizeMB` field to form
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/document-type-form-dialog.tsx`
  - UI: Number input with MB unit label
  - Suggested default: 10 MB
  - Validation: Positive number

- [x] 12.4: Integrate LegalFrameworkAssociationSection component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/document-type-form-dialog.tsx`
  - Add component to form with proper form state binding
  - Position: After basic fields, before submit button
  - Validation: Form state properly managed

- [x] 12.5: Update form submission to include new fields
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/document-type-form-dialog.tsx`
  - Include `allowedFileTypes`, `maxFileSizeMB`, and `associations` in mutation call
  - Validation: All fields properly submitted

- [x] 12.6: Add i18n for new fields
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/document-types/document-type-form-dialog.tsx`
  - Labels for allowed file types and max file size
  - Section header for legal framework associations
  - Validation: No hardcoded strings

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [ ] Touch-friendly UI elements (min 44x44px)

---

### 13. Frontend Component - Loose Document Upload Dialog

**Objective**: Create dialog for uploading documents without document type

#### Sub-tasks:

- [x] 13.1: Create component file
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/loose-document-upload-dialog.tsx`
  - Create new component with TypeScript
  - Import Dialog components from UI library
  - Validation: File created in correct location with kebab-case

- [x] 13.2: Implement component props interface
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/loose-document-upload-dialog.tsx`
  - Props:
    ```typescript
    interface LooseDocumentUploadDialogProps {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      individualProcessId: string;
      onSuccess?: () => void;
    }
    ```
  - Validation: Proper TypeScript interface

- [x] 13.3: Implement file upload field
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/loose-document-upload-dialog.tsx`
  - UI: File input with drag-and-drop support
  - Validation: File size and basic type checking
  - Show file preview/name after selection

- [x] 13.4: Add optional expiry date field
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/loose-document-upload-dialog.tsx`
  - UI: Date picker for expiry date
  - Validation: Optional field, future date only
  - i18n: Use translation keys

- [x] 13.5: Implement upload logic with Convex mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/loose-document-upload-dialog.tsx`
  - Call: `uploadLoose` mutation
  - Handle: File upload to Convex storage first, then create document record
  - Validation: Loading states, error handling, success callback

- [x] 13.6: Add i18n support
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/loose-document-upload-dialog.tsx`
  - Use `useTranslations()` hook
  - Keys: dialog title, labels, buttons, error messages
  - Validation: No hardcoded strings

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented (use `looseDocumentUploadSchema`)
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized (Dialog, Button, Input, DatePicker)
- [ ] Clean code principles followed
- [ ] Error handling implemented (file upload errors, mutation errors)
- [ ] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [ ] Touch-friendly UI elements (min 44x44px)
- [ ] File upload progress indicator

---

### 14. Frontend Component - Typed Document Upload Dialog

**Objective**: Create dialog for uploading documents with document type selection

#### Sub-tasks:

- [x] 14.1: Create component file
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/typed-document-upload-dialog.tsx`
  - Create new component with TypeScript
  - Import Dialog components from UI library
  - Validation: File created in correct location with kebab-case

- [x] 14.2: Implement component props interface
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/typed-document-upload-dialog.tsx`
  - Props:
    ```typescript
    interface TypedDocumentUploadDialogProps {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      individualProcessId: string;
      legalFrameworkId?: string;
      onSuccess?: () => void;
    }
    ```
  - Validation: Proper TypeScript interface

- [x] 14.3: Implement document type selector
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/typed-document-upload-dialog.tsx`
  - UI: Combobox or Select for document types
  - Query: Fetch document types (filtered by legal framework if provided)
  - Validation: Required field
  - Display: Show document type name and description

- [x] 14.4: Display file validation rules based on selected type
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/typed-document-upload-dialog.tsx`
  - Display: Show `allowedFileTypes` and `maxFileSizeMB` from selected document type
  - UI: Info text or alert showing requirements
  - Validation: Only show when document type is selected

- [x] 14.5: Implement file upload field with validation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/typed-document-upload-dialog.tsx`
  - UI: File input with drag-and-drop support
  - Validation:
    - Check file extension against `allowedFileTypes`
    - Check file size against `maxFileSizeMB`
    - Show clear error messages if validation fails
  - Show file preview/name after selection

- [x] 14.6: Add optional expiry date field
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/typed-document-upload-dialog.tsx`
  - UI: Date picker for expiry date
  - Validation: Optional field, future date only
  - i18n: Use translation keys

- [x] 14.7: Implement upload logic with Convex mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/typed-document-upload-dialog.tsx`
  - Call: `uploadWithType` mutation
  - Handle: File upload to Convex storage first, then create document record
  - Validation: Loading states, error handling, success callback

- [x] 14.8: Add i18n support
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/typed-document-upload-dialog.tsx`
  - Use `useTranslations()` hook
  - Keys: dialog title, labels, buttons, error messages, validation messages
  - Validation: No hardcoded strings

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented (use `typedDocumentUploadSchema`)
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized (Dialog, Select/Combobox, Button, Input, DatePicker)
- [ ] Clean code principles followed
- [ ] Error handling implemented (validation errors, upload errors)
- [ ] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [ ] Touch-friendly UI elements (min 44x44px)
- [ ] Clear validation error messages for file type/size

---

### 15. Frontend Component - Assign Document Type Dialog

**Objective**: Create dialog for converting loose documents to typed documents

#### Sub-tasks:

- [x] 15.1: Create component file
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/assign-document-type-dialog.tsx`
  - Create new component with TypeScript
  - Import Dialog components from UI library
  - Validation: File created in correct location with kebab-case

- [x] 15.2: Implement component props interface
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/assign-document-type-dialog.tsx`
  - Props:
    ```typescript
    interface AssignDocumentTypeDialogProps {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      document: {
        _id: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      };
      legalFrameworkId?: string;
      onSuccess?: () => void;
    }
    ```
  - Validation: Proper TypeScript interface

- [x] 15.3: Display current document information
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/assign-document-type-dialog.tsx`
  - Display: File name, size, type
  - UI: Read-only info section at top of dialog
  - Validation: Proper formatting of file size (MB/KB)

- [x] 15.4: Implement document type selector
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/assign-document-type-dialog.tsx`
  - UI: Combobox or Select for document types
  - Query: Fetch document types (filtered by legal framework if provided)
  - Validation: Required field
  - Display: Show document type name and description

- [x] 15.5: Show compatibility check
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/assign-document-type-dialog.tsx`
  - Logic: Check if document file type and size match selected document type rules
  - Display: Warning/error if incompatible, success message if compatible
  - Validation: Prevent submission if incompatible

- [x] 15.6: Implement assign logic with Convex mutation
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/assign-document-type-dialog.tsx`
  - Call: `assignType` mutation
  - Handle: Loading states, error handling, success callback
  - Validation: Backend will also validate compatibility

- [x] 15.7: Add i18n support
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/assign-document-type-dialog.tsx`
  - Use `useTranslations()` hook
  - Keys: dialog title, labels, buttons, compatibility messages
  - Validation: No hardcoded strings

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Zod validation implemented (use `assignDocumentTypeSchema`)
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized (Dialog, Select/Combobox, Button, Alert)
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [ ] Touch-friendly UI elements (min 44x44px)
- [ ] Clear compatibility messages

---

### 16. Frontend Component - Update Document Checklist Card

**Objective**: Update document checklist to show required, optional, and loose documents

#### Sub-tasks:

- [x] 16.1: Read existing component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - Understand current structure and queries
  - Validation: Component exists and is functional

- [x] 16.2: Update document query to group by category
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - Query: Use updated `listByIndividualProcess` query
  - Group documents:
    - Required: `isRequired === true` and `documentTypeId` exists
    - Optional: `isRequired === false` and `documentTypeId` exists
    - Loose: `documentTypeId` is null
  - Validation: Proper grouping logic

- [x] 16.3: Create "Required Documents" section
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - UI: Collapsible section or card
  - Display: List of required documents with status badges
  - Show: Upload button for "not_started" documents
  - Validation: Clear visual indication of required vs completed

- [x] 16.4: Create "Optional Documents" section
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - UI: Collapsible section or card
  - Display: List of optional documents with status badges
  - Show: Upload button for "not_started" documents
  - Validation: Clear visual distinction from required

- [x] 16.5: Create "Loose Documents" section
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - UI: Collapsible section or card
  - Display: List of loose documents with option to assign type
  - Show: "Assign Type" button for each loose document
  - Validation: Clear indication that these have no type

- [x] 16.6: Add "Upload Loose" button
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - UI: Primary action button
  - Action: Open `LooseDocumentUploadDialog`
  - Position: In header or floating action button
  - Validation: Button is accessible and visible

- [x] 16.7: Add "Upload with Type" button
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - UI: Secondary action button
  - Action: Open `TypedDocumentUploadDialog`
  - Position: In header next to "Upload Loose"
  - Validation: Button is accessible and visible

- [x] 16.8: Integrate upload dialogs
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - Import and add dialog components to the component tree
  - State: Manage open/close state for each dialog
  - Callback: Refresh document list on successful upload
  - Validation: Dialogs open and close properly

- [x] 16.9: Integrate assign type dialog
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - Import and add `AssignDocumentTypeDialog` to component tree
  - State: Track which document is being assigned
  - Callback: Refresh document list on successful assignment
  - Validation: Dialog opens with correct document data

- [x] 16.10: Add i18n for new sections and buttons
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - Keys: Section headers, button labels, status messages
  - Validation: No hardcoded strings

- [x] 16.11: Improve mobile responsiveness
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/document-checklist-card.tsx`
  - Ensure sections collapse/expand properly on mobile
  - Make action buttons touch-friendly (min 44x44px)
  - Test on small screens
  - Validation: Component works well on mobile devices

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] i18n keys added for user-facing text
- [ ] Reusable components utilized (Card, Collapsible, Button, Badge)
- [ ] Clean code principles followed
- [ ] Error handling implemented
- [ ] Mobile responsiveness implemented (sm, md, lg breakpoints)
- [ ] Touch-friendly UI elements (min 44x44px)
- [ ] Clear visual hierarchy for required/optional/loose documents
- [ ] Loading and empty states handled

---

### 17. Translations - Add i18n Keys

**Objective**: Add all translation keys for new features

#### Sub-tasks:

- [x] 17.1: Add DocumentTypes translations to Portuguese
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Add keys under `DocumentTypes` namespace:
    - `allowedFileTypes`: "Tipos de arquivo permitidos"
    - `maxFileSizeMB`: "Tamanho máximo (MB)"
    - `legalFrameworkAssociations`: "Associação com Amparos Legais"
    - `selectAll`: "Marcar Todos"
    - `deselectAll`: "Desmarcar Todos"
    - `required`: "Obrigatório"
    - `optional`: "Opcional"
  - Validation: Keys added in correct namespace

- [x] 17.2: Add DocumentTypes translations to English
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Add keys under `DocumentTypes` namespace:
    - `allowedFileTypes`: "Allowed file types"
    - `maxFileSizeMB`: "Maximum size (MB)"
    - `legalFrameworkAssociations`: "Legal Framework Associations"
    - `selectAll`: "Select All"
    - `deselectAll`: "Deselect All"
    - `required`: "Required"
    - `optional`: "Optional"
  - Validation: Keys match Portuguese keys exactly

- [x] 17.3: Add DocumentsDelivered translations to Portuguese (as DocumentChecklist and DocumentUpload)
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Add keys under `DocumentChecklist` and `DocumentUpload` namespaces:
    - `uploadLoose`: "Upload Avulso"
    - `uploadWithType`: "Upload com Tipo"
    - `assignType`: "Atribuir Tipo"
    - `looseDocument`: "Documento Avulso"
    - `requiredDocuments`: "Documentos Obrigatórios"
    - `optionalDocuments`: "Documentos Opcionais"
    - `looseDocuments`: "Documentos Avulsos"
    - `selectDocumentType`: "Selecione o tipo de documento"
    - `fileValidation`: "Validação de arquivo"
    - `fileSizeExceeded`: "Arquivo excede o tamanho máximo de {size}MB"
    - `fileTypeNotAllowed`: "Tipo de arquivo não permitido. Tipos aceitos: {types}"
    - `compatibilityCheck`: "Verificação de compatibilidade"
    - `compatible`: "Arquivo compatível com o tipo selecionado"
    - `notCompatible`: "Arquivo não compatível com o tipo selecionado"
  - Validation: Keys added in correct namespace

- [x] 17.4: Add DocumentsDelivered translations to English (as DocumentChecklist and DocumentUpload)
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Add keys under `DocumentChecklist` and `DocumentUpload` namespaces:
    - `uploadLoose`: "Upload Loose"
    - `uploadWithType`: "Upload with Type"
    - `assignType`: "Assign Type"
    - `looseDocument`: "Loose Document"
    - `requiredDocuments`: "Required Documents"
    - `optionalDocuments`: "Optional Documents"
    - `looseDocuments`: "Loose Documents"
    - `selectDocumentType`: "Select document type"
    - `fileValidation`: "File validation"
    - `fileSizeExceeded`: "File exceeds maximum size of {size}MB"
    - `fileTypeNotAllowed`: "File type not allowed. Accepted types: {types}"
    - `compatibilityCheck`: "Compatibility check"
    - `compatible`: "File is compatible with selected type"
    - `notCompatible`: "File is not compatible with selected type"
  - Validation: Keys match Portuguese keys exactly

- [x] 17.5: Add dialog and common translations to Portuguese
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json`
  - Add additional keys:
    - `uploadLooseDialog.title`: "Upload de Documento Avulso"
    - `uploadLooseDialog.description`: "Faça upload de um documento sem tipo específico"
    - `uploadTypedDialog.title`: "Upload de Documento com Tipo"
    - `uploadTypedDialog.description`: "Selecione um tipo e faça upload do documento"
    - `assignTypeDialog.title`: "Atribuir Tipo ao Documento"
    - `assignTypeDialog.description`: "Converta um documento avulso em um documento tipado"
    - `fileUpload.dragDrop`: "Arraste um arquivo ou clique para selecionar"
    - `fileUpload.selected`: "Arquivo selecionado: {fileName}"
  - Validation: Keys added for all dialogs

- [x] 17.6: Add dialog and common translations to English
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json`
  - Add additional keys:
    - `uploadLooseDialog.title`: "Upload Loose Document"
    - `uploadLooseDialog.description`: "Upload a document without a specific type"
    - `uploadTypedDialog.title`: "Upload Typed Document"
    - `uploadTypedDialog.description`: "Select a type and upload the document"
    - `assignTypeDialog.title`: "Assign Type to Document"
    - `assignTypeDialog.description`: "Convert a loose document into a typed document"
    - `fileUpload.dragDrop`: "Drag a file or click to select"
    - `fileUpload.selected`: "Selected file: {fileName}"
  - Validation: Keys match Portuguese keys exactly

#### Quality Checklist:

- [ ] All keys added to both `pt.json` and `en.json`
- [ ] Keys are properly nested in namespaces
- [ ] Translations are accurate and natural
- [ ] Keys support interpolation where needed (e.g., `{size}`, `{types}`)
- [ ] No typos in key names
- [ ] Consistent naming conventions (camelCase for keys)

---

## Implementation Notes

### Important Technical Considerations

1. **Data Migration**: Existing documents will have `documentTypeId` required, so the schema change to optional is backwards compatible. New loose documents will have `null` for this field.

2. **File Validation**: Implement client-side validation for better UX, but ALWAYS validate on the backend for security.

3. **Transaction Safety**: When creating associations, use Convex transactions to ensure atomicity.

4. **Performance**: The document checklist generation may create many records. Consider batch operations if needed.

5. **Storage**: Use Convex file storage API for file uploads. Remember to handle storage cleanup if documents are deleted.

6. **Status Management**: Document status flow:
   - Pre-populated: `"not_started"` → `"uploaded"` (via `uploadForPending`)
   - Loose: `"uploaded"` immediately (via `uploadLoose`)
   - Typed: `"uploaded"` immediately (via `uploadWithType`)
   - Assigned: Status remains `"uploaded"` (via `assignType`)

7. **Legal Framework Changes**: If a process's legal framework changes, consider whether to regenerate the document checklist or keep existing documents.

---

## Definition of Done

- [ ] All schema changes applied and Convex dev running without errors
- [ ] All backend API functions implemented and tested
- [ ] All Zod validations created
- [ ] All frontend components created and integrated
- [ ] All translations added (Portuguese and English)
- [ ] Manual testing completed:
  - [ ] Create document type with legal framework associations
  - [ ] Test "Select All" / "Deselect All" functionality
  - [ ] Create individual process with legal framework
  - [ ] Verify documents are auto-populated
  - [ ] Upload loose document
  - [ ] Upload typed document
  - [ ] Assign type to loose document
  - [ ] Upload file for pre-populated document
- [ ] Code reviewed for quality:
  - [ ] No `any` types
  - [ ] All strings use i18n
  - [ ] Error handling present
  - [ ] Mobile responsive
  - [ ] Clean code principles followed
- [ ] Application builds and runs without errors

---

## Manual Testing Checklist

### Test 1: Document Type with Legal Framework Associations
- [ ] Navigate to Document Types management
- [ ] Create new document type
- [ ] Add allowed file types (e.g., `.pdf`, `.jpg`)
- [ ] Set max file size (e.g., 5 MB)
- [ ] Click "Select All" for legal frameworks
- [ ] Mark some as "Required"
- [ ] Save document type
- [ ] Verify associations are saved
- [ ] Edit document type and verify associations load correctly

### Test 2: Individual Process Creation with Auto-Population
- [ ] Create new individual process
- [ ] Select a legal framework that has associated document types
- [ ] Save the process
- [ ] Open the process detail page
- [ ] Verify documents are pre-populated in the checklist
- [ ] Check that required documents are marked as required
- [ ] Check that optional documents are marked as optional

### Test 3: Upload Operations
- [ ] Upload a loose document (no type)
- [ ] Verify it appears in "Loose Documents" section
- [ ] Upload a typed document (select type first)
- [ ] Verify it appears in correct section
- [ ] Upload file for a pre-populated document
- [ ] Verify status changes from "not_started" to "uploaded"

### Test 4: Type Assignment
- [ ] Select a loose document
- [ ] Click "Assign Type"
- [ ] Select a document type
- [ ] Verify compatibility check (if file matches type rules)
- [ ] Assign the type
- [ ] Verify document moves to appropriate section (required/optional)

### Test 5: File Validation
- [ ] Try to upload a file larger than max size
- [ ] Verify error message appears
- [ ] Try to upload a file with wrong extension
- [ ] Verify error message appears
- [ ] Upload a valid file
- [ ] Verify success

### Test 6: Mobile Responsiveness
- [ ] Test on mobile device or browser DevTools mobile view
- [ ] Verify all sections are collapsible
- [ ] Verify buttons are touch-friendly (easy to tap)
- [ ] Verify file upload works on mobile
- [ ] Verify dialogs display correctly on mobile

### Test 7: Internationalization
- [ ] Switch language to English
- [ ] Verify all new labels are translated
- [ ] Switch back to Portuguese
- [ ] Verify all labels are in Portuguese
- [ ] Check that no hardcoded strings appear

---

## Next Steps After Completion

1. **Monitoring**: Monitor document upload success rates and file storage usage
2. **User Feedback**: Collect feedback on the document upload UX
3. **Performance**: If many documents are created, consider adding pagination to document lists
4. **Future Enhancements**:
   - Document version history
   - Bulk document upload
   - Document preview in browser
   - Document expiry notifications
   - Document approval workflow
