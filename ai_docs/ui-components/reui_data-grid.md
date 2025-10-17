# ReUI - Data Grid

> Source: https://reui.io/docs/data-grid
> Library: ReUI (React UI Component Library)
> Version: Latest
> Last Updated: 2025-10-16

## Overview

The Data Grid component is a powerful, feature-rich table component built on top of TanStack Table v8. It provides comprehensive data management capabilities including sorting, filtering, pagination, column manipulation, and drag & drop support. The component is highly customizable and supports various layouts and styles to match different design requirements.

### Key Features

- Built on TanStack Table v8 for robust data management
- Sorting and filtering capabilities
- Pagination with customizable page sizes
- Row selection (single and multiple)
- Expandable rows with custom content
- Column visibility controls
- Resizable columns
- Pinnable columns (sticky left/right)
- Draggable columns and rows (via DndKit)
- Multiple layout variants (dense, striped, bordered, etc.)
- Loading states with skeleton or spinner modes
- TypeScript support with full type definitions
- Accessibility features built-in

## Installation

### Using CLI (Recommended)

Install the data-grid component using the shadcn CLI:

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/data-grid

# Using npm
npx shadcn@latest add @reui/data-grid

# Using yarn
yarn dlx shadcn@latest add @reui/data-grid

# Using bun
bunx shadcn@latest add @reui/data-grid
```

### Manual Installation

If you prefer manual installation, you'll need to install the following dependencies:

```bash
# Core dependencies
npm install @tanstack/react-table clsx tailwind-merge class-variance-authority lucide-react

# For drag & drop features
npm install @dnd-kit/core @dnd-kit/sortable

# Radix UI components (required)
npm install @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-scroll-area
```

## Dependencies

The Data Grid component requires the following dependencies:

- **@tanstack/react-table** - Core table functionality
- **clsx** - Utility for constructing className strings
- **tailwind-merge** - Merge Tailwind CSS classes
- **class-variance-authority** - Managing component variants
- **lucide-react** - Icon library
- **@radix-ui/react-*** - Radix UI primitives for various components
- **@dnd-kit/core** (optional) - For drag & drop functionality
- **@dnd-kit/sortable** (optional) - For sortable rows/columns

## Usage

### Basic Usage

Here's a complete example of implementing a basic data grid:

```tsx
import { useMemo, useState } from 'react';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

// Define your data interface
interface User {
  id: string;
  name: string;
  email: string;
  location: string;
  balance: number;
}

// Sample data
const data: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    location: 'New York, USA',
    balance: 5143.03,
  },
  // ... more data
];

export default function DataGridDemo() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Define columns
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
        size: 175,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => (
          <a href={`mailto:${info.getValue()}`} className="hover:text-primary hover:underline">
            {info.getValue() as string}
          </a>
        ),
        size: 150,
      },
      {
        accessorKey: 'location',
        header: 'Location',
        size: 125,
      },
      {
        accessorKey: 'balance',
        header: 'Balance ($)',
        cell: (info) => <span className="font-semibold">${(info.getValue() as number).toFixed(2)}</span>,
        size: 120,
        meta: {
          headerClassName: 'text-right rtl:text-left',
          cellClassName: 'text-right rtl:text-left',
        },
      },
    ],
    [],
  );

  // Initialize the table
  const table = useReactTable({
    columns,
    data,
    pageCount: Math.ceil((data?.length || 0) / pagination.pageSize),
    getRowId: (row: User) => row.id,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <DataGrid table={table} recordCount={data?.length || 0}>
      <div className="w-full space-y-2.5">
        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
        <DataGridPagination />
      </div>
    </DataGrid>
  );
}
```

### Example 2: Data Grid with Row Selection

```tsx
import { useState } from 'react';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTableRowSelectAll, DataGridTableRowSelect } from '@/components/ui/data-grid-table';
import { ColumnDef, RowSelectionState } from '@tanstack/react-table';

export default function DataGridWithSelection() {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        size: 40,
        enableSorting: false,
        enableHiding: false,
      },
      // ... other columns
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data,
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    // ... other configurations
  });

  return (
    <DataGrid table={table} recordCount={data.length}>
      {/* ... */}
    </DataGrid>
  );
}
```

### Example 3: Data Grid with Sortable Columns

```tsx
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';

const columns = useMemo<ColumnDef<User>[]>(
  () => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Name" />
      ),
      cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
      enableSorting: true,
    },
    {
      accessorKey: 'balance',
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Balance" />
      ),
      cell: (info) => <span>${(info.getValue() as number).toFixed(2)}</span>,
      enableSorting: true,
    },
    // ... other columns
  ],
  [],
);
```

### Example 4: Dense Table with Cell Borders

```tsx
export default function DenseDataGrid() {
  // ... setup code

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      tableLayout={{
        dense: true,
        cellBorder: true,
        rowBorder: true,
      }}
    >
      <DataGridContainer>
        <ScrollArea>
          <DataGridTable />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DataGridContainer>
      <DataGridPagination />
    </DataGrid>
  );
}
```

### Example 5: Expandable Rows with Sub-Content

```tsx
const columns = useMemo<ColumnDef<User>[]>(
  () => [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => row.toggleExpanded()}
          className="text-muted-foreground hover:text-foreground"
        >
          {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}
        </button>
      ),
      size: 40,
    },
    // ... other columns
    {
      id: 'expandedContent',
      meta: {
        expandedContent: (row: User) => (
          <div className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-2">Additional Details</h4>
            <p>Email: {row.email}</p>
            <p>Location: {row.location}</p>
          </div>
        ),
      },
    },
  ],
  [],
);

const table = useReactTable({
  columns,
  data,
  getExpandedRowModel: getExpandedRowModel(),
  // ... other configurations
});
```

### Example 6: Data Grid with Column Visibility Controls

```tsx
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { Button } from '@/components/ui/button';

export default function DataGridWithColumnVisibility() {
  // ... setup code

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      tableLayout={{
        columnsVisibility: true,
      }}
    >
      <div className="w-full space-y-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Customers</h3>
          <DataGridColumnVisibility
            table={table}
            trigger={<Button variant="outline" size="sm">Columns</Button>}
          />
        </div>
        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>
        <DataGridPagination />
      </div>
    </DataGrid>
  );
}
```

### Example 7: Resizable Columns

```tsx
export default function ResizableDataGrid() {
  const [columnSizing, setColumnSizing] = useState({});

  const table = useReactTable({
    columns,
    data,
    state: {
      columnSizing,
    },
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    // ... other configurations
  });

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      tableLayout={{
        columnsResizable: true,
        width: 'fixed',
      }}
    >
      {/* ... */}
    </DataGrid>
  );
}
```

## API Reference

### DataGrid Component

The main wrapper component that provides context for the entire data grid.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `table` | `Table<TData>` | **Required** | TanStack Table instance |
| `recordCount` | `number` | **Required** | Total number of records |
| `children` | `ReactNode` | - | Child components |
| `className` | `string` | - | Additional CSS classes |
| `onRowClick` | `(row: TData) => void` | - | Callback when a row is clicked |
| `isLoading` | `boolean` | `false` | Loading state |
| `loadingMode` | `'skeleton' \| 'spinner'` | `'skeleton'` | Loading display mode |
| `loadingMessage` | `ReactNode \| string` | `'Loading...'` | Message shown during loading |
| `emptyMessage` | `ReactNode \| string` | `'No data available'` | Message shown when no data |
| `tableLayout` | `object` | See below | Table layout configuration |
| `tableClassNames` | `object` | See below | Custom class names for table elements |

### DataGrid `tableLayout` Props

Configuration object for table layout and features:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dense` | `boolean` | `false` | Compact row spacing |
| `cellBorder` | `boolean` | `false` | Show borders around cells |
| `rowBorder` | `boolean` | `true` | Show borders between rows |
| `rowRounded` | `boolean` | `false` | Rounded corners on rows |
| `stripped` | `boolean` | `false` | Alternating row colors |
| `headerBackground` | `boolean` | `true` | Background color for header |
| `headerBorder` | `boolean` | `true` | Border for header |
| `headerSticky` | `boolean` | `false` | Sticky header on scroll |
| `width` | `'auto' \| 'fixed'` | `'fixed'` | Table width mode |
| `columnsVisibility` | `boolean` | `false` | Enable column visibility controls |
| `columnsResizable` | `boolean` | `false` | Enable column resizing |
| `columnsPinnable` | `boolean` | `false` | Enable column pinning |
| `columnsMovable` | `boolean` | `false` | Enable column reordering |
| `columnsDraggable` | `boolean` | `false` | Enable drag & drop for columns |
| `rowsDraggable` | `boolean` | `false` | Enable drag & drop for rows |

### DataGrid `tableClassNames` Props

Custom class names for styling table elements:

| Prop | Type | Default |
|------|------|---------|
| `base` | `string` | `''` |
| `header` | `string` | `''` |
| `headerRow` | `string` | `''` |
| `headerSticky` | `string` | `'sticky top-0 z-10 bg-background/90 backdrop-blur-xs'` |
| `body` | `string` | `''` |
| `bodyRow` | `string` | `''` |
| `footer` | `string` | `''` |
| `edgeCell` | `string` | `''` |

### DataGridPagination Component

Provides pagination controls for the data grid.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sizes` | `number[]` | `[5, 10, 25, 50, 100]` | Available page sizes |
| `sizesLabel` | `string` | `'Show'` | Label for page size selector |
| `sizesDescription` | `string` | `'per page'` | Description for page size |
| `sizesInfo` | `string` | - | Custom info text for page size |
| `sizesSkeleton` | `ReactNode` | `<Skeleton />` | Loading skeleton for page size selector |
| `more` | `boolean` | `false` | Enable more pages display |
| `moreLimit` | `number` | `5` | Limit for pagination buttons |
| `info` | `string` | `'{from} - {to} of {count}'` | Pagination info format |
| `infoSkeleton` | `ReactNode` | `<Skeleton />` | Loading skeleton for info |
| `className` | `string` | - | Additional CSS classes |
| `rowsPerPageLabel` | `string` | `'Rows per page'` | Label for rows per page |
| `previousPageLabel` | `string` | `'Go to previous page'` | Aria label for previous button |
| `nextPageLabel` | `string` | `'Go to next page'` | Aria label for next button |
| `ellipsisText` | `string` | `'...'` | Text for pagination ellipsis |

### DataGridColumnHeader Component

Header component with sorting and pinning controls.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `column` | `Column<TData, TValue>` | Yes | TanStack Table column |
| `title` | `string` | Yes | Column title |
| `icon` | `ReactNode` | No | Optional icon |
| `filter` | `ReactNode` | No | Optional filter component |

### DataGridColumnFilter Component

Filter component for columns.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `column` | `Column<TData, TValue>` | Yes | TanStack Table column |
| `title` | `string` | Yes | Filter title |
| `options` | `Array` | Yes | Filter options |

### DataGridColumnVisibility Component

Controls for toggling column visibility.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `table` | `Table<TData>` | Yes | TanStack Table instance |
| `trigger` | `ReactNode` | No | Custom trigger element |

### DataGridTableDnd Component

Provides drag-and-drop functionality using DndKit.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `handleDragEnd` | `(event: DragEndEvent) => void` | Yes | Drag end handler |

### ColumnMeta Interface

Custom metadata for column definitions (extends TanStack Table's ColumnMeta):

| Prop | Type | Description |
|------|------|-------------|
| `headerTitle` | `string` | Custom header title |
| `headerClassName` | `string` | Custom header CSS classes |
| `cellClassName` | `string` | Custom cell CSS classes |
| `skeleton` | `ReactNode` | Custom skeleton for loading state |
| `expandedContent` | `(row: TData) => ReactNode` | Content to show when row is expanded |

## Layout Variants

### Dense Table
Compact row spacing for displaying more data:
```tsx
tableLayout={{ dense: true }}
```

### Cell Border
Show borders around all cells:
```tsx
tableLayout={{ cellBorder: true }}
```

### Striped Rows
Alternating row colors for better readability:
```tsx
tableLayout={{ stripped: true }}
```

### Sticky Header
Keep header visible while scrolling:
```tsx
tableLayout={{ headerSticky: true }}
```

### Auto Width
Let table width adjust to content:
```tsx
tableLayout={{ width: 'auto' }}
```

## Best Practices

### 1. Type Safety
Always define TypeScript interfaces for your data to get full type checking:

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  // ... other fields
}

const columns = useMemo<ColumnDef<User>[]>(() => [...], []);
```

### 2. Memoization
Use `useMemo` for column definitions to prevent unnecessary re-renders:

```tsx
const columns = useMemo<ColumnDef<User>[]>(
  () => [
    // column definitions
  ],
  [], // dependencies
);
```

### 3. Performance with Large Datasets
For large datasets, consider:
- Server-side pagination instead of client-side
- Virtual scrolling for very long lists
- Lazy loading of data
- Debouncing search/filter inputs

### 4. Accessibility
- Use semantic HTML elements
- Provide meaningful aria-labels
- Ensure keyboard navigation works
- Test with screen readers

### 5. Loading States
Always provide loading states for better UX:

```tsx
<DataGrid
  table={table}
  recordCount={data.length}
  isLoading={isLoading}
  loadingMode="skeleton"
  loadingMessage="Loading users..."
>
  {/* ... */}
</DataGrid>
```

### 6. Error Handling
Handle empty states and errors gracefully:

```tsx
<DataGrid
  table={table}
  recordCount={data.length}
  emptyMessage={
    <div className="text-center py-8">
      <p className="text-muted-foreground">No users found</p>
      <Button onClick={handleRefresh} className="mt-4">Refresh</Button>
    </div>
  }
>
  {/* ... */}
</DataGrid>
```

### 7. Mobile Responsiveness
Consider using horizontal scroll for mobile:

```tsx
<DataGridContainer>
  <ScrollArea>
    <DataGridTable />
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
</DataGridContainer>
```

### 8. Column Sizing
Define appropriate column sizes for better layout:

```tsx
{
  accessorKey: 'name',
  header: 'Name',
  size: 200, // Fixed width in pixels
  // or use minSize, maxSize for flexible sizing
}
```

## Common Issues and Solutions

### Issue: Table not rendering
**Solution**: Ensure you've provided both `table` and `recordCount` props:
```tsx
<DataGrid table={table} recordCount={data.length}>
```

### Issue: Pagination not working
**Solution**: Make sure you've included the pagination model and state:
```tsx
const table = useReactTable({
  // ... other config
  state: { pagination },
  onPaginationChange: setPagination,
  getPaginationRowModel: getPaginationRowModel(),
});
```

### Issue: Sorting not working
**Solution**: Include sorting state and model:
```tsx
const table = useReactTable({
  // ... other config
  state: { sorting },
  onSortingChange: setSorting,
  getSortedRowModel: getSortedRowModel(),
});
```

### Issue: Columns not resizing
**Solution**: Enable column resizing in both table config and layout:
```tsx
const table = useReactTable({
  columnResizeMode: 'onChange',
  state: { columnSizing },
  onColumnSizingChange: setColumnSizing,
  // ...
});

<DataGrid tableLayout={{ columnsResizable: true, width: 'fixed' }}>
```

### Issue: Drag and drop not working
**Solution**: Ensure you've installed @dnd-kit packages and wrapped with DataGridTableDnd:
```tsx
import { DataGridTableDnd } from '@/components/ui/data-grid-table-dnd';

<DataGridTableDnd handleDragEnd={handleDragEnd}>
  <DataGridTable />
</DataGridTableDnd>
```

## Advanced Usage

### Server-Side Pagination

```tsx
import { useQuery } from '@tanstack/react-query';

function ServerSideDataGrid() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const { data, isLoading } = useQuery({
    queryKey: ['users', pagination],
    queryFn: () => fetchUsers(pagination),
  });

  const table = useReactTable({
    data: data?.users || [],
    columns,
    pageCount: data?.pageCount || 0,
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true, // Important for server-side pagination
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={data?.total || 0}
      isLoading={isLoading}
    >
      {/* ... */}
    </DataGrid>
  );
}
```

### Custom Cell Renderers

```tsx
const columns = useMemo<ColumnDef<User>[]>(
  () => [
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue() as string;
        return (
          <Badge variant={status === 'active' ? 'success' : 'secondary'}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'avatar',
      header: 'Avatar',
      cell: ({ row }) => (
        <Avatar>
          <AvatarImage src={row.original.avatar} alt={row.original.name} />
          <AvatarFallback>{row.original.name[0]}</AvatarFallback>
        </Avatar>
      ),
    },
  ],
  [],
);
```

## Credits

- Built with [TanStack Table v8](https://tanstack.com/table/latest)
- Drag & drop powered by [DndKit](https://dndkit.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)

## Related Components

- Button - For action buttons and triggers
- Checkbox - For row selection
- Select - For dropdown filters and page size selector
- Scroll Area - For horizontal scrolling
- Skeleton - For loading states

## Resources

- [Official Documentation](https://reui.io/docs/data-grid)
- [TanStack Table Documentation](https://tanstack.com/table/latest/docs/introduction)
- [DndKit Documentation](https://dndkit.com/)
- [Example Collection](https://reui.io/docs/data-grid#examples)
