# Custom Phone Input Component

> **Note**: This project uses a custom phone input implementation instead of the ReUI package.
> Location: `/components/ui/phone-input.tsx`
> Based on: shadcn/ui Command + Popover pattern
> Last Updated: 2025-11-06

## Overview

A custom phone number input component with country selector and automatic formatting. Built using shadcn/ui components (Command, Popover, ScrollArea) without external phone number libraries.

**Key Features:**
- Country selector with 175+ countries (all UN members + territories)
- Automatic phone number formatting based on selected country (50+ countries with format masks)
- Search countries by name, dial code, or country code
- Auto-detects country from pasted/typed dial codes
- Compatible with React Hook Form via forwardRef
- Mobile responsive with proper touch targets (h-9/36px minimum)
- Accessible with ARIA labels and keyboard navigation
- Fully internationalized (English/Portuguese) via next-intl
- Type-safe with TypeScript (no `any` types)

## Data Format

- **Input/Output format**: `"+[dialCode] [number]"` (e.g., `"+55 11 98765-4321"`)
- Automatically adds country code prefix
- Supports various formatting characters (spaces, hyphens, parentheses, dots)

## Installation

This component is already installed in the project. No additional setup required.

**Dependencies:**
- `next-intl` for internationalization
- `lucide-react` for icons
- `@/components/ui/button` - shadcn/ui Button
- `@/components/ui/command` - shadcn/ui Command
- `@/components/ui/popover` - shadcn/ui Popover
- `@/components/ui/scroll-area` - shadcn/ui ScrollArea
- `@/lib/data/countries-phone` - Country data (175+ countries)

## Usage

### Basic Usage with React Hook Form

```tsx
import { PhoneInput } from '@/components/ui/phone-input';
import { useForm } from 'react-hook-form';

function BasicExample() {
  const form = useForm();

  return (
    <FormField
      control={form.control}
      name="phoneNumber"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('phoneNumber')}</FormLabel>
          <FormControl>
            <PhoneInput {...field} defaultCountry="BR" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### With Different Default Country

```tsx
<PhoneInput
  value={phoneNumber}
  onChange={setPhoneNumber}
  defaultCountry="US"
  placeholder="Enter phone number"
/>
```

### With Validation

Use the validation schemas from `/lib/validations/phone.ts`:

```tsx
import { optionalPhoneNumberSchema, requiredPhoneNumberSchema } from '@/lib/validations/phone';
import { z } from 'zod';

// Optional phone number
const schema = z.object({
  phoneNumber: optionalPhoneNumberSchema,
});

// Required phone number
const schema = z.object({
  phoneNumber: requiredPhoneNumberSchema,
});
```

## Props/API Reference

### PhoneInputProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `""` | The current phone number value in international format (e.g., "+55 11 98765-4321") |
| `onChange` | `(value: string) => void` | - | Callback function invoked when the phone number changes. Receives the new value with country code prefix |
| `defaultCountry` | `string` | `"BR"` | ISO 3166-1 alpha-2 country code for the default country (e.g., "US", "GB", "DE", "FR") |
| `className` | `string` | - | Additional CSS classes for the container |
| `...props` | `React.ComponentProps<'input'>` | - | All standard HTML input attributes (except `onChange`, `value`, `type`) |

## Validation

The project includes comprehensive validation schemas in `/lib/validations/phone.ts`:

### `phoneNumberSchema`
Basic phone number validation (optional or empty string):
- Validates international format with country code
- Accepts formatting characters (spaces, hyphens, parentheses, dots)
- Length: 8-30 characters

### `requiredPhoneNumberSchema`
Required phone number validation:
- Same as `phoneNumberSchema` but requires a value
- Validates digit count (7-25 digits after cleaning)

### `optionalPhoneNumberSchema`
Alias for `phoneNumberSchema` (for clarity in forms)

## Utility Functions

Available in `/lib/validations/phone.ts`:

### `cleanPhoneNumber(phone: string): string`
Removes all formatting characters, leaving only digits and the + sign.

```tsx
import { cleanPhoneNumber } from '@/lib/validations/phone';

cleanPhoneNumber("+55 (11) 98765-4321"); // "+5511987654321"
```

### `isValidPhoneLength(phone: string): boolean`
Validates that the phone number has between 7 and 25 digits.

```tsx
import { isValidPhoneLength } from '@/lib/validations/phone';

isValidPhoneLength("+55 11 98765-4321"); // true
isValidPhoneLength("+55 123"); // false
```

## Country Data

Country data is defined in `/lib/data/countries-phone.ts`:

### Country Interface

```typescript
interface Country {
  code: string;      // ISO 3166-1 alpha-2 (e.g., "BR", "US")
  name: string;      // Country name (e.g., "Brazil", "United States")
  dialCode: string;  // Country dial code (e.g., "+55", "+1")
  flag: string;      // Unicode emoji flag (e.g., "🇧🇷", "🇺🇸")
  format?: string;   // Optional format mask (e.g., "(##) #####-####")
}
```

### Available Functions

```typescript
// Find country by ISO code
findCountryByCode(code: string): Country | undefined

// Find country by dial code
findCountryByDialCode(dialCode: string): Country | undefined

// Format phone number according to country rules
formatPhoneNumber(phoneNumber: string, country: Country): string

// Clean phone number (remove formatting)
cleanPhoneNumber(phoneNumber: string): string
```

## Internationalization

The component uses `next-intl` for translations. Translation keys are in the `Common` namespace:

### English (`messages/en.json`)
```json
{
  "Common": {
    "selectCountry": "Select country",
    "searchCountry": "Search country...",
    "noCountryFound": "No country found",
    "enterPhoneNumber": "Enter phone number"
  }
}
```

### Portuguese (`messages/pt.json`)
```json
{
  "Common": {
    "selectCountry": "Selecionar país",
    "searchCountry": "Pesquisar país...",
    "noCountryFound": "Nenhum país encontrado",
    "enterPhoneNumber": "Digite o número de telefone"
  }
}
```

## Examples

### Complete Form Example

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PhoneInput } from '@/components/ui/phone-input';
import { optionalPhoneNumberSchema } from '@/lib/validations/phone';

const formSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  phoneNumber: optionalPhoneNumberSchema,
});

type FormData = z.infer<typeof formSchema>;

export function ContactForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Submitted:", data);
    // data.phoneNumber will be in format: "+55 11 98765-4321"
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <PhoneInput {...field} defaultCountry="BR" />
              </FormControl>
              <FormDescription>
                Enter your phone number with country code
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Parsing Existing Phone Numbers

```tsx
import { findCountryByDialCode } from '@/lib/data/countries-phone';

const phoneNumber = "+55 11 98765-4321";

// Extract country from dial code
for (const country of countries) {
  if (phoneNumber.startsWith(country.dialCode)) {
    console.log("Country:", country.name); // "Brazil"
    console.log("Dial Code:", country.dialCode); // "+55"
    break;
  }
}
```

## Accessibility

The component includes comprehensive accessibility features:

- **ARIA Labels**: `aria-label` on country selector button
- **ARIA Expanded**: `aria-expanded` state on combobox
- **Keyboard Navigation**: Full keyboard support for country selection
- **Screen Reader Support**: Proper announcements for selections
- **Focus Management**: Logical tab order and focus indicators
- **Mobile Touch Targets**: Minimum 36px (h-9) height for touch accessibility

## Best Practices

1. **Always use with React Hook Form**: The component is designed to work seamlessly with react-hook-form via `forwardRef`.

2. **Use validation schemas**: Import validation from `/lib/validations/phone.ts` for consistent validation across forms.

3. **Set appropriate default country**: Use `defaultCountry="BR"` for Brazilian users, adjust based on your audience.

4. **Store in consistent format**: Always store phone numbers as returned by the component (with country code prefix).

5. **Provide clear labels**: Always use proper form labels for accessibility.

## Migration from ReUI

If you previously used `@reui/base-phone-input`, here are the key differences:

### Installation
- **ReUI**: Required `pnpm dlx shadcn@latest add @reui/base-phone-input`
- **Custom**: Already included in the project

### Import Path
```tsx
// ReUI (old)
import { PhoneInput } from '@reui/components/base-phone-input';

// Custom (new)
import { PhoneInput } from '@/components/ui/phone-input';
```

### Data Format
- **ReUI**: E.164 format (`"+12133734253"`)
- **Custom**: Formatted with spaces (`"+55 11 98765-4321"`)

### Validation
```tsx
// ReUI (old)
import { isValidPhoneNumber } from 'react-phone-number-input';

// Custom (new)
import { optionalPhoneNumberSchema } from '@/lib/validations/phone';
```

### Size Prop
- **ReUI**: Supported `size="sm" | "md" | "lg"`
- **Custom**: No size prop (uses consistent h-9 height)

## Troubleshooting

### Issue: Country not being detected from pasted number

**Solution**: Ensure the pasted number starts with `+` and includes the full dial code.

### Issue: Validation failing for valid numbers

**Solution**: Check that your validation schema allows the formatted output with spaces and hyphens.

### Issue: Translations not showing

**Solution**: Verify that the translation keys exist in both `messages/en.json` and `messages/pt.json` under the `Common` namespace.

## Related Files

- Component: `/components/ui/phone-input.tsx`
- Country Data: `/lib/data/countries-phone.ts`
- Validation: `/lib/validations/phone.ts`
- Translations: `/messages/en.json`, `/messages/pt.json`

## See Also

- [i18n Documentation](./i18n.md)
- [Form Validation Best Practices](../convex_rules.md)
