# TODO: Fix Collective Process View Issues

## Context

Two critical issues need to be addressed in the collective process view:

1. When clicking on an individual process row in the subtable within a collective process view, the navigation doesn't work properly and breadcrumbs aren't updated to show the navigation path back to the collective process.

2. The "Edit" button in the collective process detail card gives a 404 error because the edit route doesn't exist.

## Related PRD Sections

- Process Management Module: Main process creation and overview, Individual process management within main processes
- Process Hierarchy: Understanding that individual processes belong to collective (main) processes

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the current routing structure and determine where to create the missing edit route

#### Sub-tasks:

- [x] 0.1: Review project structure for collective processes routes
  - Validation: Located `/app/[locale]/(dashboard)/collective-processes/[id]/page.tsx` (view route exists)
  - Output: Missing `/app/[locale]/(dashboard)/collective-processes/[id]/edit/page.tsx` route
  - Pattern: Similar to individual processes which has both `[id]/page.tsx` and `[id]/edit/page.tsx`

- [x] 0.2: Review individual process detail page for breadcrumb pattern
  - Validation: Individual process page at `/app/[locale]/(dashboard)/individual-processes/[id]/page.tsx` uses static breadcrumbs
  - Output: Breadcrumbs are defined as array with `label` and optional `href` properties
  - Pattern: `{ label: string, href?: string }`

- [x] 0.3: Identify the component that needs breadcrumb enhancement
  - Validation: Found `IndividualProcessesTable` component handles row clicks via `onRowClick` prop
  - Output: The collective process detail page (`/app/[locale]/(dashboard)/collective-processes/[id]/page.tsx`) passes `handleViewIndividual` to `onView` prop
  - Pattern: Need to modify how navigation works when coming from collective process context

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified (Next.js App Router with dynamic routes)
- [x] Existing patterns reviewed (individual processes edit route pattern)

### 1. Fix Individual Process Navigation from Collective Process View

**Objective**: Enable proper navigation from individual process row to individual process detail view with breadcrumb trail back to collective process

#### Sub-tasks:

- [x] 1.1: Modify the individual process detail page to accept and use referrer context
  - File: `/app/[locale]/(dashboard)/individual-processes/[id]/page.tsx`
  - Validation: Check for `searchParams` to detect if coming from collective process
  - Implementation: Use `searchParams.collectiveProcessId` to build enhanced breadcrumbs
  - Dependencies: None

- [x] 1.2: Update breadcrumbs logic to include collective process reference
  - File: `/app/[locale]/(dashboard)/individual-processes/[id]/page.tsx`
  - Validation: When `collectiveProcessId` is present, fetch collective process data
  - Implementation: Add query to fetch collective process details when ID is in search params
  - Pattern:
    ```typescript
    // When coming from collective process:
    [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Process Management' },
      { label: 'Collective Processes', href: '/collective-processes' },
      { label: '[Collective Process Ref Number]', href: `/collective-processes/${collectiveProcessId}` },
      { label: '[Person Name]' }
    ]
    // Normal case (no collective context):
    [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Process Management' },
      { label: 'Individual Processes', href: '/individual-processes' },
      { label: '[Person Name]' }
    ]
    ```
  - Dependencies: Task 1.1

- [x] 1.3: Update collective process detail page to pass collectiveProcessId when navigating
  - File: `/app/[locale]/(dashboard)/collective-processes/[id]/page.tsx`
  - Validation: Modify `handleViewIndividual` to append search params
  - Implementation:
    ```typescript
    const handleViewIndividual = (id: Id<"individualProcesses">) => {
      router.push(`/individual-processes/${id}?collectiveProcessId=${collectiveProcessId}`)
    }
    ```
  - Dependencies: None

- [x] 1.4: Update handleEditIndividual similarly
  - File: `/app/[locale]/(dashboard)/collective-processes/[id]/page.tsx`
  - Validation: Edit route should also preserve collective process context
  - Implementation:
    ```typescript
    const handleEditIndividual = (id: Id<"individualProcesses">) => {
      router.push(`/individual-processes/${id}/edit?collectiveProcessId=${collectiveProcessId}`)
    }
    ```
  - Dependencies: None

- [x] 1.5: Update individual process edit page breadcrumbs
  - File: `/app/[locale]/(dashboard)/individual-processes/[id]/edit/page.tsx`
  - Validation: Apply same breadcrumb logic as detail page
  - Implementation: Check for `collectiveProcessId` in searchParams and build appropriate breadcrumbs
  - Dependencies: Task 1.1, 1.2

#### Quality Checklist:

- [x] TypeScript types are properly defined for searchParams
- [x] Breadcrumbs display correctly in both contexts (with/without collective process)
- [x] Navigation maintains context throughout the flow
- [x] URLs are clean and follow Next.js conventions
- [x] Mobile responsive breadcrumbs work correctly
- [x] Back navigation works as expected

### 2. Create Missing Edit Route for Collective Process

**Objective**: Create the edit route for collective processes to fix the 404 error

#### Sub-tasks:

- [x] 2.1: Create the edit route directory structure
  - File: Create `/app/[locale]/(dashboard)/collective-processes/[id]/edit/` directory
  - Validation: Directory follows Next.js App Router conventions
  - Dependencies: None

- [x] 2.2: Identify the form component used for collective process creation
  - File: Check `/app/[locale]/(dashboard)/collective-processes/new/page.tsx`
  - Validation: Find which form component is used (likely `CollectiveProcessFormPage`)
  - Output: Component location in `/components/collective-processes/`
  - Dependencies: None

- [x] 2.3: Create the edit page component
  - File: `/app/[locale]/(dashboard)/collective-processes/[id]/edit/page.tsx`
  - Validation: Page component accepts params with id
  - Implementation:
    ```typescript
    "use client"

    import { use } from "react"
    import { useTranslations } from "next-intl"
    import { DashboardPageHeader } from "@/components/dashboard-page-header"
    import { CollectiveProcessFormPage } from "@/components/collective-processes/collective-process-form-page"
    import { Id } from "@/convex/_generated/dataModel"

    interface EditCollectiveProcessPageProps {
      params: Promise<{
        id: string
        locale: string
      }>
    }

    export default function EditCollectiveProcessPage({ params }: EditCollectiveProcessPageProps) {
      const resolvedParams = use(params)
      const t = useTranslations('CollectiveProcesses')
      const tBreadcrumbs = useTranslations('Breadcrumbs')

      const processId = resolvedParams.id as Id<"collectiveProcesses">

      const breadcrumbs = [
        { label: tBreadcrumbs('dashboard'), href: '/dashboard' },
        { label: tBreadcrumbs('processManagement') },
        { label: tBreadcrumbs('collectiveProcesses'), href: '/collective-processes' },
        { label: tBreadcrumbs('editCollectiveProcess') }
      ]

      return (
        <>
          <DashboardPageHeader breadcrumbs={breadcrumbs} />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <CollectiveProcessFormPage mode="edit" collectiveProcessId={processId} />
          </div>
        </>
      )
    }
    ```
  - Dependencies: Task 2.2

- [x] 2.4: Verify CollectiveProcessFormPage supports edit mode
  - File: `/components/collective-processes/collective-process-form-page.tsx`
  - Validation: Check if component accepts `mode` and `collectiveProcessId` props
  - Implementation: If not, add support for edit mode (fetch existing data, pre-populate form)
  - Dependencies: Task 2.3

- [x] 2.5: Add i18n translation key for edit breadcrumb
  - Files:
    - `/messages/en.json`
    - `/messages/pt.json`
  - Validation: Add `editCollectiveProcess` key under Breadcrumbs section
  - Implementation:
    - English: "Edit Collective Process"
    - Portuguese: "Editar Processo Coletivo"
  - Dependencies: None

- [x] 2.6: Test the edit button navigation
  - File: `/components/collective-processes/collective-process-detail-card.tsx`
  - Validation: Click edit button should navigate to new route without 404
  - Implementation: Verify `router.push(\`/collective-processes/\${collectiveProcess._id}/edit\`)` works
  - Dependencies: All previous tasks in section 2

#### Quality Checklist:

- [x] TypeScript types properly defined (no `any`)
- [x] Route follows Next.js 15 App Router conventions
- [x] Breadcrumbs work correctly on edit page
- [x] Form loads existing collective process data
- [x] Edit functionality works end-to-end
- [x] i18n keys added for both languages
- [x] Mobile responsive layout works
- [x] Navigation back to detail view works after save

## Implementation Notes

### Technical Considerations

1. **Search Params vs Route Segments**: Using search params (`?collectiveProcessId=...`) for context is cleaner than encoding in route segments, as it doesn't require route restructuring.

2. **Breadcrumb State Management**: The breadcrumb context is derived from URL search params, maintaining clean separation of concerns and enabling shareable URLs.

3. **Form Reusability**: The collective process form component should support both create and edit modes with a single component, following the DRY principle.

4. **Type Safety**: All route params and search params should be properly typed with Convex ID types.

### Potential Gotchas

1. **Async Params in Next.js 15**: Route params and searchParams are now async in Next.js 15, requiring `use()` hook or `await` for access.

2. **Convex Query Dependencies**: When fetching collective process data for breadcrumbs, ensure the query only runs when `collectiveProcessId` is present to avoid unnecessary API calls.

3. **Mobile Breadcrumb Overflow**: Long breadcrumb trails may overflow on mobile - ensure proper truncation or scrolling behavior.

## Definition of Done

- [x] Individual process row clicks from collective process view navigate correctly
- [x] Breadcrumbs show full navigation path including collective process reference
- [x] Users can navigate back to collective process via breadcrumbs
- [x] Edit button in collective process detail card works without 404
- [x] Edit page loads with existing collective process data
- [x] All TypeScript types are properly defined
- [x] i18n translations added for both languages
- [x] Mobile responsive behavior verified
- [x] Code follows established patterns in the project
