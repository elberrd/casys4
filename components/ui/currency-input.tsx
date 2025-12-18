"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number
  onChange?: (value: number | undefined) => void
  currencySymbol?: string
  currencyCode?: string
  locale?: "pt-BR" | "en-US"
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, currencySymbol, currencyCode = "USD", locale, disabled, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("")
    const [isFocused, setIsFocused] = React.useState(false)

    // Determine locale based on currency code
    const effectiveLocale = locale || (currencyCode === "BRL" ? "pt-BR" : "en-US")
    const decimalSeparator = effectiveLocale === "pt-BR" ? "," : "."
    const thousandSeparator = effectiveLocale === "pt-BR" ? "." : ","

    // Format number for display
    const formatValue = (val: number | undefined): string => {
      if (val === undefined || val === null || isNaN(val)) return ""

      const parts = val.toFixed(2).split(".")
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator)
      const decimalPart = parts[1]

      return `${integerPart}${decimalSeparator}${decimalPart}`
    }

    // Parse display value to number
    const parseValue = (val: string): number | undefined => {
      if (!val) return undefined

      // Remove all separators and replace decimal separator with dot
      const normalized = val
        .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
        .replace(new RegExp(`\\${decimalSeparator}`), ".")

      const parsed = parseFloat(normalized)
      return isNaN(parsed) ? undefined : parsed
    }

    // Update display value when prop value changes (only if not focused)
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatValue(value))
      }
    }, [value, isFocused, effectiveLocale])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value

      // Allow only numbers and the appropriate decimal separator
      const validChars = new RegExp(`^[0-9${decimalSeparator}${thousandSeparator}]*$`)
      if (!validChars.test(input)) return

      setDisplayValue(input)

      // Parse and send to parent
      const numericValue = parseValue(input)
      onChange?.(numericValue)
    }

    const handleFocus = () => {
      setIsFocused(true)
      // Remove formatting for easier editing
      if (value !== undefined && value !== null && !isNaN(value)) {
        setDisplayValue(value.toString().replace(".", decimalSeparator))
      }
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Reformat on blur
      if (value !== undefined && value !== null && !isNaN(value)) {
        setDisplayValue(formatValue(value))
      }
    }

    return (
      <div className="relative">
        {currencySymbol && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className={cn(
              "text-sm font-medium",
              disabled ? "text-muted-foreground" : "text-foreground"
            )}>
              {currencySymbol}
            </span>
          </div>
        )}
        <Input
          ref={ref}
          className={cn(
            currencySymbol && "pl-10",
            "font-mono",
            className
          )}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          {...props}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
