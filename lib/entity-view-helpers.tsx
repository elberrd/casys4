import { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { ViewField } from "@/components/ui/entity-view-modal"

/**
 * Formats a field value based on its type
 */
export function formatFieldValue(
  value: any,
  type?: "date" | "datetime" | "boolean" | "email" | "url" | "phone" | "currency"
): ReactNode {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>
  }

  // Handle empty strings
  if (typeof value === "string" && value.trim() === "") {
    return <span className="text-muted-foreground">-</span>
  }

  // Format based on type
  switch (type) {
    case "date":
      return new Date(value).toLocaleDateString()

    case "datetime":
      return new Date(value).toLocaleString()

    case "boolean":
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      )

    case "email":
      return (
        <a
          href={`mailto:${value}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      )

    case "url":
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      )

    case "phone":
      return (
        <a
          href={`tel:${value}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      )

    case "currency":
      if (typeof value === "number") {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value)
      }
      return value

    default:
      return value
  }
}

/**
 * Creates a field for display in the view modal
 */
export function createField(
  label: string,
  value: any,
  type?: "date" | "datetime" | "boolean" | "email" | "url" | "phone" | "currency",
  options?: {
    fullWidth?: boolean
    icon?: ReactNode
    className?: string
  }
): ViewField {
  return {
    label,
    value: formatFieldValue(value, type),
    fullWidth: options?.fullWidth,
    icon: options?.icon,
    className: options?.className,
  }
}

/**
 * Creates a relationship field that displays a related entity
 */
export function createRelationshipField(
  label: string,
  entity: any,
  displayField: string = "name",
  options?: {
    icon?: ReactNode
    className?: string
  }
): ViewField {
  const displayValue = entity?.[displayField] || "-"

  return {
    label,
    value:
      entity && displayValue !== "-" ? (
        <span className="font-medium">{displayValue}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    icon: options?.icon,
    className: options?.className,
  }
}

/**
 * Creates a badge field for status or category display
 */
export function createBadgeField(
  label: string,
  value: string | null | undefined,
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" = "default",
  options?: {
    icon?: ReactNode
    className?: string
  }
): ViewField {
  return {
    label,
    value: value ? (
      <Badge variant={variant}>{value}</Badge>
    ) : (
      <span className="text-muted-foreground">-</span>
    ),
    icon: options?.icon,
    className: options?.className,
  }
}

/**
 * Creates a color preview field
 */
export function createColorField(
  label: string,
  color: string | null | undefined,
  options?: {
    icon?: ReactNode
    className?: string
  }
): ViewField {
  return {
    label,
    value: color ? (
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded border border-gray-300"
          style={{ backgroundColor: color }}
        />
        <span className="font-mono text-sm">{color}</span>
      </div>
    ) : (
      <span className="text-muted-foreground">-</span>
    ),
    icon: options?.icon,
    className: options?.className,
  }
}

/**
 * Creates a list field for displaying arrays
 */
export function createListField(
  label: string,
  items: any[] | null | undefined,
  options?: {
    fullWidth?: boolean
    icon?: ReactNode
    className?: string
  }
): ViewField {
  return {
    label,
    value:
      items && items.length > 0 ? (
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-sm">
              {typeof item === "string" ? item : item.name || item.title || JSON.stringify(item)}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    fullWidth: options?.fullWidth,
    icon: options?.icon,
    className: options?.className,
  }
}

/**
 * Creates a JSON field for displaying formatted JSON data
 */
export function createJsonField(
  label: string,
  data: any,
  options?: {
    fullWidth?: boolean
    icon?: ReactNode
    className?: string
  }
): ViewField {
  return {
    label,
    value: data ? (
      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
        {JSON.stringify(data, null, 2)}
      </pre>
    ) : (
      <span className="text-muted-foreground">-</span>
    ),
    fullWidth: options?.fullWidth || true,
    icon: options?.icon,
    className: options?.className,
  }
}
