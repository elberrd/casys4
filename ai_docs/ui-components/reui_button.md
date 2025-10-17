# ReUI - Button Component

> Source: https://reui.io/docs/button
> Library: ReUI (React UI Components)
> Built with: React, TypeScript, Tailwind CSS, Radix UI
> Last Updated: 2025-10-16

## Overview

The Button component is a versatile and customizable clickable element that can render as either a native HTML button or be styled as any other element. It provides extensive styling options including multiple variants, appearances, sizes, and shapes to fit various design needs.

**Key Features:**
- Multiple style variants (primary, secondary, destructive, outline, ghost, etc.)
- Flexible sizing options (xs, sm, md, lg)
- Icon support (leading, trailing, or icon-only)
- Loading states with spinners
- Badge integration
- Link styling with underline options
- Full accessibility support via Radix UI
- Can be used with `asChild` prop for composition
- RTL (Right-to-Left) language support

## Installation

### Using shadcn CLI (Recommended)

Install the button component using the shadcn CLI:

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/button

# Using npm
npx shadcn@latest add @reui/button

# Using yarn
yarn dlx shadcn@latest add @reui/button

# Using bun
bunx shadcn@latest add @reui/button
```

### Manual Installation

If you prefer manual installation, you'll need to:

1. Install the required dependencies:

```bash
npm install @radix-ui/react-slot
# or
pnpm add @radix-ui/react-slot
```

2. Copy the button component code into your project
3. Ensure you have Tailwind CSS configured

## Dependencies

The Button component requires:
- **React** (>= 18.0.0)
- **Radix UI Slot** - For component composition
- **Tailwind CSS** - For styling
- **TypeScript** (optional but recommended)

## API Reference

### Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'mono' \| 'destructive' \| 'outline' \| 'dashed' \| 'ghost' \| 'link'` | `'primary'` | The visual style variant of the button |
| `appearance` | `'solid' \| 'outline' \| 'ghost'` | - | Additional appearance modifier |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'` | The size of the button |
| `shape` | `'default' \| 'rounded' \| 'pill' \| 'circle'` | `'default'` | The shape/border radius of the button |
| `mode` | `'default' \| 'fullWidth'` | `'default'` | Display mode, can make button full width |
| `underline` | `'solid' \| 'dashed'` | - | Underline style for link variants |
| `underlined` | `boolean` | - | Whether to show underline on link variants |
| `asChild` | `boolean` | `false` | When true, merges props into child element |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Whether the button is disabled |

All standard HTML button attributes are also supported (onClick, type, etc.)

## Usage Examples

### Example 1: Basic Button Variants

```tsx
import { Button } from '@/components/ui/button';

export default function ButtonVariantsExample() {
  return (
    <div className="flex gap-4">
      {/* Primary Button (Default) */}
      <Button variant="primary">
        Primary
      </Button>

      {/* Secondary Button */}
      <Button variant="secondary">
        Secondary
      </Button>

      {/* Mono Button */}
      <Button variant="mono">
        Mono
      </Button>

      {/* Destructive Button */}
      <Button variant="destructive">
        Delete
      </Button>

      {/* Outline Button */}
      <Button variant="outline">
        Outline
      </Button>

      {/* Dashed Button */}
      <Button variant="dashed">
        Dashed
      </Button>

      {/* Ghost Button */}
      <Button variant="ghost">
        Ghost
      </Button>
    </div>
  );
}
```

### Example 2: Button Sizes

```tsx
import { Button } from '@/components/ui/button';

export default function ButtonSizesExample() {
  return (
    <div className="flex items-center gap-4">
      {/* Extra Small */}
      <Button size="xs">
        XSmall
      </Button>

      {/* Small */}
      <Button size="sm">
        Small
      </Button>

      {/* Medium (Default) */}
      <Button size="md">
        Medium
      </Button>

      {/* Large */}
      <Button size="lg">
        Large
      </Button>
    </div>
  );
}
```

### Example 3: Buttons with Icons

```tsx
import { Button } from '@/components/ui/button';
import { ChevronRight, Mail, Download } from 'lucide-react';

export default function ButtonIconsExample() {
  return (
    <div className="flex flex-col gap-4">
      {/* Button with Leading Icon */}
      <Button variant="primary">
        <Mail className="mr-2 h-4 w-4" />
        Send Email
      </Button>

      {/* Button with Trailing Icon */}
      <Button variant="outline">
        Continue
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>

      {/* Icon Only Button */}
      <Button size="md" shape="circle" variant="ghost">
        <Download className="h-4 w-4" />
      </Button>

      {/* Icon Button with Full Radius */}
      <Button size="lg" shape="pill">
        <Mail className="mr-2 h-5 w-5" />
        Get Started
      </Button>
    </div>
  );
}
```

### Example 4: Loading States

```tsx
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ButtonLoadingExample() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  return (
    <div className="flex gap-4">
      {/* Loading Button */}
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? 'Submitting...' : 'Submit'}
      </Button>

      {/* Alternative Loading Style */}
      <Button variant="secondary" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing
          </>
        ) : (
          'Process'
        )}
      </Button>
    </div>
  );
}
```

### Example 5: Button with Badges

```tsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ButtonBadgeExample() {
  return (
    <div className="flex gap-4">
      {/* Button with Badge */}
      <Button variant="outline" className="relative">
        Messages
        <Badge className="ml-2" variant="default">
          5
        </Badge>
      </Button>

      {/* Button with Notification Badge */}
      <Button variant="secondary" className="relative">
        Notifications
        <Badge className="ml-2" variant="destructive">
          10+
        </Badge>
      </Button>
    </div>
  );
}
```

### Example 6: Link Buttons

```tsx
import { Button } from '@/components/ui/button';

export default function ButtonLinkExample() {
  return (
    <div className="flex flex-col gap-4">
      {/* Solid Link Button */}
      <Button variant="link" underline="solid">
        Solid Underline
      </Button>

      {/* Dashed Link Button */}
      <Button variant="link" underline="dashed">
        Dashed Underline
      </Button>

      {/* Solid with Underline on Hover */}
      <Button variant="link" underlined>
        Underlined on Hover - Solid
      </Button>

      {/* Dashed with Underline on Hover */}
      <Button variant="link" underline="dashed" underlined>
        Underlined on Hover - Dashed
      </Button>
    </div>
  );
}
```

### Example 7: Using asChild for Composition

```tsx
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ButtonAsChildExample() {
  return (
    <div className="flex gap-4">
      {/* Button as Next.js Link */}
      <Button asChild variant="primary">
        <Link href="/dashboard">
          Go to Dashboard
        </Link>
      </Button>

      {/* Button as External Link */}
      <Button asChild variant="outline">
        <a href="https://reui.io" target="_blank" rel="noopener noreferrer">
          Visit ReUI
        </a>
      </Button>
    </div>
  );
}
```

### Example 8: Full Width and Disabled States

```tsx
import { Button } from '@/components/ui/button';

export default function ButtonStatesExample() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      {/* Full Width Button */}
      <Button mode="fullWidth" variant="primary">
        Full Width Button
      </Button>

      {/* Disabled Buttons */}
      <div className="flex gap-4">
        <Button variant="primary" disabled>
          Disabled Primary
        </Button>

        <Button variant="outline" disabled>
          Disabled Outline
        </Button>

        <Button variant="link" disabled>
          Disabled Link
        </Button>
      </div>
    </div>
  );
}
```

### Example 9: Form Integration

```tsx
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function ButtonFormExample() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  const handleReset = () => {
    setFormData({ email: '', password: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        className="w-full px-3 py-2 border rounded"
      />

      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Password"
        className="w-full px-3 py-2 border rounded"
      />

      <div className="flex gap-2">
        {/* Submit Button */}
        <Button type="submit" variant="primary">
          Sign In
        </Button>

        {/* Reset Button */}
        <Button type="button" variant="outline" onClick={handleReset}>
          Clear
        </Button>

        {/* Cancel Button */}
        <Button type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}
```

### Example 10: Advanced - Button Group with Actions

```tsx
import { Button } from '@/components/ui/button';
import { Save, X, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function ButtonGroupExample() {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {!isEditing ? (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </>
      )}
    </div>
  );
}
```

## Best Practices

### Do's

1. **Use Semantic Variants**: Choose variants that match the action's intent
   - `primary` for main actions
   - `destructive` for delete/remove actions
   - `outline` or `ghost` for secondary actions
   - `link` for navigation or low-emphasis actions

2. **Consider Hierarchy**: Use button variants to establish visual hierarchy
   - One primary button per section
   - Support with secondary buttons (outline, ghost)

3. **Add Loading States**: Always provide feedback for async operations
   ```tsx
   <Button disabled={isLoading}>
     {isLoading && <Loader2 className="animate-spin mr-2" />}
     Submit
   </Button>
   ```

4. **Use Icons Meaningfully**: Icons should enhance understanding, not replace clear labels
   ```tsx
   <Button>
     <Trash2 className="mr-2" />
     Delete Account
   </Button>
   ```

5. **Implement Proper Disabled States**: Disable buttons when actions are unavailable
   ```tsx
   <Button disabled={!formValid}>Submit</Button>
   ```

### Don'ts

1. **Don't Overuse Primary Buttons**: Too many primary buttons reduces visual hierarchy
2. **Don't Use Vague Labels**: Use clear, action-oriented text (e.g., "Save Changes" not "OK")
3. **Don't Forget Accessibility**: Ensure disabled states are clearly visible
4. **Don't Mix Too Many Variants**: Stick to 2-3 variants per interface section
5. **Don't Use Buttons for Navigation**: Use the `asChild` prop with Link components instead

## Accessibility

The Button component is built on Radix UI and follows WAI-ARIA best practices:

### Keyboard Navigation
- **Tab**: Focus the button
- **Enter/Space**: Activate the button
- Focus indicators are clearly visible

### Screen Readers
- Use descriptive button text that clearly indicates the action
- For icon-only buttons, always include `aria-label`:
  ```tsx
  <Button aria-label="Delete item" shape="circle">
    <Trash2 />
  </Button>
  ```

### Disabled State
- Disabled buttons are properly marked with `disabled` attribute
- Screen readers will announce disabled state
- Visual indicators show disabled state

### Loading State
- Use `aria-busy="true"` when loading:
  ```tsx
  <Button disabled aria-busy={isLoading}>
    {isLoading && <Loader2 className="animate-spin" />}
    Submit
  </Button>
  ```

## Common Patterns

### 1. Modal Actions
```tsx
<div className="flex justify-end gap-2">
  <Button variant="ghost" onClick={onClose}>
    Cancel
  </Button>
  <Button variant="primary" onClick={onConfirm}>
    Confirm
  </Button>
</div>
```

### 2. Form Actions
```tsx
<div className="flex gap-2">
  <Button type="submit" variant="primary">
    Save
  </Button>
  <Button type="button" variant="outline" onClick={onCancel}>
    Cancel
  </Button>
</div>
```

### 3. Toolbar Actions
```tsx
<div className="flex gap-1">
  <Button variant="ghost" size="sm">
    <Bold className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="sm">
    <Italic className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="sm">
    <Underline className="h-4 w-4" />
  </Button>
</div>
```

## TypeScript Support

The Button component is fully typed. Here's an example of custom button with proper typing:

```tsx
import { Button } from '@/components/ui/button';
import { ComponentProps } from 'react';

// Extend button props
interface CustomButtonProps extends ComponentProps<typeof Button> {
  isLoading?: boolean;
  loadingText?: string;
}

export function CustomButton({
  isLoading,
  loadingText = 'Loading...',
  children,
  ...props
}: CustomButtonProps) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
```

## Styling and Customization

The Button component uses Tailwind CSS and can be customized via the `className` prop:

```tsx
// Custom styling
<Button className="bg-gradient-to-r from-purple-500 to-pink-500">
  Gradient Button
</Button>

// Override specific styles
<Button className="hover:bg-blue-600 active:scale-95">
  Custom Hover
</Button>

// Combine with Tailwind utilities
<Button className="shadow-lg rounded-full">
  Custom Shadow
</Button>
```

## Integration with Form Libraries

### React Hook Form Example

```tsx
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';

interface FormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    // Handle submission
    await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} type="email" />
      <input {...register('password')} type="password" />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

## Common Issues and Solutions

### Issue 1: Button Not Responding to Clicks
**Solution**: Check if the button is disabled or if event propagation is stopped
```tsx
// Ensure not disabled
<Button disabled={false} onClick={handleClick}>
  Click Me
</Button>
```

### Issue 2: Icons Not Aligned
**Solution**: Use proper spacing classes
```tsx
// Leading icon
<Button>
  <Icon className="mr-2 h-4 w-4" />
  Text
</Button>

// Trailing icon
<Button>
  Text
  <Icon className="ml-2 h-4 w-4" />
</Button>
```

### Issue 3: Full Width Not Working
**Solution**: Use the `mode` prop or className
```tsx
<Button mode="fullWidth">Full Width</Button>
// or
<Button className="w-full">Full Width</Button>
```

## Related Components

- **Badge**: For adding notification counts or status indicators
- **Tooltip**: For providing additional context on hover
- **Dropdown Menu**: For creating button-triggered menus
- **Dialog**: For button-triggered modal actions

## Credits

- Built with [Radix UI Slot](https://www.radix-ui.com/primitives/docs/utilities/slot)
- Part of the ReUI component library
- Integrates seamlessly with shadcn/ui

## Additional Resources

- Official Documentation: https://reui.io/docs/button
- ReUI Website: https://reui.io
- Radix UI Documentation: https://www.radix-ui.com

## Version History

- **Latest**: Full support for all variants, sizes, and compositions
- Built with React 18+ and TypeScript
- Requires Tailwind CSS v3.0+

---

**Note**: This component is part of the ReUI library and pairs beautifully with shadcn/ui. It provides a comprehensive button solution with extensive customization options while maintaining accessibility and performance standards.
