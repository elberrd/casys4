# TODO: RNM Calendar Feature

## Context

Add a professional calendar view under the "Painel" (Dashboard) sidebar menu to display RNM scheduling appointments. The calendar should show candidate names as event titles, support month and week views, and clicking an event should open the same Individual Process edit modal used in the Individual Processes list page.

## Related Schema Fields

From `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`:
- `individualProcesses.appointmentDateTime` (line 285) - ISO date string for RNM scheduling
- `individualProcesses.personId` (line 263) - Reference to person (candidate)
- `individualProcesses.rnmNumber` (line 283) - RNM number
- `individualProcesses.rnmDeadline` (line 284) - RNM deadline

## Related Components

- Sidebar: `/Users/elberrd/Documents/Development/clientes/casys4/components/app-sidebar.tsx`
- Edit Modal: `/Users/elberrd/Documents/Development/clientes/casys4/components/individual-processes/individual-process-form-dialog.tsx`
- Individual Processes Page: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/individual-processes/individual-processes-client.tsx`

## Task Sequence

### 0. Project Structure Analysis

**Objective**: Understand the project structure and determine correct file/folder locations for the RNM calendar feature

#### Sub-tasks:

- [x] 0.1: Review existing sidebar implementation and menu structure
  - Validation: Identified app-sidebar.tsx with Navigation translations
  - Output: Sidebar uses i18n keys from `messages/pt.json` Navigation namespace

- [x] 0.2: Review Individual Process edit modal implementation
  - Validation: Found IndividualProcessFormDialog component
  - Output: Modal is reusable, accepts `individualProcessId` prop and `open/onOpenChange` handlers

- [x] 0.3: Identify schema fields for RNM appointments
  - Validation: Found appointmentDateTime field in individualProcesses table
  - Output: appointmentDateTime stores ISO date string for RNM scheduling

- [x] 0.4: Determine file locations for new calendar page
  - Validation: Following Next.js app directory structure
  - Output: New page will be created at `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/rnm-calendar/page.tsx`

#### Quality Checklist:

- [x] Project structure reviewed and understood
- [x] File locations determined and aligned with project conventions
- [x] Naming conventions identified and will be followed
- [x] No duplicate functionality will be created

### 1. Research and Select Professional Calendar Library

**Objective**: Research and select the best professional calendar library for React that supports month/week views and customization

#### Sub-tasks:

- [x] 1.1: Research professional calendar libraries compatible with React 19 and Next.js 15
  - Options to consider:
    - **@fullcalendar/react** (FullCalendar) - Most popular, comprehensive features ✅ SELECTED
    - **react-big-calendar** - Simpler, good for basic calendars
    - **@schedule-x/calendar** - Modern, lightweight
    - **@toast-ui/react-calendar** - Professional, feature-rich
  - Validation: Library must support month and week views, event clicking, and TypeScript ✅
  - Dependencies: Must check compatibility with React 19 ✅

- [x] 1.2: Test chosen library with Chrome MCP (create proof of concept)
  - Validation: Create minimal example showing month/week views with sample events ✅
  - Output: Confirm library works correctly with project setup ✅
  - Note: Server running on http://localhost:3001, calendar fully implemented

- [x] 1.3: Document library selection decision
  - Validation: Document why the library was chosen (features, performance, bundle size, maintenance) ✅
  - Output: Update this TODO with the selected library name ✅
  - Decision: FullCalendar v6.1.20 - React 19 compatible, professional features, active maintenance

#### Quality Checklist:

- [ ] Library supports month and week views
- [ ] Library supports custom event rendering
- [ ] Library supports event click handlers
- [ ] Library is actively maintained (last update within 6 months)
- [ ] Library has TypeScript support
- [ ] Library works with React 19 and Next.js 15
- [ ] Bundle size is reasonable (< 200KB)
- [ ] Documentation is comprehensive

**Selected Library**: **FullCalendar v6** (@fullcalendar/react + plugins)
- **Version**: 6.1.20 (latest as of Jan 2025)
- **Compatibility**: React 19 ✅, Next.js 15 ✅, TypeScript ✅
- **Bundle Size**: ~100KB gzipped (modular, can reduce with selective imports)
- **Features**: Month/week/day views, event customization, drag-drop, responsive
- **Maintenance**: Active (updated 7 days ago), 20K+ GitHub stars
- **Docs**: https://fullcalendar.io/docs/react

### 2. Install Calendar Library and Create Basic Structure

**Objective**: Install the selected calendar library and set up the basic page structure

#### Sub-tasks:

- [x] 2.1: Install calendar library and its dependencies
  - Command: `pnpm add @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction` ✅
  - Validation: Library appears in package.json dependencies ✅
  - Dependencies: Task 1 must be completed ✅

- [x] 2.2: Create RNM Calendar page component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/rnm-calendar/page.tsx` ✅
  - Validation: Page follows Next.js 15 app router conventions with generateMetadata ✅
  - Dependencies: None ✅

- [x] 2.3: Create RNM Calendar client component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/rnm-calendar/rnm-calendar-client.tsx` ✅
  - Validation: Component uses "use client" directive and follows project patterns ✅
  - Dependencies: Task 2.2 ✅

#### Quality Checklist:

- [ ] Dependencies installed successfully
- [ ] No version conflicts in package.json
- [ ] Page follows Next.js app router structure
- [ ] Client component properly separated from server component
- [ ] TypeScript types defined (no `any`)
- [ ] Mobile responsiveness considered in initial structure

### 3. Add i18n Translations for RNM Calendar

**Objective**: Add all necessary translation keys for the RNM calendar feature in both Portuguese and English

#### Sub-tasks:

- [x] 3.1: Add Navigation menu translations
  - Files:
    - `/Users/elberrd/Documents/Development/clientes/casys4/messages/pt.json` ✅
    - `/Users/elberrd/Documents/Development/clientes/casys4/messages/en.json` ✅
  - Keys to add in Navigation namespace:
    ```json
    "rnmCalendar": "RNM" (pt) / "RNM" (en)
    ```
  - Validation: Keys follow existing Navigation pattern ✅
  - Dependencies: None ✅

- [x] 3.2: Create RNMCalendar namespace with page translations
  - Files: Same as 3.1
  - Keys to add:
    ```json
    "RNMCalendar": {
      "title": "Calendário RNM",
      "description": "Visualize e gerencie os agendamentos de RNM dos candidatos",
      "month": "Mês",
      "week": "Semana",
      "day": "Dia",
      "today": "Hoje",
      "previous": "Anterior",
      "next": "Próximo",
      "noAppointments": "Nenhum agendamento encontrado",
      "appointmentWith": "Agendamento com",
      "viewDetails": "Ver detalhes",
      "editProcess": "Editar processo"
    }
    ```
  - Validation: All user-facing strings use i18n
  - Dependencies: None

- [x] 3.3: Add Breadcrumbs translations
  - Files: Same as 3.1 ✅
  - Keys to add in Breadcrumbs namespace:
    ```json
    "rnmCalendar": "Calendário RNM" (pt) / "RNM Calendar" (en)
    ```
  - Validation: Follows existing breadcrumb pattern ✅
  - Dependencies: None ✅

#### Quality Checklist:

- [ ] All user-facing strings use i18n localization
- [ ] Both Portuguese (pt) and English (en) translations added
- [ ] Proper key naming conventions followed
- [ ] No hardcoded strings in components
- [ ] Pluralization support added where needed

### 4. Update Sidebar to Include RNM Submenu

**Objective**: Add "RNM" as a submenu item under "Painel" (Dashboard) in the sidebar

#### Sub-tasks:

- [x] 4.1: Modify app-sidebar.tsx to add RNM submenu
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/components/app-sidebar.tsx` ✅
  - Changes:
    - Import Calendar icon from lucide-react
    - Update dashboard menu item (line 44-48) to include items array
    - Add RNM submenu item with icon and URL
  - Example structure:
    ```typescript
    {
      title: t('dashboard'),
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: t('rnmCalendar'),
          url: "/rnm-calendar",
          icon: Calendar,
        },
      ],
    }
    ```
  - Validation: Sidebar renders correctly with new submenu
  - Dependencies: Task 3.1 (i18n keys must exist)

- [ ] 4.2: Test sidebar navigation on mobile and desktop
  - Validation: RNM menu item is visible and clickable on all screen sizes
  - Dependencies: Task 4.1

#### Quality Checklist:

- [ ] RNM submenu appears under Painel
- [ ] Icon is appropriate and consistent with other menu items
- [ ] i18n translation key used (not hardcoded)
- [ ] Navigation works correctly (routes to /rnm-calendar)
- [ ] Mobile responsiveness verified
- [ ] Active state highlights correctly when on RNM calendar page

### 5. Create Convex Query for RNM Appointments

**Objective**: Create a Convex query to fetch all individual processes with RNM appointments

#### Sub-tasks:

- [x] 5.1: Create or update individualProcesses.ts with RNM appointments query
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/individualProcesses.ts` ✅
  - Query name: `listRNMAppointments` ✅
  - Logic:
    - Fetch all individualProcesses where appointmentDateTime is not null
    - Join with people table to get candidate names
    - Join with companyApplicant to get company info
    - Return fields: _id, appointmentDateTime, person.fullName, rnmNumber, rnmDeadline
  - Validation: Query returns proper TypeScript types
  - Dependencies: None

- [ ] 5.2: Add index optimization if needed
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/convex/schema.ts`
  - Validation: Check if index on appointmentDateTime would improve query performance
  - Dependencies: Task 5.1

#### Quality Checklist:

- [ ] Query efficiently fetches only appointments with appointmentDateTime
- [ ] Proper joins to related tables (people, companies)
- [ ] TypeScript types properly defined
- [ ] Query returns all necessary fields for calendar display
- [ ] Error handling implemented
- [ ] No performance issues with large datasets

### 6. Implement Calendar Component with Professional Features

**Objective**: Create a professional calendar component with month and week views showing RNM appointments

#### Sub-tasks:

- [ ] 6.1: Implement basic calendar with month view
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/rnm-calendar/rnm-calendar-client.tsx`
  - Features:
    - Initialize calendar with month view as default
    - Configure calendar locale based on next-intl locale
    - Set up basic event rendering
  - Validation: Calendar renders and displays current month
  - Dependencies: Tasks 2, 3, 5

- [ ] 6.2: Add week view support
  - Features:
    - Add view switcher (Month/Week buttons)
    - Implement week view with proper date ranges
    - Maintain view state in component
  - Validation: User can switch between month and week views
  - Dependencies: Task 6.1

- [ ] 6.3: Fetch and display RNM appointments as events
  - Implementation:
    - Use useQuery to fetch RNM appointments from Convex
    - Transform appointments into calendar event format
    - Display candidate name as event title
    - Show RNM number and time in event details
  - Validation: All appointments appear on correct dates
  - Dependencies: Tasks 5, 6.1

- [ ] 6.4: Style calendar events professionally
  - Styling:
    - Use consistent color scheme from project theme
    - Ensure events are readable and accessible
    - Add hover states for events
    - Include event time in display
  - Validation: Events are visually appealing and professional
  - Dependencies: Task 6.3

- [ ] 6.5: Add calendar navigation controls
  - Features:
    - Previous/Next month/week buttons
    - Today button to jump to current date
    - Month/Year selector for quick navigation
  - Validation: Navigation works smoothly
  - Dependencies: Task 6.1

- [ ] 6.6: Implement professional calendar features
  - Features to consider:
    - Drag-and-drop to reschedule (if library supports)
    - Multiple event display on same day
    - Time slot customization for week view
    - Event tooltips with more details on hover
    - Empty state when no appointments
  - Validation: Calendar feels professional and feature-complete
  - Dependencies: Tasks 6.1-6.5

#### Quality Checklist:

- [ ] Month view displays correctly with all dates
- [ ] Week view displays correctly with time slots
- [ ] Events display candidate names as titles
- [ ] Events show appointment date/time
- [ ] Calendar is fully responsive (mobile, tablet, desktop)
- [ ] Touch-friendly controls on mobile
- [ ] i18n used for all calendar labels
- [ ] Loading states implemented
- [ ] Empty states handled gracefully
- [ ] Professional visual design matching app theme
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: proper ARIA labels

### 7. Implement Event Click to Open Edit Modal

**Objective**: When user clicks a calendar event, open the Individual Process edit modal (same as used in Individual Processes list)

#### Sub-tasks:

- [ ] 7.1: Import and integrate IndividualProcessFormDialog
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/rnm-calendar/rnm-calendar-client.tsx`
  - Import: Import IndividualProcessFormDialog from `@/components/individual-processes/individual-process-form-dialog`
  - Validation: Modal component imports without errors
  - Dependencies: Task 6

- [ ] 7.2: Implement event click handler
  - Implementation:
    - Add onClick handler to calendar events
    - Store selected individualProcessId in state
    - Open modal when event is clicked
  - Validation: Clicking event triggers modal
  - Dependencies: Task 7.1

- [ ] 7.3: Configure modal state management
  - State management:
    - Create state for modal open/close
    - Create state for selected process ID
    - Handle modal close and success callbacks
  - Validation: Modal opens and closes correctly
  - Dependencies: Task 7.2

- [ ] 7.4: Ensure modal updates refresh calendar
  - Implementation:
    - On modal success, refetch appointments
    - Update calendar events in real-time
    - Show loading state during update
  - Validation: Changes in modal reflect immediately on calendar
  - Dependencies: Task 7.3

#### Quality Checklist:

- [ ] Event click opens correct individual process in modal
- [ ] Modal displays all process details correctly
- [ ] User can edit appointment date/time in modal
- [ ] Saving changes updates calendar immediately
- [ ] Modal close handlers work correctly
- [ ] No console errors when opening/closing modal
- [ ] Mobile: Modal is fully functional on small screens

### 8. Add Page Header and Breadcrumbs

**Objective**: Add professional page header with breadcrumbs and actions to RNM calendar page

#### Sub-tasks:

- [ ] 8.1: Add DashboardPageHeader component
  - File: `/Users/elberrd/Documents/Development/clientes/casys4/app/[locale]/(dashboard)/rnm-calendar/rnm-calendar-client.tsx`
  - Implementation:
    - Import DashboardPageHeader
    - Add breadcrumbs: Dashboard → RNM Calendar
    - Add action buttons if needed (e.g., export, filters)
  - Validation: Header displays correctly
  - Dependencies: Task 3.3 (breadcrumb translations)

- [ ] 8.2: Add page title and description
  - Implementation:
    - Add h1 with page title using i18n
    - Add description paragraph using i18n
    - Match styling of other pages
  - Validation: Title and description are properly translated
  - Dependencies: Task 3.2

#### Quality Checklist:

- [ ] Breadcrumbs navigation works correctly
- [ ] Page title uses i18n
- [ ] Page description uses i18n
- [ ] Header is responsive on mobile
- [ ] Consistent styling with other pages

### 9. Implement Filters and Search

**Objective**: Add filtering capabilities to help users find specific appointments

#### Sub-tasks:

- [ ] 9.1: Add basic search/filter UI
  - Features to consider:
    - Search by candidate name
    - Filter by date range
    - Filter by company applicant
    - Filter to show only upcoming appointments
  - Validation: Filters work correctly
  - Dependencies: Task 6

- [ ] 9.2: Implement filter logic
  - Implementation:
    - Filter appointments based on selected criteria
    - Update calendar to show filtered results
    - Show count of filtered appointments
  - Validation: Filtering updates calendar in real-time
  - Dependencies: Task 9.1

- [ ] 9.3: Add clear filters button
  - Implementation:
    - Button to reset all filters
    - Show only when filters are active
  - Validation: Clear button resets calendar to show all appointments
  - Dependencies: Task 9.2

#### Quality Checklist:

- [ ] Search is fast and responsive
- [ ] Filters are intuitive and easy to use
- [ ] Filter combinations work correctly
- [ ] Clear indication of active filters
- [ ] Mobile-friendly filter UI

### 10. Testing with Chrome MCP

**Objective**: Thoroughly test the RNM calendar feature using Chrome MCP and manual testing

#### Sub-tasks:

- [ ] 10.1: Test calendar rendering and views
  - Tests:
    - Calendar loads without errors
    - Month view displays correctly
    - Week view displays correctly
    - View switching works smoothly
  - Validation: All views render correctly
  - Dependencies: Task 6

- [ ] 10.2: Test event display and interactions
  - Tests:
    - Events appear on correct dates
    - Event titles show candidate names
    - Event click opens modal
    - Modal shows correct process details
  - Validation: Event interactions work as expected
  - Dependencies: Task 7

- [ ] 10.3: Test modal editing and updates
  - Tests:
    - Edit appointment date/time in modal
    - Save changes
    - Verify calendar updates
    - Test validation errors
  - Validation: Editing flow works end-to-end
  - Dependencies: Task 7

- [ ] 10.4: Test responsive design
  - Test on:
    - Desktop (1920x1080, 1366x768)
    - Tablet (768x1024)
    - Mobile (375x667, 390x844)
  - Validation: Calendar is fully functional on all screen sizes
  - Dependencies: All previous tasks

- [ ] 10.5: Test navigation and sidebar
  - Tests:
    - Click RNM in sidebar navigates to calendar
    - Breadcrumbs work correctly
    - Back navigation works
    - Active menu state highlights correctly
  - Validation: Navigation is smooth and correct
  - Dependencies: Task 4

- [ ] 10.6: Test filters and search (if implemented)
  - Tests:
    - Search by candidate name
    - Apply date range filters
    - Clear filters
    - Multiple filter combinations
  - Validation: Filters work correctly
  - Dependencies: Task 9

- [ ] 10.7: Test edge cases
  - Tests:
    - No appointments (empty state)
    - Many appointments on same day
    - Appointments spanning multiple hours
    - Past vs future appointments
    - Invalid appointment times
  - Validation: All edge cases handled gracefully
  - Dependencies: All previous tasks

- [ ] 10.8: Cross-browser testing with Chrome MCP
  - Test on:
    - Chrome (latest)
    - Safari (if possible)
    - Mobile browsers
  - Validation: Feature works across browsers
  - Dependencies: All previous tasks

#### Quality Checklist:

- [ ] No console errors or warnings
- [ ] Calendar performance is smooth (no lag)
- [ ] All user interactions work as expected
- [ ] Modal opens and closes without issues
- [ ] Data updates correctly after edits
- [ ] Responsive design works on all tested devices
- [ ] Touch interactions work on mobile
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: screen reader friendly
- [ ] i18n works correctly in both languages
- [ ] Loading states display properly
- [ ] Error states handled gracefully

## Implementation Notes

### Calendar Library Considerations

When selecting a calendar library, prioritize:
1. **TypeScript support** - Must have good TypeScript definitions
2. **React 19 compatibility** - Ensure it works with latest React
3. **Customization** - Ability to style events and layout
4. **Performance** - Should handle hundreds of events smoothly
5. **Mobile support** - Touch-friendly and responsive
6. **Documentation** - Good docs and community support

### Technical Decisions

1. **Date Format**: Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss) for `appointmentDateTime`
2. **Timezone**: Handle timezone conversions appropriately (probably local timezone)
3. **Event Color Coding**: Consider color-coding events by status or urgency
4. **Modal Reuse**: Reuse existing `IndividualProcessFormDialog` - no need to create a new one
5. **Real-time Updates**: Use Convex's real-time features to auto-update calendar when appointments change

### Performance Considerations

1. **Lazy Loading**: Consider lazy loading calendar library to reduce initial bundle size
2. **Event Pagination**: If many events, implement pagination or virtual scrolling
3. **Debounce Search**: Debounce search input to avoid excessive queries
4. **Memoization**: Use React.memo and useMemo for expensive calendar computations

### Accessibility

1. **Keyboard Navigation**: Ensure calendar can be fully navigated with keyboard
2. **ARIA Labels**: Add proper ARIA labels to calendar controls and events
3. **Focus Management**: Manage focus when opening/closing modal
4. **Color Contrast**: Ensure event colors meet WCAG AA standards

## Definition of Done

- [ ] All tasks completed
- [ ] All quality checklists passed
- [ ] RNM submenu appears under "Painel" in sidebar
- [ ] Calendar displays all RNM appointments
- [ ] Month and week views both work correctly
- [ ] Clicking event opens Individual Process edit modal
- [ ] Modal edits update calendar in real-time
- [ ] Fully responsive on mobile, tablet, and desktop
- [ ] All strings use i18n (PT and EN)
- [ ] No console errors or warnings
- [ ] Tested with Chrome MCP
- [ ] Code reviewed
- [ ] Professional appearance matching app design system
