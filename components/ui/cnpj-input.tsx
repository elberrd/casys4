/**
 * CNPJ Input Component
 *
 * A masked input component for Brazilian CNPJ (Cadastro Nacional de Pessoas Jurídicas) numbers.
 * This component automatically formats user input according to the Brazilian CNPJ standard: 00.000.000/0000-00
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
 *   name="taxId"
 *   control={control}
 *   render={({ field }) => <CNPJInput {...field} />}
 * />
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { cleanDocumentNumber, formatCNPJ } from "@/lib/utils/document-masks";

export interface CNPJInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
}

const CNPJInput = React.forwardRef<HTMLInputElement, CNPJInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    // Format the value for display
    const displayValue = value ? formatCNPJ(value) : "";

    // Handle change event to return cleaned value (digits only)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const cleanedValue = cleanDocumentNumber(rawValue);

      // Only allow up to 14 digits
      if (cleanedValue.length <= 14) {
        onChange?.(cleanedValue);
      }
    };

    // Handle paste to accept both formatted and unformatted
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      const cleanedValue = cleanDocumentNumber(pastedText);

      if (cleanedValue.length <= 14) {
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
        placeholder="00.000.000/0000-00"
        maxLength={18} // CNPJ formatted length: 00.000.000/0000-00
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

CNPJInput.displayName = "CNPJInput";

export { CNPJInput };
