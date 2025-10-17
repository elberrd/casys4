# Kibo UI - Status Component

> Source: https://www.kibo-ui.com/components/status
> GitHub: https://github.com/haydenbleasel/kibo/tree/main/packages/status
> Version: Latest (as of October 2025)
> Last Updated: October 16, 2025

## Overview

The Status component is used to display the operational state and uptime of a service. It provides a visual indicator with an animated ping effect and customizable labels to communicate service health status at a glance. The component is designed for use in dashboards, status pages, and monitoring interfaces where real-time service availability needs to be clearly communicated.

## Features

- Displays service operational status with visual indicators
- Automatic color application based on status type
- Animated ping effect for the status indicator
- Customizable colors and labels
- Built on top of shadcn/ui Badge component
- Fully accessible and composable
- TypeScript support with proper type definitions
- Four predefined status states: Online, Offline, Maintenance, Degraded

## Installation

### Prerequisites

This component requires:
- React 18 or higher
- shadcn/ui components (specifically the Badge component)
- Tailwind CSS configured in your project
- The `cn` utility function from shadcn/ui

### Using Kibo UI CLI (Recommended)

```bash
npx kibo-ui add status
```

### Using shadcn CLI

```bash
npx shadcn@latest add https://www.kibo-ui.com/r/status.json
```

### Manual Installation

If you prefer to install manually, you'll need to:

1. Install the required dependencies:
```bash
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

2. Ensure you have the Badge component from shadcn/ui:
```bash
npx shadcn@latest add badge
```

3. Create the Status component file at `components/ui/status.tsx` with the source code provided below.

## Dependencies

- **@radix-ui/react-slot**: For component composition
- **class-variance-authority**: For variant handling
- **clsx**: For conditional class names
- **tailwind-merge**: For merging Tailwind classes
- **shadcn/ui Badge component**: Base component
- **React**: ^18.0.0

## Component Structure

The Status component is composed of three sub-components:

1. **Status**: The main wrapper component (extends Badge)
2. **StatusIndicator**: The animated visual indicator
3. **StatusLabel**: The text label for the status

## Props/API Reference

### Status Component

Extends all props from the shadcn/ui Badge component.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| status | `"online" \| "offline" \| "maintenance" \| "degraded"` | Yes | - | The current status of the service |
| className | string | No | - | Additional CSS classes to apply |
| variant | string | No | "secondary" | Badge variant (inherited from Badge component) |
| children | ReactNode | No | - | Child components (typically StatusIndicator and StatusLabel) |

### StatusIndicator Component

Extends HTMLSpanElement attributes.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| className | string | No | - | Additional CSS classes to apply |

### StatusLabel Component

Extends HTMLSpanElement attributes.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| className | string | No | - | Additional CSS classes to apply |
| children | ReactNode | No | Auto-generated based on status | Custom label text (if not provided, displays default labels) |

## Color Scheme

Each status has an associated color:

- **Online**: Emerald (emerald-500)
- **Offline**: Red (red-500)
- **Maintenance**: Blue (blue-500)
- **Degraded**: Amber (amber-500)

## Usage Examples

### Example 1: Basic Usage - All Status Types

```tsx
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

export default function StatusExample() {
  return (
    <div className="flex flex-col gap-4">
      <Status status="online">
        <StatusIndicator />
        <StatusLabel />
      </Status>

      <Status status="offline">
        <StatusIndicator />
        <StatusLabel />
      </Status>

      <Status status="maintenance">
        <StatusIndicator />
        <StatusLabel />
      </Status>

      <Status status="degraded">
        <StatusIndicator />
        <StatusLabel />
      </Status>
    </div>
  );
}
```

**Output**: Four status badges displaying "Online", "Offline", "Maintenance", and "Degraded" with appropriate colors and animated indicators.

### Example 2: Custom Labels

```tsx
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

export default function CustomLabelStatus() {
  return (
    <div className="flex flex-col gap-4">
      <Status status="online">
        <StatusIndicator />
        <StatusLabel>All Systems Operational</StatusLabel>
      </Status>

      <Status status="offline">
        <StatusIndicator />
        <StatusLabel>Service Unavailable</StatusLabel>
      </Status>

      <Status status="maintenance">
        <StatusIndicator />
        <StatusLabel>Scheduled Maintenance</StatusLabel>
      </Status>

      <Status status="degraded">
        <StatusIndicator />
        <StatusLabel>Experiencing Issues</StatusLabel>
      </Status>
    </div>
  );
}
```

**Output**: Status badges with custom descriptive labels instead of the default status names.

### Example 3: Status Dashboard

```tsx
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "maintenance" | "degraded";
  uptime: string;
}

const services: ServiceStatus[] = [
  { name: "API Server", status: "online", uptime: "99.9%" },
  { name: "Database", status: "online", uptime: "100%" },
  { name: "CDN", status: "degraded", uptime: "98.5%" },
  { name: "Email Service", status: "maintenance", uptime: "95.0%" },
];

export default function ServiceDashboard() {
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold">System Status</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-sm text-muted-foreground">
                Uptime: {service.uptime}
              </p>
            </div>
            <Status status={service.status}>
              <StatusIndicator />
              <StatusLabel />
            </Status>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Output**: A dashboard displaying multiple services with their status and uptime percentage.

### Example 4: With Custom Styling

```tsx
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

export default function CustomStyledStatus() {
  return (
    <div className="flex gap-4">
      <Status status="online" className="border-2 border-emerald-500">
        <StatusIndicator />
        <StatusLabel className="font-bold">Fully Operational</StatusLabel>
      </Status>

      <Status status="degraded" className="border-2 border-amber-500">
        <StatusIndicator />
        <StatusLabel className="font-bold">Performance Issues</StatusLabel>
      </Status>
    </div>
  );
}
```

**Output**: Status badges with custom borders and bold labels.

### Example 5: Dynamic Status with State

```tsx
"use client";

import { useState, useEffect } from "react";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

type StatusType = "online" | "offline" | "maintenance" | "degraded";

export default function DynamicStatus() {
  const [serviceStatus, setServiceStatus] = useState<StatusType>("online");

  // Simulate status checks
  useEffect(() => {
    const checkServiceHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setServiceStatus(data.status);
      } catch (error) {
        setServiceStatus("offline");
      }
    };

    // Check immediately and then every 30 seconds
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-6">
      <h2 className="text-xl font-semibold">Real-time Service Status</h2>
      <Status status={serviceStatus}>
        <StatusIndicator />
        <StatusLabel />
      </Status>
      <p className="text-sm text-muted-foreground">
        Last checked: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}
```

**Output**: A status component that updates based on API responses, checking service health every 30 seconds.

### Example 6: Compact Inline Status

```tsx
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

export default function InlineStatus() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Database Connection:</span>
      <Status status="online" className="text-xs">
        <StatusIndicator />
        <StatusLabel />
      </Status>
    </div>
  );
}
```

**Output**: A compact status indicator suitable for inline use within text or smaller UI elements.

## Component Source Code

For reference, here's the complete implementation of the Status component:

```tsx
import type { ComponentProps, HTMLAttributes } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusProps = ComponentProps<typeof Badge> & {
  status: "online" | "offline" | "maintenance" | "degraded";
};

export const Status = ({ className, status, ...props }: StatusProps) => (
  <Badge
    className={cn("flex items-center gap-2", "group", status, className)}
    variant="secondary"
    {...props}
  />
);

export type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement>;

export const StatusIndicator = ({
  className,
  ...props
}: StatusIndicatorProps) => (
  <span className="relative flex h-2 w-2" {...props}>
    <span
      className={cn(
        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
        "group-[.online]:bg-emerald-500",
        "group-[.offline]:bg-red-500",
        "group-[.maintenance]:bg-blue-500",
        "group-[.degraded]:bg-amber-500"
      )}
    />
    <span
      className={cn(
        "relative inline-flex h-2 w-2 rounded-full",
        "group-[.online]:bg-emerald-500",
        "group-[.offline]:bg-red-500",
        "group-[.maintenance]:bg-blue-500",
        "group-[.degraded]:bg-amber-500"
      )}
    />
  </span>
);

export type StatusLabelProps = HTMLAttributes<HTMLSpanElement>;

export const StatusLabel = ({
  className,
  children,
  ...props
}: StatusLabelProps) => (
  <span className={cn("text-muted-foreground", className)} {...props}>
    {children ?? (
      <>
        <span className="hidden group-[.online]:block">Online</span>
        <span className="hidden group-[.offline]:block">Offline</span>
        <span className="hidden group-[.maintenance]:block">Maintenance</span>
        <span className="hidden group-[.degraded]:block">Degraded</span>
      </>
    )}
  </span>
);
```

## Implementation Details

### How It Works

1. **Group Pattern**: The Status component uses Tailwind's `group` class to enable child components to respond to the parent's status class.

2. **Status Classes**: The status prop value is directly applied as a class name (e.g., `.online`, `.offline`), enabling the use of Tailwind's group variant selectors.

3. **Automatic Labels**: The StatusLabel component automatically displays the appropriate text based on the parent's status class using conditional rendering with `hidden` classes.

4. **Ping Animation**: The StatusIndicator uses Tailwind's `animate-ping` utility to create a pulsing effect, with a static dot overlay for better visibility.

5. **Color Coordination**: All status-related colors are synchronized through group selectors, ensuring consistent theming across indicator and potential future customizations.

## Accessibility

- The component uses semantic HTML elements
- Status information is conveyed through both color and text
- The Badge component provides proper ARIA attributes
- Color contrast meets WCAG AA standards for all status types
- Screen readers can properly announce the status through the label text

## Best Practices

1. **Always Include Both Indicator and Label**: For better accessibility and clarity, use both StatusIndicator and StatusLabel together.

```tsx
// Good
<Status status="online">
  <StatusIndicator />
  <StatusLabel />
</Status>

// Not recommended (lacks visual indicator)
<Status status="online">
  <StatusLabel />
</Status>
```

2. **Use Meaningful Custom Labels**: When providing custom labels, ensure they clearly communicate the service state.

```tsx
// Good
<StatusLabel>Payment processing available</StatusLabel>

// Less clear
<StatusLabel>OK</StatusLabel>
```

3. **Update Status Dynamically**: For real-time status displays, implement proper polling or WebSocket connections to keep the status current.

4. **Provide Context**: When displaying multiple statuses, include service names and additional context like uptime or last check time.

5. **Handle Loading States**: While fetching status data, consider showing a loading state or using "degraded" as a default.

6. **Group Related Statuses**: In dashboards, group related services together for better organization.

7. **Consider Mobile Layout**: Use responsive classes to adjust status displays on smaller screens.

## Common Issues and Solutions

### Issue: Colors not appearing correctly
**Solution**: Ensure Tailwind CSS is properly configured and the necessary color classes are not being purged. Add the status colors to your `safelist` in `tailwind.config.js` if needed:

```js
module.exports = {
  safelist: [
    'group-[.online]:bg-emerald-500',
    'group-[.offline]:bg-red-500',
    'group-[.maintenance]:bg-blue-500',
    'group-[.degraded]:bg-amber-500',
  ],
  // ... rest of config
}
```

### Issue: Animation not visible
**Solution**: Ensure the `animate-ping` utility is enabled in your Tailwind configuration and not disabled.

### Issue: Labels not changing with status
**Solution**: Verify that the `status` prop is being properly passed to the Status component and that the value matches one of the four allowed types exactly.

### Issue: TypeScript errors with status prop
**Solution**: Ensure you're using one of the exact string literals: "online", "offline", "maintenance", or "degraded". TypeScript will enforce these values.

## Related Components

- **Badge**: The Status component is built on top of the shadcn/ui Badge component
- **Alert**: For displaying more detailed status messages
- **Toast/Sonner**: For temporary status notifications

## Integration Examples

### With React Query

```tsx
import { useQuery } from "@tanstack/react-query";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

export default function ServiceStatusWithQuery() {
  const { data: status, isLoading } = useQuery({
    queryKey: ["serviceStatus"],
    queryFn: async () => {
      const res = await fetch("/api/status");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return <Status status="degraded"><StatusIndicator /><StatusLabel>Checking...</StatusLabel></Status>;
  }

  return (
    <Status status={status.status}>
      <StatusIndicator />
      <StatusLabel />
    </Status>
  );
}
```

### With Convex (Real-time)

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

export default function ConvexStatus() {
  const status = useQuery(api.status.getServiceStatus);

  return (
    <Status status={status ?? "degraded"}>
      <StatusIndicator />
      <StatusLabel />
    </Status>
  );
}
```

## Styling Customization

### Custom Colors

To use custom colors for specific statuses, you can override the default classes:

```tsx
<Status status="online" className="[&_.group-\\[\\.online\\]\\:bg-emerald-500]:bg-green-600">
  <StatusIndicator />
  <StatusLabel>Custom Green</StatusLabel>
</Status>
```

Or create a custom wrapper component:

```tsx
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";

export function CustomStatus({ status, label }: { status: string; label: string }) {
  return (
    <div className="relative">
      <Status status={status as any}>
        <StatusIndicator />
        <StatusLabel>{label}</StatusLabel>
      </Status>
    </div>
  );
}
```

## License

Kibo UI is MIT licensed and completely free and open source. The Status component is part of the Kibo UI component library.

## Resources

- [Official Documentation](https://www.kibo-ui.com/components/status)
- [GitHub Repository](https://github.com/haydenbleasel/kibo)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Kibo UI Discord Community](https://discord.gg/kibo-ui) (if available)

## Contributing

Kibo UI is open source and accepts contributions. If you find issues or want to improve the Status component, visit the [GitHub repository](https://github.com/haydenbleasel/kibo) to submit issues or pull requests.
