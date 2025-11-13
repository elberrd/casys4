"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { useLocale } from "next-intl";
import { enUS, ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import {
  formatDateForDisplay,
  formatDateForStorage,
  getDatePlaceholder,
  parseDateFromInput,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  const [open, setOpen] = React.useState(false);
  const [month, setMonthState] = React.useState(new Date());

  const dateValue = value ? parseDateFromInput(value) : undefined;
  const dateLocale = locale === "pt" ? ptBR : enUS;
  const placeholderText = placeholder ?? getDatePlaceholder(locale);

  // Update month when value changes
  React.useEffect(() => {
    if (value) {
      const parsedDate = parseDateFromInput(value);
      if (parsedDate) {
        setMonthState(parsedDate);
      }
    }
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    const dateString = formatDateForStorage(date);
    onChange?.(dateString);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.(undefined);
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !dateValue && "text-muted-foreground",
              dateValue && !disabled && "pr-10"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? formatDateForDisplay(dateValue, locale) : placeholderText}
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
      {dateValue && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
          onClick={handleClear}
          tabIndex={-1}
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      )}
    </div>
  );
}
