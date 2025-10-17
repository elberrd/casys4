# ReUI - Combobox

> Source: https://reui.io/docs/combobox
> Version: Latest
> Last Updated: 2025-10-16

## Overview

The Combobox is a versatile input component that combines a searchable dropdown with the ability to select from predefined options or enter custom values. It provides an autocomplete-like experience with a list of suggestions that users can filter through typing.

The component is built using a composition of the Popover and Command components from ReUI, providing a powerful and accessible way to handle option selection with search capabilities.

## Installation

### Using CLI (Recommended)

ReUI provides a CLI tool to automatically add components to your project:

```bash
# Install default combobox
pnpm dlx shadcn@latest add @reui/combobox-default

# Install specific variants
pnpm dlx shadcn@latest add @reui/combobox-group
pnpm dlx shadcn@latest add @reui/combobox-multiple-default
pnpm dlx shadcn@latest add @reui/combobox-form
```

### Manual Installation

If you prefer manual installation, install the required dependencies:

```bash
# Core dependencies
pnpm add clsx tailwind-merge class-variance-authority lucide-react radix-ui @radix-ui/react-dialog cmdk

# For form integration
pnpm add react-hook-form @hookform/resolvers zod

# For multiple selection
pnpm add @radix-ui/react-slot
```

Then add the required component files:
- `ui/button.tsx`
- `ui/command.tsx`
- `ui/popover.tsx`
- `ui/badge.tsx` (for multiple selection)
- `ui/form.tsx` (for form integration)
- `lib/utils.ts`

## Core Dependencies

- **Popover**: Provides the dropdown overlay functionality
- **Command**: Handles the searchable command palette interface
- **Button**: Serves as the trigger element
- **cmdk**: Command palette library for keyboard-driven interactions
- **Radix UI**: Provides accessible primitives for dialogs and popovers

## Component Architecture

The Combobox is composed of several key parts:

1. **Popover**: The container that displays the dropdown
2. **PopoverTrigger**: The button that opens the combobox
3. **PopoverContent**: The dropdown content container
4. **Command**: The searchable list interface
5. **CommandInput**: The search input field
6. **CommandList**: The scrollable list of options
7. **CommandGroup**: Groups related items
8. **CommandItem**: Individual selectable options
9. **CommandCheck**: Visual indicator for selected items

## Usage

### Basic Implementation

The combobox requires managing two state values: `open` (for the popover) and `value` (for the selected item).

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonArrow } from '@/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';

const cities = [
  { value: 'amsterdam', label: 'Amsterdam, Netherlands' },
  { value: 'london', label: 'London, UK' },
  { value: 'paris', label: 'Paris, France' },
  { value: 'tokyo', label: 'Tokyo, Japan' },
  { value: 'new_york', label: 'New York, USA' },
  { value: 'dubai', label: 'Dubai, UAE' },
];

export function BasicCombobox() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          mode="input"
          placeholder={!value}
          aria-expanded={open}
          className="w-[200px]"
        >
          <span className={cn('truncate')}>
            {value ? cities.find((city) => city.value === value)?.label : 'Select city...'}
          </span>
          <ButtonArrow />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Search city..." />
          <CommandList>
            <CommandEmpty>No city found.</CommandEmpty>
            <CommandGroup>
              {cities.map((city) => (
                <CommandItem
                  key={city.value}
                  value={city.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{city.label}</span>
                  {value === city.value && <CommandCheck />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

## Examples

### Example 1: Grouped Options

Organize options into logical groups (e.g., by continent, category, etc.):

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonArrow } from '@/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { ScrollArea, ScrollBar } from '@/ui/scroll-area';

const groupedCountries = [
  {
    group: 'Europe',
    countries: [
      { value: 'netherlands', label: 'Netherlands', flag: '🇳🇱' },
      { value: 'united_kingdom', label: 'United Kingdom', flag: '🇬🇧' },
      { value: 'france', label: 'France', flag: '🇫🇷' },
      { value: 'germany', label: 'Germany', flag: '🇩🇪' },
      { value: 'italy', label: 'Italy', flag: '🇮🇹' },
    ],
  },
  {
    group: 'Asia',
    countries: [
      { value: 'japan', label: 'Japan', flag: '🇯🇵' },
      { value: 'china', label: 'China', flag: '🇨🇳' },
      { value: 'india', label: 'India', flag: '🇮🇳' },
      { value: 'uae', label: 'United Arab Emirates', flag: '🇦🇪' },
      { value: 'south_korea', label: 'South Korea', flag: '🇰🇷' },
    ],
  },
  {
    group: 'North America',
    countries: [
      { value: 'united_states', label: 'United States', flag: '🇺🇸' },
      { value: 'canada', label: 'Canada', flag: '🇨🇦' },
      { value: 'mexico', label: 'Mexico', flag: '🇲🇽' },
    ],
  },
];

export function GroupedCombobox() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          mode="input"
          placeholder={!value}
          aria-expanded={open}
          className="w-[250px]"
        >
          <span className={cn('truncate')}>
            {value
              ? groupedCountries
                  .flatMap((group) => group.countries)
                  .find((country) => country.value === value)?.label
              : 'Select country...'}
          </span>
          <ButtonArrow />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <ScrollArea viewportClassName="max-h-[300px]">
              <CommandEmpty>No country found.</CommandEmpty>
              {groupedCountries.map((group) => (
                <CommandGroup key={group.group} heading={group.group}>
                  {group.countries.map((country) => (
                    <CommandItem
                      key={country.value}
                      value={country.value}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? '' : currentValue);
                        setOpen(false);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{country.flag}</span>
                        {country.label}
                      </span>
                      {value === country.value && <CommandCheck />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              <ScrollBar />
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### Example 2: Multiple Selection

Allow users to select multiple options with badge display:

```tsx
'use client';

import * as React from 'react';
import { Badge, BadgeButton } from '@/ui/badge';
import { Button, ButtonArrow } from '@/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { X } from 'lucide-react';

const cities = [
  { value: 'tokyo', label: 'Tokyo' },
  { value: 'new_york', label: 'New York' },
  { value: 'london', label: 'London' },
  { value: 'paris', label: 'Paris' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'hong_kong', label: 'Hong Kong' },
  { value: 'los_angeles', label: 'Los Angeles' },
  { value: 'seoul', label: 'Seoul' },
  { value: 'amsterdam', label: 'Amsterdam' },
];

export function MultipleCombobox() {
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<string[]>(['london', 'tokyo']);

  const toggleSelection = (value: string) => {
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const removeSelection = (value: string) => {
    setSelectedValues((prev) => prev.filter((v) => v !== value));
  };

  return (
    <div className="w-[300px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            autoHeight={true}
            mode="input"
            placeholder={selectedValues.length === 0}
            className="w-full p-1 relative"
          >
            <div className="flex flex-wrap items-center gap-1 pe-2.5">
              {selectedValues.length > 0 ? (
                selectedValues.map((val) => {
                  const city = cities.find((c) => c.value === val);
                  return city ? (
                    <Badge key={val} variant="outline">
                      {city.label}
                      <BadgeButton
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelection(val);
                        }}
                      >
                        <X />
                      </BadgeButton>
                    </Badge>
                  ) : null;
                })
              ) : (
                <span className="px-2.5">Select cities</span>
              )}
            </div>
            <ButtonArrow className="absolute top-2 end-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
          <Command>
            <CommandInput placeholder="Search city..." />
            <CommandList>
              <CommandEmpty>No city found.</CommandEmpty>
              <CommandGroup>
                {cities.map((city) => (
                  <CommandItem key={city.value} value={city.value} onSelect={() => toggleSelection(city.value)}>
                    <span className="truncate">{city.label}</span>
                    {selectedValues.includes(city.value) && <CommandCheck />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

### Example 3: Form Integration with Validation

Integrate the combobox with React Hook Form and Zod validation:

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonArrow } from '@/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';
import { Form, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const cities = [
  { value: 'amsterdam', label: 'Amsterdam, Netherlands' },
  { value: 'london', label: 'London, UK' },
  { value: 'paris', label: 'Paris, France' },
  { value: 'tokyo', label: 'Tokyo, Japan' },
  { value: 'new_york', label: 'New York, USA' },
  { value: 'dubai', label: 'Dubai, UAE' },
];

const FormSchema = z.object({
  city: z.string().refine((value) => cities.some((city) => city.value === value), {
    message: 'City is required.',
  }),
});

export function ComboboxForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const [open, setOpen] = React.useState(false);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log('Form submitted:', data);
    // Handle form submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-[300px] space-y-6">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    mode="input"
                    placeholder={!field.value}
                    aria-expanded={open}
                    className="w-full"
                  >
                    <span className={cn('truncate')}>
                      {field.value ? cities.find((city) => city.value === field.value)?.label : 'Select a city...'}
                    </span>
                    <ButtonArrow />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
                  <Command>
                    <CommandInput placeholder="Search city..." />
                    <CommandList>
                      <CommandEmpty>No city found.</CommandEmpty>
                      <CommandGroup>
                        {cities.map((city) => (
                          <CommandItem
                            key={city.value}
                            value={city.value}
                            onSelect={() => {
                              field.onChange(city.value);
                              setOpen(false);
                            }}
                          >
                            <span className="truncate">{city.label}</span>
                            {field.value === city.value && <CommandCheck />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>Select your preferred city.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2.5">
          <Button type="reset" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </Form>
  );
}
```

### Example 4: With Icons and Custom Content

Add icons and rich content to combobox items:

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonArrow } from '@/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Globe, Code, Database, Layout } from 'lucide-react';

const categories = [
  { value: 'web', label: 'Web Development', icon: Globe },
  { value: 'backend', label: 'Backend Development', icon: Code },
  { value: 'database', label: 'Database', icon: Database },
  { value: 'design', label: 'UI/UX Design', icon: Layout },
];

export function IconCombobox() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');

  const selectedCategory = categories.find((cat) => cat.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          mode="input"
          placeholder={!value}
          aria-expanded={open}
          className="w-[250px]"
        >
          <span className="flex items-center gap-2 truncate">
            {value && selectedCategory ? (
              <>
                <selectedCategory.icon className="h-4 w-4" />
                {selectedCategory.label}
              </>
            ) : (
              'Select a category...'
            )}
          </span>
          <ButtonArrow />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.value}
                  value={category.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                >
                  <category.icon className="h-4 w-4" />
                  <span className="truncate">{category.label}</span>
                  {value === category.value && <CommandCheck />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### Example 5: Disabled Options

Some options can be disabled to prevent selection:

```tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonArrow } from '@/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';

const languages = [
  { value: 'javascript', label: 'JavaScript', disabled: false },
  { value: 'typescript', label: 'TypeScript', disabled: false },
  { value: 'python', label: 'Python (Coming Soon)', disabled: true },
  { value: 'rust', label: 'Rust', disabled: false },
  { value: 'go', label: 'Go (Coming Soon)', disabled: true },
];

export function DisabledOptionsCombobox() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          mode="input"
          placeholder={!value}
          aria-expanded={open}
          className="w-[200px]"
        >
          <span className={cn('truncate')}>
            {value ? languages.find((lang) => lang.value === value)?.label : 'Select language...'}
          </span>
          <ButtonArrow />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup>
              {languages.map((language) => (
                <CommandItem
                  key={language.value}
                  value={language.value}
                  disabled={language.disabled}
                  onSelect={(currentValue) => {
                    if (!language.disabled) {
                      setValue(currentValue === value ? '' : currentValue);
                      setOpen(false);
                    }
                  }}
                >
                  <span className="truncate">{language.label}</span>
                  {value === language.value && <CommandCheck />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

## Props/API Reference

### Popover

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Controls the open state of the popover |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when the open state changes |

### PopoverTrigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asChild` | `boolean` | `false` | Merge props onto immediate child |

### PopoverContent

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment of the popover |
| `sideOffset` | `number` | `4` | Distance from the trigger |

### Button (Trigger)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'outline' \| 'primary' \| 'secondary' \| ...` | `'outline'` | Visual style variant |
| `mode` | `'default' \| 'input' \| 'icon' \| 'link'` | `'default'` | Button mode (use `'input'` for combobox) |
| `placeholder` | `boolean` | `false` | Whether to show placeholder styling |
| `role` | `string` | - | ARIA role (use `'combobox'`) |
| `aria-expanded` | `boolean` | - | ARIA expanded state |

### CommandInput

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | - | Placeholder text for the search input |
| `className` | `string` | - | Additional CSS classes |

### CommandItem

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | The value of the item |
| `onSelect` | `(value: string) => void` | - | Callback when item is selected |
| `disabled` | `boolean` | `false` | Whether the item is disabled |
| `className` | `string` | - | Additional CSS classes |

### CommandGroup

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `heading` | `string` | - | The heading for the group |
| `className` | `string` | - | Additional CSS classes |

## Accessibility

The Combobox component follows WAI-ARIA guidelines for combobox pattern:

- **Keyboard Navigation**:
  - `Arrow Up/Down`: Navigate through options
  - `Enter`: Select focused option
  - `Escape`: Close the popover
  - Type to search and filter options

- **ARIA Attributes**:
  - `role="combobox"` on the trigger button
  - `aria-expanded` indicates popover state
  - `aria-controls` links trigger to popover
  - `aria-selected` on selected items

- **Focus Management**: Focus returns to trigger when popover closes

- **Screen Reader Support**: All interactive elements are properly labeled

## Best Practices

1. **Clear Placeholder Text**: Use descriptive placeholder text that indicates what the user should select

2. **Appropriate Width**: Set a reasonable width for your use case. The popover will match the trigger width by using `w-(--radix-popper-anchor-width)`

3. **Empty State**: Always provide a meaningful `CommandEmpty` message when no results are found

4. **Truncate Long Text**: Use `truncate` className on labels to prevent overflow

5. **Single vs Multiple**:
   - For single selection, close the popover after selection
   - For multiple selection, keep the popover open

6. **Form Integration**: When using with forms, ensure proper validation and error handling

7. **Grouping**: Group related items for better organization and scannability

8. **Search Optimization**: For large datasets, consider implementing debounced search or server-side filtering

9. **Loading States**: Show loading indicators when fetching data asynchronously

10. **Mobile Considerations**: Ensure touch targets are large enough (minimum 44x44px) for mobile users

## Common Patterns

### Pattern 1: Async Data Loading

```tsx
const [loading, setLoading] = React.useState(false);
const [items, setItems] = React.useState([]);

React.useEffect(() => {
  setLoading(true);
  fetchItems().then(setItems).finally(() => setLoading(false));
}, []);
```

### Pattern 2: Searchable with Debounce

```tsx
const [searchQuery, setSearchQuery] = React.useState('');

const filteredItems = React.useMemo(() => {
  return items.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [items, searchQuery]);
```

### Pattern 3: Custom Value (Creatable)

```tsx
const [items, setItems] = React.useState(initialItems);

const handleCreate = (value: string) => {
  const newItem = { value: value.toLowerCase(), label: value };
  setItems([...items, newItem]);
  setValue(newItem.value);
};
```

## Additional Variants

ReUI provides several pre-built variants:

- **combobox-group**: Grouped options by category
- **combobox-disabled-option**: Options that can be disabled
- **combobox-indicator-position**: Custom check indicator positioning
- **combobox-custom-indicator**: Custom selection indicators
- **combobox-add-option**: Allow adding new options
- **combobox-icon**: Items with icons
- **combobox-status**: Status indicators (online/offline, etc.)
- **combobox-country**: Country selection with flags
- **combobox-timezone**: Timezone selection
- **combobox-phone-number**: Phone country code selection
- **combobox-badge**: Badge-style display
- **combobox-user**: User/avatar selection
- **combobox-multiple-default**: Multiple selection with badges
- **combobox-multiple-user**: Multiple user selection
- **combobox-multiple-expandable**: Collapsible multiple selection
- **combobox-multiple-count-label**: Show count of selected items

Visit the [official documentation](https://reui.io/docs/combobox) to see live examples of all variants.

## TypeScript Support

All components are fully typed with TypeScript. Example type definitions:

```typescript
type Option = {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ComponentType;
};

type ComboboxProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
};
```

## Troubleshooting

### Issue: Popover doesn't match trigger width
**Solution**: Use `className="w-(--radix-popper-anchor-width)"` on PopoverContent

### Issue: Options not filtering on search
**Solution**: Ensure CommandInput is inside Command component and value prop is set on CommandItem

### Issue: Selected value not showing
**Solution**: Check that the value state matches the option's value property exactly

### Issue: Form validation not working
**Solution**: Ensure FormField's render prop connects field.value and field.onChange properly

## Related Components

- **Select**: For simple single-selection dropdowns without search
- **Autocomplete**: For free-form text input with suggestions
- **Multi-Select**: For multiple selection scenarios
- **Command**: The underlying searchable command palette

## Resources

- [Official Documentation](https://reui.io/docs/combobox)
- [Radix UI Popover](https://www.radix-ui.com/docs/primitives/components/popover)
- [cmdk Documentation](https://cmdk.paco.me/)
- [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
