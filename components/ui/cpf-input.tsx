/**
 * CPF Input Component
 *
 * A masked input component for Brazilian CPF (Cadastro de Pessoas Físicas) numbers.
 * This component automatically formats user input according to the Brazilian CPF standard: 000.000.000-00
 *
 * Features:
 * - Automatic formatting as user types
 * - Compatible with React Hook Form
 * - Returns cleaned value (digits only) to form
 * - Displays formatted value to user
 * - Accepts both formatted and unformatted paste operations
 *
 * @example
 * // Usage with React Hook Form
 * <Controller
 *   name="cpf"
 *   control={control}
 *   render={({ field }) => <CPFInput {...field} />}
 * />
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { cleanDocumentNumber, formatCPF } from "@/lib/utils/document-masks";

export interface CPFInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
}

const CPFInput = React.forwardRef<HTMLInputElement, CPFInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    // Format the value for display
    const displayValue = value ? formatCPF(value) : "";

    // Handle change event to return cleaned value (digits only)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const cleanedValue = cleanDocumentNumber(rawValue);

      // Only allow up to 11 digits
      if (cleanedValue.length <= 11) {
        onChange?.(cleanedValue);
      }
    };

    // Handle paste to accept both formatted and unformatted
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      const cleanedValue = cleanDocumentNumber(pastedText);

      if (cleanedValue.length <= 11) {
        e.preventDefault();
        onChange?.(cleanedValue);
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="000.000.000-00"
        maxLength={14} // CPF formatted length: 000.000.000-00
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    );
  }
);

CPFInput.displayName = "CPFInput";

export { CPFInput };
