# ReUI Base Phone Input - Archived

> **⚠️ This documentation is archived. This project now uses a custom phone input implementation.**
>
> **Please refer to**: [Custom Phone Input Documentation](./reui_phone-input.md)
>
> **Component Location**: `/components/ui/phone-input.tsx`
>
> **Last Updated**: 2025-11-06

## Migration Notice

This project previously considered using the ReUI Base Phone Input component from `@reui/base-phone-input`, but a custom implementation was chosen instead for the following reasons:

1. **Better Integration**: Built specifically for this project's needs using existing shadcn/ui components
2. **No External Dependencies**: Avoids adding the `react-phone-number-input` dependency and its sub-dependencies
3. **Full Control**: Complete control over formatting, validation, and behavior
4. **Internationalization**: Native integration with the project's `next-intl` setup
5. **Customization**: Easier to customize and maintain without external package constraints

## Key Differences from ReUI Implementation

### Package Installation
- **ReUI**: Required `pnpm dlx shadcn@latest add @reui/base-phone-input`
- **Custom**: Already included in the project, no installation needed

### Dependencies
- **ReUI**: Requires `react-phone-number-input` and `libphonenumber-js`
- **Custom**: Uses only project dependencies (shadcn/ui components, next-intl)

### Import Path
```tsx
// ReUI (not used)
import PhoneInput from '@reui/base-phone-input'

// Custom (use this)
import { PhoneInput } from '@/components/ui/phone-input'
```

### Data Format
- **ReUI**: E.164 format (`"+12133734253"` - no spaces)
- **Custom**: Formatted with spaces (`"+55 11 98765-4321"`)

### Validation
```tsx
// ReUI approach (not used)
import { isValidPhoneNumber } from 'react-phone-number-input'

// Custom approach (use this)
import { optionalPhoneNumberSchema } from '@/lib/validations/phone'
```

### Country Data
- **ReUI**: Uses `libphonenumber-js` metadata
- **Custom**: Custom country data in `/lib/data/countries-phone.ts` with 175+ countries

### Features Comparison

| Feature | ReUI Base Phone Input | Custom Implementation |
|---------|----------------------|----------------------|
| Country selector | ✅ Yes | ✅ Yes |
| Phone formatting | ✅ Yes (via libphonenumber) | ✅ Yes (custom masks) |
| Validation | ✅ Yes (via libphonenumber) | ✅ Yes (Zod schemas) |
| Internationalization | ✅ Yes (import locales) | ✅ Yes (next-intl) |
| Size variants | ✅ sm/md/lg | ⚠️ Fixed h-9 |
| React Hook Form | ✅ Yes | ✅ Yes (forwardRef) |
| TypeScript | ✅ Yes | ✅ Yes (strict) |
| Dependencies | ⚠️ +2 packages | ✅ Zero additional |
| Customization | ⚠️ Limited | ✅ Full control |
| Bundle size | ⚠️ Larger | ✅ Smaller |

## Migration Guide

If you have code referencing ReUI's phone input, update it as follows:

### 1. Update Imports

```tsx
// Before (ReUI)
import PhoneInput from '@reui/base-phone-input'
import { isValidPhoneNumber } from 'react-phone-number-input'

// After (Custom)
import { PhoneInput } from '@/components/ui/phone-input'
import { optionalPhoneNumberSchema } from '@/lib/validations/phone'
```

### 2. Update Form Schema

```tsx
// Before (ReUI)
const formSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isValidPhoneNumber, {
      message: 'Invalid phone number',
    }),
})

// After (Custom)
import { requiredPhoneNumberSchema } from '@/lib/validations/phone'

const formSchema = z.object({
  phoneNumber: requiredPhoneNumberSchema,
})
```

### 3. Update Component Usage

```tsx
// Before (ReUI)
<PhoneInput
  size="md"
  defaultCountry="US"
  placeholder="Enter phone number"
  {...field}
/>

// After (Custom)
<PhoneInput
  defaultCountry="BR"  // Note: Project default is Brazil
  placeholder={t('enterPhoneNumber')}  // Use translations
  {...field}
/>
```

### 4. Handle Data Format Differences

```tsx
// ReUI returns: "+12133734253" (no spaces)
// Custom returns: "+55 11 98765-4321" (with spaces)

// To clean custom format for API calls:
import { cleanPhoneNumber } from '@/lib/validations/phone'

const cleaned = cleanPhoneNumber("+55 11 98765-4321")
// Result: "+5511987654321"
```

## For New Development

**Do not use this ReUI documentation for new development.** Instead:

1. Read the [Custom Phone Input Documentation](./reui_phone-input.md)
2. Use the component at `/components/ui/phone-input.tsx`
3. Use validation schemas from `/lib/validations/phone.ts`
4. Reference country data from `/lib/data/countries-phone.ts`

## Questions?

If you need to understand how phone input works in this project:

- **Component Implementation**: `/components/ui/phone-input.tsx`
- **Usage Examples**: See form files in `/components/companies/`, `/components/people/`, etc.
- **Validation**: `/lib/validations/phone.ts`
- **Country Data**: `/lib/data/countries-phone.ts`
- **Complete Documentation**: [reui_phone-input.md](./reui_phone-input.md)

---

*This document is maintained for historical reference only. All new development should use the custom phone input implementation.*
