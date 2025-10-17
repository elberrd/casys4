# ReUI - Stepper Component

> Source: https://reui.io/docs/stepper
> Library: ReUI (React Component Library)
> Version: Latest (Compatible with React 18+)
> Last Updated: 2025-10-16

## Overview

The Stepper component provides a step-by-step process interface for users to navigate through a series of sequential steps. It's ideal for multi-step forms, onboarding flows, checkout processes, and any workflow that requires users to complete tasks in a specific order.

**Key Features:**
- Horizontal and vertical orientations
- Controlled and uncontrolled modes
- Customizable indicators with state-based rendering
- Full keyboard navigation support (Arrow keys, Home, End, Enter, Space)
- Accessible (ARIA-compliant with proper roles and attributes)
- Loading states for async operations
- Disabled step support
- Custom styling with Tailwind CSS
- TypeScript support with full type definitions

## Installation

### Using shadcn CLI (Recommended)

```bash
# Install via pnpm
pnpm dlx shadcn@latest add @reui/stepper

# Install via npm
npx shadcn@latest add @reui/stepper

# Install via yarn
yarn dlx shadcn@latest add @reui/stepper

# Install via bun
bunx shadcn@latest add @reui/stepper
```

### Manual Installation

If you prefer manual installation, you'll need to:

1. Install dependencies:

```bash
npm install clsx tailwind-merge
```

2. Copy the stepper component code from https://reui.io/r/stepper.json

3. Add the utility function (if not already present):

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

## Required Dependencies

- **React**: 18.0.0 or higher
- **clsx**: For conditional className management
- **tailwind-merge**: For merging Tailwind CSS classes
- **Tailwind CSS**: 3.0.0 or higher
- **lucide-react** (optional): For custom indicator icons

## Component Architecture

The Stepper component is composed of multiple sub-components that work together:

- **Stepper**: Root container that manages state and provides context
- **StepperNav**: Navigation wrapper for step items
- **StepperItem**: Individual step container with state management
- **StepperTrigger**: Clickable trigger for step navigation
- **StepperIndicator**: Visual indicator (numbers, icons, etc.)
- **StepperSeparator**: Visual connector between steps
- **StepperPanel**: Container for step content
- **StepperContent**: Individual step content display
- **StepperTitle**: Optional title for each step
- **StepperDescription**: Optional description for each step

## TypeScript Types

```typescript
// Core Types
type StepperOrientation = 'horizontal' | 'vertical';
type StepState = 'active' | 'completed' | 'inactive' | 'loading';

// Indicator Configuration
type StepIndicators = {
  active?: React.ReactNode;
  completed?: React.ReactNode;
  inactive?: React.ReactNode;
  loading?: React.ReactNode;
};

// Component Props
interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: number;        // Initial step (uncontrolled mode)
  value?: number;               // Current step (controlled mode)
  onValueChange?: (value: number) => void; // Change handler
  orientation?: StepperOrientation;         // 'horizontal' | 'vertical'
  indicators?: StepIndicators;  // Custom indicators per state
}

interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number;          // Step number (required)
  completed?: boolean;   // Mark as completed
  disabled?: boolean;    // Disable step interaction
  loading?: boolean;     // Show loading state
}

interface StepperTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;     // Render as child element instead of button
}

interface StepperContentProps extends React.ComponentProps<'div'> {
  value: number;         // Step number this content belongs to
  forceMount?: boolean;  // Keep mounted even when inactive
}
```

## Usage

### Example 1: Basic Stepper (Uncontrolled)

```tsx
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from '@/components/ui/stepper';

const steps = [1, 2, 3, 4];

export default function BasicStepper() {
  return (
    <Stepper defaultValue={2} className="space-y-8">
      <StepperNav>
        {steps.map((step) => (
          <StepperItem key={step} step={step}>
            <StepperTrigger>
              <StepperIndicator>{step}</StepperIndicator>
            </StepperTrigger>
            {steps.length > step && (
              <StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
            )}
          </StepperItem>
        ))}
      </StepperNav>

      <StepperPanel className="text-sm">
        {steps.map((step) => (
          <StepperContent
            key={step}
            value={step}
            className="flex items-center justify-center"
          >
            Step {step} content
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}
```

### Example 2: Controlled Stepper with Navigation Buttons

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from '@/components/ui/stepper';

const steps = [1, 2, 3, 4];

export default function ControlledStepper() {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <Stepper
      value={currentStep}
      onValueChange={setCurrentStep}
      className="space-y-8"
    >
      <StepperNav>
        {steps.map((step) => (
          <StepperItem key={step} step={step}>
            <StepperTrigger>
              <StepperIndicator className="data-[state=completed]:bg-green-500 data-[state=completed]:text-white">
                {step}
              </StepperIndicator>
            </StepperTrigger>
            {steps.length > step && (
              <StepperSeparator className="group-data-[state=completed]/step:bg-green-500" />
            )}
          </StepperItem>
        ))}
      </StepperNav>

      <StepperPanel className="text-sm">
        {steps.map((step) => (
          <StepperContent
            key={step}
            value={step}
            className="w-full flex items-center justify-center"
          >
            <div className="space-y-4">
              <h3>Step {step} Content</h3>
              <p>This is the content for step {step}</p>
            </div>
          </StepperContent>
        ))}
      </StepperPanel>

      <div className="flex items-center justify-between gap-2.5">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentStep === steps.length}
        >
          Next
        </Button>
      </div>
    </Stepper>
  );
}
```

### Example 3: Vertical Stepper with Custom Indicators

```tsx
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from '@/components/ui/stepper';
import { Check, LoaderCircle } from 'lucide-react';

const steps = [1, 2, 3];

export default function VerticalStepper() {
  return (
    <div className="flex items-center justify-center">
      <Stepper
        className="flex flex-col items-center justify-center gap-10"
        defaultValue={2}
        orientation="vertical"
        indicators={{
          completed: <Check className="size-4" />,
          loading: <LoaderCircle className="size-4 animate-spin" />,
        }}
      >
        <StepperNav>
          {steps.map((step) => (
            <StepperItem key={step} step={step} loading={step === 2}>
              <StepperTrigger>
                <StepperIndicator className="data-[state=completed]:bg-green-500 data-[state=completed]:text-white">
                  {step}
                </StepperIndicator>
              </StepperTrigger>
              {steps.length > step && (
                <StepperSeparator className="group-data-[state=completed]/step:bg-green-500" />
              )}
            </StepperItem>
          ))}
        </StepperNav>

        <StepperPanel className="text-sm w-56 text-center">
          {steps.map((step) => (
            <StepperContent key={step} value={step}>
              Step {step} content
            </StepperContent>
          ))}
        </StepperPanel>
      </Stepper>
    </div>
  );
}
```

### Example 4: Stepper with Titles and Descriptions

```tsx
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';

const stepsData = [
  { id: 1, title: 'Account', description: 'Create your account' },
  { id: 2, title: 'Profile', description: 'Set up your profile' },
  { id: 3, title: 'Payment', description: 'Add payment info' },
  { id: 4, title: 'Complete', description: 'Finish setup' },
];

export default function StepperWithTitles() {
  return (
    <Stepper defaultValue={1} className="space-y-8">
      <StepperNav>
        {stepsData.map((step, index) => (
          <StepperItem key={step.id} step={step.id}>
            <StepperTrigger className="flex flex-col items-center gap-2">
              <StepperIndicator>{step.id}</StepperIndicator>
              <div className="text-center">
                <StepperTitle>{step.title}</StepperTitle>
                <StepperDescription>{step.description}</StepperDescription>
              </div>
            </StepperTrigger>
            {index < stepsData.length - 1 && (
              <StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
            )}
          </StepperItem>
        ))}
      </StepperNav>

      <StepperPanel>
        {stepsData.map((step) => (
          <StepperContent key={step.id} value={step.id}>
            <div className="p-6 border rounded-md">
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}
```

### Example 5: Multi-Step Form with Validation

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from '@/components/ui/stepper';

export default function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const steps = [
    { id: 1, title: 'Personal Info' },
    { id: 2, title: 'Account Details' },
    { id: 3, title: 'Review' },
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    // Handle form submission
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Stepper value={currentStep} onValueChange={setCurrentStep} className="space-y-8">
        <StepperNav>
          {steps.map((step, index) => (
            <StepperItem key={step.id} step={step.id}>
              <StepperTrigger>
                <StepperIndicator>{step.id}</StepperIndicator>
              </StepperTrigger>
              {index < steps.length - 1 && (
                <StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
              )}
            </StepperItem>
          ))}
        </StepperNav>

        <StepperPanel>
          <StepperContent value={1}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
            </div>
          </StepperContent>

          <StepperContent value={2}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a password"
                />
              </div>
            </div>
          </StepperContent>

          <StepperContent value={3}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review Your Information</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {formData.name}</p>
                <p><strong>Email:</strong> {formData.email}</p>
              </div>
            </div>
          </StepperContent>
        </StepperPanel>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              Submit
            </Button>
          )}
        </div>
      </Stepper>
    </div>
  );
}
```

## Props/API Reference

### Stepper (Root Component)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultValue` | `number` | `1` | Initial step in uncontrolled mode |
| `value` | `number` | `undefined` | Current step in controlled mode |
| `onValueChange` | `(value: number) => void` | `undefined` | Callback when step changes |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout orientation |
| `indicators` | `StepIndicators` | `{}` | Custom indicators for different states |
| `className` | `string` | `undefined` | Additional CSS classes |

### StepperItem

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `step` | `number` | **required** | Step number (must be unique) |
| `completed` | `boolean` | `false` | Mark step as completed |
| `disabled` | `boolean` | `false` | Disable step interaction |
| `loading` | `boolean` | `false` | Show loading state |
| `className` | `string` | `undefined` | Additional CSS classes |

### StepperTrigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asChild` | `boolean` | `false` | Render as child instead of button |
| `className` | `string` | `undefined` | Additional CSS classes |
| All standard button props | - | - | Extends `HTMLButtonElement` |

### StepperContent

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | **required** | Step number this content belongs to |
| `forceMount` | `boolean` | `false` | Keep mounted when inactive |
| `className` | `string` | `undefined` | Additional CSS classes |

### StepperIndicator, StepperSeparator, StepperTitle, StepperDescription

All these components accept standard HTML div/element props including `className` for styling.

## Accessibility

The Stepper component is built with accessibility in mind:

- **ARIA Roles**: Proper `role="tablist"` and `role="tab"` attributes
- **ARIA States**: `aria-selected`, `aria-controls`, `aria-orientation`
- **Keyboard Navigation**:
  - `Arrow Left/Right` (horizontal) or `Arrow Up/Down` (vertical): Navigate between steps
  - `Home`: Jump to first step
  - `End`: Jump to last step
  - `Enter` or `Space`: Activate focused step
- **Focus Management**: Proper focus indicators and tab order
- **Screen Reader Support**: Proper labeling and state announcements

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowRight` / `ArrowDown` | Move to next step |
| `ArrowLeft` / `ArrowUp` | Move to previous step |
| `Home` | Jump to first step |
| `End` | Jump to last step |
| `Enter` / `Space` | Activate focused step |
| `Tab` | Move focus in/out of stepper |

## Styling with Data Attributes

The component uses data attributes for state-based styling:

```css
/* Step states */
[data-state="active"]    /* Current active step */
[data-state="completed"] /* Completed steps */
[data-state="inactive"]  /* Future/inactive steps */
[data-state="loading"]   /* Loading state */

/* Orientation */
[data-orientation="horizontal"]
[data-orientation="vertical"]
```

Example usage in Tailwind:

```tsx
<StepperIndicator
  className="
    data-[state=completed]:bg-green-500
    data-[state=completed]:text-white
    data-[state=active]:bg-blue-500
    data-[state=inactive]:opacity-50
  "
>
  {step}
</StepperIndicator>
```

## Best Practices

1. **Step Numbering**: Always use sequential numbers starting from 1
   ```tsx
   // Good
   const steps = [1, 2, 3, 4];

   // Avoid
   const steps = [0, 1, 2, 3]; // Starting from 0 may cause issues
   ```

2. **Controlled vs Uncontrolled**: Choose based on your needs
   - Use **uncontrolled** for simple steppers without validation
   - Use **controlled** when you need to validate or control navigation

3. **Loading States**: Show loading for async operations
   ```tsx
   <StepperItem step={2} loading={isSubmitting}>
   ```

4. **Completed Steps**: Mark completed steps explicitly
   ```tsx
   <StepperItem step={1} completed={step > 1}>
   ```

5. **Custom Indicators**: Use the `indicators` prop for consistent icons
   ```tsx
   <Stepper
     indicators={{
       completed: <Check />,
       loading: <Spinner />,
     }}
   >
   ```

6. **Accessibility**: Always provide meaningful content in StepperTitle and StepperDescription

7. **Responsive Design**: Consider using vertical orientation on mobile
   ```tsx
   <Stepper
     orientation={isMobile ? 'vertical' : 'horizontal'}
   >
   ```

## Common Patterns

### Pattern 1: Form Validation Before Navigation

```tsx
const [currentStep, setCurrentStep] = useState(1);
const [errors, setErrors] = useState({});

const handleNext = async () => {
  const isValid = await validateStep(currentStep);
  if (isValid) {
    setCurrentStep((prev) => prev + 1);
    setErrors({});
  } else {
    setErrors(validationErrors);
  }
};
```

### Pattern 2: Async Step Completion

```tsx
const [currentStep, setCurrentStep] = useState(1);
const [completedSteps, setCompletedSteps] = useState(new Set());

const handleStepComplete = async (step: number) => {
  await saveStepData(step);
  setCompletedSteps((prev) => new Set(prev).add(step));
  setCurrentStep(step + 1);
};

// In render
<StepperItem
  step={step}
  completed={completedSteps.has(step)}
/>
```

### Pattern 3: Progress Tracking

```tsx
const totalSteps = 4;
const progress = (currentStep / totalSteps) * 100;

return (
  <div className="space-y-4">
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
    <Stepper value={currentStep} onValueChange={setCurrentStep}>
      {/* Stepper content */}
    </Stepper>
  </div>
);
```

## Common Issues & Solutions

### Issue 1: Steps not responding to clicks
**Solution**: Ensure each StepperItem has a unique `step` prop that matches the StepperContent `value`.

### Issue 2: Custom indicators not showing
**Solution**: Make sure to pass the `indicators` prop to the root `Stepper` component, not to `StepperIndicator`.

### Issue 3: Content not updating
**Solution**: Verify that you're using the `value` prop on `StepperContent` that matches the step number.

### Issue 4: Keyboard navigation not working
**Solution**: Ensure `StepperTrigger` is not using `asChild` with an element that doesn't support keyboard events.

## Related Components

- **Button**: Used for navigation controls
- **Form**: Often used within StepperContent
- **Progress**: Can complement stepper for visual progress tracking
- **Tabs**: Similar navigation pattern but for non-sequential content

## Credits

- Inspired by [Origin UI Stepper](https://originui.com/stepper)
- Built with [Radix UI](https://www.radix-ui.com/) primitives
- Styled with [Tailwind CSS](https://tailwindcss.com/)

## Additional Resources

- Official Documentation: https://reui.io/docs/stepper
- Component Registry: https://reui.io/r/stepper.json
- GitHub Issues: Report issues with the component
- Community Examples: https://reui.io/docs/stepper#examples
