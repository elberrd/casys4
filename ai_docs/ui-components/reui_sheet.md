# ReUI - Sheet Component

> Source: https://reui.io/docs/sheet
> Library: ReUI (React UI Components)
> Built on: Radix UI Dialog Primitives
> Last Updated: 2025-10-16

## Overview

The Sheet component extends the Dialog component to display content that complements the main content of the screen. It slides in from the top, right, bottom, or left edge of the viewport, creating an overlay panel perfect for forms, navigation menus, settings panels, or any supplementary content that doesn't require a full page.

**Key Features:**
- Slides in from any side (top, right, bottom, left)
- Built-in overlay with blur effect
- Customizable close button
- Accessible with keyboard navigation
- RTL (Right-to-Left) support
- Scrollable content support
- Smooth animations and transitions

## Installation

### CLI Installation (Recommended)

Using the shadcn CLI with ReUI registry:

```bash
# pnpm
pnpm dlx shadcn@latest add @reui/sheet

# npm
npx shadcn@latest add @reui/sheet

# yarn
yarn dlx shadcn@latest add @reui/sheet

# bun
bunx shadcn@latest add @reui/sheet
```

### Manual Installation

If you prefer manual installation, you'll need to install the required dependencies and create the component files.

#### 1. Install Dependencies

```bash
npm install @radix-ui/react-dialog @radix-ui/react-direction lucide-react class-variance-authority clsx tailwind-merge
```

#### 2. Create Utility Function

Create `/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving any conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

#### 3. Create Sheet Component

Create `/components/ui/sheet.tsx` - see the complete component code in the Usage section below.

## Dependencies

**Required:**
- `react` (^18.0.0)
- `@radix-ui/react-dialog` - Dialog primitives
- `@radix-ui/react-direction` - RTL support
- `lucide-react` - Icons (X icon for close button)
- `class-variance-authority` - Variant management
- `clsx` - Conditional classNames
- `tailwind-merge` - Tailwind class merging

**Optional:**
- `@radix-ui/react-scroll-area` - For scrollable sheet content

## Usage

### Basic Sheet Example

The simplest implementation with a trigger button and feedback form:

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useDirection } from '@radix-ui/react-direction';

export default function FeedbackSheet() {
  const direction = useDirection();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent dir={direction}>
        <SheetHeader>
          <SheetTitle>Quick Feedback</SheetTitle>
          <SheetDescription>Share your feedback to help us improve.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-5">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your Name" />
            </div>
            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Your Email" />
            </div>
            {/* Feedback */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea id="feedback" placeholder="Describe your suggestion." rows={4} />
              <p className="text-sm text-muted-foreground">Please don't include any sensitive information</p>
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button type="submit">Submit Feedback</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

### Different Sides

The Sheet can slide in from any side of the viewport:

```tsx
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function SideVariants() {
  return (
    <div className="flex items-center gap-6">
      {/* Top Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Top</Button>
        </SheetTrigger>
        <SheetContent side="top">
          {/* Content */}
        </SheetContent>
      </Sheet>

      {/* Right Sheet (Default) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Right</Button>
        </SheetTrigger>
        <SheetContent side="right">
          {/* Content */}
        </SheetContent>
      </Sheet>

      {/* Bottom Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          {/* Content */}
        </SheetContent>
      </Sheet>

      {/* Left Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Left</Button>
        </SheetTrigger>
        <SheetContent side="left">
          {/* Content */}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

### Scrollable Content

For long content that requires scrolling, use the ScrollArea component:

```tsx
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDirection } from '@radix-ui/react-direction';

export default function ScrollableSheet() {
  const direction = useDirection();

  const faqSections = [
    {
      title: 'Account Management',
      content: 'Navigate to the registration page, provide the required information, and verify your email address.',
    },
    {
      title: 'Payment and Billing',
      content: 'We accept all major credit cards, PayPal, and bank transfers.',
    },
    // ... more FAQ items
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent className="p-0" dir={direction}>
        <SheetHeader className="py-4 px-5 border-b border-border">
          <SheetTitle>Quick Help</SheetTitle>
          <SheetDescription>Frequently Asked Questions (FAQ)</SheetDescription>
        </SheetHeader>
        <SheetBody className="py-0 px-5 grow">
          <ScrollArea className="text-sm h-[calc(100dvh-190px)] pe-3 -me-3">
            <div className="space-y-4 [&_h3]:font-semibold [&_h3]:text-foreground">
              {faqSections.map((faq, index) => (
                <div key={index} className="text-accent-foreground space-y-1">
                  <h3>{faq.title}</h3>
                  <p>{faq.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetBody>
        <SheetFooter className="py-4 px-5 border-t border-border">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button type="submit">Submit Feedback</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

### Controlled State

Manage the Sheet's open state programmatically:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function ControlledSheet() {
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    // Perform submission logic
    console.log('Submitted!');

    // Close the sheet
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">Open Controlled Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Controlled Sheet</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <p>This sheet's state is controlled externally.</p>
        </SheetBody>
        <SheetFooter>
          <Button onClick={handleSubmit}>Submit & Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

### Without Overlay or Close Button

Customize the Sheet appearance by hiding the overlay or close button:

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button>Open</Button>
  </SheetTrigger>
  {/* No overlay, no close button */}
  <SheetContent overlay={false} close={false}>
    <SheetHeader>
      <SheetTitle>No Overlay or Close Button</SheetTitle>
    </SheetHeader>
    <SheetBody>
      <p>You must use the footer buttons to close this sheet.</p>
    </SheetBody>
    <SheetFooter>
      <SheetClose asChild>
        <Button>Close</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

## Component API Reference

The Sheet component is built on Radix UI Dialog primitives. Below are all components and their props.

### Sheet (Root)

The root component that manages state.

```tsx
interface SheetProps {
  defaultOpen?: boolean;      // Initial open state (uncontrolled)
  open?: boolean;             // Controlled open state
  onOpenChange?: (open: boolean) => void;  // State change callback
  modal?: boolean;            // Modal behavior (default: true)
}
```

**Example:**
```tsx
<Sheet defaultOpen={false}>
  {/* ... */}
</Sheet>
```

### SheetTrigger

Button or element that opens the sheet.

```tsx
interface SheetTriggerProps {
  asChild?: boolean;  // Render as child element (default: false)
}
```

**Data Attributes:**
- `[data-state]`: "open" | "closed"

**Example:**
```tsx
<SheetTrigger asChild>
  <Button>Open Sheet</Button>
</SheetTrigger>
```

### SheetContent

The main content container for the sheet.

```tsx
interface SheetContentProps {
  side?: 'top' | 'right' | 'bottom' | 'left';  // Side to slide from (default: 'right')
  overlay?: boolean;          // Show overlay (default: true)
  close?: boolean;            // Show close button (default: true)
  className?: string;         // Additional CSS classes
  dir?: 'ltr' | 'rtl';       // Text direction for RTL support
  // All standard Radix Dialog.Content props
}
```

**Default Sizes:**
- **Left/Right**: 75% width on mobile, max 384px (sm:max-w-sm) on larger screens
- **Top/Bottom**: Full width (inset-x-0)

**Data Attributes:**
- `[data-state]`: "open" | "closed"

**Example:**
```tsx
<SheetContent side="right" overlay={true} close={true}>
  {/* Content */}
</SheetContent>
```

### SheetHeader

Container for title and description with standardized spacing.

```tsx
interface SheetHeaderProps {
  className?: string;
}
```

**Default Styles:**
- Flexbox column layout
- Vertical spacing between children
- Centered on mobile, left-aligned on desktop

**Example:**
```tsx
<SheetHeader>
  <SheetTitle>Title Here</SheetTitle>
  <SheetDescription>Description here</SheetDescription>
</SheetHeader>
```

### SheetTitle

Accessible title for the sheet.

```tsx
interface SheetTitleProps {
  className?: string;
}
```

**Default Styles:**
- Base font size (text-base)
- Semibold font weight
- Foreground color

**Example:**
```tsx
<SheetTitle>Edit Profile</SheetTitle>
```

### SheetDescription

Accessible description for the sheet.

```tsx
interface SheetDescriptionProps {
  className?: string;
}
```

**Default Styles:**
- Small font size (text-sm)
- Muted foreground color

**Example:**
```tsx
<SheetDescription>Make changes to your profile here.</SheetDescription>
```

### SheetBody

Container for the main content with default padding.

```tsx
interface SheetBodyProps {
  className?: string;
}
```

**Default Styles:**
- Vertical padding (py-2.5)

**Example:**
```tsx
<SheetBody>
  <form>{/* Form fields */}</form>
</SheetBody>
```

### SheetFooter

Container for footer actions (buttons).

```tsx
interface SheetFooterProps {
  className?: string;
}
```

**Default Styles:**
- Column-reverse layout on mobile
- Row layout on desktop (sm:flex-row)
- Right-aligned on desktop
- Horizontal spacing between items

**Example:**
```tsx
<SheetFooter>
  <SheetClose asChild>
    <Button variant="outline">Cancel</Button>
  </SheetClose>
  <Button type="submit">Save</Button>
</SheetFooter>
```

### SheetClose

Button or element that closes the sheet.

```tsx
interface SheetCloseProps {
  asChild?: boolean;  // Render as child element (default: false)
}
```

**Example:**
```tsx
<SheetClose asChild>
  <Button variant="outline">Cancel</Button>
</SheetClose>
```

### SheetOverlay

The backdrop overlay (usually managed automatically by SheetContent).

```tsx
interface SheetOverlayProps {
  className?: string;
}
```

**Default Styles:**
- Fixed positioning covering viewport
- Semi-transparent black background (bg-black/30)
- Blur effect (backdrop-filter: blur(4px))
- Fade in/out animations

### SheetPortal

Portal component for rendering sheet outside normal DOM hierarchy.

```tsx
interface SheetPortalProps {
  container?: HTMLElement;  // Custom portal target (default: document.body)
  forceMount?: boolean;     // Force mount regardless of state
}
```

## Accessibility

The Sheet component follows WAI-ARIA Dialog patterns and includes:

### Keyboard Navigation
- **Tab**: Navigate through interactive elements
- **Shift + Tab**: Navigate backwards
- **Escape**: Close the sheet
- **Space/Enter**: Activate buttons

### Screen Reader Support
- `SheetTitle` is automatically announced
- `SheetDescription` provides additional context
- Close button has accessible label ("Close")
- Focus is trapped within the sheet when open
- Focus returns to trigger element when closed

### ARIA Attributes
- `role="dialog"` on content
- `aria-labelledby` references title
- `aria-describedby` references description
- `aria-modal="true"` when modal

### Focus Management
- Auto-focus on first focusable element when opened
- Focus trap keeps keyboard navigation within sheet
- Focus restoration to trigger on close

## Best Practices

### 1. Use Appropriate Side
```tsx
// Right side for forms and settings (common in Western UIs)
<SheetContent side="right">

// Left side for navigation menus
<SheetContent side="left">

// Bottom for mobile-first actions
<SheetContent side="bottom">

// Top for notifications or announcements
<SheetContent side="top">
```

### 2. Always Include Title and Description
```tsx
// Good - Accessible and clear
<SheetHeader>
  <SheetTitle>Edit Profile</SheetTitle>
  <SheetDescription>
    Update your personal information and preferences
  </SheetDescription>
</SheetHeader>

// Avoid - Missing context for screen readers
<SheetHeader>
  <SheetTitle>Edit</SheetTitle>
</SheetHeader>
```

### 3. Use SheetClose for Dismissal Actions
```tsx
// Good - Properly closes the sheet
<SheetFooter>
  <SheetClose asChild>
    <Button variant="outline">Cancel</Button>
  </SheetClose>
</SheetFooter>

// Avoid - Manual state management when not needed
<Button onClick={() => setOpen(false)}>Cancel</Button>
```

### 4. Manage Scrollable Content
```tsx
// Good - Proper scroll container with fixed header/footer
<SheetContent className="p-0">
  <SheetHeader className="py-4 px-5 border-b">
    {/* Header content */}
  </SheetHeader>
  <SheetBody className="py-0 px-5 grow">
    <ScrollArea className="h-[calc(100dvh-190px)]">
      {/* Scrollable content */}
    </ScrollArea>
  </SheetBody>
  <SheetFooter className="py-4 px-5 border-t">
    {/* Footer content */}
  </SheetFooter>
</SheetContent>
```

### 5. Use Controlled State for Complex Interactions
```tsx
// Good - Form validation before closing
const [open, setOpen] = useState(false);

const handleSubmit = async (data) => {
  const isValid = await validateForm(data);
  if (isValid) {
    await saveData(data);
    setOpen(false); // Only close if valid
  }
};
```

### 6. Consider Mobile Experience
```tsx
// Good - Different behavior for mobile
<SheetContent
  side={isMobile ? "bottom" : "right"}
  className={isMobile ? "h-[90vh]" : ""}
>
  {/* Content */}
</SheetContent>
```

### 7. RTL Support
```tsx
import { useDirection } from '@radix-ui/react-direction';

export default function MySheet() {
  const direction = useDirection();

  return (
    <SheetContent dir={direction}>
      {/* Content adapts to text direction */}
    </SheetContent>
  );
}
```

## Styling and Customization

### Custom Width/Height

```tsx
// Custom width for right/left sheets
<SheetContent side="right" className="sm:max-w-lg">
  {/* 512px max width instead of default 384px */}
</SheetContent>

// Custom height for top/bottom sheets
<SheetContent side="bottom" className="h-[60vh]">
  {/* 60% viewport height */}
</SheetContent>
```

### Custom Animations

The sheet uses CSS animations defined in your Tailwind config. Customize by modifying:

```css
/* In your globals.css or tailwind.config.js */
@keyframes slide-in-from-right {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}
```

### Custom Overlay

```tsx
// Custom overlay with different opacity
<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetPortal>
    <SheetOverlay className="bg-black/50" />
    <SheetContent overlay={false}>
      {/* Content */}
    </SheetContent>
  </SheetPortal>
</Sheet>
```

## Common Issues and Solutions

### Issue 1: Sheet Not Closing on Overlay Click

**Problem**: Sheet doesn't close when clicking outside.

**Solution**: Ensure `modal={true}` (default) and don't set `onPointerDownOutside` to prevent default behavior:

```tsx
<Sheet modal={true}>
  <SheetContent>
    {/* Content */}
  </SheetContent>
</Sheet>
```

### Issue 2: Content Cut Off or Not Scrolling

**Problem**: Long content is cut off or scrolling doesn't work.

**Solution**: Use ScrollArea component and calculate proper height:

```tsx
<SheetContent className="p-0">
  <SheetHeader className="py-4 px-5">
    <SheetTitle>Title</SheetTitle>
  </SheetHeader>
  <SheetBody className="px-5 overflow-hidden">
    <ScrollArea className="h-[calc(100dvh-160px)]">
      {/* Long content */}
    </ScrollArea>
  </SheetBody>
</SheetContent>
```

### Issue 3: Focus Not Trapped in Sheet

**Problem**: Tab key navigates to elements behind the sheet.

**Solution**: Ensure proper Dialog structure and don't use `modal={false}`:

```tsx
<Sheet modal={true}>
  {/* Default modal behavior traps focus */}
</Sheet>
```

### Issue 4: Animation Glitches

**Problem**: Sheet slides in incorrectly or from wrong direction.

**Solution**: Verify the `side` prop matches your desired direction and check Tailwind animation classes are properly configured:

```tsx
// Ensure animations are in your tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        // ... other directions
      },
    },
  },
};
```

### Issue 5: RTL Direction Issues

**Problem**: Sheet slides from wrong side in RTL layouts.

**Solution**: Use the `useDirection` hook and pass to SheetContent:

```tsx
import { useDirection } from '@radix-ui/react-direction';

function MySheet() {
  const direction = useDirection();

  return (
    <SheetContent dir={direction}>
      {/* Content */}
    </SheetContent>
  );
}
```

## TypeScript Support

Full TypeScript support with proper type definitions:

```tsx
import type { ComponentProps } from 'react';
import type { VariantProps } from 'class-variance-authority';

// Infer prop types from components
type SheetTriggerProps = ComponentProps<typeof SheetTrigger>;
type SheetContentProps = ComponentProps<typeof SheetContent>;

// Custom sheet with typed props
interface CustomSheetProps {
  title: string;
  description: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function CustomSheet({ title, description, children, side = 'right' }: CustomSheetProps) {
  return (
    <Sheet>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}
```

## Complete Component Code

Here's the complete Sheet component implementation:

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/30 [backdrop-filter:blur(4px)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  );
}

const sheetVariants = cva(
  'flex flex-col items-strech fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-400',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 start-0 h-full w-3/4 border-e data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm rtl:data-[state=closed]:slide-out-to-right rtl:data-[state=open]:slide-in-from-right',
        right:
          'inset-y-0 end-0 h-full w-3/4  border-s data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm rtl:data-[state=closed]:slide-out-to-left rtl:data-[state=open]:slide-in-from-left',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

interface SheetContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  overlay?: boolean;
  close?: boolean;
}

function SheetContent({
  side = 'right',
  overlay = true,
  close = true,
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & SheetContentProps) {
  return (
    <SheetPortal>
      {overlay && <SheetOverlay />}
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        {close && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            className="cursor-pointer absolute end-5 top-4 rounded-sm opacity-60 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col space-y-1 text-center sm:text-start', className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-body" className={cn('py-2.5', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-base font-semibold text-foreground', className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
```

## Related Components

- **Dialog**: For modal dialogs that appear centered
- **Drawer**: Similar to Sheet but with different behavior
- **Popover**: For smaller contextual overlays
- **ScrollArea**: For scrollable content within sheets

## Credits

- Built with [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- Maintained by [ReUI](https://reui.io)
- Inspired by shadcn/ui design patterns

## Additional Resources

- [ReUI Documentation](https://reui.io/docs/sheet)
- [Radix UI Dialog Documentation](https://www.radix-ui.com/primitives/docs/components/dialog)
- [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
