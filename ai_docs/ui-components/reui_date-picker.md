# ReUI - Date Picker

> Source: https://reui.io/docs/date-picker
> Library: ReUI (React UI Components)
> Last Updated: 2025-10-16

## Overview

The Date Picker is a versatile date input component that combines a calendar popover with an input field. It provides an intuitive way for users to select dates, date ranges, and even date/time combinations. The component is highly customizable and includes multiple variants for different use cases.

**Key Features:**
- Single date selection
- Date range selection
- Date and time selection
- Preset date ranges
- Form integration with validation
- Responsive design
- Keyboard navigation
- Accessibility support

## Installation

The Date Picker is built using a composition of the Popover and Calendar components from ReUI.

### Using CLI (Recommended)

```bash
# Install the default date picker
pnpm dlx shadcn@latest add @reui/date-picker-default

# Or install specific variants
pnpm dlx shadcn@latest add @reui/date-picker-date-time
pnpm dlx shadcn@latest add @reui/date-picker-range
pnpm dlx shadcn@latest add @reui/date-picker-presets
pnpm dlx shadcn@latest add @reui/date-picker-form
```

### Manual Installation

If you prefer to install manually, you need the following dependencies:

```bash
# Core dependencies
npm install date-fns react-day-picker

# UI dependencies
npm install @radix-ui/react-popover lucide-react

# Utility dependencies
npm install class-variance-authority clsx tailwind-merge
```

### Required Component Dependencies

The Date Picker requires these ReUI components to be installed:
- Button
- Calendar
- Popover

You can install them using:

```bash
pnpm dlx shadcn@latest add @reui/button
pnpm dlx shadcn@latest add @reui/calendar
pnpm dlx shadcn@latest add @reui/popover
```

## Component Architecture

The Date Picker is composed of several sub-components:

- **DatePicker**: The main container (Popover wrapper)
- **DatePickerTrigger**: The trigger button that opens the calendar
- **DatePickerContent**: The popover content containing the calendar
- **DatePickerPresets**: Optional preset date ranges
- **Calendar**: The calendar interface for date selection

## API Reference

### Calendar Component

Based on the [DayPicker](https://react-day-picker.js.org/basics/customization) component from react-day-picker.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS classes |
| `classNames` | `object` | See calendar.tsx | Custom class names for calendar parts |
| `mode` | `"single" \| "range" \| "multiple"` | - | Selection mode |
| `selected` | `Date \| DateRange` | - | Currently selected date(s) |
| `onSelect` | `(date) => void` | - | Callback when date is selected |
| `showOutsideDays` | `boolean` | `true` | Show days from adjacent months |
| `numberOfMonths` | `number` | `1` | Number of months to display |
| `disabled` | `Matcher \| Matcher[]` | - | Dates to disable |

### DatePickerTrigger

The trigger button that opens the date picker popover.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `asInput` | `boolean` | `false` | Render as input-style button |
| `placeholder` | `string` | `"Pick a date"` | Placeholder text when no date selected |
| `className` | `string` | `undefined` | Additional CSS classes |

### DatePickerContent

The popover content that contains the calendar. Extends Radix UI's Popover.Content.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS classes |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Alignment relative to trigger |
| `sideOffset` | `number` | `4` | Distance from trigger in pixels |

### DatePickerPresets

A component for displaying preset date ranges.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `presets` | `Array<{ label: string; range: DateRange }>` | - | Array of preset options |
| `onSelect` | `(range: DateRange) => void` | - | Callback when preset is selected |
| `className` | `string` | `undefined` | Additional CSS classes |

## Usage Examples

### Example 1: Basic Single Date Picker

A simple date picker for selecting a single date with a reset button.

```tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';

export function DatePickerDemo() {
  const [date, setDate] = React.useState<Date>();

  const handleReset = (e: React.MouseEvent<HTMLElement>) => {
    setDate(undefined);
    e.preventDefault();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative w-[250px]">
          <Button
            type="button"
            variant="outline"
            mode="input"
            placeholder={!date}
            className="w-full"
          >
            <CalendarIcon />
            {date ? format(date, 'PPP') : <span>Pick a date</span>}
          </Button>
          {date && (
            <Button
              type="button"
              variant="dim"
              size="sm"
              className="absolute top-1/2 -end-0 -translate-y-1/2"
              onClick={handleReset}
            >
              <X />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={setDate} autoFocus />
      </PopoverContent>
    </Popover>
  );
}
```

### Example 2: Date & Time Picker

A date picker with time slot selection, perfect for booking and scheduling applications.

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

export function DateTimePickerDemo() {
  const today = new Date();
  const [date, setDate] = useState<Date | undefined>(today);
  const [time, setTime] = useState<string | undefined>('10:00');

  // Mock time slots data - in real app, fetch from API
  const timeSlots = [
    { time: '09:00', available: false },
    { time: '09:30', available: false },
    { time: '10:00', available: true },
    { time: '10:30', available: true },
    { time: '11:00', available: true },
    { time: '11:30', available: true },
    { time: '12:00', available: false },
    // ... more time slots
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative w-[250px]">
          <Button
            type="button"
            variant="outline"
            mode="input"
            placeholder={!date}
            className="w-full"
          >
            <CalendarIcon />
            {date ? format(date, 'PPP') + (time ? ` - ${time}` : '') : <span>Pick a date and time</span>}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex max-sm:flex-col">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(newDate);
                setTime(undefined);
              }
            }}
            className="p-2 sm:pe-5"
            disabled={[{ before: today }]}
          />
          <div className="relative w-full max-sm:h-48 sm:w-40">
            <div className="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea className="h-full sm:border-s">
                <div className="space-y-3">
                  <div className="flex h-5 shrink-0 items-center px-5">
                    <p className="text-sm font-medium">
                      {date ? format(date, 'EEEE, d') : 'Pick a date'}
                    </p>
                  </div>
                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {timeSlots.map(({ time: timeSlot, available }) => (
                      <Button
                        key={timeSlot}
                        variant={time === timeSlot ? 'primary' : 'outline'}
                        size="sm"
                        className="w-full"
                        onClick={() => setTime(timeSlot)}
                        disabled={!available}
                      >
                        {timeSlot}
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Example 3: Date Range Picker

Select a date range with Apply and Reset actions.

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

export function DateRangePickerDemo() {
  const today = new Date();
  const defaultDate: DateRange = {
    from: today,
    to: addDays(today, 5),
  };

  const [date, setDate] = useState<DateRange | undefined>(defaultDate);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleApply = () => {
    if (date) {
      setDate(date);
    }
    setIsPopoverOpen(false);
  };

  const handleReset = () => {
    setDate(defaultDate);
    setIsPopoverOpen(false);
  };

  const handleSelect = (selected: DateRange | undefined) => {
    setDate({
      from: selected?.from || undefined,
      to: selected?.to || undefined,
    });
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          mode="input"
          placeholder={!date?.from && !date?.to}
          className="w-[250px]"
        >
          <CalendarIcon />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
              </>
            ) : (
              format(date.from, 'LLL dd, y')
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          autoFocus
          mode="range"
          defaultMonth={date?.from}
          showOutsideDays={false}
          selected={date}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
        <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Example 4: Date Range Picker with Presets

Includes preset options like "Last 7 days", "Last 30 days", etc.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  endOfMonth,
  endOfYear,
  format,
  isEqual,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

export function DatePickerWithPresets() {
  const today = new Date();

  // Define preset ranges
  const presets = [
    { label: 'Today', range: { from: today, to: today } },
    { label: 'Yesterday', range: { from: subDays(today, 1), to: subDays(today, 1) } },
    { label: 'Last 7 days', range: { from: subDays(today, 6), to: today } },
    { label: 'Last 30 days', range: { from: subDays(today, 29), to: today } },
    { label: 'Month to date', range: { from: startOfMonth(today), to: today } },
    {
      label: 'Last month',
      range: {
        from: startOfMonth(subMonths(today, 1)),
        to: endOfMonth(subMonths(today, 1)),
      },
    },
    { label: 'Year to date', range: { from: startOfYear(today), to: today } },
    {
      label: 'Last year',
      range: {
        from: startOfYear(subYears(today, 1)),
        to: endOfYear(subYears(today, 1)),
      },
    },
  ];

  const [month, setMonth] = useState(today);
  const defaultPreset = presets[2]; // Last 7 days
  const [date, setDate] = useState<DateRange | undefined>(defaultPreset.range);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(defaultPreset.label);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleApply = () => {
    if (date) {
      setDate(date);
    }
    setIsPopoverOpen(false);
  };

  const handleReset = () => {
    setDate(defaultPreset.range);
    setSelectedPreset(defaultPreset.label);
    setIsPopoverOpen(false);
  };

  const handleSelect = (selected: DateRange | undefined) => {
    setDate({
      from: selected?.from || undefined,
      to: selected?.to || undefined,
    });
    setSelectedPreset(null); // Clear preset when manually selecting
  };

  // Update selectedPreset when date changes
  useEffect(() => {
    const matchedPreset = presets.find(
      (preset) =>
        isEqual(startOfDay(preset.range.from), startOfDay(date?.from || new Date(0))) &&
        isEqual(startOfDay(preset.range.to), startOfDay(date?.to || new Date(0))),
    );
    setSelectedPreset(matchedPreset?.label || null);
  }, [date]);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          mode="input"
          placeholder={!date?.from && !date?.to}
          className="w-[250px]"
        >
          <CalendarIcon />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
              </>
            ) : (
              format(date.from, 'LLL dd, y')
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <div className="flex max-sm:flex-col">
          <div className="relative border-border max-sm:order-1 max-sm:border-t sm:w-32">
            <div className="h-full border-border sm:border-e py-2">
              <div className="flex flex-col px-2 gap-[2px]">
                {presets.map((preset, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="ghost"
                    className={cn(
                      'h-8 w-full justify-start',
                      selectedPreset === preset.label && 'bg-accent'
                    )}
                    onClick={() => {
                      setDate(preset.range);
                      setMonth(preset.range.from || today);
                      setSelectedPreset(preset.label);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Calendar
            autoFocus
            mode="range"
            month={month}
            onMonthChange={setMonth}
            showOutsideDays={false}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </div>
        <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Example 5: Form Integration with Validation

Date picker integrated with React Hook Form and Zod validation.

```tsx
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Define the schema with Zod
const FormSchema = z.object({
  singleDate: z
    .string()
    .nonempty({ message: 'Date is required.' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Please select a valid date.',
    }),
  rangeDate: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional()
    .refine(
      (val) =>
        !val ||
        (!val.from && !val.to) ||
        (val.from && val.to && !isNaN(Date.parse(val.from)) && !isNaN(Date.parse(val.to))),
      {
        message: 'Please select a valid date range.',
        path: ['rangeDate'],
      },
    ),
});

export function DatePickerFormDemo() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      singleDate: '',
      rangeDate: { from: '', to: '' },
    },
  });

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    const message = [];
    if (data.singleDate) {
      message.push(`Single date: ${format(new Date(data.singleDate), 'PPP')}`);
    }
    if (data.rangeDate?.from && data.rangeDate?.to) {
      message.push(
        `Range: ${format(new Date(data.rangeDate.from), 'PPP')} - ${format(new Date(data.rangeDate.to), 'PPP')}`,
      );
    }
    const finalMessage = message.length > 0 ? message.join(' | ') : 'No dates selected';
    toast.success(finalMessage);
  };

  const handleReset = () => {
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-[300px] space-y-6">
        <FormField
          control={form.control}
          name="singleDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Single Date:</FormLabel>
              <FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        mode="input"
                        placeholder={!field.value}
                        className="w-full"
                      >
                        <CalendarIcon />
                        {field.value ? (
                          format(new Date(field.value), 'dd MMM, yyyy')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                      {field.value && (
                        <Button
                          type="button"
                          variant="dim"
                          size="sm"
                          className="absolute top-1/2 -end-0 -translate-y-1/2"
                          onClick={(e) => {
                            e.preventDefault();
                            form.setValue('singleDate', '', { shouldValidate: true });
                          }}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) =>
                        form.setValue('singleDate', date?.toISOString() || '', {
                          shouldValidate: true,
                        })
                      }
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormDescription>Enter your single date to proceed</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rangeDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date Range:</FormLabel>
              <FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Button
                        variant="outline"
                        mode="input"
                        placeholder={!field.value?.from && !field.value?.to}
                        className="w-full"
                      >
                        <CalendarIcon />
                        {field.value?.from ? (
                          field.value.to ? (
                            `${format(new Date(field.value.from), 'dd MMM, yyyy')} - ${format(new Date(field.value.to), 'dd MMM, yyyy')}`
                          ) : (
                            format(new Date(field.value.from), 'dd MMM, yyyy')
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                      {field.value?.from && (
                        <Button
                          variant="dim"
                          size="sm"
                          className="absolute top-1/2 -end-0 -translate-y-1/2"
                          onClick={(e) => {
                            e.preventDefault();
                            form.setValue('rangeDate', { from: '', to: '' }, { shouldValidate: true });
                          }}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={
                        field.value?.from && field.value?.to
                          ? {
                              from: new Date(field.value.from),
                              to: new Date(field.value.to),
                            }
                          : undefined
                      }
                      onSelect={(range) =>
                        form.setValue(
                          'rangeDate',
                          {
                            from: range?.from?.toISOString() || '',
                            to: range?.to?.toISOString() || '',
                          },
                          { shouldValidate: true },
                        )
                      }
                      numberOfMonths={2}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormDescription>Enter your date range to proceed</FormDescription>
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

**Additional dependencies for form example:**
```bash
npm install react-hook-form @hookform/resolvers zod sonner
```

## Accessibility

The Date Picker component follows accessibility best practices:

- **Keyboard Navigation**: Full keyboard support with arrow keys, Enter, Escape, Tab
- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Focus Management**: Automatic focus handling when opening/closing
- **Date Announcements**: Selected dates are announced to screen readers
- **Disabled States**: Properly marked disabled dates
- **High Contrast**: Works well with high contrast modes

**Keyboard Shortcuts:**
- `Space/Enter`: Open calendar when trigger is focused
- `Arrow Keys`: Navigate between dates
- `Escape`: Close the popover
- `Tab`: Move focus between elements
- `Page Up/Down`: Navigate between months
- `Home/End`: Jump to start/end of week

## Best Practices

### 1. Date Formatting

Use `date-fns` for consistent date formatting:

```tsx
import { format } from 'date-fns';

// Display format
format(date, 'PPP') // January 1st, 2024
format(date, 'LLL dd, y') // Jan 01, 2024
format(date, 'dd MMM, yyyy') // 01 Jan, 2024

// Store format
date.toISOString() // Use for storing in database
```

### 2. Validation

Always validate dates on both client and server:

```tsx
// Client-side with Zod
const schema = z.object({
  date: z.date().min(new Date(), { message: "Date must be in the future" }),
});

// Disable invalid dates
<Calendar
  disabled={[
    { before: new Date() }, // Disable past dates
    { dayOfWeek: [0, 6] }, // Disable weekends
  ]}
/>
```

### 3. State Management

For complex forms, store dates as ISO strings:

```tsx
// Good - Easy to serialize and validate
const [date, setDate] = useState<string>('');

// Convert when needed
const dateObj = date ? new Date(date) : undefined;
```

### 4. Responsive Design

The component is responsive out of the box, but consider these patterns:

```tsx
// Stack time picker on mobile
<div className="flex max-sm:flex-col">
  <Calendar />
  <TimePicker />
</div>

// Adjust width for mobile
<Button className="w-full sm:w-[250px]">
  Pick a date
</Button>
```

### 5. Loading States

Handle loading states for dynamic date restrictions:

```tsx
const { data: unavailableDates, isLoading } = useQuery('unavailable-dates');

<Calendar
  disabled={isLoading ? [] : unavailableDates}
  // Show loading indicator
/>
```

## Common Use Cases

### Booking Systems
- Date and time slot selection
- Unavailable date marking
- Multi-step booking flow

### Analytics Dashboards
- Date range selection with presets
- Quick filters (Last 7 days, This month, etc.)
- Custom range selection

### Forms
- Birth date picker
- Event date selection
- Deadline setting

### Scheduling
- Meeting scheduler
- Appointment booking
- Calendar integration

## TypeScript Support

The component is fully typed with TypeScript:

```tsx
import { DateRange } from 'react-day-picker';

// Single date
const [date, setDate] = useState<Date | undefined>();

// Date range
const [dateRange, setDateRange] = useState<DateRange | undefined>();

// With initial value
const [date, setDate] = useState<Date>(new Date());
```

## Styling Customization

### Using className

```tsx
<Calendar
  className="rounded-xl border-2"
  classNames={{
    day_button: "hover:bg-blue-100",
    day_selected: "bg-blue-500 text-white",
  }}
/>
```

### Theming

The component uses CSS variables for theming. Customize in your globals.css:

```css
:root {
  --primary: 222.2 47.4% 11.2%;
  --ring: 222.2 84% 4.9%;
  /* ... other theme variables */
}
```

## Integration with Other Libraries

### React Hook Form
See Example 5 above for complete integration.

### TanStack Query
```tsx
const { data: availableDates } = useQuery(['dates'], fetchDates);

<Calendar disabled={(date) => !availableDates?.includes(date)} />
```

### Zustand/Redux
```tsx
const setBookingDate = useStore((state) => state.setBookingDate);

<Calendar onSelect={(date) => setBookingDate(date)} />
```

## Troubleshooting

### Issue: Calendar not showing
- Ensure Popover is properly installed
- Check z-index conflicts
- Verify PopoverContent has proper positioning

### Issue: Date not updating
- Use controlled state properly
- Check if `onSelect` is being called
- Verify date format compatibility

### Issue: Styling conflicts
- Check for global CSS overrides
- Use `classNames` prop for specific targeting
- Ensure Tailwind classes are being processed

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Credits

- Built with [React DayPicker](https://daypicker.dev/)
- Built with [Radix UI Popover](https://www.radix-ui.com/primitives/docs/components/popover)
- Date utilities by [date-fns](https://date-fns.org/)
- Part of [ReUI](https://reui.io/) component library

## Related Components

- [Calendar](https://reui.io/docs/calendar) - The underlying calendar component
- [Popover](https://reui.io/docs/popover) - The popover container
- [Button](https://reui.io/docs/button) - Trigger and action buttons
- [Form](https://reui.io/docs/form) - Form integration components

## License

MIT License - See ReUI documentation for details.
