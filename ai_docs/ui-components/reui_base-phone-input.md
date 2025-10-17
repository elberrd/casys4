# ReUI - Base Phone Input

> Source: https://reui.io/docs/base-phone-input
> Based on: react-phone-number-input v3.x
> Last Updated: 2025-10-16

## Overview

The Base Phone Input is an international phone number input component with country selection and validation capabilities. It is built on top of Base UI components and integrates with the `react-phone-number-input` library, providing a comprehensive solution for collecting phone numbers with international dial codes.

**Key Features:**
- International phone number formatting
- Country selection dropdown with flags
- Automatic validation
- Support for national and international formats
- Multiple size variants
- Form integration with validation
- Accessibility support
- TypeScript compatible

## Installation

### CLI Installation (Recommended)

Using the shadcn CLI, you can install the component directly into your project:

```bash
# pnpm
pnpm dlx shadcn@latest add @reui/base-phone-input

# npm
npx shadcn@latest add @reui/base-phone-input

# yarn
yarn dlx shadcn@latest add @reui/base-phone-input

# bun
bunx shadcn@latest add @reui/base-phone-input
```

### Manual Installation

If you prefer manual installation, install the required dependencies:

```bash
# pnpm
pnpm add react-phone-number-input

# npm
npm install react-phone-number-input

# yarn
yarn add react-phone-number-input

# bun
bun add react-phone-number-input
```

## Dependencies

The component requires the following dependencies:

- `react` (^18.0.0 or higher)
- `react-phone-number-input` (latest version)
- Base UI components (installed via ReUI)
- `libphonenumber-js` (peer dependency of react-phone-number-input)

## Usage

### Basic Example

```tsx
import React, { useState } from 'react'
import PhoneInput from '@reui/base-phone-input'

export default function PhoneInputExample() {
  const [value, setValue] = useState<string>()

  return (
    <PhoneInput
      placeholder="Enter phone number"
      value={value}
      onChange={setValue}
    />
  )
}
```

### With Default Country

Set a default country to pre-select it in the dropdown. The country can be obtained via IP geolocation or based on user preferences.

```tsx
import React, { useState } from 'react'
import PhoneInput from '@reui/base-phone-input'

export default function PhoneInputWithDefault() {
  const [value, setValue] = useState<string>()

  return (
    <PhoneInput
      defaultCountry="US"
      placeholder="Enter phone number"
      value={value}
      onChange={setValue}
    />
  )
}
```

### Size Variants

The component supports three size variants: small, medium (default), and large.

```tsx
import React, { useState } from 'react'
import PhoneInput from '@reui/base-phone-input'

export default function PhoneInputSizes() {
  const [small, setSmall] = useState<string>()
  const [medium, setMedium] = useState<string>()
  const [large, setLarge] = useState<string>()

  return (
    <div className="space-y-4">
      {/* Small */}
      <PhoneInput
        size="sm"
        placeholder="Small input"
        value={small}
        onChange={setSmall}
      />

      {/* Medium (Default) */}
      <PhoneInput
        placeholder="Medium input (default)"
        value={medium}
        onChange={setMedium}
      />

      {/* Large */}
      <PhoneInput
        size="lg"
        placeholder="Large input"
        value={large}
        onChange={setLarge}
      />
    </div>
  )
}
```

### Form Integration with Validation

Complete example using React Hook Form with validation:

```tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import PhoneInput from '@reui/base-phone-input'
import { isValidPhoneNumber } from 'react-phone-number-input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'

const formSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .refine(isValidPhoneNumber, {
      message: 'Invalid phone number',
    }),
})

type FormValues = z.infer<typeof formSchema>

export default function PhoneInputForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: '',
    },
  })

  function onSubmit(data: FormValues) {
    console.log('Form submitted:', data)
    // Handle form submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <PhoneInput
                  placeholder="Enter your phone number"
                  defaultCountry="US"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter your phone number to proceed
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </Form>
  )
}
```

### International Format

Force international format for phone numbers:

```tsx
import React, { useState } from 'react'
import PhoneInput from '@reui/base-phone-input'

export default function InternationalFormat() {
  const [value, setValue] = useState<string>()

  return (
    <PhoneInput
      international
      defaultCountry="US"
      placeholder="Enter phone number"
      value={value}
      onChange={setValue}
    />
  )
}
```

### National Format Only

Restrict input to national format for a specific country:

```tsx
import React, { useState } from 'react'
import PhoneInput from '@reui/base-phone-input'

export default function NationalFormat() {
  const [value, setValue] = useState<string>()

  return (
    <PhoneInput
      international={false}
      defaultCountry="US"
      placeholder="Enter phone number"
      value={value}
      onChange={setValue}
    />
  )
}
```

### With Validation Display

Show validation status in real-time:

```tsx
import React, { useState } from 'react'
import PhoneInput from '@reui/base-phone-input'
import {
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  formatPhoneNumber,
  formatPhoneNumberIntl,
} from 'react-phone-number-input'

export default function PhoneInputWithValidation() {
  const [value, setValue] = useState<string>()

  return (
    <div className="space-y-4">
      <PhoneInput
        placeholder="Enter phone number"
        value={value}
        onChange={setValue}
        error={
          value
            ? isValidPhoneNumber(value)
              ? undefined
              : 'Invalid phone number'
            : 'Phone number required'
        }
      />

      {value && (
        <div className="space-y-2 text-sm">
          <p>
            <strong>Is Possible:</strong>{' '}
            {isPossiblePhoneNumber(value) ? 'Yes' : 'No'}
          </p>
          <p>
            <strong>Is Valid:</strong>{' '}
            {isValidPhoneNumber(value) ? 'Yes' : 'No'}
          </p>
          <p>
            <strong>National Format:</strong> {formatPhoneNumber(value)}
          </p>
          <p>
            <strong>International Format:</strong> {formatPhoneNumberIntl(value)}
          </p>
        </div>
      )}
    </div>
  )
}
```

### With Localization

Use localized country names:

```tsx
import React, { useState } from 'react'
import PhoneInput from '@reui/base-phone-input'
import es from 'react-phone-number-input/locale/es' // Spanish labels

export default function LocalizedPhoneInput() {
  const [value, setValue] = useState<string>()

  return (
    <PhoneInput
      labels={es}
      placeholder="Ingrese su número de teléfono"
      value={value}
      onChange={setValue}
    />
  )
}
```

## Props / API Reference

The component is built on top of `react-phone-number-input`. Below are the most commonly used props:

### Core Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| undefined` | - | The phone number value in E.164 format (e.g., "+12133734253") |
| `onChange` | `(value?: string) => void` | - | Callback fired when the value changes |
| `defaultCountry` | `string` | - | Two-letter country code to pre-select (e.g., "US", "GB", "FR") |
| `country` | `string` | - | Force a specific country (removes country selector) |
| `countries` | `string[]` | All countries | Array of two-letter country codes to include |
| `placeholder` | `string` | - | Placeholder text for the input |
| `international` | `boolean` | `true` | Allow international format. Set to `false` for national format only |
| `countryCallingCodeEditable` | `boolean` | `true` | Whether the country calling code is editable |
| `withCountryCallingCode` | `boolean` | `false` | Include the country calling code in the input (non-editable) |

### Display & Styling Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant of the input |
| `disabled` | `boolean` | `false` | Disable the input |
| `className` | `string` | - | Additional CSS classes |
| `error` | `string` | - | Error message to display |

### Country Select Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `labels` | `object` | English | Localized country names (import from `react-phone-number-input/locale/{lang}`) |
| `countrySelectProps` | `object` | - | Additional props for the country select component |
| `countrySelectComponent` | `Component` | - | Custom country select component |

### Format & Validation Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialValueFormat` | `"national" \| "international"` | `"international"` | Format to use for initial value display |
| `smartCaret` | `boolean` | `true` | Enable smart caret positioning |
| `useNationalFormatForDefaultCountryValue` | `boolean` | - | Use national format when default country matches |

### Additional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `metadata` | `object` | - | Custom metadata for phone number parsing |
| `inputComponent` | `Component` | - | Custom input component |
| `numberInputProps` | `object` | - | Props passed to the underlying input element |
| `focusInputOnCountrySelection` | `boolean` | `true` | Focus input when country changes |

## Validation Functions

The library provides several validation functions:

```tsx
import {
  isValidPhoneNumber,
  isPossiblePhoneNumber,
  parsePhoneNumber,
  getCountries,
  getCountryCallingCode,
} from 'react-phone-number-input'

// Validate if phone number is valid
const isValid = isValidPhoneNumber('+12133734253') // true or false

// Check if phone number is possible (less strict, checks length only)
const isPossible = isPossiblePhoneNumber('+12133734253') // true or false

// Parse phone number details
const phoneNumber = parsePhoneNumber('+12133734253')
if (phoneNumber) {
  console.log(phoneNumber.country) // "US"
  console.log(phoneNumber.nationalNumber) // "2133734253"
}

// Get all available countries
const countries = getCountries() // ["AC", "AD", "AE", ...]

// Get calling code for a country
const callingCode = getCountryCallingCode('US') // "1"
```

## Formatting Functions

Format phone numbers for display:

```tsx
import {
  formatPhoneNumber,
  formatPhoneNumberIntl,
} from 'react-phone-number-input'

const value = '+12133734253'

// Format in national format
const national = formatPhoneNumber(value) // "(213) 373-4253"

// Format in international format
const international = formatPhoneNumberIntl(value) // "+1 213 373 4253"
```

## Best Practices

### 1. Use Appropriate Validation

The library author recommends using `isPossiblePhoneNumber()` for validation rather than `isValidPhoneNumber()` in most cases, as it only validates length and is less strict:

```tsx
// Recommended: Less strict, validates length
const isValid = isPossiblePhoneNumber(value)

// Strict: Full validation (use only when necessary)
const isStrictlyValid = isValidPhoneNumber(value)
```

### 2. Store Values in E.164 Format

Always store phone numbers in E.164 format (international format starting with +):

```tsx
// Good: Store as "+12133734253"
const phoneNumber = value // E.164 format

// Bad: Don't store as "(213) 373-4253"
```

### 3. Set Default Country Based on User Location

Use IP geolocation or user preferences to set the default country:

```tsx
import { useState, useEffect } from 'react'
import PhoneInput from '@reui/base-phone-input'

export default function SmartPhoneInput() {
  const [country, setCountry] = useState<string>()
  const [value, setValue] = useState<string>()

  useEffect(() => {
    // Fetch user's country from IP geolocation
    fetch('https://api.ipgeolocation.io/ipgeo?apiKey=YOUR_API_KEY')
      .then((res) => res.json())
      .then((data) => setCountry(data.country_code2))
  }, [])

  return (
    <PhoneInput
      defaultCountry={country}
      value={value}
      onChange={setValue}
    />
  )
}
```

### 4. Handle Form Submission Properly

Always validate before submission:

```tsx
const handleSubmit = (data: FormValues) => {
  if (!isValidPhoneNumber(data.phoneNumber)) {
    toast.error('Please enter a valid phone number')
    return
  }

  // Proceed with submission
  submitToAPI(data)
}
```

### 5. Provide Clear Error Messages

Show specific error messages for better UX:

```tsx
const getErrorMessage = (value?: string) => {
  if (!value) return 'Phone number is required'
  if (!isPossiblePhoneNumber(value)) return 'Phone number is too short'
  if (!isValidPhoneNumber(value)) return 'Invalid phone number format'
  return undefined
}
```

### 6. Consider Accessibility

The component includes built-in accessibility features, but ensure you:

- Always provide labels for screen readers
- Use proper form field descriptions
- Handle keyboard navigation
- Provide clear error messages

## Accessibility

The component follows accessibility best practices:

- Proper ARIA labels for country select and input
- Keyboard navigation support
- Screen reader compatible
- Focus management
- Error announcements

## Common Use Cases

### 1. Contact Form

```tsx
<FormField
  control={form.control}
  name="phone"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Contact Number</FormLabel>
      <FormControl>
        <PhoneInput
          defaultCountry="US"
          placeholder="(555) 123-4567"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 2. User Registration

```tsx
<PhoneInput
  defaultCountry={userCountry}
  placeholder="Enter your mobile number"
  value={phone}
  onChange={setPhone}
  error={phoneError}
/>
```

### 3. Two-Factor Authentication

```tsx
<PhoneInput
  international
  countryCallingCodeEditable={false}
  defaultCountry="US"
  placeholder="Your phone for 2FA"
  value={phone}
  onChange={setPhone}
/>
```

## TypeScript Support

The component is fully typed for TypeScript:

```tsx
import type { Country } from 'react-phone-number-input'

interface PhoneInputProps {
  value?: string
  onChange: (value?: string) => void
  defaultCountry?: Country
  countries?: Country[]
  size?: 'sm' | 'md' | 'lg'
  error?: string
  disabled?: boolean
}
```

## Troubleshooting

### Issue: Country flags not showing

**Solution:** Ensure you have the proper font support or use Unicode flags:

```tsx
<PhoneInput
  countrySelectProps={{ unicodeFlags: true }}
  value={value}
  onChange={setValue}
/>
```

### Issue: Validation always fails

**Solution:** Make sure the value is in E.164 format (starts with +):

```tsx
// Correct
const value = '+12133734253'

// Incorrect
const value = '2133734253'
```

### Issue: Default country not working

**Solution:** Use two-letter ISO country code:

```tsx
// Correct
defaultCountry="US"

// Incorrect
defaultCountry="USA"
```

## Related Resources

- [Official ReUI Documentation](https://reui.io/docs/base-phone-input)
- [react-phone-number-input Documentation](https://catamphetamine.gitlab.io/react-phone-number-input/)
- [react-phone-number-input GitHub](https://gitlab.com/catamphetamine/react-phone-number-input)
- [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) (underlying library)

## License

The component follows ReUI's licensing. The underlying `react-phone-number-input` library is MIT licensed.
