# ReUI - Input

> Source: https://reui.io/docs/input
> Library: ReUI (React UI Component Library)
> Last Updated: 2025-10-16

## Overview

The ReUI Input component is a highly customizable and feature-rich form input field built on top of React, TypeScript, Tailwind CSS, Radix UI, and React Aria. It extends the native HTML `<input>` element with additional styling, size variants, and advanced composition patterns including input groups, addons, wrappers, and icon support.

The component supports various input types including text, email, password, file, date, time, and datetime inputs, with built-in accessibility features and validation states.

## Installation

### CLI Installation (Recommended)

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/input

# Using npm
npx shadcn@latest add @reui/input

# Using yarn
yarn dlx shadcn@latest add @reui/input

# Using bun
bunx shadcn@latest add @reui/input
```

### Manual Installation

#### Install Dependencies

```bash
# Using pnpm
pnpm add clsx tailwind-merge class-variance-authority

# Using npm
npm install clsx tailwind-merge class-variance-authority

# Using yarn
yarn add clsx tailwind-merge class-variance-authority
```

#### Required Files

You'll need to create the following files in your project:

1. **`components/ui/input.tsx`** - Main Input component
2. **`lib/utils.ts`** - Utility function for class name merging

## Component Structure

The Input component consists of four main sub-components:

- **`Input`** - The base input field
- **`InputAddon`** - Text or icon addons that appear alongside inputs
- **`InputGroup`** - Container for combining inputs with addons
- **`InputWrapper`** - Wrapper for inputs with inline icons

## Usage

### Basic Input

```tsx
import { Input } from '@/components/ui/input';

export default function BasicInput() {
  return (
    <div className="w-80">
      <Input type="email" placeholder="Email" />
    </div>
  );
}
```

### Disabled State

```tsx
import { Input } from '@/components/ui/input';

export default function DisabledInput() {
  return (
    <div className="w-80">
      <Input type="email" placeholder="Email" disabled />
    </div>
  );
}
```

### Readonly State

```tsx
import { Input } from '@/components/ui/input';

export default function ReadonlyInput() {
  return (
    <div className="w-80">
      <Input type="email" placeholder="Email" value="john@example.com" readOnly />
    </div>
  );
}
```

### Size Variants

```tsx
import { Input } from '@/components/ui/input';

export default function InputSizes() {
  return (
    <div className="space-y-4 w-80">
      {/* Small */}
      <Input variant="sm" type="email" placeholder="Small input" />

      {/* Medium (default) */}
      <Input variant="md" type="email" placeholder="Medium input" />

      {/* Large */}
      <Input variant="lg" type="email" placeholder="Large input" />
    </div>
  );
}
```

### Input with Addons

Input groups allow you to add text or icon addons to the start or end of an input field.

```tsx
import { Input, InputAddon, InputGroup } from '@/components/ui/input';
import { Euro, TicketPercent } from 'lucide-react';

export default function InputWithAddons() {
  return (
    <div className="space-y-5 w-80">
      {/* Text addon at start */}
      <InputGroup>
        <InputAddon>Addon</InputAddon>
        <Input type="email" placeholder="Start addon" />
      </InputGroup>

      {/* Text addon at end */}
      <InputGroup>
        <Input type="email" placeholder="End addon" />
        <InputAddon>Addon</InputAddon>
      </InputGroup>

      {/* Icon addon at start */}
      <InputGroup>
        <InputAddon mode="icon">
          <Euro />
        </InputAddon>
        <Input type="email" placeholder="Start icon addon" />
      </InputGroup>

      {/* Icon addon at end */}
      <InputGroup>
        <Input type="email" placeholder="End icon addon" />
        <InputAddon mode="icon">
          <TicketPercent />
        </InputAddon>
      </InputGroup>
    </div>
  );
}
```

### Input with Icons

Use `InputWrapper` to add inline icons inside the input field.

```tsx
import { Button } from '@/components/ui/button';
import { Input, InputWrapper } from '@/components/ui/input';
import { Euro, TicketPercent, User, X } from 'lucide-react';

export default function InputWithIcons() {
  return (
    <div className="space-y-5 w-80">
      {/* Icon at start */}
      <InputWrapper>
        <Euro />
        <Input type="email" placeholder="Start icon" />
      </InputWrapper>

      {/* Icon at end */}
      <InputWrapper>
        <Input type="email" placeholder="End icon" />
        <TicketPercent />
      </InputWrapper>

      {/* Clickable icon at start */}
      <InputWrapper>
        <Button size="sm" variant="dim" mode="icon" className="size-5 -ms-0.5">
          <User />
        </Button>
        <Input type="email" placeholder="Start clickable icon" />
      </InputWrapper>

      {/* Clickable icon at end (clear button) */}
      <InputWrapper>
        <Input type="email" placeholder="End clickable icon" />
        <Button size="sm" variant="dim" mode="icon" className="size-5 -me-0.5">
          <X />
        </Button>
      </InputWrapper>
    </div>
  );
}
```

### File Input

```tsx
import { Input } from '@/components/ui/input';

export default function FileInput() {
  return (
    <div className="w-80">
      <Input type="file" />
    </div>
  );
}
```

### Date Input

```tsx
import { Input } from '@/components/ui/input';

export default function DateInput() {
  return (
    <div className="w-80">
      <Input type="date" placeholder="mm/dd/yyyy" />
    </div>
  );
}
```

### Time Input

```tsx
import { Input } from '@/components/ui/input';

export default function TimeInput() {
  return (
    <div className="w-80">
      <Input type="time" placeholder="--:-- AM" />
    </div>
  );
}
```

### DateTime Input

```tsx
import { Input } from '@/components/ui/input';

export default function DateTimeInput() {
  return (
    <div className="w-80">
      <Input type="datetime-local" placeholder="mm/dd/yyyy, --:--" />
    </div>
  );
}
```

### Form Integration with Validation

Example using React Hook Form and Zod for validation:

```tsx
'use client';

import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const FormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

export default function InputFormExample() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    toast.custom((t) => (
      <Alert variant="mono" icon="primary" onClose={() => toast.dismiss(t)}>
        <AlertIcon>
          <RiCheckboxCircleFill />
        </AlertIcon>
        <AlertTitle>Your form has been successfully submitted</AlertTitle>
      </Alert>
    ));
  };

  const handleReset = () => {
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-80 space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address:</FormLabel>
              <FormControl>
                <Input placeholder="Email address" {...field} />
              </FormControl>
              <FormDescription>Enter your email to proceed</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </Form>
  );
}
```

## API Reference

### Input

The base input component that extends the native HTML `<input>` element.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant of the input |
| `type` | `string` | `'text'` | HTML input type |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disables the input |
| `readOnly` | `boolean` | `false` | Makes the input read-only |
| ...props | `React.ComponentProps<'input'>` | - | All native input attributes |

#### Size Variants

- **`sm`**: Height 32px (h-8), padding 10px (px-2.5), text-xs
- **`md`**: Height 36px (h-9), padding 12px (px-3), text-sm (default)
- **`lg`**: Height 40px (h-10), padding 16px (px-4), text-sm

### InputAddon

A component for adding text or icon addons to inputs within an `InputGroup`.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant matching the input |
| `mode` | `'default' \| 'icon'` | `'default'` | Display mode (text or icon) |
| `className` | `string` | - | Additional CSS classes |
| ...props | `React.ComponentProps<'div'>` | - | All native div attributes |

### InputGroup

A container component that groups inputs with addons, handling the layout and border styling.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| ...props | `React.ComponentProps<'div'>` | - | All native div attributes |

### InputWrapper

A wrapper component for displaying icons or buttons inside an input field.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant matching the input |
| `className` | `string` | - | Additional CSS classes |
| ...props | `React.ComponentProps<'div'>` | - | All native div attributes |

## Dependencies

### Required Dependencies

```json
{
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0",
  "class-variance-authority": "^0.7.0"
}
```

### Optional Dependencies (for advanced examples)

```json
{
  "lucide-react": "^0.300.0",
  "@radix-ui/react-slot": "^1.0.0",
  "react-hook-form": "^7.48.0",
  "@hookform/resolvers": "^3.3.0",
  "zod": "^3.22.0",
  "sonner": "^1.2.0"
}
```

## Styling and Customization

The Input component uses `class-variance-authority` (CVA) for variant management and includes:

- **Focus states**: Ring effect with customizable color
- **Error states**: Automatic styling with `aria-invalid` attribute
- **Disabled states**: Reduced opacity and cursor changes
- **Readonly states**: Muted background color
- **File input styling**: Custom styling for file upload inputs
- **Dark mode support**: Automatic adaptation to dark theme

### Custom Styling Example

```tsx
import { Input } from '@/components/ui/input';

export default function CustomStyledInput() {
  return (
    <Input
      type="email"
      placeholder="Custom styled input"
      className="border-blue-500 focus-visible:ring-blue-300"
    />
  );
}
```

## Accessibility

The Input component follows accessibility best practices:

- **Keyboard Navigation**: Full keyboard support for all input types
- **ARIA Attributes**: Proper `aria-invalid` for error states
- **Form Integration**: Works seamlessly with form libraries and validation
- **Focus Management**: Clear focus indicators with ring effects
- **Screen Readers**: Compatible with screen reader technology
- **Disabled States**: Proper `disabled` attribute and cursor styling

### Accessible Form Example

```tsx
import { Input } from '@/components/ui/input';

export default function AccessibleInput() {
  return (
    <div className="w-80">
      <label htmlFor="email-input" className="block mb-2 text-sm font-medium">
        Email Address
      </label>
      <Input
        id="email-input"
        type="email"
        placeholder="Enter your email"
        aria-describedby="email-description"
        aria-required="true"
      />
      <p id="email-description" className="mt-2 text-xs text-muted-foreground">
        We'll never share your email with anyone else.
      </p>
    </div>
  );
}
```

## Best Practices

### 1. Always Use Appropriate Input Types

```tsx
// Good: Use specific input types for better UX
<Input type="email" placeholder="Email" />
<Input type="tel" placeholder="Phone" />
<Input type="url" placeholder="Website" />

// Avoid: Using text type for everything
<Input type="text" placeholder="Email" />
```

### 2. Provide Clear Labels and Placeholders

```tsx
// Good: Clear label with helpful placeholder
<FormLabel htmlFor="email">Email Address</FormLabel>
<Input id="email" type="email" placeholder="you@example.com" />

// Avoid: Placeholder as sole label
<Input type="email" placeholder="Email" />
```

### 3. Use Consistent Sizing

```tsx
// Good: Consistent variant across related inputs
<div className="space-y-4">
  <Input variant="md" type="text" placeholder="First Name" />
  <Input variant="md" type="text" placeholder="Last Name" />
  <Input variant="md" type="email" placeholder="Email" />
</div>
```

### 4. Handle Validation States Properly

```tsx
// Good: Using aria-invalid for validation
<Input
  type="email"
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
{hasError && (
  <span id="email-error" className="text-destructive text-xs">
    Please enter a valid email
  </span>
)}
```

### 5. Match Addon and Input Variants

```tsx
// Good: Matching variants
<InputGroup>
  <InputAddon variant="lg">$</InputAddon>
  <Input variant="lg" type="number" placeholder="Amount" />
</InputGroup>

// Avoid: Mismatched variants
<InputGroup>
  <InputAddon variant="sm">$</InputAddon>
  <Input variant="lg" type="number" placeholder="Amount" />
</InputGroup>
```

## Common Patterns

### Search Input with Clear Button

```tsx
'use client';

import { useState } from 'react';
import { Input, InputWrapper } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function SearchInput() {
  const [value, setValue] = useState('');

  return (
    <InputWrapper className="w-80">
      <Search />
      <Input
        type="search"
        placeholder="Search..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <Button
          size="sm"
          variant="dim"
          mode="icon"
          className="size-5 -me-0.5"
          onClick={() => setValue('')}
        >
          <X />
        </Button>
      )}
    </InputWrapper>
  );
}
```

### Currency Input

```tsx
import { Input, InputAddon, InputGroup } from '@/components/ui/input';

export default function CurrencyInput() {
  return (
    <InputGroup className="w-80">
      <InputAddon>$</InputAddon>
      <Input type="number" placeholder="0.00" step="0.01" />
      <InputAddon>USD</InputAddon>
    </InputGroup>
  );
}
```

### Password Input with Toggle

```tsx
'use client';

import { useState } from 'react';
import { Input, InputWrapper } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <InputWrapper className="w-80">
      <Input
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter password"
      />
      <Button
        size="sm"
        variant="dim"
        mode="icon"
        className="size-5 -me-0.5"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? <EyeOff /> : <Eye />}
      </Button>
    </InputWrapper>
  );
}
```

## Common Issues

### Issue: Focus Ring Not Visible

**Solution**: Ensure you're not overriding focus styles with custom classes. If you need custom focus styles, use the proper Tailwind classes:

```tsx
<Input
  type="text"
  className="focus-visible:ring-blue-500 focus-visible:border-blue-500"
/>
```

### Issue: Addon Not Aligning Properly

**Solution**: Make sure both the Input and InputAddon use the same `variant` prop:

```tsx
<InputGroup>
  <InputAddon variant="lg">$</InputAddon>
  <Input variant="lg" type="number" />
</InputGroup>
```

### Issue: Validation Styles Not Showing

**Solution**: Use the `aria-invalid` attribute to trigger error styles:

```tsx
<Input type="email" aria-invalid={!!error} />
```

## Credits

- Built with [Radix UI Slot](https://www.radix-ui.com/primitives/docs/utilities/slot)
- Built with [React Aria](https://react-spectrum.adobe.com/react-aria/index.html)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Variants with [Class Variance Authority](https://cva.style/)

## Related Components

- **Form**: For comprehensive form handling with validation
- **Label**: For accessible input labels
- **Button**: For input group actions and icon buttons
- **Textarea**: For multi-line text input

## Version Compatibility

This documentation is based on the latest version available at the time of writing. For the most up-to-date information, always refer to the official documentation at https://reui.io/docs/input.
