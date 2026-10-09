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
  countDateInputDigits,
  getDatePickerMessageKey,
  maskDateInput,
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
  id?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showYearMonthDropdowns?: boolean;
  fromYear?: number;
  toYear?: number;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  disabledDates?: React.ComponentProps<typeof Calendar>["disabled"];
  onValidationChange?: (isValid: boolean) => void;
}

export function DatePicker({
  id,
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  showYearMonthDropdowns = false,
  fromYear = 1900,
  toYear = new Date().getFullYear() + 10,
  ariaLabel,
  ariaDescribedBy,
  disabledDates,
  onValidationChange,
}: DatePickerProps) {
  const locale = useLocale();
  const t = useTranslations("Common.datePicker");
  const errorId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [month, setMonthState] = React.useState(new Date());

  const [inputValue, setInputValue] = React.useState("");
  const [validationError, setValidationError] = React.useState<
    string | undefined
  >();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const onValidationChangeRef = React.useRef(onValidationChange);

  React.useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  }, [onValidationChange]);

  const emitValidity = React.useCallback((isValid: boolean) => {
    onValidationChangeRef.current?.(isValid);
  }, []);

  const dateValue = value ? parseDateFromInput(value) : undefined;
  const dateLocale = locale === "pt" ? ptBR : enUS;
  const placeholderText = placeholder ?? getDatePlaceholder(locale);

  React.useEffect(() => {
    if (value) {
      const parsedDate = parseDateFromInput(value);
      if (parsedDate) {
        setMonthState(parsedDate);
        setInputValue(formatDateForDisplay(parsedDate, locale) || "");
        setValidationError(undefined);
        emitValidity(true);
      }
    } else {
      setInputValue("");
      setValidationError(undefined);
      emitValidity(true);
    }
  }, [value, locale, emitValidity]);

  const commitValidDate = (date: Date) => {
    onChange?.(formatDateForStorage(date));
    setMonthState(date);
    setValidationError(undefined);
    emitValidity(true);
  };

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange?.(undefined);
      setInputValue("");
      setValidationError(undefined);
      emitValidity(true);
      setOpen(false);
      return;
    }
    setInputValue(formatDateForDisplay(date, locale) || "");
    commitValidDate(date);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.(undefined);
    setInputValue("");
    setValidationError(undefined);
    emitValidity(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = maskDateInput(e.target.value, locale);
    setInputValue(formatted);

    if (!formatted.trim()) {
      setValidationError(undefined);
      emitValidity(true);
      onChange?.(undefined);
      return;
    }

    if (countDateInputDigits(formatted) < 8) {
      setValidationError(undefined);
      return;
    }

    const validation = validateDateString(formatted, locale);
    if (validation.valid) {
      const parsedDate = parseManualDateEntry(formatted, locale);
      if (parsedDate) {
        commitValidDate(parsedDate);
      }
    } else {
      setValidationError(validation.error);
      emitValidity(false);
    }
  };

  const handleInputBlur = () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      onChange?.(undefined);
      setValidationError(undefined);
      emitValidity(true);
      return;
    }

    const validation = validateDateString(trimmedValue, locale);

    if (validation.valid) {
      const parsedDate = parseManualDateEntry(trimmedValue, locale);
      if (parsedDate) {
        commitValidDate(parsedDate);
      }
    } else {
      setValidationError(validation.error);
      emitValidity(false);
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
      if (dateValue) {
        setInputValue(formatDateForDisplay(dateValue, locale) || "");
      } else {
        setInputValue("");
      }
      setValidationError(undefined);
      emitValidity(true);
    }
  };

  return (
    <div className="relative">
      <div className={cn("flex gap-1", className)}>
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholderText}
            disabled={disabled}
            aria-label={ariaLabel ?? t("enterManually")}
            aria-invalid={!!validationError}
            aria-describedby={
              validationError ? errorId : ariaDescribedBy
            }
            className={cn(
              "h-10",
              dateValue && !disabled && "pr-8",
              validationError &&
                "border-destructive focus-visible:ring-destructive/20"
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
              aria-label={t("clearDate")}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>

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
              disabled={disabledDates}
              autoFocus={false}
            />
          </PopoverContent>
        </Popover>
      </div>

      {validationError && (
        <p
          id={errorId}
          className="text-xs text-destructive mt-1.5"
          role="alert"
        >
          {t(getDatePickerMessageKey(validationError))}
        </p>
      )}
    </div>
  );
}
