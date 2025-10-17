# ReUI - Dropdown Menu

> Source: https://reui.io/docs/dropdown-menu
> GitHub: https://github.com/keenthemes/reui
> Version: Latest (October 2025)
> Last Updated: 2025-10-16

## Overview

The Dropdown Menu component displays a menu to the user — such as a set of actions or functions — triggered by a button. It's built on top of Radix UI's Dropdown Menu primitive and is designed to work seamlessly with React, TypeScript, Tailwind CSS, and integrates beautifully with shadcn/ui.

**Key Features:**
- Keyboard navigation support
- Submenu capability with portal rendering
- Checkbox and radio group variants
- Icon integration (via lucide-react)
- Keyboard shortcut display
- Disabled menu item states
- Destructive action variants
- RTL (Right-to-Left) support
- Full accessibility through Radix UI

## Installation

### Using CLI (Recommended)

Install the component using the ReUI CLI:

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/dropdown-menu

# Using npm
npx shadcn@latest add @reui/dropdown-menu

# Using yarn
yarn dlx shadcn@latest add @reui/dropdown-menu

# Using bun
bunx shadcn@latest add @reui/dropdown-menu
```

### Manual Installation

If you prefer manual installation:

1. **Install dependencies:**

```bash
npm install radix-ui lucide-react
```

2. **Copy the component code:**

Create a file at `components/ui/dropdown-menu.tsx` and paste the component code (see Component Code section below).

3. **Install utility function:**

Ensure you have the `cn` utility function in your project:

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Dependencies

- **React** (^18.0.0 or higher)
- **radix-ui** - Provides the underlying dropdown menu primitives
- **lucide-react** - Icon library (Check, ChevronRight, Circle icons)
- **Tailwind CSS** - For styling
- **TypeScript** (optional but recommended)

## Component Architecture

The Dropdown Menu is composed of multiple sub-components:

### Core Components

| Component | Description |
|-----------|-------------|
| `DropdownMenu` | Root wrapper component that manages menu state |
| `DropdownMenuTrigger` | Button that toggles the menu open/closed |
| `DropdownMenuContent` | Container for menu items with positioning |
| `DropdownMenuPortal` | Portal wrapper for rendering outside DOM hierarchy |

### Menu Items

| Component | Description |
|-----------|-------------|
| `DropdownMenuItem` | Standard clickable menu item |
| `DropdownMenuCheckboxItem` | Menu item with checkbox indicator |
| `DropdownMenuRadioItem` | Menu item with radio button indicator |
| `DropdownMenuLabel` | Non-interactive text label for sections |

### Organization

| Component | Description |
|-----------|-------------|
| `DropdownMenuGroup` | Groups related menu items |
| `DropdownMenuSeparator` | Visual divider between menu sections |
| `DropdownMenuRadioGroup` | Container for radio button items |

### Nested Menus

| Component | Description |
|-----------|-------------|
| `DropdownMenuSub` | Wrapper for submenu functionality |
| `DropdownMenuSubTrigger` | Opens a submenu with chevron indicator |
| `DropdownMenuSubContent` | Content container for submenu items |

### Utilities

| Component | Description |
|-----------|-------------|
| `DropdownMenuShortcut` | Displays keyboard shortcuts (non-functional, visual only) |

## Usage

### Basic Example

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function DropdownMenuDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Example with Icons and Shortcuts

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User, Settings, LogOut } from "lucide-react"

export function DropdownWithIcons() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Account</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem>
          <User />
          <span>Profile</span>
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings />
          <span>Settings</span>
          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LogOut />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Example with Groups and Separators

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User, CreditCard, Settings, Users, LogOut } from "lucide-react"

export function GroupedDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">My Account</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            <span>Billing</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <Users />
          <span>Team</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive">
          <LogOut />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Example with Checkbox Items

```tsx
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function CheckboxDropdown() {
  const [showStatusBar, setShowStatusBar] = useState(true)
  const [showActivityBar, setShowActivityBar] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">View Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showStatusBar}
          onCheckedChange={setShowStatusBar}
        >
          Status Bar
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showActivityBar}
          onCheckedChange={setShowActivityBar}
        >
          Activity Bar
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showPanel}
          onCheckedChange={setShowPanel}
        >
          Panel
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Example with Radio Group

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function RadioGroupDropdown() {
  const [position, setPosition] = useState("bottom")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Position: {position}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Panel Position</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
          <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Example with Submenu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Mail, MessageSquare, PlusCircle } from "lucide-react"

export function SubmenuDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem>
          <Mail />
          <span>Email</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <MessageSquare />
          <span>Message</span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PlusCircle />
            <span>More Options</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>
              <span>Email Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Notification Settings</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## Props/API Reference

### DropdownMenu (Root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultOpen` | `boolean` | `false` | The initial open state (uncontrolled) |
| `open` | `boolean` | - | The controlled open state |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when open state changes |
| `modal` | `boolean` | `true` | Whether the dropdown behaves as modal |
| `dir` | `"ltr" \| "rtl"` | - | Reading direction for the dropdown |

### DropdownMenuTrigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asChild` | `boolean` | `false` | Merge props onto child element |

**Data Attributes:**
- `[data-state]`: "open" \| "closed"
- `[data-disabled]`: Present when disabled

### DropdownMenuContent

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `sideOffset` | `number` | `4` | Distance from trigger in pixels |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Alignment relative to trigger |
| `side` | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | Preferred side of trigger |
| `loop` | `boolean` | `false` | Whether keyboard navigation loops |
| `avoidCollisions` | `boolean` | `true` | Prevent content from overflowing viewport |

### DropdownMenuItem

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `inset` | `boolean` | `false` | Add left padding for alignment |
| `variant` | `"destructive"` | - | Apply destructive styling |
| `disabled` | `boolean` | `false` | Disable the item |
| `onSelect` | `(event: Event) => void` | - | Callback when item is selected |

### DropdownMenuCheckboxItem

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `checked` | `boolean \| "indeterminate"` | - | Checked state |
| `onCheckedChange` | `(checked: boolean) => void` | - | Callback when checked state changes |

### DropdownMenuRadioGroup

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | The selected value |
| `onValueChange` | `(value: string) => void` | - | Callback when value changes |

### DropdownMenuRadioItem

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `value` | `string` | - | The value of this item |
| `disabled` | `boolean` | `false` | Disable the item |

### DropdownMenuLabel

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `inset` | `boolean` | `false` | Add left padding for alignment |

### DropdownMenuSeparator

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

### DropdownMenuShortcut

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |

**Note:** The shortcut component is purely visual and doesn't implement actual keyboard shortcuts.

## Styling

The component uses Tailwind CSS for styling with the following design tokens:

- `border` - Border color
- `bg-popover` - Background color
- `text-popover-foreground` - Text color
- `bg-accent` - Focus/hover background
- `text-accent-foreground` - Focus/hover text
- `text-destructive` - Destructive variant text
- `bg-destructive/5` - Destructive variant background
- `text-muted-foreground` - Muted text (labels, shortcuts)

### Custom Styling

You can customize the appearance by:

1. **Passing className prop:**
```tsx
<DropdownMenuContent className="w-64 bg-slate-900 text-white">
  {/* items */}
</DropdownMenuContent>
```

2. **Using CSS variables in your global styles:**
```css
:root {
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
}

.dark {
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
}
```

## Accessibility

The Dropdown Menu component is built on Radix UI and includes:

- **Keyboard Navigation:**
  - `Space/Enter` - Open/select item
  - `Arrow keys` - Navigate items
  - `Esc` - Close menu
  - `Tab` - Move focus outside menu

- **Screen Reader Support:**
  - ARIA roles and attributes
  - Proper focus management
  - Accessible labels

- **Focus Management:**
  - Automatic focus on open
  - Focus trap when modal
  - Return focus on close

## Best Practices

1. **Use asChild for Trigger:**
   ```tsx
   <DropdownMenuTrigger asChild>
     <Button>Menu</Button>
   </DropdownMenuTrigger>
   ```
   This prevents wrapping the button in an extra element.

2. **Set Meaningful Width:**
   ```tsx
   <DropdownMenuContent className="w-56">
   ```
   This ensures consistent sizing and prevents content overflow.

3. **Use Separators for Grouping:**
   Visually separate related items for better UX.

4. **Mark Destructive Actions:**
   ```tsx
   <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
   ```

5. **Disable Items When Needed:**
   ```tsx
   <DropdownMenuItem disabled>Coming Soon</DropdownMenuItem>
   ```

6. **Provide Visual Feedback:**
   Include icons and shortcuts to help users understand actions.

7. **Control Menu State When Needed:**
   ```tsx
   const [open, setOpen] = useState(false)
   <DropdownMenu open={open} onOpenChange={setOpen}>
   ```

## Common Issues and Solutions

### Issue: Menu doesn't close on item select

**Solution:** By default, menu items close the menu on selection. If you need to prevent this:

```tsx
<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
  Keep Open
</DropdownMenuItem>
```

### Issue: Icons not aligned properly

**Solution:** Ensure you're using the component's built-in icon spacing:

```tsx
<DropdownMenuItem>
  <IconComponent /> {/* Icons are automatically sized and spaced */}
  <span>Text</span>
</DropdownMenuItem>
```

### Issue: Submenu appears in wrong position

**Solution:** Ensure the `DropdownMenuSubContent` is inside `DropdownMenuSub`:

```tsx
<DropdownMenuSub>
  <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
  <DropdownMenuSubContent>
    {/* items */}
  </DropdownMenuSubContent>
</DropdownMenuSub>
```

### Issue: Menu cut off by container

**Solution:** Use `DropdownMenuPortal` to render outside the container:

```tsx
<DropdownMenuContent> {/* Portal is used by default */}
  {/* items */}
</DropdownMenuContent>
```

## Component Code

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger className="select-none" data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        'flex cursor-default gap-2 select-none items-center rounded-md px-2 py-1.5 text-sm outline-hidden',
        'focus:bg-accent focus:text-foreground',
        'data-[state=open]:bg-accent data-[state=open]:text-foreground',
        'data-[here=true]:bg-accent data-[here=true]:text-foreground',
        '[&>svg]:pointer-events-none [&_svg:not([role=img]):not([class*=text-])]:opacity-60 [&>svg]:size-4 [&>svg]:shrink-0',
        inset && 'ps-8',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight data-slot="dropdown-menu-sub-trigger-indicator" className="ms-auto size-3.5! rtl:rotate-180" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'space-y-0.5 z-50 min-w-[8rem] overflow-hidden shadow-md shadow-black/5 rounded-md border border-border bg-popover text-popover-foreground p-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'space-y-0.5 z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md shadow-black/5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'destructive';
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'text-foreground relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden transition-colors data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([role=img]):not([class*=text-])]:opacity-60 [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0',
        'focus:bg-accent focus:text-foreground',
        'data-[active=true]:bg-accent data-[active=true]:text-accent-foreground',
        inset && 'ps-8',
        variant === 'destructive' &&
          'text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/5 focus:bg-destructive/5 data-[active=true]:bg-destructive/5',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        'relative flex cursor-default select-none items-center rounded-md py-1.5 ps-8 pe-2 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute start-2 flex h-3.5 w-3.5 items-center text-muted-foreground justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-primary" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        'relative flex cursor-default select-none items-center rounded-md py-1.5 ps-6 pe-2 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute start-1.5 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="h-1.5 w-1.5 fill-primary stroke-primary" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn('px-2 py-1.5 text-xs text-muted-foreground font-medium', inset && 'ps-8', className)}
      {...props}
    />
  );
}

function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-2 my-1.5 h-px bg-muted', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('ms-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
```

## Additional Resources

- [ReUI Official Documentation](https://reui.io/docs/dropdown-menu)
- [Radix UI Dropdown Menu Docs](https://www.radix-ui.com/primitives/docs/components/dropdown-menu)
- [GitHub Repository](https://github.com/keenthemes/reui)
- [Lucide React Icons](https://lucide.dev)

## Credits

- Built with [Radix UI Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu)
- Part of the [ReUI Component Library](https://reui.io)
- Maintained by [KeenThemes](https://github.com/keenthemes)
