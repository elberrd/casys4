"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { enUS, ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import {
  formatDateForDisplay,
  formatDateForStorage,
  getDatePlaceholder,
  parseDateFromInput,
} from "@/lib/utils";
import {
  parseManualDateEntry,
  validateDateString,
} from "@/lib/validations/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showYearMonthDropdowns?: boolean;
  fromYear?: number;
  toYear?: number;
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  showYearMonthDropdowns = false,
  fromYear = 1900,
  toYear = new Date().getFullYear() + 10,
}: DatePickerProps) {
  const locale = useLocale();
  const t = useTranslations("Common.datePicker");
  const [open, setOpen] = React.useState(false);
  const [month, setMonthState] = React.useState(new Date());

  // State for manual input
  const [inputValue, setInputValue] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | undefined>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const dateValue = value ? parseDateFromInput(value) : undefined;
  const dateLocale = locale === "pt" ? ptBR : enUS;
  const placeholderText = placeholder ?? getDatePlaceholder(locale);

  // Sync input value with external value changes
  React.useEffect(() => {
    if (value) {
      const parsedDate = parseDateFromInput(value);
      if (parsedDate) {
        setMonthState(parsedDate);
        setInputValue(formatDateForDisplay(parsedDate, locale) || "");
        setValidationError(undefined);
      }
    } else {
      setInputValue("");
      setValidationError(undefined);
    }
  }, [value, locale]);

  const handleSelect = (date: Date | undefined) => {
    const dateString = formatDateForStorage(date);
    onChange?.(dateString);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.(undefined);
    setInputValue("");
    setValidationError(undefined);
  };

  const formatDateInput = (value: string, locale: string): string => {
    // Remove all non-numeric characters except slashes
    const cleaned = value.replace(/[^\d/]/g, '');

    // Remove any existing slashes to rebuild from scratch
    const digitsOnly = cleaned.replace(/\//g, '');

    // Limit to 8 digits maximum
    const truncated = digitsOnly.slice(0, 8);

    // Format based on locale
    if (locale === "pt") {
      // dd/MM/yyyy format
      let formatted = truncated;
      if (truncated.length >= 3) {
        formatted = truncated.slice(0, 2) + '/' + truncated.slice(2);
      }
      if (truncated.length >= 5) {
        formatted = truncated.slice(0, 2) + '/' + truncated.slice(2, 4) + '/' + truncated.slice(4);
      }
      return formatted;
    } else {
      // MM/dd/yyyy format
      let formatted = truncated;
      if (truncated.length >= 3) {
        formatted = truncated.slice(0, 2) + '/' + truncated.slice(2);
      }
      if (truncated.length >= 5) {
        formatted = truncated.slice(0, 2) + '/' + truncated.slice(2, 4) + '/' + truncated.slice(4);
      }
      return formatted;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Apply input mask formatting
    const formatted = formatDateInput(rawValue, locale);
    setInputValue(formatted);

    // Clear validation error as user types
    if (validationError) {
      setValidationError(undefined);
    }

    // If input is empty, clear the date
    if (!formatted.trim()) {
      onChange?.(undefined);
      return;
    }
  };

  const handleInputBlur = () => {
    const trimmedValue = inputValue.trim();

    // If empty, just clear
    if (!trimmedValue) {
      onChange?.(undefined);
      setValidationError(undefined);
      return;
    }

    // Validate the input
    const validation = validateDateString(trimmedValue, locale);

    if (validation.valid) {
      // Parse and convert to ISO format
      const parsedDate = parseManualDateEntry(trimmedValue, locale);
      if (parsedDate) {
        const isoDate = formatDateForStorage(parsedDate);
        onChange?.(isoDate);
        setMonthState(parsedDate); // Update calendar month
        setValidationError(undefined);
      }
    } else {
      // Show validation error
      setValidationError(validation.error);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInputBlur();
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      // Reset input to current value
      if (dateValue) {
        setInputValue(formatDateForDisplay(dateValue, locale) || "");
      } else {
        setInputValue("");
      }
      setValidationError(undefined);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-1">
        {/* Manual input field */}
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholderText}
            disabled={disabled}
            aria-label={t("enterManually")}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? "date-error" : undefined}
            className={cn(
              "h-10",
              validationError && "border-destructive focus-visible:ring-destructive/20"
            )}
          />
          {dateValue && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
              onClick={handleClear}
              tabIndex={-1}
              aria-label="Clear date"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>

        {/* Calendar button */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={disabled}
              aria-label={t("selectFromCalendar")}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleSelect}
              month={month}
              onMonthChange={setMonthState}
              locale={dateLocale}
              captionLayout={showYearMonthDropdowns ? "dropdown" : "label"}
              fromYear={showYearMonthDropdowns ? fromYear : undefined}
              toYear={showYearMonthDropdowns ? toYear : undefined}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Validation error message */}
      {validationError && (
        <p
          id="date-error"
          className="text-xs text-destructive mt-1.5"
          role="alert"
        >
          {t(validationError.replace("Common.datePicker.", "") as any)}
        </p>
      )}
    </div>
  );
}
