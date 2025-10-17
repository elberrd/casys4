# ReUI - Phone Input

> Source: https://reui.io/docs/base-phone-input
> Built on: react-phone-number-input (https://github.com/catamphetamine/react-phone-number-input)
> Version: Latest
> Last Updated: 2025-10-17

## Overview

A phone number input component with country selection and validation. Built on top of Base UI components with react-phone-number-input. The component provides an intuitive interface for international phone number input, featuring automatic formatting, country code detection, and comprehensive validation capabilities.

**Key Features:**
- International phone number formatting
- Country selection dropdown with flags
- Automatic phone number validation
- E.164 format output
- Multiple size variants (small, medium, large)
- Form integration support
- RTL (Right-to-Left) support
- Accessibility features built-in

## Installation

### Using CLI (Recommended)

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/base-phone-input

# Using npm
npm dlx shadcn@latest add @reui/base-phone-input

# Using yarn
yarn dlx shadcn@latest add @reui/base-phone-input

# Using bun
bunx shadcn@latest add @reui/base-phone-input
```

### Manual Installation

If you prefer manual installation, you need to install the underlying dependencies:

```bash
# Install react-phone-number-input
npm install react-phone-number-input

# Install required CSS
npm install react-phone-number-input/style.css
```

## Dependencies

The ReUI Phone Input component is built on top of:
- **react-phone-number-input**: Core phone number parsing, formatting, and validation
- **libphonenumber-js**: Phone number parsing and formatting library (included with react-phone-number-input)
- **Base UI components**: ReUI's base component library

## Usage

### Basic Usage

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useState } from 'react'

function BasicExample() {
  const [phoneNumber, setPhoneNumber] = useState('')

  return (
    <PhoneInput
      placeholder="Enter phone number"
      value={phoneNumber}
      onChange={setPhoneNumber}
    />
  )
}
```

The `value` will be in E.164 format (e.g., "+12133734253"). This is an international standard for phone numbers.

### With Default Country

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useState } from 'react'

function DefaultCountryExample() {
  const [phoneNumber, setPhoneNumber] = useState('')

  return (
    <PhoneInput
      placeholder="Enter phone number"
      defaultCountry="US"
      value={phoneNumber}
      onChange={setPhoneNumber}
    />
  )
}
```

### Size Variants

The component supports three size variants: small, medium (default), and large.

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useState } from 'react'

function SizeExample() {
  const [small, setSmall] = useState('')
  const [medium, setMedium] = useState('')
  const [large, setLarge] = useState('')

  return (
    <div className="space-y-4">
      {/* Small */}
      <PhoneInput
        size="sm"
        placeholder="Small"
        value={small}
        onChange={setSmall}
      />

      {/* Medium (Default) */}
      <PhoneInput
        size="md"
        placeholder="Medium"
        value={medium}
        onChange={setMedium}
      />

      {/* Large */}
      <PhoneInput
        size="lg"
        placeholder="Large"
        value={large}
        onChange={setLarge}
      />
    </div>
  )
}
```

### Form Integration

The component integrates seamlessly with form libraries like React Hook Form.

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useForm } from 'react-hook-form'
import { Button } from '@reui/components/button'

interface FormData {
  phoneNumber: string
}

function FormExample() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<FormData>()

  const phoneNumber = watch('phoneNumber')

  const onSubmit = (data: FormData) => {
    console.log('Phone Number:', data.phoneNumber)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium mb-2">
          Phone Number
        </label>
        <PhoneInput
          id="phoneNumber"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(value) => setValue('phoneNumber', value || '')}
          defaultCountry="US"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Enter your phone number to proceed
        </p>
        {errors.phoneNumber && (
          <p className="text-sm text-destructive mt-1">
            {errors.phoneNumber.message}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline">
          Reset
        </Button>
        <Button type="submit">
          Submit
        </Button>
      </div>
    </form>
  )
}
```

### With Validation

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useState } from 'react'
import { isValidPhoneNumber, isPossiblePhoneNumber } from 'react-phone-number-input'

function ValidationExample() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')

  const handleChange = (value: string) => {
    setPhoneNumber(value)

    if (!value) {
      setError('Phone number is required')
    } else if (!isPossiblePhoneNumber(value)) {
      setError('Invalid phone number length')
    } else if (!isValidPhoneNumber(value)) {
      setError('Invalid phone number')
    } else {
      setError('')
    }
  }

  return (
    <div>
      <PhoneInput
        placeholder="Enter phone number"
        value={phoneNumber}
        onChange={handleChange}
      />
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
      {phoneNumber && !error && (
        <p className="text-sm text-success mt-1">Valid phone number!</p>
      )}
    </div>
  )
}
```

### Formatting Display Values

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useState } from 'react'
import { formatPhoneNumber, formatPhoneNumberIntl } from 'react-phone-number-input'

function FormatExample() {
  const [phoneNumber, setPhoneNumber] = useState('')

  return (
    <div className="space-y-4">
      <PhoneInput
        placeholder="Enter phone number"
        value={phoneNumber}
        onChange={setPhoneNumber}
      />

      {phoneNumber && (
        <div className="text-sm space-y-1">
          <p>
            <strong>E.164 Format:</strong> {phoneNumber}
          </p>
          <p>
            <strong>National Format:</strong> {formatPhoneNumber(phoneNumber)}
          </p>
          <p>
            <strong>International Format:</strong> {formatPhoneNumberIntl(phoneNumber)}
          </p>
        </div>
      )}
    </div>
  )
}
```

### Getting Country Information

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useState } from 'react'
import { parsePhoneNumber, getCountryCallingCode } from 'react-phone-number-input'

function CountryInfoExample() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [country, setCountry] = useState<string>()

  const phoneNumberObj = phoneNumber ? parsePhoneNumber(phoneNumber) : null

  return (
    <div className="space-y-4">
      <PhoneInput
        placeholder="Enter phone number"
        value={phoneNumber}
        onChange={setPhoneNumber}
        onCountryChange={setCountry}
      />

      {phoneNumberObj && (
        <div className="text-sm space-y-1">
          <p>
            <strong>Country:</strong> {phoneNumberObj.country}
          </p>
          <p>
            <strong>Country Calling Code:</strong> +{phoneNumberObj.countryCallingCode}
          </p>
          <p>
            <strong>National Number:</strong> {phoneNumberObj.nationalNumber}
          </p>
        </div>
      )}
    </div>
  )
}
```

### With Custom Styling

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useState } from 'react'

function CustomStyledExample() {
  const [phoneNumber, setPhoneNumber] = useState('')

  return (
    <PhoneInput
      placeholder="Enter phone number"
      value={phoneNumber}
      onChange={setPhoneNumber}
      className="border-2 border-primary focus-within:ring-2 focus-within:ring-primary"
    />
  )
}
```

## Props/API Reference

### Main Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `undefined` | Phone number in E.164 format (e.g., "+12133734253") |
| `onChange` | `(value: string \| undefined) => void` | - | Callback when phone number changes. Receives `undefined` for empty values |
| `defaultCountry` | `string` | `undefined` | Default country code (ISO 3166-1 alpha-2). Example: "US", "GB", "FR" |
| `countries` | `string[]` | All countries | Array of country codes to display in the selector |
| `placeholder` | `string` | - | Placeholder text for the input |
| `disabled` | `boolean` | `false` | Disables the input and country selector |
| `readOnly` | `boolean` | `false` | Makes the input read-only |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant of the input |
| `international` | `boolean` | - | Force international format |
| `withCountryCallingCode` | `boolean` | - | Include country calling code in the input |
| `countryCallingCodeEditable` | `boolean` | `true` | Whether the country calling code can be edited |
| `onCountryChange` | `(country?: string) => void` | - | Callback when country changes |
| `labels` | `object` | English | Localization labels for countries and UI text |
| `className` | `string` | - | Additional CSS classes |
| `inputComponent` | `Component` | `input` | Custom input component |
| `countrySelectComponent` | `Component` | Default select | Custom country select component |
| `flagUrl` | `string` | Default CDN | Custom flag icon URL template |
| `flags` | `object` | - | Custom flag icon components |
| `addInternationalOption` | `boolean` | `true` | Show "International" option in country selector |
| `smartCaret` | `boolean` | `true` | Enable smart caret positioning |

### Standard Input Props

The component also accepts standard HTML input attributes:
- `autoComplete`
- `autoFocus`
- `tabIndex`
- `name`
- `id`
- `type` (defaults to "tel")
- All ARIA attributes

## Utility Functions

The component exports several utility functions from react-phone-number-input:

### `isValidPhoneNumber(value: string): boolean`

Validates if a phone number is valid (checks length and digit patterns).

```tsx
import { isValidPhoneNumber } from 'react-phone-number-input'

isValidPhoneNumber('+12133734253') // true
isValidPhoneNumber('+12223333333') // false
```

### `isPossiblePhoneNumber(value: string): boolean`

Checks if a phone number has valid length (less strict than `isValidPhoneNumber`).

```tsx
import { isPossiblePhoneNumber } from 'react-phone-number-input'

isPossiblePhoneNumber('+12223333333') // true
```

### `formatPhoneNumber(value: string): string`

Formats phone number in national format.

```tsx
import { formatPhoneNumber } from 'react-phone-number-input'

formatPhoneNumber('+12133734253') // "(213) 373-4253"
```

### `formatPhoneNumberIntl(value: string): string`

Formats phone number in international format.

```tsx
import { formatPhoneNumberIntl } from 'react-phone-number-input'

formatPhoneNumberIntl('+12133734253') // "+1 213 373 4253"
```

### `parsePhoneNumber(input: string): PhoneNumber | undefined`

Parses a phone number string into a PhoneNumber object.

```tsx
import { parsePhoneNumber } from 'react-phone-number-input'

const phoneNumber = parsePhoneNumber('+12133734253')
if (phoneNumber) {
  console.log(phoneNumber.country) // "US"
  console.log(phoneNumber.nationalNumber) // "2133734253"
}
```

### `getCountryCallingCode(country: string): string`

Gets the calling code for a country.

```tsx
import { getCountryCallingCode } from 'react-phone-number-input'

getCountryCallingCode('US') // "1"
getCountryCallingCode('GB') // "44"
```

## Styling and Customization

### CSS Variables

The component uses CSS variables for easy customization:

```css
:root {
  --PhoneInputCountryFlag-height: 1em;
  --PhoneInputCountryFlag-borderColor: rgba(0, 0, 0, 0.5);
  --PhoneInputCountrySelectArrow-color: currentColor;
  --PhoneInputCountrySelectArrow-opacity: 0.45;
  --PhoneInput-color--focus: #03b2cb;
}
```

### Size Classes

The component applies different classes based on the `size` prop:
- `size="sm"`: Smaller padding and font size
- `size="md"`: Default medium size
- `size="lg"`: Larger padding and font size

### Custom Themes

```css
/* Example: Dark theme customization */
.dark .PhoneInput {
  --PhoneInputCountryFlag-borderColor: rgba(255, 255, 255, 0.5);
  --PhoneInputCountrySelectArrow-color: white;
  --PhoneInput-color--focus: #60a5fa;
}

/* Example: Custom brand colors */
.PhoneInput {
  --PhoneInput-color--focus: #3b82f6;
}
```

## Localization

The component supports internationalization through the `labels` prop. ReUI and react-phone-number-input come with several pre-built translations.

### Using Localization

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import es from 'react-phone-number-input/locale/es' // Spanish
import fr from 'react-phone-number-input/locale/fr' // French
import ru from 'react-phone-number-input/locale/ru' // Russian

function LocalizedExample() {
  const [phoneNumber, setPhoneNumber] = useState('')

  return (
    <PhoneInput
      labels={es} // Use Spanish labels
      placeholder="Ingrese número de teléfono"
      value={phoneNumber}
      onChange={setPhoneNumber}
    />
  )
}
```

### Available Locales

- English (en) - default
- Spanish (es)
- French (fr)
- German (de)
- Russian (ru)
- Portuguese (pt)
- Italian (it)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- And many more...

See the [complete list of available locales](https://github.com/catamphetamine/react-phone-number-input/tree/master/locale).

## Accessibility

The Phone Input component is built with accessibility in mind:

- **ARIA Labels**: Proper `aria-label` attributes on country select
- **Keyboard Navigation**: Full keyboard support for input and country selection
- **Screen Reader Support**: Descriptive labels and announcements
- **Focus Management**: Clear focus indicators and logical tab order
- **Error Announcements**: Error messages are properly associated with inputs

### Accessibility Best Practices

```tsx
import { PhoneInput } from '@reui/components/base-phone-input'
import { useState } from 'react'

function AccessibleExample() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState('')

  return (
    <div>
      <label htmlFor="phone-input" className="block text-sm font-medium mb-2">
        Phone Number <span className="text-destructive">*</span>
      </label>
      <PhoneInput
        id="phone-input"
        placeholder="Enter phone number"
        value={phoneNumber}
        onChange={setPhoneNumber}
        required
        aria-required="true"
        aria-invalid={!!error}
        aria-describedby={error ? "phone-error" : undefined}
      />
      {error && (
        <p id="phone-error" className="text-sm text-destructive mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
```

## Common Issues and Solutions

### Issue: Phone number not being validated correctly

**Solution**: Make sure you're using the appropriate validation function. Use `isPossiblePhoneNumber()` for length validation, and `isValidPhoneNumber()` for strict validation.

```tsx
// Recommended: Use isPossiblePhoneNumber for better UX
if (phoneNumber && !isPossiblePhoneNumber(phoneNumber)) {
  setError('Please enter a valid phone number')
}
```

### Issue: Country not being detected

**Solution**: Ensure the phone number is in E.164 format (starts with +) for automatic country detection.

```tsx
const phoneNumber = parsePhoneNumber(value)
if (phoneNumber) {
  console.log('Country:', phoneNumber.country)
}
```

### Issue: Custom styling not applying

**Solution**: Make sure to import the base CSS file and use CSS variables or className prop.

```tsx
import 'react-phone-number-input/style.css'

<PhoneInput className="custom-phone-input" ... />
```

### Issue: Flags not displaying

**Solution**: The component loads flags from CDN by default. If you need offline support, import flags directly:

```tsx
import flags from 'react-phone-number-input/flags'

<PhoneInput flags={flags} ... />
```

## Best Practices

1. **Always validate phone numbers**: Use `isPossiblePhoneNumber()` or `isValidPhoneNumber()` before form submission.

2. **Provide clear error messages**: Help users understand what's wrong with their input.

3. **Set a default country**: If you know your users' location, set `defaultCountry` for better UX.

4. **Store in E.164 format**: Always store phone numbers in E.164 format in your database for consistency.

5. **Display formatted numbers**: Use `formatPhoneNumber()` or `formatPhoneNumberIntl()` when displaying phone numbers to users.

6. **Consider using `isPossiblePhoneNumber()` over `isValidPhoneNumber()`**: Phone numbering plans can change, and `isPossiblePhoneNumber()` is more future-proof.

7. **Accessibility matters**: Always provide proper labels and error messages.

8. **Test with real phone numbers**: Test your forms with actual phone numbers from different countries.

## RTL (Right-to-Left) Support

The component supports RTL languages out of the box. When the page direction is RTL, the component automatically adjusts its layout.

```tsx
<div dir="rtl">
  <PhoneInput
    placeholder="أدخل رقم الهاتف"
    value={phoneNumber}
    onChange={setPhoneNumber}
  />
</div>
```

## Browser Support

The component works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

**Note**: Internet Explorer is not supported. For older browsers, you may need to transpile CSS variables.

## Related Resources

- [ReUI Documentation](https://reui.io/docs)
- [react-phone-number-input GitHub](https://github.com/catamphetamine/react-phone-number-input)
- [react-phone-number-input Demo](https://catamphetamine.github.io/react-phone-number-input/)
- [libphonenumber-js Documentation](https://gitlab.com/catamphetamine/libphonenumber-js)
- [ISO 3166-1 Country Codes](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)

## License

This component is part of ReUI, which uses the MIT license. The underlying react-phone-number-input library is also MIT licensed.
