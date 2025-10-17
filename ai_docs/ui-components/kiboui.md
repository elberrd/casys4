# Kibo UI Documentation

Kibo UI is a custom registry of composable, accessible, and extensible components designed for use with shadcn/ui. It's a component library built on top of shadcn/ui that helps developers build richer UIs faster with pre-built components.

**Official Website:** https://www.kibo-ui.com
**GitHub:** https://github.com/haydenbleasel/kibo (2.9K stars)
**License:** MIT (Open Source)

---

## What is Kibo UI?

Kibo UI is a component library and custom registry built on top of shadcn/ui. Its goal is to help developers build richer UIs faster by providing pre-built components like tables, file dropzones, and AI chat primitives. Unlike simple style libraries, Kibo UI delivers fully composable and accessible components that come with real functionality, not just pre-styled code.

### Key Features

- **Composable & Accessible:** All components are designed to be fully composable with proper accessibility
- **Built on shadcn/ui:** Uses the same Tailwind CSS variable theming to work seamlessly with shadcn's primitives
- **Open Source:** MIT licensed and hosted on GitHub
- **Modern Stack:** Tailored for React, Next.js, and Tailwind CSS
- **Higher-Level Components:** Extends shadcn/ui with more complex components (calendars, editors, drag-and-drop, etc.)
- **Blocks & Patterns:** Pre-built sections for entire application features (login pages, dashboards, etc.)

---

## Installation

### Prerequisites

Before installing Kibo UI, ensure your environment meets these requirements:

- **Node.js:** Version 18 or later
- **React:** Version 18 or later
- **shadcn/ui:** Must be installed in your project (run `npx shadcn@latest init` if not already done)
- **Tailwind CSS:** Configured and working in your project
- **CSS Variables Mode:** Kibo UI currently supports only the CSS Variables mode of shadcn/ui for theming

**Important:** If you haven't installed shadcn/ui yet, you must do that first. Follow the official shadcn/ui setup instructions to configure Tailwind CSS and the base components. Kibo UI builds on that foundation.

### Installing Components

You can install Kibo UI components using either the **Kibo UI CLI** or the **shadcn/ui CLI**. Both achieve the same result: adding the selected component's code and dependencies to your project.

#### Method 1: Kibo UI CLI

```bash
npx kibo-ui add [component-name]
```

#### Method 2: shadcn/ui CLI

```bash
npx shadcn add https://kibo-ui.com/r/[component-name]
```

#### Example: Installing the Gantt Chart component

```bash
npx kibo-ui add gantt
```

**What happens:**
- The CLI downloads the component's code
- Files are added to `@/components/kibo-ui/[component-name]/` (or your configured components folder)
- Required dependencies are automatically installed
- Setup typically takes only a few seconds

---

## Available Components (41 Components)

### Collaboration Components

#### **Avatar Stack**
- **Description:** Component that allows you to stack and overlap avatars.
- **URL:** https://www.kibo-ui.com/components/avatar-stack

#### **Cursor**
- **Description:** Customizable cursor component with color, name label, message display, and smooth animations.
- **Features:**
  - Customizable cursor color with automatic text color contrast adjustment
  - Optional name label display
  - Optional message display
  - Smooth cursor animations
- **URL:** https://www.kibo-ui.com/components/cursor

#### **Dialog Stack**
- **Description:** Component for managing multiple stacked dialogs.
- **URL:** https://www.kibo-ui.com/components/dialog-stack

---

### Project Management Components

#### **Kanban**
- **Description:** A kanban board is a visual tool that helps you manage and visualize your work with columns representing different statuses.
- **URL:** https://www.kibo-ui.com/components/kanban

#### **Gantt**
- **Description:** Gantt chart component for project timeline visualization.
- **URL:** https://www.kibo-ui.com/components/gantt

#### **List**
- **Description:** List views for showing tasks grouped by status and ranked by priority.
- **URL:** https://www.kibo-ui.com/components/list

---

### Data Display Components

#### **Table**
- **Description:** Table views for displaying data in a tabular format. Useful for displaying large amounts of data in a structured way.
- **URL:** https://www.kibo-ui.com/components/table

#### **Contribution Graph**
- **Description:** GitHub-style contribution graph component.
- **URL:** https://www.kibo-ui.com/components/contribution-graph

#### **Tree**
- **Description:** Composable tree component with animated expand/collapse and customizable nodes for displaying hierarchical data structures.
- **URL:** https://www.kibo-ui.com/components/tree

---

### Form & Input Components

#### **Choicebox**
- **Description:** Radio or checkbox options displayed with a card style.
- **URL:** https://www.kibo-ui.com/components/choicebox

#### **Color Picker**
- **Description:** Color picker with drag and drop, hue/alpha sliders, eyedropper, and multiple format outputs (HEX, RGB, CSS, HSL).
- **URL:** https://www.kibo-ui.com/components/color-picker

#### **Combobox**
- **Description:** Enhanced combobox component with search and selection capabilities.
- **URL:** https://www.kibo-ui.com/components/combobox

#### **Dropzone**
- **Description:** File upload component with drag-and-drop functionality.
- **URL:** https://www.kibo-ui.com/components/dropzone

#### **Rating**
- **Description:** Star rating component with customizable features.
- **Features:**
  - Customizable number of stars and size
  - Support for keyboard navigation
  - Hover and focus states
  - Accessible ARIA attributes
  - Read-only mode
- **URL:** https://www.kibo-ui.com/components/rating

#### **Tags**
- **Description:** Tag input component with search and management features.
- **Features:**
  - Built-in search input to filter through tags
  - Supports both controlled and uncontrolled usage
  - Fully customizable through className props
- **URL:** https://www.kibo-ui.com/components/tags

---

### Content Display Components

#### **Announcement**
- **Description:** Announcement banner component with badge styling.
- **Features:**
  - Compound component with Badge-based styling and rounded full appearance
  - Customizable themed mode for different visual styles
  - Built-in tag and link support
- **URL:** https://www.kibo-ui.com/components/announcement

#### **Banner**
- **Description:** Full-width component for displaying messages and actions to users.
- **URL:** https://www.kibo-ui.com/components/banner

#### **Code Block**
- **Description:** Component for displaying formatted code blocks.
- **URL:** https://www.kibo-ui.com/components/code-block

#### **Snippet**
- **Description:** Code snippet component with copy functionality.
- **Features:**
  - Copy code to clipboard
  - Customize the tab contents
  - Multiple tabs support
  - Customizable copy button, tab triggers, and tab content
- **URL:** https://www.kibo-ui.com/components/snippet

#### **Status**
- **Description:** Service status indicator component.
- **Features:**
  - Displays the status of a service
  - Automatic colors based on the status
  - Customizable colors and labels
  - Ping animation for the indicator
- **URL:** https://www.kibo-ui.com/components/status

#### **Typography**
- **Description:** Component for applying consistent typography styles across your application.
- **URL:** https://www.kibo-ui.com/components/typography

---

### Media Components

#### **Comparison**
- **Description:** Compare two items side by side with a draggable slider.
- **Features:**
  - Support for both hover and drag modes
  - Smooth animations
  - Touch and mouse event support
  - Customizable appearance
- **URL:** https://www.kibo-ui.com/components/comparison

#### **Deck**
- **Description:** Swipeable card deck component.
- **Features:**
  - Swipe cards left or right with touch or mouse drag
  - Smooth, animated transitions powered by Motion
  - Composable API: pass children as swipeable cards
- **URL:** https://www.kibo-ui.com/components/deck

#### **Glimpse**
- **Description:** URL preview component with hover functionality.
- **Features:**
  - Fetches data from a URL in a React Server Component
  - Preview a URL when hovering over a link
  - Show title, description, and image
  - Customizable hover behavior
- **URL:** https://www.kibo-ui.com/components/glimpse

#### **Image Crop**
- **Description:** Image cropping component with interactive controls.
- **URL:** https://www.kibo-ui.com/components/image-crop

#### **Image Zoom**
- **Description:** Image zoom component with magnification capabilities.
- **URL:** https://www.kibo-ui.com/components/image-zoom

#### **QR Code**
- **Description:** QR code generator component.
- **URL:** https://www.kibo-ui.com/components/qr-code

#### **Reel**
- **Description:** Composable, Instagram-style Reel component with progress indicators and navigation controls.
- **URL:** https://www.kibo-ui.com/components/reel

#### **Stories**
- **Description:** Instagram-style stories carousel component.
- **Features:**
  - Composable Stories carousel with smooth scrolling
  - Built-in video and image support with proper aspect ratios
  - Author information with avatar and name display
- **URL:** https://www.kibo-ui.com/components/stories

#### **Video Player**
- **Description:** Customizable video player component with controls.
- **URL:** https://www.kibo-ui.com/components/video-player

---

### Date & Time Components

#### **Calendar**
- **Description:** Advanced calendar component for date selection and display.
- **URL:** https://www.kibo-ui.com/components/calendar

#### **Mini Calendar**
- **Description:** Composable mini calendar component for picking dates close to today.
- **URL:** https://www.kibo-ui.com/components/mini-calendar

#### **Relative Time**
- **Description:** Time display component with timezone support.
- **Features:**
  - Displays multiple timezones simultaneously
  - Supports both controlled and uncontrolled time states
  - Auto-updates every second when no time is provided
- **URL:** https://www.kibo-ui.com/components/relative-time

---

### AI & Editor Components

#### **AI Tool** (Streaming React Components)
- **Description:** Comprehensive collection of React components designed for building modern AI chat interfaces.
- **URL:** https://www.kibo-ui.com/components/ai-tool

#### **Editor**
- **Description:** Rich text editor component with formatting capabilities.
- **URL:** https://www.kibo-ui.com/components/editor

#### **Sandbox**
- **Description:** Code sandbox component for live code execution and preview.
- **URL:** https://www.kibo-ui.com/components/sandbox

---

### UI Enhancement Components

#### **Credit Card**
- **Description:** Credit card display and input component with validation.
- **URL:** https://www.kibo-ui.com/components/credit-card

#### **Marquee**
- **Description:** Scrolling text/content marquee component.
- **URL:** https://www.kibo-ui.com/components/marquee

#### **Pill**
- **Description:** Badge-like pill component with avatars and status indicators.
- **Features:**
  - Customizable badge-like component with rounded corners and consistent padding
  - Support for avatars with fallback options
  - Built-in status indicators
- **URL:** https://www.kibo-ui.com/components/pill

#### **Spinner**
- **Description:** Loading spinner component with multiple variants (extends shadcn spinner).
- **URL:** https://www.kibo-ui.com/components/spinner

#### **Theme Switcher**
- **Description:** Theme/mode switcher component for light/dark mode toggle.
- **URL:** https://www.kibo-ui.com/components/theme-switcher

#### **Ticker**
- **Description:** Animated ticker component for displaying changing numbers or text.
- **URL:** https://www.kibo-ui.com/components/ticker

---

## Available Blocks (6 Blocks)

Blocks are pre-built components designed as building blocks for entire sections of your application.

#### **Codebase**
- **Description:** A codebase block combines a file explorer tree with a code viewer for browsing and viewing source code.
- **URL:** https://www.kibo-ui.com/blocks/codebase

#### **Collaborative Canvas**
- **Description:** Create an online, realtime collaborative canvas with Kibo UI components.
- **URL:** https://www.kibo-ui.com/blocks/collaborative-canvas

#### **Form**
- **Description:** Form block that allows users to submit data to a website or application.
- **URL:** https://www.kibo-ui.com/blocks/form

#### **Hero**
- **Description:** Hero section block for landing pages.
- **URL:** https://www.kibo-ui.com/blocks/hero

#### **Pricing**
- **Description:** Pricing table block for showcasing product/service pricing.
- **URL:** https://www.kibo-ui.com/blocks/pricing

#### **Roadmap**
- **Description:** Roadmap block for displaying project timelines and milestones.
- **URL:** https://www.kibo-ui.com/blocks/roadmap

---

## Available Patterns (1101 Patterns)

Patterns are pre-styled variations and use cases for components. They provide ready-to-use implementations for common scenarios.

### Pattern Categories

#### **Accordion Patterns**
- Standard Accordion (7 variations)
- Accordion with Subtitle (4 variations)
- Accordion with Tabs (4 variations)
- Multi-level Accordion (4 variations)
- Accordion Form (2 variations)
- **Base URL:** https://www.kibo-ui.com/patterns (filter by "accordion")

#### **Alert Patterns**
- Info Alerts (4 variations)
- Success Alerts (4 variations)
- Warning Alerts (4 variations)
- **Base URL:** https://www.kibo-ui.com/patterns (filter by "alert")

#### **Breadcrumb Patterns**
- Breadcrumb with Home Icon (4 variations)
- **Base URL:** https://www.kibo-ui.com/patterns (filter by "breadcrumb")

#### **Combobox Patterns**
- Combobox with States (7 variations)
- **Base URL:** https://www.kibo-ui.com/patterns (filter by "combobox")

#### **Skeleton Patterns**
- Skeleton Card (3+ variations)
- **Base URL:** https://www.kibo-ui.com/patterns (filter by "skeleton")

#### **Textarea Patterns**
- Labeled Textarea (1+ variations)
- **Base URL:** https://www.kibo-ui.com/patterns (filter by "textarea")

**Note:** With 1101 patterns available, these represent the most common categories. Visit https://www.kibo-ui.com/patterns to explore all available patterns.

---

## Additional Resources

### Documentation
- **Introduction:** https://www.kibo-ui.com/docs
- **Setup Guide:** https://www.kibo-ui.com/docs/setup
- **Usage Guide:** https://www.kibo-ui.com/docs/usage
- **Philosophy:** https://www.kibo-ui.com/docs/philosophy
- **Benefits:** https://www.kibo-ui.com/docs/benefits
- **Troubleshooting:** https://www.kibo-ui.com/docs/troubleshooting

### Community & Contribution
- **Community:** https://www.kibo-ui.com/docs/community
- **How to Contribute:** https://www.kibo-ui.com/docs/how-to-contribute
- **New Components Guide:** https://www.kibo-ui.com/docs/new-components
- **Sponsors:** https://www.kibo-ui.com/docs/sponsors

### Integration
- **MCP Server:** https://www.kibo-ui.com/docs/mcp
  - The Model Context Protocol (MCP) allows AI assistants like Claude and Cursor to securely connect with Kibo UI

---

## Component Categories Summary

- **Collaboration Components:** 3 components (Avatar Stack, Cursor, Dialog Stack)
- **Project Management Components:** 3 components (Kanban, Gantt, List)
- **Data Display Components:** 3 components (Table, Contribution Graph, Tree)
- **Form & Input Components:** 6 components (Choicebox, Color Picker, Combobox, Dropzone, Rating, Tags)
- **Content Display Components:** 6 components (Announcement, Banner, Code Block, Snippet, Status, Typography)
- **Media Components:** 9 components (Comparison, Deck, Glimpse, Image Crop, Image Zoom, QR Code, Reel, Stories, Video Player)
- **Date & Time Components:** 3 components (Calendar, Mini Calendar, Relative Time)
- **AI & Editor Components:** 3 components (AI Tool, Editor, Sandbox)
- **UI Enhancement Components:** 6 components (Credit Card, Marquee, Pill, Spinner, Theme Switcher, Ticker)

**Total:** 41 components + 6 blocks + 1101 patterns

---

## Why Choose Kibo UI?

### For Rapid Development
- Install components in seconds with the CLI
- Pre-built, functional components (not just styled code)
- Focus on your app's unique logic instead of rebuilding common UI elements

### For Design Systems
- Un-opinionated styling beyond Tailwind utility classes
- Fully customizable to match your brand
- Composable architecture allows easy extension
- Great starting point for consistent, accessible design systems

### For Modern React Apps
- Seamless integration with shadcn/ui
- Built for React, Next.js, and Tailwind CSS
- Uses same theming approach as shadcn/ui
- Open source with active community development

---

## Quick Start Example

```bash
# 1. Make sure shadcn/ui is installed
npx shadcn@latest init

# 2. Install a Kibo UI component
npx kibo-ui add kanban

# 3. Use the component in your code
import { Kanban } from '@/components/kibo-ui/kanban'

export default function MyPage() {
  return <Kanban {...props} />
}
```

---

## License & Community

**License:** MIT (Open Source)
**GitHub:** https://github.com/haydenbleasel/kibo
**Creator:** @haydenbleasel

Kibo UI is completely open source and welcomes community contributions. Whether you're fixing bugs, improving documentation, or creating new components, your contributions help make Kibo UI better for everyone.
