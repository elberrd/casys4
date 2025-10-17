# ReUI - Filters

> Source: https://reui.io/docs/filters
> Library: ReUI (React UI Components)
> Last Updated: 2025-10-16

## Overview

The Filters component is a comprehensive filtering system that provides multiple filter types, operators, and visual indicators for data organization. Built on top of Radix UI primitives for accessibility, it offers a powerful and flexible way to implement advanced filtering capabilities in your React applications.

**Key Features:**
- Multiple field types (text, number, date, select, multiselect, boolean, and more)
- Rich operator support for each field type
- Searchable dropdowns
- Visual indicators and badges
- Groupable field configurations
- Internationalization support
- Async data loading support
- URL state management (via nuqs integration)
- Customizable styling with variants, sizes, and radius options

## Installation

### CLI Installation (Recommended)

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/filters

# Using npm
npx shadcn@latest add @reui/filters

# Using yarn
yarn dlx shadcn@latest add @reui/filters

# Using bun
bunx shadcn@latest add @reui/filters
```

### Dependencies

The Filters component is built with the following core dependencies:

- **Radix UI** - For accessible UI primitives
- **Class Variance Authority (CVA)** - For styling variants
- **Lucide React** - For icons
- **React** (^18.0.0 or higher)
- **Tailwind CSS** - For styling

These dependencies are typically installed automatically when using the CLI installation method.

## Usage

### Basic Implementation

```typescript
'use client';

import { useState } from 'react';
import { Filters, type Filter, type FilterFieldConfig, createFilter } from '@/components/ui/filters';
import { Users, Mail, Globe } from 'lucide-react';

export default function BasicFiltersDemo() {
  const [filters, setFilters] = useState<Filter[]>([]);

  const fields: FilterFieldConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      icon: <Users />,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'archived', label: 'Archived' },
      ],
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      icon: <Mail />,
      placeholder: 'user@example.com',
    },
    {
      key: 'website',
      label: 'Website',
      type: 'url',
      icon: <Globe />,
      placeholder: 'https://example.com',
    },
  ];

  return (
    <Filters
      filters={filters}
      fields={fields}
      onChange={setFilters}
    />
  );
}
```

### Grouped Fields Configuration

Organize fields into logical groups for better UX:

```typescript
import { Type, Mail, Globe, Calendar, Users, Building } from 'lucide-react';

const groupedFields: FilterFieldConfig[] = [
  {
    group: 'Basic Information',
    fields: [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        icon: <Type />,
        placeholder: 'Search by name...',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        icon: <Mail />,
        placeholder: 'user@example.com',
      },
    ],
  },
  {
    group: 'Dates',
    fields: [
      {
        key: 'createdAt',
        label: 'Created Date',
        type: 'date',
        icon: <Calendar />,
      },
      {
        key: 'dateRange',
        label: 'Date Range',
        type: 'daterange',
        icon: <Calendar />,
      },
    ],
  },
  {
    group: 'Organization',
    fields: [
      {
        key: 'company',
        label: 'Company',
        type: 'select',
        icon: <Building />,
        options: [
          { value: 'apple', label: 'Apple' },
          { value: 'google', label: 'Google' },
          { value: 'microsoft', label: 'Microsoft' },
        ],
        searchable: true,
      },
    ],
  },
];
```

## Props/API Reference

### Filters Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | `Filter[]` | - | **Required.** Array of active filters |
| `fields` | `FilterFieldsConfig<T>` | - | **Required.** Field configurations (can be flat array or grouped) |
| `onChange` | `(filters: Filter<T>[]) => void` | - | **Required.** Callback when filters change |
| `className` | `string` | - | Additional CSS classes for the container |
| `showAddButton` | `boolean` | `true` | Show/hide the "Add filter" button |
| `addButtonText` | `string` | - | Custom text for add button |
| `addButtonIcon` | `ReactNode` | - | Custom icon for add button |
| `addButtonClassName` | `string` | - | Additional classes for add button |
| `addButton` | `ReactNode` | - | Custom add button component (overrides default) |
| `variant` | `"outline" \| "solid"` | `"outline"` | Visual style variant |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size of filter components |
| `radius` | `"sm" \| "md" \| "lg" \| "full"` | `"md"` | Border radius style |
| `i18n` | `Partial<FilterI18nConfig>` | - | Internationalization configuration |
| `showSearchInput` | `boolean` | `true` | Show search input for fields |
| `cursorPointer` | `boolean` | `true` | Show pointer cursor on hover |
| `trigger` | `ReactNode` | - | Custom trigger component |
| `allowMultiple` | `boolean` | `true` | Allow multiple filters |
| `popoverContentClassName` | `string` | - | Classes for popover content |

### FilterFieldConfig

Configuration object for defining individual filter fields:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `key` | `string` | - | **Required.** Unique identifier for the field |
| `label` | `string` | - | **Required.** Display label for the field |
| `type` | `FieldType` | - | **Required.** Type of field (see Field Types below) |
| `icon` | `ReactNode` | - | Icon to display with the field |
| `options` | `FilterOption[]` | - | Options for select/multiselect types |
| `operators` | `FilterOperator[]` | - | Available operators (auto-generated if not provided) |
| `placeholder` | `string` | - | Placeholder text for input fields |
| `searchable` | `boolean` | - | Enable search for select/multiselect |
| `className` | `string` | - | Additional classes for field |
| `defaultOperator` | `string` | - | Default operator to use |
| `popoverContentClassName` | `string` | - | Classes for field's popover |
| `maxSelections` | `number` | - | Max selections for multiselect |
| `min` | `number` | - | Minimum value for number fields |
| `max` | `number` | - | Maximum value for number fields |
| `step` | `number` | - | Step value for number fields |
| `prefix` | `string \| ReactNode` | - | Prefix for input (e.g., "$" for currency) |
| `suffix` | `string \| ReactNode` | - | Suffix for input (e.g., "%" for percentage) |
| `pattern` | `string` | - | Regex pattern for validation |
| `validation` | `(value: unknown) => boolean` | - | Custom validation function |
| `allowCustomValues` | `boolean` | - | Allow user-created values |
| `onLabel` | `string` | - | Label for boolean "on" state |
| `offLabel` | `string` | - | Label for boolean "off" state |

### Filter Type

The active filter object structure:

```typescript
interface Filter {
  id: string;           // Unique identifier
  field: string;        // Field key
  operator: string;     // Operator value
  values: unknown[];    // Selected values
}
```

### FilterFieldGroup

For grouping related fields:

```typescript
interface FilterFieldGroup {
  group: string;                    // Group label
  fields: FilterFieldConfig[];      // Array of field configs
}
```

### FilterOption

Option structure for select/multiselect fields:

```typescript
interface FilterOption {
  value: unknown;       // Option value
  label: string;        // Display label
  icon?: ReactNode;     // Optional icon
}
```

### FilterOperator

Operator configuration:

```typescript
interface FilterOperator {
  value: string;              // Operator identifier
  label: string;              // Display label
  supportsMultiple?: boolean; // Supports multiple values
}
```

## Field Types

The Filters component supports various field types, each with specific behaviors:

| Field Type | Default Operators | Input Type | Description |
|------------|------------------|------------|-------------|
| `text` | `contains`, `notContains`, `startsWith`, `endsWith`, `isExactly` | Text Input | Text input with optional pattern validation |
| `number` | `equals`, `notEquals`, `greaterThan`, `lessThan`, `between`, `notBetween` | Number Input | Number input with min/max/step support |
| `date` | `is`, `isNot`, `before`, `after`, `between`, `notBetween` | Date Picker | Calendar-based date selection |
| `daterange` | `between`, `notBetween`, `overlaps` | Date Range | Two date pickers with range support |
| `select` | `is`, `isNot`, `isAnyOf`, `isNotAnyOf` | Dropdown | Searchable dropdown with predefined options |
| `multiselect` | `includesAll`, `includesAnyOf`, `excludesAll` | Multi-Select | Multi-select dropdown with search |
| `boolean` | `is` | Switch | Toggle switch with custom labels |
| `email` | `contains`, `notContains`, `startsWith`, `endsWith`, `isExactly` | Email Input | Email input with built-in validation |
| `url` | `contains`, `notContains`, `startsWith`, `endsWith`, `isExactly` | URL Input | URL input with validation |
| `tel` | `contains`, `notContains`, `startsWith`, `endsWith`, `isExactly` | Phone Input | Phone input with validation |
| `time` | `is`, `isNot`, `before`, `after`, `between` | Time Picker | Time selection component |
| `datetime` | `is`, `isNot`, `before`, `after`, `between` | DateTime Picker | Combined date and time selection |
| `custom` | Custom | Custom Component | Fully custom field rendering |
| `separator` | None | Visual Separator | Non-interactive visual separator |

## Examples

### Example 1: Priority Filter with Custom Icons

```typescript
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Filters, type Filter, createFilter, type FilterFieldConfig } from '@/components/ui/filters';
import { AlertCircle } from 'lucide-react';

const PriorityIcon = ({ priority }: { priority: string }) => {
  const colors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-violet-500',
    urgent: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div
      className={cn(
        'size-2.5 shrink-0 rounded-full',
        colors[priority as keyof typeof colors]
      )}
    />
  );
};

export default function PriorityFilterDemo() {
  const [filters, setFilters] = useState<Filter[]>([
    createFilter('priority', 'contains', ['low', 'medium', 'critical']),
  ]);

  const fields: FilterFieldConfig[] = [
    {
      key: 'priority',
      label: 'Priority',
      type: 'multiselect',
      icon: <AlertCircle />,
      options: [
        { value: 'low', label: 'Low', icon: <PriorityIcon priority="low" /> },
        { value: 'medium', label: 'Medium', icon: <PriorityIcon priority="medium" /> },
        { value: 'high', label: 'High', icon: <PriorityIcon priority="high" /> },
        { value: 'urgent', label: 'Urgent', icon: <PriorityIcon priority="urgent" /> },
        { value: 'critical', label: 'Critical', icon: <PriorityIcon priority="critical" /> },
      ],
      searchable: true,
    },
  ];

  return (
    <Filters
      filters={filters}
      fields={fields}
      onChange={setFilters}
    />
  );
}
```

### Example 2: User Assignment Filter with Avatars

```typescript
'use client';

import { useState } from 'react';
import { Filters, type Filter, type FilterFieldConfig } from '@/components/ui/filters';
import { UserRoundCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function UserFilterDemo() {
  const [filters, setFilters] = useState<Filter[]>([]);

  const fields: FilterFieldConfig[] = [
    {
      key: 'assignee',
      label: 'Assignee',
      type: 'multiselect',
      icon: <UserRoundCheck />,
      options: [
        {
          value: 'john',
          label: 'John Doe',
          icon: (
            <Avatar className="size-5">
              <AvatarImage src="https://randomuser.me/api/portraits/men/1.jpg" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          ),
        },
        {
          value: 'alice',
          label: 'Alice Brown',
          icon: (
            <Avatar className="size-5">
              <AvatarImage src="https://randomuser.me/api/portraits/women/4.jpg" />
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
          ),
        },
        {
          value: 'nick',
          label: 'Nick Bold',
          icon: (
            <Avatar className="size-5">
              <AvatarImage src="https://randomuser.me/api/portraits/men/4.jpg" />
              <AvatarFallback>NB</AvatarFallback>
            </Avatar>
          ),
        },
      ],
      searchable: true,
    },
  ];

  return (
    <Filters
      filters={filters}
      fields={fields}
      onChange={setFilters}
      variant="outline"
    />
  );
}
```

### Example 3: Date Range Filter

```typescript
'use client';

import { useState } from 'react';
import { Filters, type Filter, type FilterFieldConfig } from '@/components/ui/filters';
import { Calendar } from 'lucide-react';

export default function DateRangeFilterDemo() {
  const [filters, setFilters] = useState<Filter[]>([]);

  const fields: FilterFieldConfig[] = [
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'daterange',
      icon: <Calendar />,
      placeholder: 'Pick a date range',
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      type: 'date',
      icon: <Calendar />,
      placeholder: 'Select date',
    },
  ];

  return (
    <Filters
      filters={filters}
      fields={fields}
      onChange={setFilters}
    />
  );
}
```

### Example 4: Number Range Filter with Prefix/Suffix

```typescript
'use client';

import { useState } from 'react';
import { Filters, type Filter, type FilterFieldConfig } from '@/components/ui/filters';
import { Wallet, TrendingUp } from 'lucide-react';

export default function NumberFilterDemo() {
  const [filters, setFilters] = useState<Filter[]>([]);

  const fields: FilterFieldConfig[] = [
    {
      key: 'price',
      label: 'Price',
      type: 'number',
      icon: <Wallet />,
      prefix: '$',
      min: 0,
      max: 10000,
      step: 100,
      placeholder: 'Enter amount',
    },
    {
      key: 'discount',
      label: 'Discount',
      type: 'number',
      icon: <TrendingUp />,
      suffix: '%',
      min: 0,
      max: 100,
      step: 5,
      placeholder: 'Enter percentage',
    },
  ];

  return (
    <Filters
      filters={filters}
      fields={fields}
      onChange={setFilters}
    />
  );
}
```

### Example 5: Solid Style Variant

```typescript
'use client';

import { useState } from 'react';
import { Filters, type Filter, type FilterFieldConfig } from '@/components/ui/filters';
import { Users } from 'lucide-react';

export default function SolidStyleDemo() {
  const [filters, setFilters] = useState<Filter[]>([]);

  const fields: FilterFieldConfig[] = [
    {
      key: 'assignee',
      label: 'Assignee',
      type: 'select',
      icon: <Users />,
      options: [
        { value: 'john', label: 'John Doe' },
        { value: 'alice', label: 'Alice Brown' },
      ],
    },
  ];

  return (
    <Filters
      filters={filters}
      fields={fields}
      onChange={setFilters}
      variant="solid"
      radius="md"
    />
  );
}
```

### Example 6: Different Sizes

```typescript
'use client';

import { useState } from 'react';
import { Filters, type Filter, type FilterFieldConfig } from '@/components/ui/filters';
import { Mail } from 'lucide-react';

export default function SizeDemo() {
  const [filters, setFilters] = useState<Filter[]>([]);

  const fields: FilterFieldConfig[] = [
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      icon: <Mail />,
      placeholder: 'user@example.com',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-medium">Small Size</h3>
        <Filters
          filters={filters}
          fields={fields}
          onChange={setFilters}
          size="sm"
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Medium Size (Default)</h3>
        <Filters
          filters={filters}
          fields={fields}
          onChange={setFilters}
          size="md"
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Large Size</h3>
        <Filters
          filters={filters}
          fields={fields}
          onChange={setFilters}
          size="lg"
        />
      </div>
    </div>
  );
}
```

### Example 7: Internationalization (i18n)

```typescript
'use client';

import { useState } from 'react';
import { Filters, type Filter, type FilterFieldConfig } from '@/components/ui/filters';
import { CheckCircle } from 'lucide-react';

export default function InternationalizationDemo() {
  const [filters, setFilters] = useState<Filter[]>([]);

  const fields: FilterFieldConfig[] = [
    {
      key: 'status',
      label: 'Estado',
      type: 'select',
      icon: <CheckCircle />,
      options: [
        { value: 'active', label: 'Activo' },
        { value: 'inactive', label: 'Inactivo' },
      ],
    },
  ];

  const spanishI18n = {
    addFilter: 'Agregar filtro',
    searchFields: 'Buscar campos...',
    noFieldsFound: 'No se encontraron campos.',
    select: 'Seleccionar...',
    operators: {
      is: 'es',
      isNot: 'no es',
      contains: 'contiene',
      notContains: 'no contiene',
    },
  };

  return (
    <Filters
      filters={filters}
      fields={fields}
      onChange={setFilters}
      i18n={spanishI18n}
    />
  );
}
```

### Example 8: Data Grid Integration with Async Loading

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Filters, type Filter, type FilterFieldConfig } from '@/components/ui/filters';
import { CheckCircle } from 'lucide-react';

interface DataItem {
  id: string;
  name: string;
  status: string;
  email: string;
}

export default function DataGridDemo() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fields: FilterFieldConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      icon: <CheckCircle />,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'archived', label: 'Archived' },
      ],
    },
  ];

  // Simulate async data fetching based on filters
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Apply filters to data (simplified example)
      const filteredData = mockData.filter(item => {
        if (filters.length === 0) return true;

        return filters.every(filter => {
          if (filter.field === 'status') {
            return filter.values.includes(item.status);
          }
          return true;
        });
      });

      setData(filteredData);
      setLoading(false);
    };

    fetchData();
  }, [filters]);

  return (
    <div className="space-y-4">
      <Filters
        filters={filters}
        fields={fields}
        onChange={setFilters}
      />

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="p-4 text-center">Loading...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center">No results found</td>
              </tr>
            ) : (
              data.map(item => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.email}</td>
                  <td className="p-2">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const mockData: DataItem[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  // Add more mock data as needed
];
```

## Utility Functions

### createFilter

Helper function to create filter objects:

```typescript
import { createFilter } from '@/components/ui/filters';

// Create a filter with single value
const filter1 = createFilter('status', 'is', ['active']);

// Create a filter with multiple values
const filter2 = createFilter('priority', 'isAnyOf', ['high', 'urgent', 'critical']);

// Create a date range filter
const filter3 = createFilter('dateRange', 'between', [startDate, endDate]);
```

## Internationalization (i18n)

The Filters component supports full internationalization. You can customize all text strings:

```typescript
const customI18n: Partial<FilterI18nConfig> = {
  addFilter: 'Add Filter',
  searchFields: 'Search fields...',
  noFieldsFound: 'No fields found.',
  noResultsFound: 'No results found.',
  select: 'Select...',
  true: 'Yes',
  false: 'No',
  min: 'Minimum',
  max: 'Maximum',
  to: 'to',
  selected: 'selected',

  operators: {
    is: 'is',
    isNot: 'is not',
    isAnyOf: 'is any of',
    contains: 'contains',
    notContains: 'does not contain',
    startsWith: 'starts with',
    endsWith: 'ends with',
    before: 'before',
    after: 'after',
    between: 'between',
    greaterThan: 'greater than',
    lessThan: 'less than',
    // ... more operators
  },

  placeholders: {
    enterField: (fieldType: string) => `Enter ${fieldType}...`,
    selectField: 'Select...',
    searchField: (fieldName: string) => `Search ${fieldName.toLowerCase()}...`,
  },

  validation: {
    invalidEmail: 'Invalid email format',
    invalidUrl: 'Invalid URL format',
    invalidTel: 'Invalid phone format',
    invalid: 'Invalid input format',
  },
};

<Filters i18n={customI18n} {...otherProps} />
```

## Accessibility

The Filters component is built with accessibility in mind:

- Built on Radix UI primitives for keyboard navigation and ARIA support
- Proper focus management
- Screen reader announcements
- Keyboard shortcuts support
- High contrast mode compatibility
- Proper semantic HTML structure

## Best Practices

1. **Field Configuration**
   - Use descriptive labels for fields
   - Provide icons for better visual recognition
   - Group related fields together
   - Set appropriate default operators

2. **Performance**
   - For large datasets, implement debounced filter updates
   - Use async loading for filter options when needed
   - Consider pagination with filtered results
   - Memoize field configurations when possible

3. **User Experience**
   - Enable search for fields with many options (>10)
   - Use appropriate field types for data (e.g., date picker for dates)
   - Provide clear placeholder text
   - Show visual feedback for active filters
   - Allow users to clear filters easily

4. **Validation**
   - Use built-in validation for email, URL, and phone fields
   - Provide custom validation functions for complex requirements
   - Show clear error messages
   - Validate min/max values for number fields

5. **State Management**
   - Lift filter state to parent component
   - Consider URL state persistence for shareable filtered views
   - Implement reset/clear all functionality
   - Handle loading states appropriately

## Common Use Cases

### 1. Data Table Filtering

Perfect for filtering table data with multiple criteria.

### 2. Search Interfaces

Build advanced search interfaces with multiple field types and operators.

### 3. Admin Panels

Filter users, products, orders, or any admin data with complex criteria.

### 4. Dashboard Analytics

Filter analytics data by date ranges, categories, and metrics.

### 5. E-commerce Product Filters

Filter products by price, category, availability, ratings, etc.

## Integration Examples

### With TanStack Table

```typescript
import { useReactTable } from '@tanstack/react-table';
import { Filters, type Filter } from '@/components/ui/filters';

function DataTable() {
  const [filters, setFilters] = useState<Filter[]>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      // Convert filters to TanStack Table format
      columnFilters: filters.map(f => ({
        id: f.field,
        value: f.values,
      })),
    },
  });

  return (
    <>
      <Filters filters={filters} fields={fields} onChange={setFilters} />
      {/* Table component */}
    </>
  );
}
```

### With URL State (nuqs)

```typescript
import { useQueryState, parseAsJson } from 'nuqs';
import { Filters, type Filter } from '@/components/ui/filters';

function FiltersWithURL() {
  const [filters, setFilters] = useQueryState(
    'filters',
    parseAsJson<Filter[]>().withDefault([])
  );

  return (
    <Filters
      filters={filters}
      fields={fields}
      onChange={setFilters}
    />
  );
}
```

## Troubleshooting

### Filters not updating

Ensure you're using controlled state and the `onChange` callback properly updates your state:

```typescript
const [filters, setFilters] = useState<Filter[]>([]);

<Filters
  filters={filters}  // Must be the current state
  fields={fields}
  onChange={setFilters}  // Must update the state
/>
```

### Options not showing

Verify that your field configuration includes the `options` array for select/multiselect types:

```typescript
{
  key: 'status',
  type: 'select',  // or 'multiselect'
  options: [       // Required for select types
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
}
```

### Operators not working

Each field type has default operators. To customize, provide the `operators` array:

```typescript
{
  key: 'email',
  type: 'email',
  operators: [
    { value: 'contains', label: 'contains', supportsMultiple: false },
    { value: 'isExactly', label: 'is exactly', supportsMultiple: false },
  ],
}
```

## Version Information

This documentation is based on the latest version of ReUI Filters component. For the most up-to-date information, visit the official documentation at https://reui.io/docs/filters.

## Credits

- Built with [Radix UI](https://www.radix-ui.com/) primitives for accessibility
- Built with [Class Variance Authority](https://cva.style/) for styling variants
- Built with [Lucide React](https://lucide.dev/) for icons
- Part of the [ReUI](https://reui.io) component library

## Related Components

- **Data Grid** - For displaying filtered data
- **Command** - For search and command interfaces
- **Select** - For single selection dropdowns
- **Popover** - Underlying component for filter popovers
