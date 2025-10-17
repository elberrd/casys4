# ReUI - Progress

> Source: https://reui.io/docs/progress
> Version: Latest (Compatible with React 19+, TypeScript 5.7+, Tailwind CSS 4+)
> Last Updated: 2025-10-16

## Overview

The Progress component from ReUI displays an indicator showing the completion progress of a task. It comes in multiple variants including traditional progress bars, circular progress indicators, radial progress meters, and animated spinners. Built on top of Radix UI Progress primitives, it provides accessible and customizable progress indicators with smooth animations.

## Key Features

- Multiple variants: Linear bar, Circle, Radial, and Spinner
- Built with Radix UI for accessibility
- TypeScript support with full type definitions
- Customizable size, stroke width, and colors
- Smooth animations with Motion-based transitions
- Support for custom content and labels
- RTL (Right-to-Left) language support

## Installation

### Prerequisites

Before installing the Progress component, ensure your project has:

- React 19 or higher
- TypeScript 5.7 or higher
- Tailwind CSS 4 or higher
- Radix UI installed
- Motion library (for animations)

### Using CLI (Recommended)

```bash
# Using pnpm
pnpm dlx shadcn@latest add @reui/progress

# Using npm
npm dlx shadcn@latest add @reui/progress

# Using yarn
yarn dlx shadcn@latest add @reui/progress

# Using bun
bun dlx shadcn@latest add @reui/progress
```

### Manual Installation

If you prefer manual installation:

1. Install required dependencies:

```bash
npm install clsx tailwind-merge radix-ui
```

2. Create the utility function file (`lib/utils.ts`):

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving any conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

3. Create the Progress component file (`ui/progress.tsx`) - see the complete component code in the Usage section below.

## Component Variants

ReUI Progress provides three main component exports:

1. **Progress** - Traditional horizontal progress bar
2. **ProgressCircle** - Circular progress indicator (full circle)
3. **ProgressRadial** - Radial/arc progress indicator (partial circle)

## Usage

### Complete Component Code

Create `ui/progress.tsx`:

```typescript
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Progress as ProgressPrimitive } from 'radix-ui';

function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn('h-full w-full flex-1 bg-primary transition-all', indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

function ProgressCircle({
  className,
  indicatorClassName,
  trackClassName,
  value = 0,
  size = 48,
  strokeWidth = 4,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /**
   * Progress value from 0 to 100
   */
  value?: number;
  /**
   * Size of the circle in pixels
   */
  size?: number;
  /**
   * Width of the progress stroke
   */
  strokeWidth?: number;
  /**
   * Additional className for the progress stroke
   */
  indicatorClassName?: string;
  /**
   * Additional className for the progress track
   */
  trackClassName?: string;
  /**
   * Content to display in the center of the circle
   */
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div
      data-slot="progress-circle"
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          data-slot="progress-circle-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={cn('text-secondary', trackClassName)}
        />
        <circle
          data-slot="progress-circle-indicator"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('text-primary transition-all duration-300 ease-in-out', indicatorClassName)}
        />
      </svg>
      {children && (
        <div
          data-slot="progress-circle-content"
          className="relative z-10 flex items-center justify-center text-sm font-medium"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ProgressRadial({
  className,
  value = 0,
  size = 120,
  strokeWidth = 8,
  startAngle = -90,
  endAngle = 90,
  showLabel = false,
  trackClassName,
  indicatorClassName,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /**
   * Progress value from 0 to 100
   */
  value?: number;
  /**
   * Size of the radial in pixels
   */
  size?: number;
  /**
   * Width of the progress stroke
   */
  strokeWidth?: number;
  /**
   * Start angle in degrees
   */
  startAngle?: number;
  /**
   * Additional className for the progress stroke
   */
  indicatorClassName?: string;
  /**
   * Additional className for the progress track
   */
  trackClassName?: string;
  /**
   * End angle in degrees
   */
  endAngle?: number;
  /**
   * Whether to show percentage label
   */
  showLabel?: boolean;
  /**
   * Custom content to display
   */
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const angleRange = endAngle - startAngle;
  const progressAngle = (value / 100) * angleRange;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const startX = size / 2 + radius * Math.cos(toRadians(startAngle));
  const startY = size / 2 + radius * Math.sin(toRadians(startAngle));
  const endX = size / 2 + radius * Math.cos(toRadians(startAngle + progressAngle));
  const endY = size / 2 + radius * Math.sin(toRadians(startAngle + progressAngle));

  const largeArc = progressAngle > 180 ? 1 : 0;

  const pathData = ['M', startX, startY, 'A', radius, radius, 0, largeArc, 1, endX, endY].join(' ');

  return (
    <div
      data-slot="progress-radial"
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={[
            'M',
            size / 2 + radius * Math.cos(toRadians(startAngle)),
            size / 2 + radius * Math.sin(toRadians(startAngle)),
            'A',
            radius,
            radius,
            0,
            angleRange > 180 ? 1 : 0,
            1,
            size / 2 + radius * Math.cos(toRadians(endAngle)),
            size / 2 + radius * Math.sin(toRadians(endAngle)),
          ].join(' ')}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={cn('text-secondary', trackClassName)}
        />
        <path
          d={pathData}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={cn('text-primary transition-all duration-300 ease-in-out', indicatorClassName)}
        />
      </svg>
      {(showLabel || children) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children || <span className="text-lg font-bold">{value}%</span>}
        </div>
      )}
    </div>
  );
}

export { Progress, ProgressCircle, ProgressRadial };
```

## Props/API Reference

### Progress (Linear Bar)

Extends `React.ComponentProps<typeof ProgressPrimitive.Root>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Progress value from 0 to 100 |
| `className` | `string` | - | Additional CSS classes for the root element |
| `indicatorClassName` | `string` | - | Additional CSS classes for the progress indicator |

### ProgressCircle

Extends `React.ComponentProps<'div'>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Progress value from 0 to 100 |
| `size` | `number` | `48` | Size of the circle in pixels |
| `strokeWidth` | `number` | `4` | Width of the progress stroke |
| `className` | `string` | - | Additional CSS classes for the container |
| `indicatorClassName` | `string` | - | Additional CSS classes for the progress stroke |
| `trackClassName` | `string` | - | Additional CSS classes for the progress track |
| `children` | `React.ReactNode` | - | Content to display in the center of the circle |

### ProgressRadial

Extends `React.ComponentProps<'div'>`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | `0` | Progress value from 0 to 100 |
| `size` | `number` | `120` | Size of the radial in pixels |
| `strokeWidth` | `number` | `8` | Width of the progress stroke |
| `startAngle` | `number` | `-90` | Start angle in degrees |
| `endAngle` | `number` | `90` | End angle in degrees |
| `showLabel` | `boolean` | `false` | Whether to show percentage label |
| `className` | `string` | - | Additional CSS classes for the container |
| `indicatorClassName` | `string` | - | Additional CSS classes for the progress stroke |
| `trackClassName` | `string` | - | Additional CSS classes for the progress track |
| `children` | `React.ReactNode` | - | Custom content to display in the center |

## Examples

### Example 1: Basic Linear Progress Bar

Simple horizontal progress bar with animated progress.

```typescript
'use client';

import * as React from 'react';
import { Progress } from '@/ui/progress';

export default function BasicProgress() {
  const [progress, setProgress] = React.useState(13);

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-md">
      <Progress value={progress} />
    </div>
  );
}
```

### Example 2: Progress with Status Messages

Progress bar with dynamic status messages based on completion percentage.

```typescript
'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Progress } from '@/ui/progress';

export default function ProgressWithStatus() {
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Get status message based on progress
  const getStatusMessage = (progress: number) => {
    if (progress < 5) return 'Initializing download...';
    if (progress < 15) return 'Setting up environment...';
    if (progress < 25) return 'Connecting to server...';
    if (progress < 35) return 'Verifying permissions...';
    if (progress < 50) return 'Downloading core files...';
    if (progress < 65) return 'Downloading assets...';
    if (progress < 80) return 'Downloading dependencies...';
    if (progress < 90) return 'Extracting files...';
    if (progress < 95) return 'Validating integrity...';
    if (progress < 100) return 'Finalizing installation...';
    return 'Download complete!';
  };

  useEffect(() => {
    // Download simulation
    const downloadTimer = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          return 0; // Reset for continuous loop
        }
        return prev + Math.random() * 3 + 1; // Random increment 1-4
      });
    }, 150);

    return () => {
      clearInterval(downloadTimer);
    };
  }, []);

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Workspace Setup</span>
          <span className="text-muted-foreground">{Math.round(downloadProgress)}%</span>
        </div>
        <Progress value={downloadProgress} className="w-full" />
        <div className="text-xs text-muted-foreground">{getStatusMessage(downloadProgress)}</div>
      </div>
    </div>
  );
}
```

### Example 3: Circular Progress Indicator

Circular progress with custom content display and color.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ProgressCircle } from '@/ui/progress';

export default function CircularProgress() {
  const [cpuUsage, setCpuUsage] = useState(0);

  useEffect(() => {
    // CPU usage simulation
    const cpuTimer = setInterval(() => {
      setCpuUsage((prev) => {
        const target = 30 + Math.sin(Date.now() / 3000) * 20 + Math.random() * 15;
        return prev + (target - prev) * 0.1;
      });
    }, 100);

    return () => {
      clearInterval(cpuTimer);
    };
  }, []);

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <ProgressCircle
          value={cpuUsage}
          size={80}
          strokeWidth={6}
          className="text-fuchsia-500"
          indicatorClassName="text-fuchsia-500"
        >
          <div className="text-center">
            <div className="text-base font-bold">{Math.round(cpuUsage)}%</div>
            <div className="text-xs text-muted-foreground">CPU</div>
          </div>
        </ProgressCircle>
        <span className="text-xs text-muted-foreground">Processor Usage</span>
      </div>
    </div>
  );
}
```

### Example 4: Radial Progress (Arc)

Radial progress indicator showing a partial arc with custom angles.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { ProgressRadial } from '@/ui/progress';

export default function RadialProgress() {
  const [taskProgress, setTaskProgress] = useState(0);

  useEffect(() => {
    // Task completion simulation
    const taskTimer = setInterval(() => {
      setTaskProgress((prev) => {
        if (prev >= 100) {
          return 0; // Reset for continuous loop
        }
        return prev + Math.random() * 2 + 0.5; // Random increment 0.5-2.5
      });
    }, 200);

    return () => {
      clearInterval(taskTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <ProgressRadial
        value={taskProgress}
        size={80}
        startAngle={-90}
        endAngle={180}
        strokeWidth={5}
        indicatorClassName="text-green-500"
        className="text-green-500"
      >
        <div className="text-center">
          <div className="text-base font-bold">{Math.round(taskProgress)}%</div>
          <div className="text-xs text-muted-foreground">Upload</div>
        </div>
      </ProgressRadial>
      <span className="text-xs text-muted-foreground">Upload Status</span>
    </div>
  );
}
```

### Example 5: Animated Spinner

Loading spinner using ProgressCircle with Tailwind's animate-spin.

```typescript
'use client';

import { ProgressCircle } from '@/ui/progress';

export default function SpinnerProgress() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <ProgressCircle
          value={25}
          size={32}
          strokeWidth={3}
          className="text-blue-500 animate-spin"
        />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}
```

### Example 6: Multiple Progress Indicators

Dashboard-style display with multiple progress types.

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Progress, ProgressCircle, ProgressRadial } from '@/ui/progress';

export default function MultiProgressDashboard() {
  const [memoryUsage, setMemoryUsage] = useState(45);
  const [diskUsage, setDiskUsage] = useState(67);
  const [networkSpeed, setNetworkSpeed] = useState(33);

  useEffect(() => {
    const interval = setInterval(() => {
      setMemoryUsage((prev) => Math.min(100, prev + Math.random() * 2 - 1));
      setDiskUsage((prev) => Math.min(100, prev + Math.random() * 1.5 - 0.5));
      setNetworkSpeed((prev) => Math.max(0, Math.min(100, prev + Math.random() * 10 - 5)));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl space-y-6 p-6 bg-card rounded-lg">
      <h2 className="text-xl font-bold mb-4">System Monitor</h2>

      {/* Linear Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Memory Usage</span>
          <span className="text-muted-foreground">{Math.round(memoryUsage)}%</span>
        </div>
        <Progress value={memoryUsage} />
      </div>

      {/* Circular and Radial Progress */}
      <div className="flex gap-8 justify-center">
        <div className="flex flex-col items-center gap-2">
          <ProgressCircle
            value={diskUsage}
            size={80}
            strokeWidth={6}
            indicatorClassName="text-orange-500"
          >
            <div className="text-center">
              <div className="text-base font-bold">{Math.round(diskUsage)}%</div>
              <div className="text-xs text-muted-foreground">Disk</div>
            </div>
          </ProgressCircle>
          <span className="text-xs text-muted-foreground">Storage</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ProgressRadial
            value={networkSpeed}
            size={80}
            strokeWidth={5}
            startAngle={-90}
            endAngle={180}
            indicatorClassName="text-blue-500"
          >
            <div className="text-center">
              <div className="text-base font-bold">{Math.round(networkSpeed)}%</div>
              <div className="text-xs text-muted-foreground">Speed</div>
            </div>
          </ProgressRadial>
          <span className="text-xs text-muted-foreground">Network</span>
        </div>
      </div>
    </div>
  );
}
```

## Accessibility

The Progress component is built on Radix UI primitives, which follow WAI-ARIA guidelines:

- Uses proper ARIA attributes (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`)
- Screen reader friendly with appropriate labels
- Keyboard navigation support where applicable
- Supports high contrast mode
- All variants maintain proper color contrast ratios

### Best Practices for Accessibility

1. Always provide meaningful labels or descriptions for progress indicators
2. Use the `aria-label` or `aria-labelledby` attributes when the context isn't clear
3. Consider providing text alternatives for users who cannot see progress animations
4. Ensure color combinations meet WCAG contrast requirements

## Styling and Customization

### Custom Colors

You can customize colors using Tailwind classes:

```typescript
// Custom indicator color
<Progress
  value={50}
  indicatorClassName="bg-green-500"
/>

// Custom circle colors
<ProgressCircle
  value={75}
  className="text-purple-500"
  indicatorClassName="text-purple-500"
  trackClassName="text-purple-100"
/>
```

### Custom Sizes

Adjust sizes using the component props:

```typescript
// Small progress bar
<Progress value={50} className="h-1" />

// Large progress bar
<Progress value={50} className="h-3" />

// Custom circle size
<ProgressCircle value={50} size={120} strokeWidth={8} />
```

### Animation Customization

Modify transition timing:

```typescript
<Progress
  value={50}
  indicatorClassName="bg-primary transition-all duration-1000 ease-out"
/>
```

## Best Practices

1. **Choose the Right Variant**
   - Use linear progress bars for horizontal space and known durations
   - Use circular progress for compact spaces or loading states
   - Use radial progress for dashboard gauges and metrics
   - Use spinner for indeterminate loading states

2. **Provide Context**
   - Always include labels or descriptions
   - Show percentage or time remaining when possible
   - Update status messages for long-running operations

3. **Performance**
   - Use `React.useCallback` and `React.useMemo` for expensive calculations
   - Throttle progress updates to avoid excessive re-renders
   - Consider using CSS transitions over JavaScript animations

4. **User Experience**
   - Set realistic initial values (avoid starting at 0% if instant)
   - Smooth out jumpy progress with interpolation
   - Provide feedback for both success and error states
   - Don't fake progress - users notice!

5. **Responsive Design**
   - Test progress components at different viewport sizes
   - Adjust circle/radial sizes for mobile devices
   - Consider stacking progress indicators vertically on small screens

## Common Issues

### Progress Not Updating

Ensure you're passing a numeric value between 0-100:

```typescript
// Incorrect
<Progress value="50" />

// Correct
<Progress value={50} />
```

### Circular Progress Not Visible

Check that parent containers have sufficient height:

```typescript
<div className="h-32 flex items-center justify-center">
  <ProgressCircle value={50} size={80} />
</div>
```

### Animations Stuttering

Reduce update frequency:

```typescript
// Use throttling for smoother animations
const throttledProgress = useThrottle(progress, 100); // Update every 100ms
```

## Integration with Forms

Progress components work well with form submission states:

```typescript
'use client';

import { useState } from 'react';
import { Progress } from '@/ui/progress';

export default function FormWithProgress() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="file" />
      <button type="submit" disabled={isUploading}>
        Upload
      </button>
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-sm text-muted-foreground">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}
    </form>
  );
}
```

## Dependencies

- **clsx** - For conditional class name concatenation
- **tailwind-merge** - For merging Tailwind CSS classes
- **radix-ui** - For accessible progress primitives
- **React** - Version 19 or higher
- **TypeScript** - Version 5.7 or higher
- **Tailwind CSS** - Version 4 or higher

## Credits

- Built with [Radix UI Progress](https://www.radix-ui.com/primitives/docs/components/progress)
- Part of the [ReUI](https://reui.io) component library
- Inspired by modern design systems and accessibility standards

## Related Components

- **Spinner** - For indeterminate loading states
- **Skeleton** - For content loading placeholders
- **Toast** - For notification messages
- **Dialog** - For modal progress displays

## Additional Resources

- [ReUI Documentation](https://reui.io/docs)
- [Radix UI Progress Documentation](https://www.radix-ui.com/primitives/docs/components/progress)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WAI-ARIA Progress Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/progressbar/)
