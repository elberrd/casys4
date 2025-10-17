# ReUI - Checkbox

> Source: https://reui.io/docs/checkbox
> Built with: Radix UI Checkbox (https://www.radix-ui.com/primitives/docs/components/checkbox)
> Version: Latest
> Last Updated: 2025-10-16

## Overview

The Checkbox component is a control that allows users to toggle between checked, unchecked, and indeterminate states. It's built on top of Radix UI's Checkbox primitive and styled with Tailwind CSS using class-variance-authority for flexible sizing options.

**Key Features:**
- Supports checked, unchecked, and indeterminate states
- Three size variants (small, medium, large)
- Full keyboard navigation
- Built-in accessibility features
- Form validation support with error states
- Can be controlled or uncontrolled
- Automatic form integration

## Installation

### Using CLI (Recommended)

Install the checkbox component using the ReUI CLI:

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/checkbox

# Using npm
npx shadcn@latest add @reui/checkbox

# Using yarn
yarn dlx shadcn@latest add @reui/checkbox

# Using bun
bunx shadcn@latest add @reui/checkbox
```

### Manual Installation

If you prefer manual installation, install the required dependencies:

```bash
# Using pnpm
pnpm add clsx tailwind-merge class-variance-authority lucide-react radix-ui

# Using npm
npm install clsx tailwind-merge class-variance-authority lucide-react radix-ui

# Using yarn
yarn add clsx tailwind-merge class-variance-authority lucide-react radix-ui

# Using bun
bun add clsx tailwind-merge class-variance-authority lucide-react radix-ui
```

## Required Dependencies

- **clsx**: Utility for constructing className strings conditionally
- **tailwind-merge**: Utility for merging Tailwind CSS classes
- **class-variance-authority**: For managing component variants
- **lucide-react**: Icon library (Check and Minus icons)
- **radix-ui**: Headless UI primitives

## Component Structure

The Checkbox component consists of two main parts:

1. **Checkbox.Root**: The main checkbox container
2. **Checkbox.Indicator**: The visual indicator (checkmark or minus icon)

## Usage

### Basic Import

```tsx
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
```

### Props/API Reference

The Checkbox component extends all props from `Radix UI Checkbox.Root` and includes additional styling variants.

#### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant of the checkbox |
| `className` | `string` | - | Additional CSS classes |
| `checked` | `boolean \| 'indeterminate'` | - | Controlled checked state |
| `defaultChecked` | `boolean \| 'indeterminate'` | - | Default checked state (uncontrolled) |
| `onCheckedChange` | `(checked: boolean \| 'indeterminate') => void` | - | Callback when checked state changes |
| `disabled` | `boolean` | `false` | Whether the checkbox is disabled |
| `required` | `boolean` | `false` | Whether the checkbox is required |
| `name` | `string` | - | Name attribute for form submission |
| `value` | `string` | `'on'` | Value attribute for form submission |
| `id` | `string` | - | HTML id attribute |

#### Data Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `data-state` | `'checked' \| 'unchecked' \| 'indeterminate'` | Current state of the checkbox |
| `data-disabled` | Present when disabled | Indicates disabled state |
| `aria-invalid` | `true \| false` | Indicates validation error state |

#### Size Variants

- **sm**: `size-4.5` (18px) with `size-3` icons
- **md**: `size-5` (20px) with `size-3.5` icons (default)
- **lg**: `size-5.5` (22px) with `size-4` icons

## Code Examples

### Example 1: Basic Usage (Uncontrolled)

A simple checkbox with a label, using uncontrolled state:

```tsx
'use client';

import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function BasicCheckbox() {
  const id = useId();

  return (
    <div className="flex items-center space-x-2">
      <Checkbox id={id} />
      <Label htmlFor={id}>Accept terms and conditions</Label>
    </div>
  );
}
```

### Example 2: Controlled Checkbox

A checkbox with controlled state management:

```tsx
'use client';

import { useId, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function ControlledCheckbox() {
  const id = useId();
  const [checked, setChecked] = useState<boolean>(true);

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => setChecked(!!value)}
      />
      <Label htmlFor={id}>Accept terms and conditions</Label>
    </div>
  );
}
```

### Example 3: Different Sizes

Demonstrating all three size variants:

```tsx
'use client';

import { useId, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function CheckboxSizes() {
  const id1 = useId();
  const id2 = useId();
  const id3 = useId();

  const [checked1, setChecked1] = useState<boolean>(true);
  const [checked2, setChecked2] = useState<boolean>(true);
  const [checked3, setChecked3] = useState<boolean>(true);

  return (
    <div className="space-y-5">
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id1}
          checked={checked1}
          size="sm"
          onCheckedChange={(value) => setChecked1(!!value)}
        />
        <Label htmlFor={id1}>Small</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id={id2}
          checked={checked2}
          onCheckedChange={(value) => setChecked2(!!value)}
        />
        <Label htmlFor={id2}>Medium (Default)</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id={id3}
          checked={checked3}
          size="lg"
          onCheckedChange={(value) => setChecked3(!!value)}
        />
        <Label htmlFor={id3}>Large</Label>
      </div>
    </div>
  );
}
```

### Example 4: Disabled State

A checkbox in disabled state:

```tsx
'use client';

import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function DisabledCheckbox() {
  const id = useId();

  return (
    <div className="flex items-center space-x-2">
      <Checkbox id={id} disabled />
      <Label htmlFor={id}>Disabled state</Label>
    </div>
  );
}
```

### Example 5: Indeterminate State

A checkbox with indeterminate state (useful for "select all" functionality):

```tsx
'use client';

import { useId, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function IndeterminateCheckbox() {
  const id = useId();
  const [checked, setChecked] = useState<boolean | 'indeterminate'>('indeterminate');

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={setChecked}
      />
      <Label htmlFor={id}>Indeterminate state</Label>
    </div>
  );
}
```

### Example 6: Form Integration with React Hook Form

Complete form example with validation using React Hook Form and Zod:

```tsx
'use client';

import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Define form schema with validation
const FormSchema = z.object({
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions.',
  }),
});

export default function CheckboxForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { acceptTerms: false },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast.custom((t) => (
      <Alert variant="mono" icon="primary" onClose={() => toast.dismiss(t)}>
        <AlertIcon>
          <RiCheckboxCircleFill />
        </AlertIcon>
        <AlertTitle>Your form has successfully submitted</AlertTitle>
      </Alert>
    ));
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-[300px] space-y-6">
        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>I accept the terms and conditions</FormLabel>
              </div>
              <FormDescription>You need to agree to proceed.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-end gap-2.5">
          <Button type="reset" variant="outline">
            Reset
          </Button>
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </Form>
  );
}
```

**Additional dependencies for this example:**
```bash
pnpm add @hookform/resolvers react-hook-form zod sonner @remixicon/react
```

### Example 7: Multiple Checkboxes with Group State

Managing a group of checkboxes with a "select all" checkbox:

```tsx
'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function CheckboxGroup() {
  const [items, setItems] = useState([
    { id: '1', label: 'Option 1', checked: false },
    { id: '2', label: 'Option 2', checked: false },
    { id: '3', label: 'Option 3', checked: false },
  ]);

  const allChecked = items.every(item => item.checked);
  const someChecked = items.some(item => item.checked) && !allChecked;

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setItems(items.map(item => ({ ...item, checked: checked === true })));
  };

  const handleItemChange = (id: string, checked: boolean | 'indeterminate') => {
    setItems(items.map(item =>
      item.id === id ? { ...item, checked: checked === true } : item
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 border-b pb-2">
        <Checkbox
          checked={allChecked ? true : someChecked ? 'indeterminate' : false}
          onCheckedChange={handleSelectAll}
        />
        <Label className="font-semibold">Select All</Label>
      </div>

      <div className="space-y-3 pl-6">
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox
              checked={item.checked}
              onCheckedChange={(checked) => handleItemChange(item.id, checked)}
            />
            <Label>{item.label}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Accessibility

The ReUI Checkbox component adheres to the [WAI-ARIA tri-state Checkbox design pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/).

### Features:

- **Keyboard Navigation**: Full keyboard support with `Space` key to toggle
- **Screen Reader Support**: Proper ARIA attributes for state announcement
- **Focus Management**: Visible focus ring on keyboard focus
- **Label Association**: Proper `htmlFor` and `id` linking between label and checkbox
- **Form Integration**: Automatic form submission support with hidden input elements
- **Error States**: Support for `aria-invalid` attribute for form validation

### Keyboard Interactions

| Key | Action |
|-----|--------|
| `Space` | Toggles the checkbox between checked and unchecked states |
| `Tab` | Moves focus to or away from the checkbox |

### Best Practices for Accessibility

1. **Always provide a label**: Use the `Label` component with proper `htmlFor` attribute
2. **Use unique IDs**: Generate unique IDs using React's `useId()` hook
3. **Provide context**: Use `FormDescription` to give users additional context
4. **Error handling**: Show clear error messages using `FormMessage` component
5. **Group related checkboxes**: Use fieldset and legend for checkbox groups

## Styling and Customization

### Default Styles

The component includes:
- **Focus states**: Ring outline on keyboard focus
- **Disabled states**: Reduced opacity and cursor change
- **Error states**: Red border and ring for validation errors
- **Checked states**: Primary color background with white checkmark
- **Indeterminate states**: Primary color background with minus icon

### Custom Styling

You can customize the checkbox using the `className` prop:

```tsx
<Checkbox
  className="border-green-500 data-[state=checked]:bg-green-600"
/>
```

### Dark Mode Support

The component automatically supports dark mode through Tailwind CSS:
- Error states adjust for dark mode
- Background and border colors adapt automatically

## Common Use Cases

1. **Terms and Conditions**: Agreement checkboxes in signup forms
2. **Preferences**: User settings and configuration options
3. **Filters**: Multi-select filters in search interfaces
4. **Todo Lists**: Task completion tracking
5. **Permissions**: Role and permission management
6. **Bulk Actions**: Select items for batch operations
7. **Feature Toggles**: Enable/disable features in admin panels

## Common Issues and Solutions

### Issue: Checkbox not updating visually
**Solution**: Make sure you're using the `onCheckedChange` callback to update state:
```tsx
<Checkbox checked={checked} onCheckedChange={setChecked} />
```

### Issue: Label not clickable
**Solution**: Ensure the Label's `htmlFor` matches the Checkbox's `id`:
```tsx
const id = useId();
<Checkbox id={id} />
<Label htmlFor={id}>Label text</Label>
```

### Issue: Form validation not working
**Solution**: Wrap the checkbox in `FormControl` and use proper form field setup:
```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormControl>
      <Checkbox
        checked={field.value}
        onCheckedChange={field.onChange}
      />
    </FormControl>
  )}
/>
```

### Issue: TypeScript errors with checked state
**Solution**: Use proper type annotation for indeterminate support:
```tsx
const [checked, setChecked] = useState<boolean | 'indeterminate'>(false);
```

## Related Components

- **Label**: Used to provide accessible labels for checkboxes
- **Form**: Form integration components for validation
- **Radio Group**: Alternative for single-choice selections
- **Switch**: Alternative for toggle-style binary choices

## Additional Resources

- [Radix UI Checkbox Documentation](https://www.radix-ui.com/primitives/docs/components/checkbox)
- [ReUI Documentation](https://reui.io/docs/checkbox)
- [WAI-ARIA Checkbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
- [React Hook Form Documentation](https://react-hook-form.com/)
