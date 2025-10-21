# Table Implementation Guide

## Overview

This guide explains how to implement data tables in the application using the DataGrid component system. The system provides automatic column width calculation, horizontal scrolling, and responsive design out of the box.

## Key Features

- **Dynamic Column Widths**: Column widths automatically calculated based on header text length
- **No Header Overflow**: Column headers never overflow - text is truncated with ellipsis and tooltip
- **Horizontal Scroll**: Automatic horizontal scrolling when table content exceeds container width
- **Responsive Design**: Mobile-friendly with touch scrolling support
- **Consistent Patterns**: All tables follow the same structure and behavior

## Basic Table Structure

All tables should follow this standard pattern:

```tsx
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid"
import { DataGridTable } from "@/components/ui/data-grid-table"
import { DataGridPagination } from "@/components/ui/data-grid-pagination"
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header"
import { DataGridFilter } from "@/components/ui/data-grid-filter"
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility"
import { DataGridBulkActions } from "@/components/ui/data-grid-bulk-actions"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { createSelectColumn } from "@/lib/data-grid-utils"

export function MyTable({ data, onEdit, onDelete }: MyTableProps) {
  const t = useTranslations('MyTable')
  const tCommon = useTranslations('Common')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columns = useMemo<ColumnDef<MyDataType>[]>(
    () => [
      // Selection column
      createSelectColumn<MyDataType>(),

      // Data columns
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t('name')} />
        ),
        cell: ({ row }) => (
          <DataGridHighlightedCell text={row.original.name} />
        ),
      },

      // Actions column
      {
        id: "actions",
        cell: ({ row }) => (
          <DataGridRowActions
            items={[
              {
                label: tCommon('edit'),
                icon: <Edit className="h-4 w-4" />,
                onClick: () => onEdit(row.original._id),
              },
              {
                label: tCommon('delete'),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => onDelete(row.original._id),
                variant: 'destructive',
                separator: true,
              },
            ]}
          />
        ),
        size: 60,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon, onEdit, onDelete]
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalFuzzyFilter,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  })

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      emptyMessage={t('noResults')}
      tableLayout={{
        columnsVisibility: true,
      }}
    >
      <div className="w-full space-y-2.5">
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <DataGridFilter table={table} className="w-full sm:max-w-sm" />
          <DataGridColumnVisibility
            table={table}
            trigger={<Button variant="outline" size="sm">Columns</Button>}
          />
        </div>

        {/* Bulk Actions */}
        <DataGridBulkActions
          table={table}
          actions={[
            {
              label: tCommon('deleteSelected'),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: async (selectedRows) => {
                // Handle bulk delete
              },
              variant: "destructive",
            },
          ]}
        />

        {/* Table with ScrollArea */}
        <DataGridContainer>
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DataGridContainer>

        {/* Pagination */}
        <DataGridPagination />
      </div>
    </DataGrid>
  )
}
```

## Column Width Behavior

### Automatic Calculation

The DataGridTable component automatically calculates minimum column widths using the `calculateMinColumnWidth` utility from `/lib/data-grid-utils.tsx`.

**Calculation Formula:**
```typescript
minWidth = (textLength × 9px) + 32px (padding) + 24px (sort icon, if sortable)
```

**Constraints:**
- Minimum: 100px
- Maximum: 400px
- Special columns:
  - `select`: 40px (fixed)
  - `actions`: 60px (fixed)

### Custom Column Widths

To set a custom column width, use the `size` property in the column definition:

```tsx
{
  accessorKey: "description",
  header: ({ column }) => (
    <DataGridColumnHeader column={column} title={t('description')} />
  ),
  size: 300, // Custom width in pixels
}
```

### Header Text Extraction

The width calculation system automatically extracts header text from:

1. **String headers**: Direct text value
2. **Function headers** (like DataGridColumnHeader): Falls back to column id

For optimal width calculation with function headers, ensure your column has a descriptive `accessorKey`.

## Horizontal Scroll Implementation

### Required Pattern

Always wrap DataGridTable in ScrollArea with horizontal ScrollBar:

```tsx
<DataGridContainer>
  <ScrollArea>
    <DataGridTable />
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
</DataGridContainer>
```

### When Scroll Appears

- **Desktop**: Scroll appears when table width exceeds container width
- **Mobile**: Scroll is expected for tables with many columns
- **Touch devices**: Native touch scrolling is supported

### Container Constraints

The DataGridContainer applies these critical styles:
- `overflow-hidden`: Clips content to enable ScrollArea
- `w-full max-w-full`: Prevents container overflow
- `rounded-md border`: Visual styling

## Best Practices

### 1. Column Header Text

✅ **Good** - Concise, descriptive headers:
```tsx
header: ({ column }) => (
  <DataGridColumnHeader column={column} title={t('customerName')} />
)
```

❌ **Bad** - Very long headers that will be truncated:
```tsx
header: ({ column }) => (
  <DataGridColumnHeader
    column={column}
    title="Customer Full Legal Name and Business Registration"  // Too long!
  />
)
```

### 2. Responsive Layout

Use responsive flex layout for filters and actions:

```tsx
<div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
  <DataGridFilter table={table} className="w-full sm:max-w-sm" />
  <div className="flex flex-col sm:flex-row gap-2">
    <DataGridColumnVisibility table={table} />
    <Button onClick={onCreate}>Create New</Button>
  </div>
</div>
```

### 3. Selection Column

Always use the `createSelectColumn` utility for consistency:

```tsx
import { createSelectColumn } from "@/lib/data-grid-utils"

const columns = useMemo<ColumnDef<MyDataType>[]>(
  () => [
    createSelectColumn<MyDataType>(),
    // ... other columns
  ],
  []
)
```

### 4. Highlighted Primary Column

Use DataGridHighlightedCell for the primary identifier column:

```tsx
{
  accessorKey: "name",
  header: ({ column }) => (
    <DataGridColumnHeader column={column} title={t('name')} />
  ),
  cell: ({ row }) => (
    <DataGridHighlightedCell text={row.original.name} />
  ),
}
```

### 5. Mobile Responsiveness

Ensure action buttons stack on mobile:

```tsx
<Button size="sm" className="w-full sm:w-auto">
  <Plus className="h-4 w-4 mr-2" />
  {t('createNew')}
</Button>
```

## Common Patterns

### Status Badge Column

```tsx
{
  accessorKey: "status",
  header: ({ column }) => (
    <DataGridColumnHeader column={column} title={t('status')} />
  ),
  cell: ({ row }) => (
    <Badge variant={row.original.isActive ? "default" : "secondary"}>
      {row.original.isActive ? t('active') : t('inactive')}
    </Badge>
  ),
}
```

### Date Column

```tsx
{
  accessorKey: "_creationTime",
  header: ({ column }) => (
    <DataGridColumnHeader column={column} title={t('createdAt')} />
  ),
  cell: ({ row }) => (
    <span className="text-muted-foreground">
      {new Date(row.original._creationTime).toLocaleDateString()}
    </span>
  ),
}
```

### Relationship Column

```tsx
{
  id: "country",
  header: ({ column }) => (
    <DataGridColumnHeader column={column} title={t('country')} />
  ),
  cell: ({ row }) => (
    <span>{row.original.country?.name || '-'}</span>
  ),
}
```

## Troubleshooting

### Column Headers Overflow

**Problem**: Column headers are getting cut off.

**Solution**: This should not happen with the automatic width calculation. If it does:
1. Check that DataGridTable is up to date
2. Verify header text is being extracted correctly
3. Ensure you're using DataGridColumnHeader component

### No Horizontal Scroll

**Problem**: Table content is overflowing instead of scrolling.

**Solution**:
1. Verify you're using the ScrollArea wrapper pattern
2. Check that DataGridContainer has `overflow-hidden`
3. Ensure ScrollBar component is included with `orientation="horizontal"`

### Table Too Wide on Mobile

**Problem**: Table takes up too much space on small screens.

**Solution**:
1. This is expected - horizontal scroll should appear
2. Consider hiding less important columns on mobile using column visibility
3. Ensure touch scrolling works (test on actual device)

### Sorting Breaks Column Width

**Problem**: Adding sorting changes column width unexpectedly.

**Solution**: The width calculation includes space for sort icons. This is intentional and ensures consistent layout.

## Migration from Old Tables

If you have tables using the old DataGrid pattern without ScrollArea:

1. Wrap your table in the new pattern:
```tsx
// Old
<DataGrid columns={columns} data={data} />

// New
<DataGrid table={table} recordCount={data.length}>
  <DataGridContainer>
    <ScrollArea>
      <DataGridTable />
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  </DataGridContainer>
</DataGrid>
```

2. Update column definitions to use DataGridColumnHeader
3. Add selection column using createSelectColumn
4. Add bulk actions using DataGridBulkActions

## Performance Considerations

### Large Datasets

- Use pagination (DataGridPagination component)
- Default page size: 10 items
- Adjust with `initialState` in useReactTable

### Many Columns

- Enable column visibility controls
- Hide less important columns by default
- Consider separate mobile view for 8+ columns

### Slow Rendering

- Use `useMemo` for column definitions
- Avoid inline functions in cell renderers
- Use `React.memo` for complex cell components

## References

- **Column Width Utility**: `/lib/data-grid-utils.tsx`
- **Base Table Component**: `/components/ui/data-grid-table.tsx`
- **DataGrid Wrapper**: `/components/ui/data-grid.tsx`
- **Example Tables**: `/components/companies/companies-table.tsx`, `/components/document-types/document-types-table.tsx`
