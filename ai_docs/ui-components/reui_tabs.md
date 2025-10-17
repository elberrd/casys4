# ReUI - Tabs Component

> Source: https://reui.io/docs/tabs
> GitHub: https://github.com/keenthemes/reui
> Version: ReUI v1.0.27
> Last Updated: 2025-10-16

## Overview

The Tabs component is a set of layered sections of content—known as tab panels—that are displayed one at a time. It's built on Radix UI primitives and is part of the ReUI component library, which pairs beautifully with shadcn/ui. The component provides full keyboard navigation, ARIA compliance, and flexible visual customization through a comprehensive variants system.

## Prerequisites

Before installing the Tabs component, ensure your project meets these requirements:

- **React**: Version 19 or higher
- **TypeScript**: Version 5.7 or higher
- **Tailwind CSS**: Version 4 or higher
- **Radix UI**: Version 1 or higher
- **Motion**: Version 12.19 or higher

## Installation

### Option 1: Via CLI (Recommended)

```bash
pnpm dlx shadcn@latest add @reui/tabs
```

### Option 2: Manual Installation

#### Step 1: Install Required Dependencies

```bash
npm i radix-ui
npm i motion
npm i lucide-react  # For icon support
```

#### Step 2: Copy the Component Code

Create a file at `components/ui/tabs.tsx` and add the Tabs component code. The component uses:
- **Radix UI** primitives for accessibility
- **CVA (Class Variance Authority)** for variant styling
- **Tailwind CSS** for styling
- **React Context** for managing variant inheritance

#### Step 3: Configure Global Styles

Ensure your `globals.css` includes:
- Tailwind CSS imports
- CSS custom properties for colors (light and dark modes)
- Base styles with smooth scroll behavior

## Core Components

The Tabs component consists of four main parts:

1. **Tabs** - Root container (based on `Radix.Tabs.Root`)
2. **TabsList** - Container for tab triggers with customizable styling
3. **TabsTrigger** - Individual tab button that activates content panels
4. **TabsContent** - Content section displayed when corresponding trigger is active

## Props/API Reference

### Tabs (Root Component)

Inherits all props from Radix UI's `Tabs.Root`:

| Prop | Type | Description |
|------|------|-------------|
| `defaultValue` | string | The value of the tab that should be active when initially rendered |
| `value` | string | The controlled value of the tab to activate (for controlled mode) |
| `onValueChange` | (value: string) => void | Event handler called when the value changes |
| `orientation` | "horizontal" \| "vertical" | The orientation of the component (default: "horizontal") |
| `dir` | "ltr" \| "rtl" | The reading direction |
| `activationMode` | "automatic" \| "manual" | Whether a tab is activated automatically or manually |

### TabsList

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | "default" \| "button" \| "line" \| "pill" | "default" | Visual style variant |
| `size` | "lg" \| "md" \| "sm" \| "xs" | "md" | Size of the tabs |
| `shape` | "default" \| "pill" | "default" | Shape style (rounded corners) |
| `className` | string | undefined | Additional CSS classes |

**Variant Descriptions:**
- **default**: Standard tab appearance with accent background on active state
- **button**: Button-styled tabs with prominent background
- **line**: Minimal style with underline indicator
- **pill**: Rounded pill-shaped tabs

**Size Options:**
- **lg**: Large spacing and text (increased padding)
- **md**: Medium/default size
- **sm**: Small/compact layout
- **xs**: Extra small with minimal spacing

### TabsTrigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | string | required | A unique value that associates the trigger with content |
| `disabled` | boolean | false | When true, prevents the user from interacting with the tab |
| `className` | string | undefined | Additional CSS classes |

**Note:** TabsTrigger automatically inherits `variant` and `size` from the parent TabsList via React Context.

### TabsContent

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | string | required | A unique value that associates the content with a trigger |
| `forceMount` | boolean | false | Used to force mounting when more control is needed |
| `className` | string | undefined | Additional CSS classes |

## Usage Examples

### Example 1: Basic Usage

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BasicTabsDemo() {
  return (
    <Tabs defaultValue="profile" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Profile Settings</h3>
          <p className="text-sm text-gray-600">
            Manage your profile information and preferences here.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Notification Settings</h3>
          <p className="text-sm text-gray-600">
            Configure how you receive notifications and updates.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

### Example 2: Different Variants

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function VariantsDemo() {
  return (
    <div className="space-y-8">
      {/* Default Variant */}
      <Tabs defaultValue="tab1" className="w-[400px]">
        <TabsList variant="default" className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Default</TabsTrigger>
          <TabsTrigger value="tab2">Style</TabsTrigger>
          <TabsTrigger value="tab3">Tabs</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Default variant content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>

      {/* Button Variant */}
      <Tabs defaultValue="tab1" className="w-[400px]">
        <TabsList variant="button" className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Button</TabsTrigger>
          <TabsTrigger value="tab2">Style</TabsTrigger>
          <TabsTrigger value="tab3">Tabs</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Button variant content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>

      {/* Line Variant */}
      <Tabs defaultValue="tab1" className="w-[400px]">
        <TabsList variant="line" className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Line</TabsTrigger>
          <TabsTrigger value="tab2">Style</TabsTrigger>
          <TabsTrigger value="tab3">Tabs</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Line variant content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>

      {/* Pill Variant */}
      <Tabs defaultValue="tab1" className="w-[400px]">
        <TabsList variant="pill" className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Pill</TabsTrigger>
          <TabsTrigger value="tab2">Style</TabsTrigger>
          <TabsTrigger value="tab3">Tabs</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Pill variant content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>
    </div>
  );
}
```

### Example 3: Size Variations

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SizesDemo() {
  return (
    <div className="space-y-8">
      {/* Large Size */}
      <Tabs defaultValue="tab1" className="w-[500px]">
        <TabsList size="lg" className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Large</TabsTrigger>
          <TabsTrigger value="tab2">Size</TabsTrigger>
          <TabsTrigger value="tab3">Tabs</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Large size content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>

      {/* Medium Size (Default) */}
      <Tabs defaultValue="tab1" className="w-[400px]">
        <TabsList size="md" className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Medium</TabsTrigger>
          <TabsTrigger value="tab2">Size</TabsTrigger>
          <TabsTrigger value="tab3">Tabs</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Medium size content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>

      {/* Small Size */}
      <Tabs defaultValue="tab1" className="w-[350px]">
        <TabsList size="sm" className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">Small</TabsTrigger>
          <TabsTrigger value="tab2">Size</TabsTrigger>
          <TabsTrigger value="tab3">Tabs</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Small size content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>

      {/* Extra Small Size */}
      <Tabs defaultValue="tab1" className="w-[300px]">
        <TabsList size="xs" className="grid w-full grid-cols-3">
          <TabsTrigger value="tab1">XS</TabsTrigger>
          <TabsTrigger value="tab2">Size</TabsTrigger>
          <TabsTrigger value="tab3">Tabs</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Extra small content</TabsContent>
        <TabsContent value="tab2">Tab 2 content</TabsContent>
        <TabsContent value="tab3">Tab 3 content</TabsContent>
      </Tabs>
    </div>
  );
}
```

### Example 4: Icon Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRound, Bell, Settings, Mail } from 'lucide-react';

export default function IconTabsDemo() {
  return (
    <Tabs defaultValue="profile" className="w-[450px]">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          <span>Profile</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span>Alerts</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </TabsTrigger>
        <TabsTrigger value="messages" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span>Mail</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">User Profile</h3>
          <p className="text-sm text-gray-600">
            View and edit your profile information.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="notifications" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Notifications</h3>
          <p className="text-sm text-gray-600">
            Manage your notification preferences.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Settings</h3>
          <p className="text-sm text-gray-600">
            Configure your application settings.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="messages" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Messages</h3>
          <p className="text-sm text-gray-600">
            Check your inbox and sent messages.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

### Example 5: Badge Tabs with Status Indicators

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function BadgeTabsDemo() {
  return (
    <Tabs defaultValue="all" className="w-[500px]">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="all" className="flex items-center gap-2">
          All
          <Badge variant="secondary" className="ml-auto">128</Badge>
        </TabsTrigger>
        <TabsTrigger value="active" className="flex items-center gap-2">
          Active
          <Badge variant="default" className="ml-auto">24</Badge>
        </TabsTrigger>
        <TabsTrigger value="pending" className="flex items-center gap-2">
          Pending
          <Badge variant="outline" className="ml-auto">8</Badge>
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          Done
          <Badge variant="success" className="ml-auto">96</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Showing all 128 items</p>
        </div>
      </TabsContent>

      <TabsContent value="active" className="mt-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Showing 24 active items</p>
        </div>
      </TabsContent>

      <TabsContent value="pending" className="mt-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Showing 8 pending items</p>
        </div>
      </TabsContent>

      <TabsContent value="completed" className="mt-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">Showing 96 completed items</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

### Example 6: Controlled Tabs with State Management

```tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function ControlledTabsDemo() {
  const [activeTab, setActiveTab] = useState('step1');

  const handleNext = () => {
    if (activeTab === 'step1') setActiveTab('step2');
    else if (activeTab === 'step2') setActiveTab('step3');
  };

  const handlePrevious = () => {
    if (activeTab === 'step3') setActiveTab('step2');
    else if (activeTab === 'step2') setActiveTab('step1');
  };

  return (
    <div className="w-[500px]">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="step1">Step 1</TabsTrigger>
          <TabsTrigger value="step2">Step 2</TabsTrigger>
          <TabsTrigger value="step3">Step 3</TabsTrigger>
        </TabsList>

        <TabsContent value="step1" className="mt-4">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your basic personal details.
            </p>
            <Button onClick={handleNext}>Next</Button>
          </div>
        </TabsContent>

        <TabsContent value="step2" className="mt-4">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Contact Details</h3>
            <p className="text-sm text-gray-600 mb-4">
              Provide your contact information.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrevious}>Previous</Button>
              <Button onClick={handleNext}>Next</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="step3" className="mt-4">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Review & Submit</h3>
            <p className="text-sm text-gray-600 mb-4">
              Review your information and submit.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrevious}>Previous</Button>
              <Button>Submit</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Example 7: Disabled Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DisabledTabsDemo() {
  return (
    <Tabs defaultValue="available" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="available">Available</TabsTrigger>
        <TabsTrigger value="locked" disabled>
          Locked
        </TabsTrigger>
        <TabsTrigger value="premium" disabled>
          Premium
        </TabsTrigger>
      </TabsList>

      <TabsContent value="available" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Available Content</h3>
          <p className="text-sm text-gray-600">
            This content is freely accessible.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="locked" className="mt-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">
            This tab is locked and cannot be accessed.
          </p>
        </div>
      </TabsContent>

      <TabsContent value="premium" className="mt-4">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-600">
            Upgrade to premium to access this content.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

### Example 8: Vertical Orientation

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function VerticalTabsDemo() {
  return (
    <Tabs
      defaultValue="overview"
      orientation="vertical"
      className="flex gap-4"
    >
      <TabsList className="flex flex-col h-fit">
        <TabsTrigger value="overview" className="w-full justify-start">
          Overview
        </TabsTrigger>
        <TabsTrigger value="analytics" className="w-full justify-start">
          Analytics
        </TabsTrigger>
        <TabsTrigger value="reports" className="w-full justify-start">
          Reports
        </TabsTrigger>
        <TabsTrigger value="settings" className="w-full justify-start">
          Settings
        </TabsTrigger>
      </TabsList>

      <div className="flex-1">
        <TabsContent value="overview">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Dashboard Overview</h3>
            <p className="text-sm text-gray-600">
              View your dashboard metrics and key performance indicators.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Analytics</h3>
            <p className="text-sm text-gray-600">
              Detailed analytics and insights about your data.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Reports</h3>
            <p className="text-sm text-gray-600">
              Generate and download custom reports.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Dashboard Settings</h3>
            <p className="text-sm text-gray-600">
              Configure your dashboard preferences.
            </p>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
```

## Technical Implementation Details

### Styling System

The Tabs component uses **CVA (Class Variance Authority)** to manage variants efficiently:

```typescript
const tabsListVariants = cva(
  // Base styles
  "inline-flex items-center justify-center",
  {
    variants: {
      variant: {
        default: "bg-accent/10 rounded-lg p-1",
        button: "gap-2",
        line: "border-b",
        pill: "bg-accent/10 rounded-full p-1"
      },
      size: {
        lg: "h-12 text-base",
        md: "h-10 text-sm",
        sm: "h-8 text-xs",
        xs: "h-6 text-xs"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);
```

### Context Management

The component uses React Context to pass `variant` and `size` from TabsList to TabsTrigger:

```typescript
const TabsContext = createContext<{
  variant: TabsListVariant;
  size: TabsListSize;
}>({
  variant: "default",
  size: "md"
});
```

This eliminates prop drilling and ensures consistent styling across all child triggers.

### Accessibility Features

1. **Keyboard Navigation**: Full arrow key support (inherited from Radix UI)
2. **ARIA Attributes**: Proper role, aria-selected, and aria-controls attributes
3. **Focus Management**: Visible focus rings with `ring-offset-background` and `focus-visible:ring-2`
4. **Screen Reader Support**: Semantic HTML and ARIA labels
5. **Disabled State**: Proper `disabled` attribute with visual feedback

### Icon Support

Icons are integrated using Lucide React with automatic color transitions:

```tsx
// SVG elements inherit color from the trigger
<TabsTrigger value="profile">
  <UserRound className="h-4 w-4" /> {/* Inherits text color */}
  <span>Profile</span>
</TabsTrigger>
```

The component applies `[&_svg]:text-inherit` to ensure icons match the trigger's text color.

## Best Practices

### 1. Use Semantic Values

Choose meaningful value strings that describe the content:

```tsx
// Good
<TabsTrigger value="user-profile">Profile</TabsTrigger>

// Avoid
<TabsTrigger value="tab1">Profile</TabsTrigger>
```

### 2. Maintain Consistent Tab Count

Keep the number of tabs between 3-7 for optimal UX. Too many tabs can overwhelm users.

### 3. Set Default Values

Always set a `defaultValue` or control with `value` to avoid empty states:

```tsx
<Tabs defaultValue="overview">
  {/* tabs content */}
</Tabs>
```

### 4. Use Grid for Equal Width Tabs

For evenly distributed tabs, use Tailwind's grid utilities:

```tsx
<TabsList className="grid w-full grid-cols-4">
  {/* 4 equal-width tabs */}
</TabsList>
```

### 5. Provide Visual Feedback

Include loading states or transitions when tab content requires async data:

```tsx
<TabsContent value="data">
  {isLoading ? <Spinner /> : <DataDisplay data={data} />}
</TabsContent>
```

### 6. Optimize Tab Content

Lazy load heavy content or use conditional rendering to improve performance:

```tsx
<TabsContent value="heavy">
  {activeTab === 'heavy' && <HeavyComponent />}
</TabsContent>
```

### 7. Consider Mobile Layouts

For narrow screens, reduce tab count or switch to vertical orientation:

```tsx
<Tabs orientation={isMobile ? 'vertical' : 'horizontal'}>
  {/* tabs */}
</Tabs>
```

### 8. Combine Variants Thoughtfully

Match variants with your design system:

```tsx
// Professional dashboard
<TabsList variant="line" size="sm" />

// User settings panel
<TabsList variant="default" size="md" />

// Mobile navigation
<TabsList variant="pill" size="lg" />
```

## Accessibility Considerations

### Keyboard Navigation

- **Tab**: Move focus to/from the tab list
- **Arrow Left/Right**: Navigate between tabs (horizontal orientation)
- **Arrow Up/Down**: Navigate between tabs (vertical orientation)
- **Home**: Move to first tab
- **End**: Move to last tab
- **Space/Enter**: Activate focused tab

### Focus Management

The component includes proper focus styling:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Screen Reader Announcements

- Active tabs are announced with `aria-selected="true"`
- Tab panels are properly associated with triggers via `aria-controls`
- Disabled tabs are announced as unavailable

### Color Contrast

Ensure sufficient contrast between:
- Active and inactive tabs (minimum 3:1 ratio)
- Text and background (minimum 4.5:1 for normal text)
- Focus indicators and background

## Common Issues and Solutions

### Issue 1: Tabs Not Showing Active State

**Problem**: Active tab doesn't highlight correctly.

**Solution**: Ensure the `value` prop on TabsTrigger matches exactly (case-sensitive):

```tsx
// Correct
<TabsTrigger value="profile">Profile</TabsTrigger>
<TabsContent value="profile">...</TabsContent>

// Wrong - values don't match
<TabsTrigger value="profile">Profile</TabsTrigger>
<TabsContent value="Profile">...</TabsContent>
```

### Issue 2: Content Not Switching

**Problem**: Clicking tabs doesn't change content.

**Solution**: Check that each TabsContent has a corresponding TabsTrigger with matching values.

### Issue 3: Styling Not Applied

**Problem**: Variant or size props not working.

**Solution**: Ensure CVA is properly configured and Tailwind classes are available. Run:

```bash
npm run build:css
```

### Issue 4: Icons Not Aligned

**Problem**: Icons don't align with text in TabsTrigger.

**Solution**: Use flex layout with gap:

```tsx
<TabsTrigger className="flex items-center gap-2">
  <Icon className="h-4 w-4" />
  <span>Label</span>
</TabsTrigger>
```

### Issue 5: Controlled Tabs Not Updating

**Problem**: Setting `value` prop doesn't update active tab.

**Solution**: Use both `value` and `onValueChange`:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  {/* tabs */}
</Tabs>
```

## Integration with Forms

Tabs work well with form libraries like React Hook Form:

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FormTabsDemo() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Tabs defaultValue="personal" className="w-[500px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <input {...register('firstName')} placeholder="First Name" />
          <input {...register('lastName')} placeholder="Last Name" />
        </TabsContent>

        <TabsContent value="professional" className="space-y-4">
          <input {...register('company')} placeholder="Company" />
          <input {...register('position')} placeholder="Position" />
        </TabsContent>
      </Tabs>

      <button type="submit" className="mt-4">Submit</button>
    </form>
  );
}
```

## Performance Optimization

### Lazy Loading Content

For tabs with heavy content, use dynamic imports:

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
});

export default function OptimizedTabs() {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">Quick overview content</TabsContent>
      <TabsContent value="analytics">
        <HeavyChart />
      </TabsContent>
    </Tabs>
  );
}
```

### Memoization

Memoize complex tab content to prevent unnecessary re-renders:

```tsx
import { memo } from 'react';

const ExpensiveTabContent = memo(({ data }: { data: any }) => {
  // Complex rendering logic
  return <div>...</div>;
});

export default function MemoizedTabs() {
  return (
    <Tabs defaultValue="data">
      <TabsList>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="data">
        <ExpensiveTabContent data={data} />
      </TabsContent>
    </Tabs>
  );
}
```

## Dependencies Summary

### Required
- `react` (v19+)
- `react-dom` (v19+)
- `radix-ui` (v1+) - Core primitives
- `tailwindcss` (v4+) - Styling
- `class-variance-authority` - Variant management

### Optional
- `lucide-react` - For icon support
- `@remixicon/react` - Alternative icon library
- `motion` (v12.19+) - For animations
- `clsx` or `tailwind-merge` - Class name utilities

## Further Resources

- **Official Documentation**: https://reui.io/docs/tabs
- **GitHub Repository**: https://github.com/keenthemes/reui
- **Radix UI Tabs**: https://www.radix-ui.com/docs/primitives/components/tabs
- **ReUI Installation Guide**: https://reui.io/docs/installation
- **CVA Documentation**: https://cva.style/docs

## License

The ReUI Tabs component is licensed under the MIT License. See the [LICENSE](https://github.com/keenthemes/reui/blob/main/LICENSE.md) for details.

## Support

For questions or issues:
- Twitter: [@reui_io](https://x.com/reui_io)
- Email: hello@reui.io
- GitHub Issues: https://github.com/keenthemes/reui/issues
