- Every time I insert new items or components or pages if I already have i18N location it is not translating to the default language selected or inserted.

- every time it creates form I need to make it use Zod library or similar to validate the fields and I need to create masks to fields like phone, CNPJ, email.

====
IDEA

- Create an agent that will decide which components it will use (reusable) and bing the correct information to the agent to continue the task - I can use commands to do it.

- I should have templates to trigger the agent to search for example the i18n for translation shadcnui to front-end striped for example payments and so on

- # Insert Dashboard in (dasboard) - the page - to be a lyout only to be used

======

Based on the Implementation Roadmap in the PRD, here is the recommended sequence for creating
the database tables, broken down by phase.

Phase 1: Core System & Foundational Data

This phase establishes the core entities for users, clients, and the basic process hierarchy.

1.  Lookup Tables:
    - countries
    - states
    - cities
    - processTypes
    - legalFrameworks

2.  Core Entities:
    - organizations: To support multi-tenancy from the start.
    - userProfiles: For user accounts, roles, and permissions.
    - people: To store information about the individuals (candidates).
    - companies: To store information about client companies.
    - peopleCompanies: To link people and the companies they work for.

3.  Process Management:
    - mainProcesses: The main container for a case.
    - individualProcesses: To track each person's specific journey within a mainProcess.

Phase 2: Document Management & Templates

This phase builds the system for handling document requirements, uploads, and reviews.

1.  Lookup Tables:
    - documentTypes

2.  Template System:
    - documentTemplates: To define the set of documents required for a specific process type.
    - documentRequirements: To detail each specific document within a template.

3.  Document Tracking:
    - documentsDelivered: To track the actual files uploaded by users against the
      requirements.
    - passports: A specialized table for passport data, which is a critical and frequently
      accessed document.

Phase 3: Automation, Tracking & Notifications

This phase introduces tables needed for automating workflows, tracking history, and notifying
users.

1.  Lookup Tables:
    - cboCodes (Brazilian Occupational Classification)
    - consulates

2.  Automation & History:
    - tasks: For creating and managing tasks associated with processes.
    - processHistory: To create an audit trail of all status changes in an individualProcess.
    - notifications: To store notifications for users.
    - activityLogs: For system-wide auditing of user actions.

Phase 4: Advanced Features & Configuration

This phase adds tables for enhancing user experience with custom dashboards and system-wide
settings.

1.  Request Workflow:
    - processRequests: To manage the formal flow for initiating new processes, which requires
      approval.

2.  Configuration & UI:
    - systemSettings: For organization-specific configurations.
    - dashboardWidgets: To a

======

# TODO: Standardize Dashboard Page Creation Guidelines

## Context

The dashboard uses Next.js route groups `(dashboard)` to share a common layout across all dashboard pages. However, there are currently no standardized guidelines for ensuring new pages include:

1. **Proper breadcrumb navigation** - Currently hardcoded in layout
2. **Loading states with skeleton components** - No loading.tsx files exist
3. **Consistent page structure** - Need clear examples and patterns

This task sequence will establish comprehensive, documented guidelines that ensure every new dashboard page meets these requirements automatically.

## Related PRD Sections

- Section 3.2: Core Modules - Multiple modules need consistent navigation
- Section 7: User Interface Concepts - Dashboard views require proper UX patterns
- Section 10.1: Role-Based Access Control - Different roles access different pages

## Current State Analysis

**Existing Structure:**

- Route group: `/app/(dashboard)/` ✓
- Shared layout with sidebar: ✓
- Breadcrumb component: ✓ (but hardcoded)
- Loading states: ✗ (none implemented)
- Documentation: Partial (README exists but incomplete)

**Current Issues:**

1. Breadcrumb shows static placeholder text ("Building Your Application" / "Data Fetching")
2. No loading.tsx files for Suspense boundaries
3. No skeleton component usage examples
4. Documentation doesn't cover breadcrumbs or loading states

---

## Task Sequence

### 0. Project Structure Analysis (ALWAYS FIRST)

**Objective**: Understand the current dashboard structure and identify where to document standardized patterns

#### Sub-tasks:

- [x] 0.1: Review `/app/(dashboard)/README.md` for existing documentation patterns
  - Validation: Current README covers basic page creation but lacks breadcrumb and loading state guidance
  - Output: README needs enhancement with breadcrumb and skeleton examples

- [x] 0.2: Review existing dashboard pages for current patterns
  - Validation: Examined `/app/(dashboard)/dashboard/page.tsx` and `/app/(dashboard)/processes/page.tsx`
  - Output: Pages use consistent wrapper div structure but no loading states or dynamic breadcrumbs

- [x] 0.3: Check `/CLAUDE.md` for existing development guidelines
  - Validation: CLAUDE.md has basic dashboard page creation guide
  - Output: Need to enhance with breadcrumb and loading state requirements

- [x] 0.4: Identify existing UI components available
  - Validation: Found Skeleton component at `/components/ui/skeleton.tsx`
  - Output: Breadcrumb components exist and are used in layout; Skeleton is available but unused

#### Quality Checklist:

- [x] PRD structure reviewed and understood
- [x] Current dashboard structure documented
- [x] Existing patterns identified
- [x] UI components inventory completed
- [x] Documentation gaps identified

---

### 1. Create Dynamic Breadcrumb System

**Objective**: Replace hardcoded breadcrumbs with dynamic, route-based navigation

#### Sub-tasks:

- [ ] 1.1: Create breadcrumb utility function
  - Validation: Function generates breadcrumb items from current pathname
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/lib/breadcrumbs.ts`
  - Dependencies: None
  - Implementation:

    ```typescript
    import { BreadcrumbItem } from "@/components/ui/breadcrumb";

    export interface BreadcrumbConfig {
      label: string;
      href?: string;
    }

    // Route-to-label mapping for dashboard pages
    const routeLabels: Record<string, string> = {
      dashboard: "Dashboard",
      processes: "Processes",
      companies: "Companies",
      people: "People",
      documents: "Documents",
      tasks: "Tasks",
      settings: "Settings",
    };

    /**
     * Generates breadcrumb items from the current pathname
     * @param pathname - Current URL pathname (e.g., '/dashboard/processes')
     * @returns Array of breadcrumb items
     */
    export function getBreadcrumbs(pathname: string): BreadcrumbConfig[] {
      const paths = pathname.split("/").filter(Boolean);
      const breadcrumbs: BreadcrumbConfig[] = [];

      paths.forEach((path, index) => {
        const label =
          routeLabels[path] || path.charAt(0).toUpperCase() + path.slice(1);
        const href =
          index < paths.length - 1
            ? `/${paths.slice(0, index + 1).join("/")}`
            : undefined;

        breadcrumbs.push({ label, href });
      });

      return breadcrumbs;
    }
    ```

- [ ] 1.2: Update dashboard layout to use dynamic breadcrumbs
  - Validation: Breadcrumbs update automatically based on current route
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/app/(dashboard)/layout.tsx`
  - Dependencies: Task 1.1 completed
  - Implementation changes:
    1. Import `usePathname` from 'next/navigation'
    2. Import breadcrumb utility function
    3. Replace hardcoded breadcrumb items with dynamic generation
    4. Handle edge cases (home, single-level routes, multi-level routes)

- [ ] 1.3: Add breadcrumb override system for custom labels
  - Validation: Pages can optionally override default breadcrumb labels
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/lib/breadcrumbs.ts`
  - Dependencies: Task 1.1 completed
  - Implementation:
    - Add route metadata support
    - Allow pages to export breadcrumb config
    - Document override pattern in guidelines

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Function handles all edge cases (root, single-level, multi-level routes)
- [ ] Clean code principles followed
- [ ] Works with existing Breadcrumb UI components
- [ ] Tested with multiple routes
- [ ] Error handling implemented

---

### 2. Create Standard Loading State Patterns

**Objective**: Establish reusable loading skeletons for dashboard pages

#### Sub-tasks:

- [ ] 2.1: Create reusable skeleton components for common layouts
  - Validation: Skeleton components match actual page structures
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/components/dashboard/skeletons.tsx`
  - Dependencies: None
  - Implementation:

    ```typescript
    import { Skeleton } from '@/components/ui/skeleton'

    /**
     * Standard page header skeleton
     * Used for pages with title + action buttons
     */
    export function PageHeaderSkeleton() {
      return (
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
      )
    }

    /**
     * Card grid skeleton
     * Used for dashboard-style card layouts
     */
    export function CardGridSkeleton({ columns = 3 }: { columns?: number }) {
      return (
        <div className={`grid auto-rows-min gap-4 md:grid-cols-${columns}`}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      )
    }

    /**
     * Table skeleton
     * Used for list/table pages
     */
    export function TableSkeleton({ rows = 5 }: { rows?: number }) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" /> {/* Header */}
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )
    }

    /**
     * Full dashboard loading skeleton
     * Default loading state for dashboard pages
     */
    export function DashboardPageSkeleton() {
      return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <PageHeaderSkeleton />
          <CardGridSkeleton columns={3} />
          <Skeleton className="min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
        </div>
      )
    }
    ```

- [ ] 2.2: Create loading.tsx for dashboard home
  - Validation: Loading state displays while dashboard page loads
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/app/(dashboard)/dashboard/loading.tsx`
  - Dependencies: Task 2.1 completed
  - Implementation:

    ```typescript
    import { DashboardPageSkeleton } from '@/components/dashboard/skeletons'

    export default function DashboardLoading() {
      return <DashboardPageSkeleton />
    }
    ```

- [ ] 2.3: Create loading.tsx for processes page
  - Validation: Loading state displays while processes page loads
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/app/(dashboard)/processes/loading.tsx`
  - Dependencies: Task 2.1 completed
  - Implementation:

    ```typescript
    import { PageHeaderSkeleton, TableSkeleton } from '@/components/dashboard/skeletons'

    export default function ProcessesLoading() {
      return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <PageHeaderSkeleton />
          <div className="bg-muted/50 min-h-[50vh] flex-1 rounded-xl p-4">
            <TableSkeleton rows={5} />
          </div>
        </div>
      )
    }
    ```

#### Quality Checklist:

- [ ] TypeScript types defined (no `any`)
- [ ] Skeleton components are reusable
- [ ] Loading states match actual page layouts
- [ ] Responsive design maintained
- [ ] Accessibility considered (ARIA labels if needed)
- [ ] Clean code principles followed

---

### 3. Update Dashboard Documentation

**Objective**: Create comprehensive, easily discoverable guidelines for dashboard page creation

#### Sub-tasks:

- [ ] 3.1: Update `/app/(dashboard)/README.md` with complete guidelines
  - Validation: README covers location, breadcrumbs, and loading states
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/app/(dashboard)/README.md`
  - Dependencies: Tasks 1.2, 2.1, 2.2, 2.3 completed
  - New sections to add:
    1. **Breadcrumb Configuration** - How breadcrumbs work and how to customize
    2. **Loading States** - How to create loading.tsx with skeleton examples
    3. **Complete Page Structure Example** - Full example with all requirements
    4. **Available Skeleton Components** - Reference to reusable skeletons
    5. **Best Practices** - Common patterns and anti-patterns

- [ ] 3.2: Create comprehensive page creation template
  - Validation: Template includes all required elements
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/app/(dashboard)/README.md` (add to existing)
  - Dependencies: Task 3.1 completed
  - Template content:

    ````markdown
    ## Complete Page Creation Template

    ### 1. Create the page directory

    ```bash
    mkdir -p app/(dashboard)/your-module
    ```
    ````

    ### 2. Create page.tsx with proper structure

    ```tsx
    // app/(dashboard)/your-module/page.tsx
    export default function YourModulePage() {
      return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Your Module</h1>
            {/* Action buttons here */}
          </div>
          <div className="bg-muted/50 min-h-[50vh] flex-1 rounded-xl p-4">
            {/* Page content here */}
          </div>
        </div>
      );
    }
    ```

    ### 3. Create loading.tsx for better UX

    ```tsx
    // app/(dashboard)/your-module/loading.tsx
    import {
      PageHeaderSkeleton,
      TableSkeleton,
    } from "@/components/dashboard/skeletons";

    export default function YourModuleLoading() {
      return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <PageHeaderSkeleton />
          <div className="bg-muted/50 min-h-[50vh] flex-1 rounded-xl p-4">
            <TableSkeleton rows={5} />
          </div>
        </div>
      );
    }
    ```

    ### 4. Add custom breadcrumb label (optional)

    If the default label doesn't fit, add to `/lib/breadcrumbs.ts`:

    ```typescript
    const routeLabels: Record<string, string> = {
      // ... existing labels
      "your-module": "Custom Label",
    };
    ```

    ```

    ```

- [ ] 3.3: Update `/CLAUDE.md` with new development guidelines
  - Validation: CLAUDE.md references the complete dashboard creation process
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/CLAUDE.md`
  - Dependencies: Tasks 3.1 and 3.2 completed
  - Updates to make:
    1. Enhance "Adding New Dashboard Pages" section
    2. Add reference to breadcrumb system
    3. Add reference to loading states
    4. Link to complete README for details

- [ ] 3.4: Create dashboard development checklist
  - Validation: Quick reference checklist for new page creation
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/app/(dashboard)/README.md` (add to existing)
  - Dependencies: Task 3.3 completed
  - Checklist content:

    ```markdown
    ## Dashboard Page Creation Checklist

    When creating a new dashboard page, ensure:

    - [ ] **Location**: Page created in `/app/(dashboard)/your-module/page.tsx`
    - [ ] **Page Structure**: Uses standard wrapper div with `flex flex-1 flex-col gap-4 p-4 pt-0`
    - [ ] **Breadcrumb**: Route added to `routeLabels` in `/lib/breadcrumbs.ts` if custom label needed
    - [ ] **Loading State**: `loading.tsx` file created with appropriate skeleton
    - [ ] **TypeScript**: All types defined, no `any` types
    - [ ] **Responsive**: Layout works on mobile and desktop
    - [ ] **Accessibility**: Semantic HTML and ARIA labels where needed
    - [ ] **Error Handling**: Consider error.tsx for error boundaries
    - [ ] **Testing**: Manually test navigation, loading, and rendering
    ```

#### Quality Checklist:

- [ ] Documentation is comprehensive and clear
- [ ] Examples are copy-paste ready
- [ ] All edge cases covered
- [ ] Links between documents work
- [ ] Code samples follow project conventions
- [ ] Future developers can follow guidelines easily

---

### 4. Create Example Implementation

**Objective**: Provide a complete reference implementation of all guidelines

#### Sub-tasks:

- [ ] 4.1: Create a fully-featured example page
  - Validation: Example demonstrates all required patterns
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/app/(dashboard)/example/page.tsx`
  - Dependencies: All previous tasks completed
  - Implementation: Create an "Example Module" page that:
    1. Uses proper page structure
    2. Has custom breadcrumb label
    3. Includes loading state
    4. Shows common patterns (header, content area, actions)
    5. Has inline comments explaining each part

- [ ] 4.2: Add example to documentation
  - Validation: Documentation references the example page
  - File Path: `/Users/elberrd/Documents/Development/clientes/casys3/app/(dashboard)/README.md`
  - Dependencies: Task 4.1 completed
  - Add section:

    ```markdown
    ## Reference Implementation

    See `/app/(dashboard)/example/` for a complete reference implementation that demonstrates:

    - Proper page structure
    - Custom breadcrumb configuration
    - Loading state with skeleton
    - Common UI patterns
    - TypeScript best practices

    Use this as a template for new pages.
    ```

#### Quality Checklist:

- [ ] Example page is complete and functional
- [ ] All patterns are demonstrated
- [ ] Code is well-commented
- [ ] Example is referenced in documentation
- [ ] TypeScript types defined (no `any`)

---

### 5. Testing and Validation

**Objective**: Ensure all components work together correctly

#### Sub-tasks:

- [ ] 5.1: Test dynamic breadcrumb system
  - Validation: Breadcrumbs update correctly for all routes
  - Dependencies: Task 1.2 completed
  - Routes to test:
    - `/dashboard` - Should show "Dashboard"
    - `/processes` - Should show "Processes"
    - `/example` - Should show custom label if set
    - Multi-level routes (if any exist)

- [ ] 5.2: Test loading states
  - Validation: Loading skeletons appear before page content
  - Dependencies: Tasks 2.2 and 2.3 completed
  - Test steps:
    1. Add artificial delay to page components (for testing)
    2. Navigate to each page
    3. Verify skeleton appears first
    4. Verify smooth transition to actual content
    5. Remove artificial delays

- [ ] 5.3: Test responsive behavior
  - Validation: All pages work on mobile and desktop
  - Dependencies: All previous tasks completed
  - Viewports to test:
    - Mobile (375px)
    - Tablet (768px)
    - Desktop (1024px+)
    - Test breadcrumb visibility at different sizes

- [ ] 5.4: Run TypeScript type checking
  - Validation: No TypeScript errors
  - Dependencies: All code tasks completed
  - Command: `pnpm exec tsc --noEmit`

- [ ] 5.5: Test production build
  - Validation: Build succeeds with no warnings
  - Dependencies: All previous tasks completed
  - Commands:
    ```bash
    pnpm run build
    ```

#### Quality Checklist:

- [ ] All routes tested and working
- [ ] Breadcrumbs update correctly
- [ ] Loading states work properly
- [ ] Responsive design verified
- [ ] No TypeScript errors
- [ ] Production build succeeds
- [ ] No console errors or warnings

---

## Implementation Notes

### Breadcrumb System Architecture

The breadcrumb system uses Next.js's `usePathname` hook to dynamically generate breadcrumb items based on the current route. This provides:

1. **Automatic updates** - No manual breadcrumb configuration per page
2. **Consistent navigation** - Same pattern across all pages
3. **Customizable labels** - Override default labels in central config
4. **Type-safe** - Full TypeScript support

### Loading State Best Practices

1. **Match page structure** - Skeleton should mirror actual content layout
2. **Reuse components** - Use shared skeletons for consistency
3. **Appropriate detail** - Don't over-skeleton; focus on major layout elements
4. **Smooth transitions** - Ensure skeleton and content have similar dimensions

### Route Group Benefits Reinforced

With these enhancements, the route group pattern provides:

1. **Zero boilerplate** - Breadcrumbs and sidebar automatic
2. **Consistent UX** - Loading states and navigation work the same everywhere
3. **Easy scaling** - Add new pages with minimal code
4. **Type safety** - TypeScript catches errors at compile time
5. **Performance** - Suspense boundaries enable granular loading

### Future Enhancements

Once guidelines are in place, consider:

- Role-based breadcrumb filtering (hide routes based on permissions)
- Nested layouts for module-specific sidebars
- Page-level error boundaries with custom error.tsx files
- Animated transitions between loading and loaded states
- Breadcrumb metadata for SEO

---

## Definition of Done

- [ ] Dynamic breadcrumb system implemented and working
  - [ ] Breadcrumb utility function created
  - [ ] Layout updated to use dynamic breadcrumbs
  - [ ] Override system for custom labels implemented

- [ ] Loading state patterns established
  - [ ] Reusable skeleton components created
  - [ ] loading.tsx files created for existing pages
  - [ ] Skeleton patterns documented

- [ ] Documentation comprehensive and accessible
  - [ ] `/app/(dashboard)/README.md` fully updated
  - [ ] `/CLAUDE.md` references new guidelines
  - [ ] Complete page creation template provided
  - [ ] Development checklist created

- [ ] Example implementation complete
  - [ ] Reference example page created
  - [ ] Example demonstrates all patterns
  - [ ] Example referenced in docs

- [ ] All tests passing
  - [ ] Breadcrumbs tested on all routes
  - [ ] Loading states verified
  - [ ] Responsive design confirmed
  - [ ] TypeScript type checking passes
  - [ ] Production build succeeds
  - [ ] No console errors

- [ ] Quality gates met
  - [ ] No `any` types used
  - [ ] Clean code principles followed
  - [ ] Accessibility considered
  - [ ] Documentation is clear and complete
  - [ ] Future developers can easily follow guidelines
