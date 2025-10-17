# ReUI - Sortable

> Source: https://reui.io/docs/sortable
> Library: ReUI
> Built with: DndKit
> Last Updated: 2025-10-16

## Overview

The Sortable component is a flexible drag-and-drop component designed for seamless item organization across customizable columns and layouts. Built on top of DndKit, it provides an accessible, performant solution for creating sortable lists with support for vertical, horizontal, and grid layouts. The component includes built-in keyboard navigation support and follows accessibility best practices.

**Key Features:**
- Drag-and-drop functionality with smooth animations
- Multiple layout strategies (vertical, horizontal, grid)
- Nested sortable lists support
- Keyboard navigation (Space to pick up, Arrow keys to move, Space to drop, Escape to cancel)
- Fully accessible with screen reader support
- TypeScript support
- Customizable drag handles
- Integration with shadcn/ui

## Prerequisites

Before installing the Sortable component, ensure your project has the following:

- **React**: Version 19 or higher
- **TypeScript**: Version 5.7 or higher
- **Tailwind CSS**: Version 4 or higher
- **Radix UI**: Version 1 or higher
- **Base UI**: Version 1 or higher
- **Motion**: Version 12.19 or higher
- **shadcn/ui**: Set up and configured

## Installation

### Method 1: Using shadcn CLI (Recommended)

The easiest way to add the Sortable component is using the shadcn CLI:

```bash
pnpm dlx shadcn@latest add @reui/sortable
```

Or with other package managers:

```bash
# npm
npx shadcn@latest add @reui/sortable

# yarn
yarn dlx shadcn@latest add @reui/sortable

# bun
bunx shadcn@latest add @reui/sortable
```

### Method 2: Manual Installation

If you need to install dependencies manually:

1. **Install DndKit dependencies:**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

2. **Install additional ReUI dependencies (if not already installed):**

```bash
# Radix UI
pnpm add @radix-ui/react-slot

# Motion for animations
pnpm add motion

# Lucide icons
pnpm add lucide-react
```

3. **Copy the component code** from the ReUI documentation and add it to your components directory.

## Required Dependencies

The Sortable component requires the following packages:

```json
{
  "@dnd-kit/core": "^6.0.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.0",
  "react": "^19.0.0",
  "tailwindcss": "^4.0.0",
  "motion": "^12.19.0"
}
```

## Usage

### Basic Import

```tsx
import { Sortable, SortableItem, SortableItemHandle } from "@/components/ui/sortable"
```

### Basic Vertical List Example

```tsx
'use client'

import { useState } from 'react'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { GripVertical } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
}

export default function BasicSortableList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Task 1', description: 'Complete project documentation' },
    { id: '2', title: 'Task 2', description: 'Review pull requests' },
    { id: '3', title: 'Task 3', description: 'Update dependencies' },
    { id: '4', title: 'Task 4', description: 'Write unit tests' },
  ])

  return (
    <Sortable
      value={tasks}
      onValueChange={setTasks}
      getItemValue={(item) => item.id}
      className="space-y-2"
    >
      {tasks.map((task) => (
        <SortableItem
          key={task.id}
          value={task.id}
          className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-accent"
        >
          <SortableItemHandle className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </SortableItemHandle>
          <div className="flex-1">
            <h3 className="font-semibold">{task.title}</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
        </SortableItem>
      ))}
    </Sortable>
  )
}
```

### Grid Layout Example

Perfect for organizing items in a grid with drag-and-drop:

```tsx
'use client'

import { useState } from 'react'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { GripVertical, Image, FileText, Video, Music } from 'lucide-react'

interface MediaFile {
  id: string
  name: string
  type: 'image' | 'document' | 'video' | 'audio'
  size: string
}

const getIcon = (type: string) => {
  switch (type) {
    case 'image': return <Image className="h-8 w-8" />
    case 'document': return <FileText className="h-8 w-8" />
    case 'video': return <Video className="h-8 w-8" />
    case 'audio': return <Music className="h-8 w-8" />
    default: return <FileText className="h-8 w-8" />
  }
}

export default function GridSortableExample() {
  const [files, setFiles] = useState<MediaFile[]>([
    { id: '1', name: 'Hero Image', type: 'image', size: '2.4 MB' },
    { id: '2', name: 'Product Specs', type: 'document', size: '1.2 MB' },
    { id: '3', name: 'Demo Video', type: 'video', size: '15.7 MB' },
    { id: '4', name: 'Audio Guide', type: 'audio', size: '8.3 MB' },
    { id: '5', name: 'Gallery Photo 1', type: 'image', size: '3.1 MB' },
    { id: '6', name: 'Gallery Photo 2', type: 'image', size: '2.8 MB' },
  ])

  return (
    <Sortable
      value={files}
      onValueChange={setFiles}
      getItemValue={(item) => item.id}
      strategy="grid"
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
    >
      {files.map((file) => (
        <SortableItem
          key={file.id}
          value={file.id}
          className="flex flex-col items-center gap-2 rounded-lg border bg-card p-6 hover:bg-accent"
        >
          <SortableItemHandle className="self-start cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </SortableItemHandle>
          <div className="flex flex-col items-center gap-2 text-center">
            {getIcon(file.type)}
            <div>
              <p className="font-medium text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">{file.type}</p>
              <p className="text-xs text-muted-foreground">{file.size}</p>
            </div>
          </div>
        </SortableItem>
      ))}
    </Sortable>
  )
}
```

### Nested Sortable Lists Example

Create hierarchical sortable structures:

```tsx
'use client'

import { useState } from 'react'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { GripVertical, ChevronRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  items: string[]
}

export default function NestedSortableExample() {
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Colors', items: ['White', 'Black', 'Grey', 'Green'] },
    { id: '2', name: 'Sizes', items: ['Small', 'Medium', 'Large'] },
    { id: '3', name: 'Materials', items: ['Cotton', 'Polyester', 'Wool'] },
  ])

  const updateCategoryItems = (categoryId: string, newItems: string[]) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, items: newItems } : cat
      )
    )
  }

  return (
    <Sortable
      value={categories}
      onValueChange={setCategories}
      getItemValue={(item) => item.id}
      className="space-y-4"
    >
      {categories.map((category) => (
        <SortableItem
          key={category.id}
          value={category.id}
          className="rounded-lg border bg-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <SortableItemHandle className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </SortableItemHandle>
            <h3 className="font-semibold">{category.name}</h3>
          </div>

          <Sortable
            value={category.items}
            onValueChange={(newItems) => updateCategoryItems(category.id, newItems)}
            getItemValue={(item) => item}
            className="space-y-2 pl-7"
          >
            {category.items.map((item) => (
              <SortableItem
                key={item}
                value={item}
                className="flex items-center gap-2 rounded-md border bg-background p-2 hover:bg-accent"
              >
                <SortableItemHandle className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </SortableItemHandle>
                <span className="text-sm">{item}</span>
              </SortableItem>
            ))}
          </Sortable>
        </SortableItem>
      ))}
    </Sortable>
  )
}
```

### Horizontal List Example

```tsx
'use client'

import { useState } from 'react'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { GripVertical } from 'lucide-react'

interface Tab {
  id: string
  label: string
  count?: number
}

export default function HorizontalSortableExample() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', label: 'Dashboard', count: 5 },
    { id: '2', label: 'Analytics', count: 12 },
    { id: '3', label: 'Reports', count: 3 },
    { id: '4', label: 'Settings' },
  ])

  return (
    <Sortable
      value={tabs}
      onValueChange={setTabs}
      getItemValue={(item) => item.id}
      strategy="horizontal"
      className="flex gap-2 overflow-x-auto pb-2"
    >
      {tabs.map((tab) => (
        <SortableItem
          key={tab.id}
          value={tab.id}
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 hover:bg-accent whitespace-nowrap"
        >
          <SortableItemHandle className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </SortableItemHandle>
          <span className="font-medium">{tab.label}</span>
          {tab.count && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {tab.count}
            </span>
          )}
        </SortableItem>
      ))}
    </Sortable>
  )
}
```

### With Drag Events Example

Handle drag start and end events:

```tsx
'use client'

import { useState } from 'react'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { GripVertical } from 'lucide-react'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'

interface Item {
  id: string
  name: string
}

export default function SortableWithEventsExample() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.id as string)
    console.log('Drag started:', event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedItem(null)
    console.log('Drag ended:', event.active.id, 'to', event.over?.id)
  }

  return (
    <div className="space-y-4">
      {draggedItem && (
        <div className="rounded-md bg-blue-100 dark:bg-blue-900 p-3 text-sm">
          Currently dragging: {items.find(i => i.id === draggedItem)?.name}
        </div>
      )}

      <Sortable
        value={items}
        onValueChange={setItems}
        getItemValue={(item) => item.id}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="space-y-2"
      >
        {items.map((item) => (
          <SortableItem
            key={item.id}
            value={item.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-accent"
          >
            <SortableItemHandle className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </SortableItemHandle>
            <span>{item.name}</span>
          </SortableItem>
        ))}
      </Sortable>
    </div>
  )
}
```

### Disabled Items Example

```tsx
'use client'

import { useState } from 'react'
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable'
import { GripVertical, Lock } from 'lucide-react'

interface Task {
  id: string
  name: string
  locked: boolean
}

export default function DisabledItemsExample() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', name: 'Editable Task 1', locked: false },
    { id: '2', name: 'Locked Task (Cannot Move)', locked: true },
    { id: '3', name: 'Editable Task 2', locked: false },
    { id: '4', name: 'Editable Task 3', locked: false },
  ])

  return (
    <Sortable
      value={tasks}
      onValueChange={setTasks}
      getItemValue={(item) => item.id}
      className="space-y-2"
    >
      {tasks.map((task) => (
        <SortableItem
          key={task.id}
          value={task.id}
          disabled={task.locked}
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            task.locked
              ? 'bg-muted opacity-60 cursor-not-allowed'
              : 'bg-card hover:bg-accent'
          }`}
        >
          <SortableItemHandle
            className={task.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
          >
            {task.locked ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            )}
          </SortableItemHandle>
          <span>{task.name}</span>
        </SortableItem>
      ))}
    </Sortable>
  )
}
```

## API Reference

### Sortable

The root Sortable component that creates a sortable context for its children.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T[]` | **Required** | Array of items to be sorted |
| `onValueChange` | `(value: T[]) => void` | **Required** | Callback fired when items are reordered |
| `getItemValue` | `(item: T) => string` | **Required** | Function to extract unique string identifier from each item |
| `children` | `React.ReactNode` | **Required** | SortableItem components to render |
| `className` | `string` | `undefined` | Additional CSS classes for the container |
| `strategy` | `'vertical' \| 'horizontal' \| 'grid'` | `'vertical'` | Layout strategy for the sortable list |
| `onMove` | `(event: SortableMoveEvent) => void` | `undefined` | Callback fired during drag move events |
| `onDragStart` | `(event: DragStartEvent) => void` | `undefined` | Callback fired when drag starts |
| `onDragEnd` | `(event: DragEndEvent) => void` | `undefined` | Callback fired when drag ends |

### SortableItem

A draggable item within a Sortable container.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | **Required** | Unique identifier for this item (must match value from `getItemValue`) |
| `children` | `ReactNode` | **Required** | Content to render inside the item |
| `asChild` | `boolean` | `false` | Render as child element instead of default div |
| `className` | `string` | `undefined` | Additional CSS classes for the item |
| `disabled` | `boolean` | `false` | Whether the item can be dragged |

### SortableItemHandle

A drag handle component that controls where users can grab to drag an item.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **Required** | Icon or content for the drag handle |
| `asChild` | `boolean` | `false` | Render as child element instead of default button |
| `className` | `string` | `undefined` | Additional CSS classes for the handle |
| `cursor` | `boolean` | `true` | Whether to apply grab cursor styles |

## Accessibility

The Sortable component is built with accessibility in mind:

### Keyboard Navigation

- **Space**: Pick up a draggable item
- **Arrow Keys**: Move the item while dragging (up/down for vertical, left/right for horizontal)
- **Space**: Drop the item in its new position
- **Escape**: Cancel the drag operation

### Screen Reader Support

- Items announce their draggable state
- Position changes are communicated to screen readers
- Drag instructions are provided via accessible text
- Focus management follows accessibility best practices

### ARIA Attributes

The component automatically handles:
- `role="button"` on draggable items
- `aria-pressed` state for active drags
- `aria-describedby` for drag instructions
- `tabindex` for keyboard navigation

## Best Practices

### 1. Always Provide Unique Keys

```tsx
// Good
<SortableItem key={item.id} value={item.id}>

// Bad - index as key can cause issues
<SortableItem key={index} value={index.toString()}>
```

### 2. Use Appropriate Layout Strategy

Choose the strategy that matches your visual layout:
- `vertical`: For standard lists (default)
- `horizontal`: For tabs, chips, or horizontal carousels
- `grid`: For grid layouts with multiple columns

### 3. Implement Visual Feedback

```tsx
<SortableItem
  className="flex items-center gap-3 rounded-lg border bg-card p-4
             hover:bg-accent transition-colors
             data-[dragging=true]:opacity-50"
>
```

### 4. Optimize for Performance

For large lists, consider:
- Virtualizing the list with libraries like `react-virtual`
- Memoizing item components with `React.memo`
- Using `onMove` callback for custom animations

### 5. Handle State Persistence

Save sorted order to backend or local storage:

```tsx
const handleValueChange = async (newItems: Item[]) => {
  setItems(newItems)
  // Persist to backend
  await updateItemOrder(newItems.map(item => item.id))
}
```

### 6. Provide Clear Visual Handles

Make drag handles obvious and accessible:

```tsx
<SortableItemHandle className="cursor-grab active:cursor-grabbing hover:bg-accent p-1 rounded">
  <GripVertical className="h-5 w-5" aria-label="Drag to reorder" />
</SortableItemHandle>
```

### 7. Consider Mobile Users

Ensure drag handles are large enough for touch targets (minimum 44x44px):

```tsx
<SortableItemHandle className="cursor-grab active:cursor-grabbing p-3 md:p-2">
  <GripVertical className="h-6 w-6 md:h-5 md:w-5" />
</SortableItemHandle>
```

## Common Issues and Solutions

### Issue: Items not dragging

**Solution**: Ensure you're using `SortableItemHandle` and that the `value` prop matches the ID from `getItemValue`:

```tsx
<Sortable getItemValue={(item) => item.id}>
  <SortableItem value={item.id}> {/* Must match! */}
    <SortableItemHandle>...</SortableItemHandle>
  </SortableItem>
</Sortable>
```

### Issue: Nested lists interfering with each other

**Solution**: Each nested Sortable needs its own state management:

```tsx
// Each category manages its own items
<Sortable value={categories} onValueChange={setCategories}>
  {categories.map(category => (
    <Sortable
      value={category.items}
      onValueChange={(items) => updateCategory(category.id, items)}
    >
      ...
    </Sortable>
  ))}
</Sortable>
```

### Issue: Grid layout not working correctly

**Solution**: Use `strategy="grid"` and apply appropriate CSS grid classes:

```tsx
<Sortable
  strategy="grid"
  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
>
```

### Issue: TypeScript errors with generic types

**Solution**: Explicitly type your data arrays:

```tsx
interface Task {
  id: string
  name: string
}

const [tasks, setTasks] = useState<Task[]>([])
```

## Integration with Forms

You can integrate Sortable with form libraries like React Hook Form:

```tsx
import { useForm, Controller } from 'react-hook-form'

function SortableForm() {
  const { control, handleSubmit } = useForm()

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="tasks"
        control={control}
        render={({ field }) => (
          <Sortable
            value={field.value}
            onValueChange={field.onChange}
            getItemValue={(item) => item.id}
          >
            {/* Items */}
          </Sortable>
        )}
      />
    </form>
  )
}
```

## Styling and Customization

The component uses Tailwind CSS and follows the ReUI design system. All components accept `className` props for customization.

### Custom Drag Overlay

Create a custom drag overlay for better visual feedback:

```tsx
<Sortable
  value={items}
  onValueChange={setItems}
  getItemValue={(item) => item.id}
  className="space-y-2"
  onDragStart={(event) => {
    // Custom drag overlay logic
  }}
>
```

### Dark Mode Support

The component automatically supports dark mode through Tailwind's dark variant:

```tsx
<SortableItem className="bg-card dark:bg-card-dark border dark:border-gray-800">
```

## Credits

- Built with [DndKit](https://dndkit.com/) - A modern, performant, and accessible drag and drop toolkit for React
- Part of the [ReUI](https://reui.io) component library
- Integrates seamlessly with [shadcn/ui](https://ui.shadcn.com)

## Additional Resources

- [DndKit Documentation](https://docs.dndkit.com/)
- [ReUI Documentation](https://reui.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Version Information

This documentation is for ReUI Sortable component compatible with:
- React 19+
- TypeScript 5.7+
- Tailwind CSS 4+
- DndKit 6+
