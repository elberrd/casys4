# ReUI - Tooltip Component

> Source: https://reui.io/docs/tooltip
> Library: ReUI (Built on Radix UI)
> Last Updated: 2025-10-16

## Overview

The Tooltip component displays brief, contextual information when hovering over or focusing on an element. It enhances user experience by providing additional clarity without cluttering the interface. The component is built on top of Radix UI primitives and includes smooth animations, flexible positioning, and full accessibility support.

**Key Features:**
- Multiple positioning options (top, bottom, left, right)
- Customizable delay duration
- Smooth fade-in and zoom animations
- Built-in arrow pointer
- Keyboard navigation support
- Screen reader friendly
- Portal-based rendering to avoid z-index issues

## Installation

### Option 1: Via CLI (Recommended)

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/tooltip

# Using npm
npx shadcn@latest add @reui/tooltip

# Using yarn
yarn dlx shadcn@latest add @reui/tooltip
```

### Option 2: Manual Installation

**Step 1:** Install the required dependency:

```bash
npm install @radix-ui/react-tooltip
```

**Step 2:** Copy the component code below into `components/ui/tooltip.tsx`:

```typescript
'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

**Step 3:** Ensure you have the `cn` utility function in `lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Dependencies

- **@radix-ui/react-tooltip**: Core tooltip primitive component
- **clsx**: Utility for constructing className strings
- **tailwind-merge**: Utility for merging Tailwind CSS classes
- **Tailwind CSS**: For styling (required)

## Component API

### TooltipProvider

Wraps the entire tooltip system and provides context for all tooltips.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `delayDuration` | `number` | `700` | Time in milliseconds before tooltip appears on hover |
| `skipDelayDuration` | `number` | `300` | Time to skip delay when moving between tooltips |
| `disableHoverableContent` | `boolean` | `false` | Prevents tooltip from staying open when hovering over content |

### Tooltip

Root component that manages the tooltip's open/closed state.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultOpen` | `boolean` | `false` | Initial open state |
| `open` | `boolean` | - | Controlled open state |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when open state changes |
| `delayDuration` | `number` | `700` | Override provider's delay duration |

### TooltipTrigger

The element that triggers the tooltip when hovered or focused.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asChild` | `boolean` | `false` | Render as child element instead of button |
| All button props | - | - | Accepts all HTML button attributes |

### TooltipContent

The container for the tooltip content with positioning and animations.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | Preferred side of trigger to render |
| `sideOffset` | `number` | `4` | Distance in pixels from the trigger |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment relative to trigger |
| `alignOffset` | `number` | `0` | Offset in pixels from the align option |
| `className` | `string` | - | Additional CSS classes |
| `children` | `ReactNode` | - | Tooltip content |

## Usage Examples

### Example 1: Basic Tooltip

A simple tooltip that appears on hover with default settings.

```tsx
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export default function BasicTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">
            <Info className="h-4 w-4" />
            Hover me
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Get detailed information about this feature.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### Example 2: Directional Tooltips (Positioning)

Tooltips can be positioned on any side of the trigger element.

```tsx
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { MoveDown, MoveLeft, MoveRight, MoveUp } from 'lucide-react';

export default function DirectionalTooltips() {
  return (
    <div className="flex items-center justify-center gap-6">
      {/* Top Tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">
              <MoveUp className="h-4 w-4" />
              Top
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Tooltip appears above</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Right Tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">
              <MoveRight className="h-4 w-4" />
              Right
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Tooltip appears to the right</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Bottom Tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">
              <MoveDown className="h-4 w-4" />
              Bottom
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Tooltip appears below</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Left Tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">
              <MoveLeft className="h-4 w-4" />
              Left
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Tooltip appears to the left</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
```

### Example 3: Custom Delay Duration

Control when the tooltip appears by adjusting the delay.

```tsx
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

export default function DelayedTooltip() {
  return (
    <div className="flex gap-4">
      {/* Instant tooltip */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Instant</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Appears immediately</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Default delay (700ms) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Default</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Appears after 700ms</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Long delay */}
      <TooltipProvider delayDuration={1500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Delayed</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Appears after 1.5 seconds</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
```

### Example 4: Multiple Tooltips with Shared Provider

Wrap multiple tooltips in a single provider for better performance.

```tsx
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Save, Edit, Trash, Share } from 'lucide-react';

export default function MultipleTooltips() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save changes</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit document</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Trash className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete item</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Share className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share with others</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```

### Example 5: Controlled Tooltip State

Programmatically control when the tooltip is open or closed.

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

export default function ControlledTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <TooltipProvider>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover or focus me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This tooltip is controlled programmatically</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex gap-2">
        <Button onClick={() => setOpen(true)} size="sm">
          Show Tooltip
        </Button>
        <Button onClick={() => setOpen(false)} size="sm" variant="secondary">
          Hide Tooltip
        </Button>
      </div>
    </div>
  );
}
```

### Example 6: Tooltip with Custom Styling

Customize the appearance with additional CSS classes.

```tsx
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

export default function CustomStyledTooltip() {
  return (
    <TooltipProvider>
      <div className="flex gap-4">
        {/* Success tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Success</Button>
          </TooltipTrigger>
          <TooltipContent className="bg-green-600 text-white">
            <p>Operation completed successfully!</p>
          </TooltipContent>
        </Tooltip>

        {/* Warning tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Warning</Button>
          </TooltipTrigger>
          <TooltipContent className="bg-yellow-600 text-white">
            <p>Please review before proceeding</p>
          </TooltipContent>
        </Tooltip>

        {/* Error tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Error</Button>
          </TooltipTrigger>
          <TooltipContent className="bg-red-600 text-white">
            <p>An error occurred</p>
          </TooltipContent>
        </Tooltip>

        {/* Large tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Large</Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-4">
            <p className="text-sm">
              This is a larger tooltip with more detailed information that can
              span multiple lines and provide comprehensive context.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```

### Example 7: Tooltip on Icon Button

Tooltips are particularly useful for icon-only buttons to explain their function.

```tsx
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Bell, Settings, User, LogOut } from 'lucide-react';

export default function IconButtonTooltips() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View notifications</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
              <span className="sr-only">Profile</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Go to profile</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open settings</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sign out</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```

## Accessibility

The Tooltip component follows WAI-ARIA best practices:

- **Keyboard Navigation**: Tooltips appear on focus and can be dismissed with Escape key
- **Screen Reader Support**: Content is announced when tooltip appears
- **ARIA Attributes**: Automatically applies `aria-describedby` to link trigger and content
- **Focus Management**: Maintains focus on trigger element while tooltip is visible
- **Visible on Hover and Focus**: Ensures tooltips work for both mouse and keyboard users

**Best Practices:**

1. Always include `<span className="sr-only">` text for icon-only buttons
2. Keep tooltip content concise and informative
3. Don't put critical information only in tooltips (they're not always visible)
4. Use `asChild` prop on TooltipTrigger to maintain proper semantics
5. Avoid putting interactive elements inside tooltips

## Implementation Details

### Portal Rendering

The tooltip content is rendered in a portal, which means it's appended to the document body. This ensures:
- Tooltips aren't clipped by overflow containers
- Proper z-index stacking without conflicts
- Consistent positioning regardless of parent styles

### Animation System

The component uses Tailwind CSS animations with these states:
- **Opening**: `fade-in-0 zoom-in-95` with directional slide
- **Closing**: `fade-out-0 zoom-out-95` with reverse slide
- **Duration**: Smooth 200ms transitions

### Positioning Logic

Radix UI's floating positioning system:
1. Calculates available space on all sides
2. Positions tooltip on preferred side if space available
3. Automatically flips to opposite side if needed
4. Adjusts alignment to stay within viewport bounds

## Best Practices

### DO:

1. **Use for supplementary information**: Tooltips should enhance understanding, not be the primary source of information
2. **Keep content brief**: Aim for one or two short sentences
3. **Share providers**: Wrap related tooltips in a single `TooltipProvider` for better performance
4. **Set appropriate delays**: Use shorter delays (200-300ms) for frequently accessed tooltips
5. **Use with icon buttons**: Great for explaining icon-only interface elements

### DON'T:

1. **Don't hide critical information**: Important content should be visible by default
2. **Don't make tooltips interactive**: Avoid putting buttons or links inside tooltips
3. **Don't use for mobile-primary interfaces**: Tooltips work best on hover, which isn't ideal for touch
4. **Don't nest tooltips**: One tooltip at a time is enough
5. **Don't use excessive animations**: Keep transitions smooth and quick

## Common Patterns

### Form Field Hints

```tsx
<div className="flex items-center gap-2">
  <Label htmlFor="email">Email Address</Label>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-4 w-4">
          <Info className="h-3 w-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>We'll never share your email with anyone</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>
```

### Disabled Button Explanation

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span> {/* Wrapper needed for disabled buttons */}
      <Button disabled>Submit</Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>
    <p>Please fill in all required fields</p>
  </TooltipContent>
</Tooltip>
```

### Data Table Actions

```tsx
<TooltipProvider>
  <div className="flex gap-1">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>View details</TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Edit record</TooltipContent>
    </Tooltip>
  </div>
</TooltipProvider>
```

## Troubleshooting

### Tooltip not appearing

- Ensure `TooltipProvider` wraps all tooltip components
- Check that trigger element can receive focus (use `asChild` for custom components)
- Verify z-index isn't being overridden by other elements

### Tooltip positioned incorrectly

- Check for `overflow: hidden` on parent containers
- Ensure sufficient space in the viewport
- Try adjusting `sideOffset` and `align` props

### Animations not working

- Verify Tailwind CSS animation utilities are enabled
- Check that `tailwind.config.js` includes animation plugin
- Ensure CSS classes aren't being purged

## TypeScript Support

The component is fully typed with TypeScript. Import types as needed:

```typescript
import type { TooltipProps } from '@radix-ui/react-tooltip';

// Custom tooltip component with strict typing
const CustomTooltip: React.FC<TooltipProps> = ({ children, ...props }) => {
  return <Tooltip {...props}>{children}</Tooltip>;
};
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (requires iOS 13+ / macOS 10.15+)
- Mobile: Limited (tooltips don't work well on touch devices)

For mobile interfaces, consider using a popover or modal instead of tooltips.
