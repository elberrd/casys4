# ReUI - Skeleton

> Source: https://reui.io/docs/skeleton
> Version: Latest
> Last Updated: 2025-10-16

## Overview

The Skeleton component is a loading placeholder that displays a preview of content before the actual data loads. It uses a pulsing animation to indicate that content is being fetched, reducing perceived load times and improving user experience during asynchronous operations.

The ReUI Skeleton component is a lightweight, customizable component built on top of Tailwind CSS utilities. It provides a simple yet effective way to show content placeholders with minimal setup.

## Installation

### Using CLI (Recommended)

The easiest way to install the Skeleton component is using the shadcn CLI:

**pnpm:**
```bash
pnpm dlx shadcn@latest add @reui/skeleton
```

**npm:**
```bash
npx shadcn@latest add @reui/skeleton
```

**yarn:**
```bash
yarn dlx shadcn@latest add @reui/skeleton
```

**bun:**
```bash
bunx shadcn@latest add @reui/skeleton
```

### Manual Installation

If you prefer to install manually, follow these steps:

1. **Install dependencies:**

```bash
pnpm add clsx tailwind-merge
```

2. **Create the utility function** (`lib/utils.ts`):

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving any conflicts.
 *
 * @param inputs - An array of class names to merge.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

3. **Create the Skeleton component** (`components/ui/skeleton.tsx`):

```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-accent', className)}
      {...props}
    />
  );
}

export { Skeleton };
```

## Dependencies

- **clsx** - Utility for constructing className strings conditionally
- **tailwind-merge** - Utility for merging Tailwind CSS classes without conflicts
- **Tailwind CSS** - Required for styling and animation utilities

## Usage

### Basic Import

```typescript
import { Skeleton } from '@/components/ui/skeleton';
```

### Basic Skeleton

The simplest use case creates a basic rectangular skeleton:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function BasicSkeleton() {
  return <Skeleton className="h-12 w-full" />;
}
```

## API Reference

### Skeleton Component Props

The Skeleton component extends the standard HTML `div` element props.

| **Prop** | **Type** | **Default** | **Description** |
|----------|----------|-------------|-----------------|
| `className` | `string` | `undefined` | Additional CSS classes to customize the skeleton appearance |
| `...props` | `React.ComponentProps<'div'>` | - | All standard div element props (onClick, onMouseEnter, etc.) |

### Default Classes

The component comes with these default classes:
- `animate-pulse` - Provides the pulsing animation effect
- `rounded-md` - Medium border radius
- `bg-accent` - Uses the accent color from your theme

## Examples

### Example 1: User Profile Card Skeleton

A common pattern for loading user profile information:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function UserProfileSkeleton() {
  return (
    <div className="flex items-center space-x-4">
      {/* Avatar skeleton */}
      <Skeleton className="size-16 rounded-full" />

      {/* User info skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-[225px]" />
        <Skeleton className="h-4 w-[175px]" />
      </div>
    </div>
  );
}
```

### Example 2: Card List Skeleton

Loading state for a list of cards:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function CardListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>

          {/* Content */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />

          {/* Footer */}
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Article/Blog Post Skeleton

Complex skeleton for article content:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function ArticleSkeleton() {
  return (
    <article className="max-w-3xl mx-auto p-6">
      {/* Title */}
      <Skeleton className="h-10 w-3/4 mb-4" />

      {/* Author info */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Featured image */}
      <Skeleton className="h-64 w-full rounded-lg mb-6" />

      {/* Content paragraphs */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </article>
  );
}
```

### Example 4: Table Skeleton

Loading state for data tables:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function TableSkeleton() {
  return (
    <div className="w-full">
      {/* Table header */}
      <div className="border-b pb-3 mb-3">
        <div className="flex gap-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      {/* Table rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 py-3 border-b">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
```

### Example 5: Conditional Loading with Data

Real-world usage with data fetching:

```tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
}

export default function UserCard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setUser({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '/avatar.jpg'
      });
      setIsLoading(false);
    }, 2000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      <img
        src={user?.avatar}
        alt={user?.name}
        className="size-16 rounded-full object-cover"
      />
      <div>
        <h3 className="text-lg font-semibold">{user?.name}</h3>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>
    </div>
  );
}
```

### Example 6: Custom Styled Skeleton

Creating custom skeleton variants:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomSkeletons() {
  return (
    <div className="space-y-4 p-6">
      {/* Circle skeleton */}
      <Skeleton className="size-24 rounded-full" />

      {/* Square skeleton */}
      <Skeleton className="size-24 rounded-none" />

      {/* Custom color skeleton */}
      <Skeleton className="h-12 w-64 bg-blue-200 dark:bg-blue-800" />

      {/* Slower animation */}
      <Skeleton className="h-12 w-64 animate-pulse [animation-duration:1.5s]" />

      {/* No animation */}
      <div className="h-12 w-64 rounded-md bg-accent opacity-50" />
    </div>
  );
}
```

## Accessibility

### Best Practices

1. **ARIA Labels**: Consider adding `aria-label="Loading"` or `aria-busy="true"` to skeleton containers for screen readers:

```tsx
<div aria-label="Loading content" aria-busy="true">
  <Skeleton className="h-12 w-full" />
</div>
```

2. **Announce State Changes**: Use `aria-live` regions to announce when content has loaded:

```tsx
<div aria-live="polite" aria-atomic="true">
  {isLoading ? (
    <Skeleton className="h-12 w-full" />
  ) : (
    <div>Loaded content</div>
  )}
</div>
```

3. **Semantic Structure**: Maintain the same semantic structure in both skeleton and loaded states.

## Best Practices

### 1. Match Content Structure

Skeleton layouts should closely match the structure of the actual content to avoid layout shifts:

```tsx
// Good: Skeleton matches the actual content structure
{isLoading ? (
  <div className="flex gap-4">
    <Skeleton className="size-16 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
) : (
  <div className="flex gap-4">
    <img src={avatar} className="size-16 rounded-full" />
    <div className="flex-1">
      <h3 className="text-lg">{name}</h3>
      <p className="text-sm">{description}</p>
    </div>
  </div>
)}
```

### 2. Use Appropriate Dimensions

Set skeleton dimensions that match your actual content to prevent cumulative layout shift (CLS):

```tsx
// Use fixed heights/widths that match your content
<Skeleton className="h-[200px] w-full" /> // For images
<Skeleton className="h-5 w-48" />         // For headings
<Skeleton className="h-4 w-full" />       // For paragraphs
```

### 3. Limit Animation

Don't overuse pulsing animations. Consider using static skeletons for complex UIs to reduce visual noise:

```tsx
// Static skeleton (remove animate-pulse)
<div className="rounded-md bg-accent opacity-50 h-12 w-full" />
```

### 4. Progressive Loading

Show skeletons progressively for better UX:

```tsx
// Show header immediately, then content
<div>
  <Header /> {/* Loaded immediately */}
  {isLoadingContent ? (
    <ContentSkeleton />
  ) : (
    <Content />
  )}
</div>
```

### 5. Responsive Skeletons

Make skeletons responsive to match your content:

```tsx
<Skeleton className="h-12 w-full md:w-64 lg:w-96" />
```

## Common Issues

### Issue 1: Layout Shift

**Problem**: Content jumps when skeleton is replaced with actual content.

**Solution**: Ensure skeleton dimensions match the loaded content exactly:

```tsx
// Define consistent heights
const CARD_HEIGHT = 'h-[280px]';

{isLoading ? (
  <Skeleton className={CARD_HEIGHT} />
) : (
  <Card className={CARD_HEIGHT}>
    {content}
  </Card>
)}
```

### Issue 2: Wrong Theme Colors

**Problem**: Skeleton doesn't match your theme.

**Solution**: Customize the background color using Tailwind classes:

```tsx
// Override default bg-accent
<Skeleton className="h-12 w-full bg-gray-200 dark:bg-gray-800" />
```

### Issue 3: Animation Performance

**Problem**: Too many animated skeletons cause performance issues.

**Solution**: Reduce animation or use static skeletons:

```tsx
// Option 1: Slower animation
<Skeleton className="animate-pulse [animation-duration:2s]" />

// Option 2: Static skeleton
<div className="rounded-md bg-accent/50 h-12 w-full" />
```

## Customization

### Custom Animation Timing

Adjust animation duration in your Tailwind config:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  }
}
```

Usage:
```tsx
<Skeleton className="animate-pulse-slow h-12 w-full" />
```

### Custom Colors

Override the default accent color:

```tsx
// Using Tailwind classes
<Skeleton className="bg-gradient-to-r from-gray-200 to-gray-300" />

// Using custom colors
<Skeleton className="bg-[#e5e7eb]" />
```

## Integration Tips

### With React Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId)
  });

  if (isLoading) {
    return <UserProfileSkeleton />;
  }

  return <UserProfileContent user={data} />;
}
```

### With Next.js Suspense

```tsx
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Page() {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <Article />
    </Suspense>
  );
}
```

## Related Components

- **Spinner** - For inline loading states
- **Progress** - For determinate loading progress
- **Placeholder** - For empty states

---

*This documentation is based on ReUI Skeleton component. For the latest updates and more examples, visit the [official documentation](https://reui.io/docs/skeleton).*
