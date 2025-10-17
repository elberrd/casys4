# ReUI Documentation

ReUI is an open-source collection of UI components and animated effects built with React, TypeScript, Tailwind CSS, and Motion. It pairs beautifully with shadcn/ui and provides copy-and-paste components for rapid app development.

**Official Website:** https://reui.io

---

## Installation

### Prerequisites

Before installing ReUI, ensure your project meets these requirements:

- **React**: Version 19 or higher
- **TypeScript**: Version 5.7 or higher
- **Tailwind CSS**: Version 4 or higher
- **Radix UI**: Version 1 or higher
- **Base UI**: Version 1 or higher
- **Motion**: Version 12.19 or higher

### Setup Steps

#### 1. Initialize a React Project

ReUI is fully compatible with Shadcn and extends it with advanced component options. Set up your React project following the [Shadcn Installation Guide](https://ui.shadcn.com/docs/installation).

If you already have a Shadcn-compatible project, skip this step.

#### 2. Install Radix UI

```bash
npm i radix-ui
```

Follow the [Radix UI Installation Guide](https://www.radix-ui.com/primitives/docs/overview/introduction#incremental-adoption) for more details.

#### 3. Install Base UI

```bash
npm i @base-ui-components/react
```

Follow the [Base UI Installation Guide](https://base-ui.com/react/overview/quick-start) for more details.

#### 4. Install Motion

```bash
npm i motion
```

Follow the [Motion Installation Guide](https://motion.dev/) for more details.

#### 5. Integrate ReUI Styles

Add the following code to your entry CSS file (`globals.css`):

```css
@import 'tailwindcss';

@import 'tw-animate-css';

/** Dark Mode Variant **/
@custom-variant dark (&:is(.dark *));

/** Colors **/
:root {
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --background: var(--color-white);
  --foreground: var(--color-zinc-950);
  --card: var(--color-white);
  --card-foreground: var(--color-zinc-950);
  --popover: var(--color-white);
  --popover-foreground: var(--color-zinc-950);
  --primary: var(--color-blue-500);
  --primary-foreground: var(--color-white);
  --secondary: var(--color-zinc-100);
  --secondary-foreground: var(--color-zinc-900);
  --muted: var(--color-zinc-100);
  --muted-foreground: var(--color-zinc-500);
  --accent: var(--color-zinc-100);
  --accent-foreground: var(--color-zinc-900);
  --destructive: var(--color-red-600);
  --destructive-foreground: var(--color-white);
  --chart-1: var(--color-blue-500);
  --chart-2: var(--color-green-500);
  --chart-3: var(--color-yellow-500);
  --chart-4: var(--color-red-500);
  --chart-5: var(--color-purple-500);
  --border: oklch(94% 0.004 286.32);
  --input: var(--color-zinc-200);
  --ring: var(--color-zinc-400);
  --radius: 0.5rem;
}

.dark {
  --background: var(--color-zinc-950);
  --foreground: var(--color-zinc-50);
  --card: var(--color-zinc-950);
  --card-foreground: var(--color-zinc-50);
  --popover: var(--color-zinc-950);
  --popover-foreground: var(--color-zinc-50);
  --primary: var(--color-blue-600);
  --primary-foreground: var(--color-white);
  --secondary: var(--color-zinc-800);
  --secondary-foreground: var(--color-zinc-50);
  --muted: var(--color-zinc-900);
  --muted-foreground: var(--color-zinc-500);
  --accent: var(--color-zinc-900);
  --accent-foreground: var(--color-zinc-50);
  --destructive: var(--color-red-600);
  --destructive-foreground: var(--color-white);
  --chart-1: var(--color-blue-500);
  --chart-2: var(--color-green-500);
  --chart-3: var(--color-yellow-500);
  --chart-4: var(--color-red-500);
  --chart-5: var(--color-purple-500);
  --border: var(--color-zinc-800);
  --input: var(--color-zinc-800);
  --ring: var(--color-zinc-600);
}

/** Theme Setup **/
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);

  --animate-marquee: marquee var(--duration) infinite linear;
  --animate-marquee-vertical: marquee-vertical var(--duration) linear infinite;

  @keyframes marquee {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(calc(-100% - var(--gap)));
    }
  }

  @keyframes marquee-vertical {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(calc(-100% - var(--gap)));
    }
  }
}

/** Global Styles **/
@layer base {
  * {
    @apply border-border;
  }

  *:focus-visible {
    @apply outline-ring rounded-xs shadow-none outline-2 outline-offset-3 transition-none!;
  }
}

/** Custom Scrollbar **/
@layer base {
  ::-webkit-scrollbar {
    width: 5px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--input);
    border-radius: 5px;
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--input) transparent;
  }
}

/** Custom Container **/
@utility container {
  margin-inline: auto;
  padding-inline: 1.5rem;
  @media (width >= --theme(--breakpoint-sm)) {
    max-width: none;
  }
  @media (width >= 1440px) {
    padding-inline: 2rem;
    max-width: 1440px;
  }
}

/** Smooth scroll **/
html {
  scroll-behavior: smooth;
}
```

#### 6. Setup Inter Font (Next.js)

Add the following code to your root layout file (`app/layout.tsx` or `src/app/layout.tsx`):

```tsx
import { Inter } from 'next/font/google';
import { cn } from '@/utils/cn';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html>
      <body className={cn('text-base antialiased', inter.className)}>{children}</body>
    </html>
  );
}
```

#### 7. Setup System Fonts

Add the following code to your style entry file (`globals.css`):

```css
@theme {
  --font-sans:
    'Geist', 'Geist Fallback', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
    'Segoe UI Symbol', 'Noto Color Emoji';
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
```

For a modern and visually appealing design, we recommend using [Inter](https://fonts.google.com/specimen/Inter) as the default font.

#### 8. Add Lucide Icon Library

```bash
npm i lucide
```

#### 9. Add Remix Icon Library (Optional)

```bash
npm i @remixicon/react
```

#### 10. Setup Base UI Portals

Base UI uses portals for components that render popups (Dialog, Popover, etc.). Add the `isolate` Tailwind class to your application layout root:

```tsx
<div className="isolate"></div>
```

#### 11. Add Components

Explore the [ReUI Components](https://reui.io/docs/accordion) and add the ones you need to your project.

---

## Available Components

### Form & Input Components

#### **Accordion**
- **Description:** A collapsible panel that can be expanded or collapsed.
- **URL:** https://reui.io/docs/accordion

#### **Autocomplete** (Base UI)
- **Description:** An input that suggests options as you type. Built on top of Base UI Autocomplete component with shadcn styling.
- **URL:** https://reui.io/docs/base-autocomplete

#### **Button**
- **Description:** Interactive button component with various styles and states.
- **URL:** https://reui.io/docs/button

#### **Calendar**
- **Description:** Customizable calendar system built on top of the react-day-picker library.
- **URL:** https://reui.io/docs/calendar

#### **Checkbox**
- **Description:** A control that allows the user to toggle between checked and not checked.
- **URL:** https://reui.io/docs/checkbox

#### **Combobox**
- **Description:** An input with a list of suggestions that allows users to select from the list or enter a custom value.
- **URL:** https://reui.io/docs/combobox

#### **Command**
- **Description:** Command palette component for keyboard navigation.
- **URL:** https://reui.io/docs/command

#### **Date Picker**
- **Description:** Date selection component with calendar integration.
- **URL:** https://reui.io/docs/date-picker

#### **File Upload**
- **Description:** File upload component with drag-and-drop support.
- **URL:** https://reui.io/docs/file-upload

#### **Form**
- **Description:** Building forms with React Hook Form and Zod schema validation.
- **URL:** https://reui.io/docs/form

#### **Input**
- **Description:** Form input field with support for input groups, number spinners, date/time inputs, and custom styling.
- **URL:** https://reui.io/docs/input

#### **Label**
- **Description:** Form label component for accessibility.
- **URL:** https://reui.io/docs/label

#### **Phone Input** (Base UI)
- **Description:** A number input component with increment/decrement controls and validation. Built on top of Base UI Number Field component.
- **URL:** https://reui.io/docs/base-number-field

#### **Radio Group**
- **Description:** A set of checkable buttons where only one can be checked at a time.
- **URL:** https://reui.io/docs/radio-group

#### **Rating**
- **Description:** Star rating component for user feedback.
- **URL:** https://reui.io/docs/rating

#### **Select**
- **Description:** Dropdown list of options for the user to pick from—triggered by a button.
- **URL:** https://reui.io/docs/select

#### **Slider**
- **Description:** An input where the user selects a value from within a given range.
- **URL:** https://reui.io/docs/slider

#### **Switch**
- **Description:** A control that allows the user to toggle between checked and unchecked states.
- **URL:** https://reui.io/docs/switch

#### **Textarea**
- **Description:** A multi-line text input field with support for custom styling and states.
- **URL:** https://reui.io/docs/textarea

#### **Toggle**
- **Description:** A two-state button that can be either on or off.
- **URL:** https://reui.io/docs/toggle

#### **Toggle Group**
- **Description:** A set of two-state buttons that can be toggled on or off.
- **URL:** https://reui.io/docs/toggle-group

---

### Display Components

#### **Alert**
- **Description:** Displays a callout for user attention, such as a success message, warning, or error.
- **URL:** https://reui.io/docs/alert

#### **Avatar**
- **Description:** Builds on Radix UI Avatar primitives with customization options such as indicators and status.
- **URL:** https://reui.io/docs/avatar

#### **Avatar Group**
- **Description:** Display multiple avatars in a group with overlap styling.
- **URL:** https://reui.io/docs/avatar-group

#### **Badge**
- **Description:** A small, visually distinct element used to display contextual metadata, such as status, category, or notifications.
- **URL:** https://reui.io/docs/badge

#### **Card**
- **Description:** Customizable card system with various sections and styles for content display.
- **URL:** https://reui.io/docs/card

#### **Chart**
- **Description:** Data visualization component for creating charts and graphs.
- **URL:** https://reui.io/docs/chart

#### **Code**
- **Description:** Component used to display inline code with ability to copy the content by a button.
- **URL:** https://reui.io/docs/code

#### **Kbd**
- **Description:** Displays keyboard input or shortcut keys with customizable styles and sizes.
- **URL:** https://reui.io/docs/kbd

#### **Progress**
- **Description:** Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
- **URL:** https://reui.io/docs/progress

#### **Skeleton**
- **Description:** Loading placeholder animation effect.
- **URL:** https://reui.io/docs/skeleton

#### **Table**
- **Description:** A responsive table component with support for headers, footers, and custom styling.
- **URL:** https://reui.io/docs/table

---

### Navigation Components

#### **Breadcrumb**
- **Description:** Navigation component showing the current page's location in the site hierarchy.
- **URL:** https://reui.io/docs/breadcrumb

#### **Navigation Menu**
- **Description:** A collection of links for navigating websites.
- **URL:** https://reui.io/docs/navigation-menu

#### **Pagination**
- **Description:** A responsive pagination component for navigating through multiple pages of content.
- **URL:** https://reui.io/docs/pagination

#### **Scrollspy**
- **Description:** Dynamically highlights navigation to indicate current visible section in viewport during page scroll.
- **URL:** https://reui.io/docs/scrollspy

#### **Stepper**
- **Description:** Step-by-step navigation component for multi-step processes.
- **URL:** https://reui.io/docs/stepper

#### **Tabs**
- **Description:** A set of layered sections of content—known as tab panels—that are displayed one at a time.
- **URL:** https://reui.io/docs/tabs

---

### Overlay Components

#### **Alert Dialog**
- **Description:** A modal dialog that interrupts the user with important content and expects a response.
- **URL:** https://reui.io/docs/alert-dialog

#### **Context Menu**
- **Description:** Right-click context menu component.
- **URL:** https://reui.io/docs/context-menu

#### **Dialog**
- **Description:** A modal dialog that interrupts the user with important content and expects a response.
- **URL:** https://reui.io/docs/dialog

#### **Drawer**
- **Description:** A panel that slides in from the edge of the screen.
- **URL:** https://reui.io/docs/drawer

#### **Dropdown Menu**
- **Description:** Displays a menu to the user — such as a set of actions or functions — triggered by a button.
- **URL:** https://reui.io/docs/dropdown-menu

#### **Hover Card**
- **Description:** Preview card that appears when hovering over an element.
- **URL:** https://reui.io/docs/hover-card

#### **Menubar**
- **Description:** A visually persistent menu common in desktop applications.
- **URL:** https://reui.io/docs/menubar

#### **Popover**
- **Description:** Displays rich and interactive content in a portal, triggered by a button or other interactive element.
- **URL:** https://reui.io/docs/popover

#### **Sheet**
- **Description:** Side panel that slides in from the edge of the screen.
- **URL:** https://reui.io/docs/sheet

#### **Sonner**
- **Description:** Toast notification system.
- **URL:** https://reui.io/docs/sonner

#### **Tooltip**
- **Description:** Displays brief, contextual information when hovering over or focusing on an element.
- **URL:** https://reui.io/docs/tooltip

---

### Layout Components

#### **Collapsible**
- **Description:** Component that can be expanded or collapsed to show/hide content.
- **URL:** https://reui.io/docs/collapsible

#### **Resizable**
- **Description:** Accessible resizable panel groups and layouts with keyboard support.
- **URL:** https://reui.io/docs/resizable

#### **Scroll Area**
- **Description:** Augments native scroll functionality for custom, cross-browser styling.
- **URL:** https://reui.io/docs/scroll-area

#### **Separator**
- **Description:** Visually or semantically separates content into groups.
- **URL:** https://reui.io/docs/separator

---

### Data & Organization Components

#### **Accordion Menu**
- **Description:** Navigation menu with accordion-style collapsible sections.
- **URL:** https://reui.io/docs/accordion-menu

#### **Carousel**
- **Description:** A carousel with motion and swipe built using Embla.
- **URL:** https://reui.io/docs/carousel

#### **Data Grid**
- **Description:** Advanced data table with sorting, filtering, and pagination.
- **URL:** https://reui.io/docs/data-grid

#### **Filters**
- **Description:** A comprehensive filtering system with multiple filter types, operators, and visual indicators for data organization.
- **URL:** https://reui.io/docs/filters

#### **Kanban**
- **Description:** A drag-and-drop kanban component designed for seamless item organization across customizable columns.
- **URL:** https://reui.io/docs/kanban

#### **Sortable**
- **Description:** A drag-and-drop sortable component designed for seamless item organization across customizable columns.
- **URL:** https://reui.io/docs/sortable

#### **Tree**
- **Description:** A customizable tree component for React.
- **URL:** https://reui.io/docs/tree

---

### Animation & Effects Components

#### **Counting Number**
- **Description:** Animated number counter with customizable duration and formatting.
- **URL:** https://reui.io/docs/counting-number

#### **Gradient Background**
- **Description:** Animated gradient background component.
- **URL:** https://reui.io/docs/gradient-background

#### **Grid Background**
- **Description:** Grid pattern background component.
- **URL:** https://reui.io/docs/grid-background

#### **Github Button**
- **Description:** GitHub repository button with star count.
- **URL:** https://reui.io/docs/github-button

#### **Hover Background**
- **Description:** An interactive background component with animated objects that respond to hover interactions and customizable colors.
- **URL:** https://reui.io/docs/hover-background

#### **Marquee**
- **Description:** Scrolling text or content animation component.
- **URL:** https://reui.io/docs/marquee

#### **Shimmering Text**
- **Description:** Text with shimmering animation effect.
- **URL:** https://reui.io/docs/shimmering-text

#### **Sliding Number**
- **Description:** Number display with sliding animation when value changes.
- **URL:** https://reui.io/docs/sliding-number

#### **SVG Text**
- **Description:** Display text with animated SVG backgrounds. Perfect for creating dynamic text effects with custom SVG graphics and animations.
- **URL:** https://reui.io/docs/svg-text

#### **Text Reveal**
- **Description:** Text animation that reveals content progressively.
- **URL:** https://reui.io/docs/text-reveal

#### **Typing Text**
- **Description:** Typewriter effect for text animation.
- **URL:** https://reui.io/docs/typing-text

#### **Video Text**
- **Description:** Text with video background effect.
- **URL:** https://reui.io/docs/video-text

#### **Word Rotate**
- **Description:** Rotating word animation component.
- **URL:** https://reui.io/docs/word-rotate

---

## Base UI Components

ReUI includes components built on top of Base UI primitives with shadcn styling:

#### **Base Accordion**
- **URL:** https://reui.io/docs/base-accordion

#### **Base Alert Dialog**
- **Description:** A dialog that requires user response to proceed, built with Base UI components.
- **URL:** https://reui.io/docs/base-alert-dialog

#### **Base Avatar**
- **URL:** https://reui.io/docs/base-avatar

#### **Base Badge**
- **URL:** https://reui.io/docs/base-badge

#### **Base Breadcrumb**
- **URL:** https://reui.io/docs/base-breadcrumb

#### **Base Button**
- **URL:** https://reui.io/docs/base-button

#### **Base Checkbox**
- **URL:** https://reui.io/docs/base-checkbox

#### **Base Collapsible**
- **URL:** https://reui.io/docs/base-collapsible

#### **Base Combobox**
- **URL:** https://reui.io/docs/base-combobox

#### **Base Context Menu**
- **URL:** https://reui.io/docs/base-context-menu

#### **Base Dialog**
- **URL:** https://reui.io/docs/base-dialog

#### **Base Input**
- **URL:** https://reui.io/docs/base-input

#### **Base Menu**
- **Description:** A list of actions in a dropdown, enhanced with keyboard navigation. Built on top of Base UI Menu component with shadcn styling.
- **URL:** https://reui.io/docs/base-menu

#### **Base Menubar**
- **Description:** A horizontal menu bar with keyboard navigation. Built on top of Base UI Menubar component with shadcn styling.
- **URL:** https://reui.io/docs/base-menubar

#### **Base Meter**
- **URL:** https://reui.io/docs/base-meter

#### **Base Navigation Menu**
- **Description:** A navigation menu component with keyboard navigation and accessibility features. Built on top of Base UI Navigation Menu component.
- **URL:** https://reui.io/docs/base-navigation-menu

#### **Base Popover**
- **Description:** A floating panel that appears on demand. Built on top of Base UI Popover component with shadcn styling.
- **URL:** https://reui.io/docs/base-popover

#### **Base Preview Card**
- **URL:** https://reui.io/docs/base-preview-card

#### **Base Progress**
- **URL:** https://reui.io/docs/base-progress

#### **Base Radio Group**
- **URL:** https://reui.io/docs/base-radio-group

#### **Base Scroll Area**
- **URL:** https://reui.io/docs/base-scroll-area

#### **Base Select**
- **URL:** https://reui.io/docs/base-select

#### **Base Separator**
- **URL:** https://reui.io/docs/base-separator

#### **Base Sheet**
- **URL:** https://reui.io/docs/base-sheet

#### **Base Slider**
- **URL:** https://reui.io/docs/base-slider

#### **Base Switch**
- **URL:** https://reui.io/docs/base-switch

#### **Base Tabs**
- **URL:** https://reui.io/docs/base-tabs

#### **Base Toast**
- **URL:** https://reui.io/docs/base-toast

#### **Base Toggle**
- **URL:** https://reui.io/docs/base-toggle

#### **Base Toggle Group**
- **URL:** https://reui.io/docs/base-toggle-group

#### **Base Toolbar**
- **URL:** https://reui.io/docs/base-toolbar

#### **Base Tooltip**
- **URL:** https://reui.io/docs/base-tooltip

---

## Additional Resources

- **Documentation:** https://reui.io/docs
- **Theming Guide:** https://reui.io/docs/theming
- **Dark Mode Setup:** https://reui.io/docs/dark-mode
- **RTL Support:** https://reui.io/docs/rtl
- **Registry:** https://reui.io/docs/registry
- **MCP Integration:** https://reui.io/docs/mcp
- **Changelog:** https://reui.io/docs/changelog
- **References:** https://reui.io/docs/references

---

## Component Categories Summary

- **Form & Input Components:** 20 components for user input and form handling
- **Display Components:** 12 components for presenting information
- **Navigation Components:** 6 components for site navigation
- **Overlay Components:** 11 components for modals, dialogs, and popups
- **Layout Components:** 4 components for page structure
- **Data & Organization Components:** 7 components for managing and organizing data
- **Animation & Effects Components:** 14 components for visual effects and animations
- **Base UI Components:** 35+ components built on Base UI primitives

**Total:** 100+ components available for building modern React applications.
