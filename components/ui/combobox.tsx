"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn, normalizeString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Option type for combobox items
 */
export interface ComboboxOption<T = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

/**
 * Combobox component props
 */
export interface ComboboxProps<T = string> {
  options: ComboboxOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  /**
   * Enable multiple selection mode
   */
  multiple?: false;
  /**
   * Whether to show the clear button when a value is selected
   * @default true
   */
  showClearButton?: boolean;
  /**
   * ARIA label for the clear button
   * @default "Clear selection"
   */
  clearButtonAriaLabel?: string;
}

/**
 * Multiple combobox component props
 */
export interface ComboboxMultipleProps<T = string>
  extends Omit<ComboboxProps<T>, "value" | "onValueChange" | "multiple" | "defaultValue" | "clearButtonAriaLabel"> {
  value?: T[];
  defaultValue?: T[];
  onValueChange?: (value: T[]) => void;
  multiple: true;
  maxSelected?: number;
  /**
   * ARIA label for the clear all button
   * @default "Clear all selections"
   */
  clearButtonAriaLabel?: string;
}

/**
 * Single selection combobox component with built-in search/filter functionality.
 *
 * Filtering uses case-insensitive substring matching on option labels.
 * Users can type any part of the visible label to filter results.
 *
 * Example: For a CBO code option with label "3912-05 - Inspetor de qualidade",
 * users can search by typing "3912", "inspetor", "qualidade", etc.
 *
 * Note: Uses custom filter function for exact substring matching instead of
 * cmdk's default fuzzy matching to prevent false positives.
 */
function ComboboxSingle<T extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  showClearButton = true,
  clearButtonAriaLabel = "Clear selection",
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState<T | undefined>(
    defaultValue,
  );

  // Use controlled value if provided, otherwise use internal state
  const selectedValue = value !== undefined ? value : internalValue;

  // Get the selected option
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  // Group options by group property
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, ComboboxOption<T>[]> = {};
    const ungrouped: ComboboxOption<T>[] = [];

    options.forEach((option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    return { groups, ungrouped };
  }, [options]);

  const handleSelect = (optionValue: string) => {
    const newValue =
      optionValue === selectedValue ? undefined : (optionValue as T);

    if (value === undefined) {
      setInternalValue(newValue);
    }

    onValueChange?.(newValue);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening popover

    if (value === undefined) {
      setInternalValue(undefined);
    }

    onValueChange?.(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedValue && "text-muted-foreground",
            triggerClassName,
          )}
        >
          {selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              {selectedOption.icon}
              <span className="truncate">{selectedOption.label}</span>
            </span>
          ) : (
            placeholder
          )}
          {showClearButton && selectedValue && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as any);
                }
              }}
              className="ml-auto mr-2 p-1 h-auto shrink-0 opacity-50 hover:opacity-100 transition-opacity rounded-sm hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer"
              aria-label={clearButtonAriaLabel}
            >
              <X className="h-4 w-4" />
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("p-0", contentClassName)}
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command
          filter={(value, search) => {
            // Custom filter: accent-insensitive and case-insensitive substring match on label
            const option = options.find((opt) => String(opt.value) === value);
            if (!option) return 0;

            const searchNormalized = normalizeString(search);
            const labelNormalized = normalizeString(option.label);

            // Return 1 if label contains search string, 0 otherwise
            return labelNormalized.includes(searchNormalized) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            {/* Ungrouped options */}
            {groupedOptions.ungrouped.length > 0 && (
              <CommandGroup>
                {groupedOptions.ungrouped.map((option) => (
                  <CommandItem
                    key={String(option.value)}
                    value={String(option.value)}
                    disabled={option.disabled}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValue === option.value
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {option.icon && <span className="mr-2">{option.icon}</span>}
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Grouped options */}
            {Object.entries(groupedOptions.groups).map(
              ([groupName, groupOptions]) => (
                <CommandGroup key={groupName} heading={groupName}>
                  {groupOptions.map((option) => (
                    <CommandItem
                      key={String(option.value)}
                      value={String(option.value)}
                      disabled={option.disabled}
                      onSelect={handleSelect}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedValue === option.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {option.icon && (
                        <span className="mr-2">{option.icon}</span>
                      )}
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ),
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Multiple selection combobox component with built-in search/filter functionality.
 *
 * Filtering uses case-insensitive substring matching on option labels.
 * Users can type any part of the visible label to filter results.
 *
 * Example: For a CBO code option with label "3912-05 - Inspetor de qualidade",
 * users can search by typing "3912", "inspetor", "qualidade", etc.
 *
 * Note: Uses custom filter function for exact substring matching instead of
 * cmdk's default fuzzy matching to prevent false positives.
 */
function ComboboxMultiple<T extends string = string>({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  maxSelected,
  showClearButton = true,
  clearButtonAriaLabel = "Clear all selections",
}: ComboboxMultipleProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState<T[]>(
    defaultValue || [],
  );

  // Use controlled value if provided, otherwise use internal state
  const selectedValues = value !== undefined ? value : internalValue;

  // Get the selected options
  const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.value),
  );

  // Group options by group property
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, ComboboxOption<T>[]> = {};
    const ungrouped: ComboboxOption<T>[] = [];

    options.forEach((option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
      } else {
        ungrouped.push(option);
      }
    });

    return { groups, ungrouped };
  }, [options]);

  const handleSelect = (optionValue: string) => {
    const newValues = selectedValues.includes(optionValue as T)
      ? selectedValues.filter((v) => v !== optionValue)
      : maxSelected && selectedValues.length >= maxSelected
        ? selectedValues
        : [...selectedValues, optionValue as T];

    if (value === undefined) {
      setInternalValue(newValues);
    }

    onValueChange?.(newValues);
  };

  const handleRemove = (optionValue: T) => {
    const newValues = selectedValues.filter((v) => v !== optionValue);

    if (value === undefined) {
      setInternalValue(newValues);
    }

    onValueChange?.(newValues);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening popover

    const newValues: T[] = [];

    if (value === undefined) {
      setInternalValue(newValues);
    }

    onValueChange?.(newValues);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-9 h-auto",
            selectedValues.length === 0 && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedValues.length === 0
              ? placeholder
              : selectedOptions.map((option) => (
                  <span
                    key={String(option.value)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs"
                  >
                    {option.icon && (
                      <span className="h-3 w-3">{option.icon}</span>
                    )}
                    {option.label}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(option.value);
                      }}
                      className="hover:bg-secondary-foreground/20 rounded-sm cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </span>
                ))}
          </div>
          {showClearButton && selectedValues.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClearAll(e as any);
                }
              }}
              className="ml-auto mr-2 p-1 h-auto shrink-0 opacity-50 hover:opacity-100 transition-opacity rounded-sm hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-pointer"
              aria-label={clearButtonAriaLabel}
            >
              <X className="h-4 w-4" />
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("p-0", contentClassName)}
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command
          filter={(value, search) => {
            // Custom filter: accent-insensitive and case-insensitive substring match on label
            const option = options.find((opt) => String(opt.value) === value);
            if (!option) return 0;

            const searchNormalized = normalizeString(search);
            const labelNormalized = normalizeString(option.label);

            // Return 1 if label contains search string, 0 otherwise
            return labelNormalized.includes(searchNormalized) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            {/* Ungrouped options */}
            {groupedOptions.ungrouped.length > 0 && (
              <CommandGroup>
                {groupedOptions.ungrouped.map((option) => (
                  <CommandItem
                    key={String(option.value)}
                    value={String(option.value)}
                    disabled={
                      option.disabled ||
                      (maxSelected !== undefined &&
                        selectedValues.length >= maxSelected &&
                        !selectedValues.includes(option.value))
                    }
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValues.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {option.icon && <span className="mr-2">{option.icon}</span>}
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Grouped options */}
            {Object.entries(groupedOptions.groups).map(
              ([groupName, groupOptions]) => (
                <CommandGroup key={groupName} heading={groupName}>
                  {groupOptions.map((option) => (
                    <CommandItem
                      key={String(option.value)}
                      value={String(option.value)}
                      disabled={
                        option.disabled ||
                        (maxSelected !== undefined &&
                          selectedValues.length >= maxSelected &&
                          !selectedValues.includes(option.value))
                      }
                      onSelect={handleSelect}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedValues.includes(option.value)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {option.icon && (
                        <span className="mr-2">{option.icon}</span>
                      )}
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ),
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Combobox component with built-in search/filter functionality.
 * Supports both single and multiple selection modes.
 *
 * @example
 * // Single selection
 * <Combobox
 *   options={[
 *     { value: "apple", label: "Apple" },
 *     { value: "banana", label: "Banana" },
 *   ]}
 *   value={value}
 *   onValueChange={setValue}
 *   placeholder="Select a fruit"
 * />
 *
 * @example
 * // Multiple selection
 * <Combobox
 *   multiple
 *   options={[
 *     { value: "apple", label: "Apple" },
 *     { value: "banana", label: "Banana" },
 *   ]}
 *   value={values}
 *   onValueChange={setValues}
 *   placeholder="Select fruits"
 * />
 *
 * @example
 * // With groups
 * <Combobox
 *   options={[
 *     { value: "apple", label: "Apple", group: "Fruits" },
 *     { value: "carrot", label: "Carrot", group: "Vegetables" },
 *   ]}
 *   value={value}
 *   onValueChange={setValue}
 * />
 *
 * @example
 * // With custom clear button configuration
 * <Combobox
 *   options={options}
 *   value={value}
 *   onValueChange={setValue}
 *   showClearButton={true}
 *   clearButtonAriaLabel="Reset selection"
 * />
 *
 * @example
 * // Disable clear button
 * <Combobox
 *   options={options}
 *   value={value}
 *   onValueChange={setValue}
 *   showClearButton={false}
 * />
 */
export function Combobox<T extends string = string>(
  props: ComboboxProps<T> | ComboboxMultipleProps<T>,
) {
  if (props.multiple) {
    return <ComboboxMultiple {...props} />;
  }
  return <ComboboxSingle {...props} />;
}

export { ComboboxSingle, ComboboxMultiple };
