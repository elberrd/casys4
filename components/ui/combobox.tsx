"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, Plus, Loader2 } from "lucide-react";

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
  /**
   * Callback to create a new item when it doesn't exist
   * Receives the search query and should return the created item's ID
   */
  onCreateNew?: (searchQuery: string) => Promise<T>;
  /**
   * Text to display on the create new item button
   * @default "Create new..."
   */
  createNewText?: string;
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
  onCreateNew,
  createNewText = "Create new...",
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState<T | undefined>(
    defaultValue,
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

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

  const handleCreateNew = async () => {
    if (!onCreateNew || !searchQuery.trim()) return;

    setIsCreating(true);
    try {
      const newId = await onCreateNew(searchQuery.trim());

      if (value === undefined) {
        setInternalValue(newId);
      }

      onValueChange?.(newId);
      setSearchQuery("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to create new item:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Clear search query when closing
    if (!newOpen) {
      setSearchQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {onCreateNew && searchQuery.trim() ? (
                <div className="flex flex-col items-center gap-2 p-4">
                  <p className="text-sm text-muted-foreground">{emptyText}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCreateNew}
                    disabled={isCreating}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating ? "Creating..." : `${createNewText} "${searchQuery}"`}
                  </Button>
                </div>
              ) : (
                emptyText
              )}
            </CommandEmpty>

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
  onCreateNew,
  createNewText = "Create new...",
}: ComboboxMultipleProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState<T[]>(
    defaultValue || [],
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [showCreateButton, setShowCreateButton] = React.useState(false);

  // Monitor the cmdk input for real-time search updates
  React.useEffect(() => {
    if (!open) {
      setShowCreateButton(false);
      return;
    }

    const interval = setInterval(() => {
      const cmdkInput = document.querySelector('[cmdk-input]') as HTMLInputElement;
      if (cmdkInput) {
        const currentValue = cmdkInput.value;
        console.log('[Combobox Debug] Input value:', currentValue, 'onCreateNew:', !!onCreateNew, 'showCreateButton:', showCreateButton);
        if (currentValue !== searchQuery) {
          console.log('[Combobox Debug] Updating searchQuery from', searchQuery, 'to', currentValue);
          setSearchQuery(currentValue);
        }
        // Show create button if there's text in the input and onCreateNew is available
        const shouldShow = !!currentValue.trim() && !!onCreateNew;
        if (shouldShow !== showCreateButton) {
          console.log('[Combobox Debug] Updating showCreateButton to', shouldShow);
          setShowCreateButton(shouldShow);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [open, searchQuery, onCreateNew, showCreateButton]);

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

  const handleCreateNew = async () => {
    // Get the current search value from the input element
    const commandInput = document.querySelector('[cmdk-input]') as HTMLInputElement;
    const currentSearchValue = commandInput?.value || searchQuery;

    if (!onCreateNew || !currentSearchValue.trim()) return;

    setIsCreating(true);
    try {
      const newId = await onCreateNew(currentSearchValue.trim());
      const newValues = [...selectedValues, newId];

      if (value === undefined) {
        setInternalValue(newValues);
      }

      onValueChange?.(newValues);
      setSearchQuery("");
      setOpen(false);
    } catch (error) {
      console.error("Failed to create new item:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Clear search query when closing
    if (!newOpen) {
      setSearchQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
          <div className={cn(
            "flex flex-wrap gap-1 flex-1",
            selectedValues.length > 3 && "max-h-[72px] overflow-y-auto"
          )}>
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
            // Always show the "create new" item
            if (value === '__create_new_item__') return 1;

            // Custom filter: accent-insensitive and case-insensitive substring match on label
            const option = options.find((opt) => String(opt.value) === value);
            if (!option) return 0;

            const searchNormalized = normalizeString(search);
            const labelNormalized = normalizeString(option.label);

            // Return 1 if label contains search string, 0 otherwise
            return labelNormalized.includes(searchNormalized) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            onValueChange={(value) => {
              console.log('[Multi-Select CommandInput] onValueChange called with:', value);
              setSearchQuery(value);
              setShowCreateButton(!!value.trim() && !!onCreateNew);
            }}
          />
          <CommandList>
            <CommandEmpty>
              {emptyText}
            </CommandEmpty>

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
                    <div className="mr-2 h-4 w-4 flex items-center justify-center">
                      {selectedValues.includes(option.value) && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
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
                      <div className="mr-2 h-4 w-4 flex items-center justify-center">
                        {selectedValues.includes(option.value) && (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                      {option.icon && (
                        <span className="mr-2">{option.icon}</span>
                      )}
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ),
            )}

            {/* Create new option - always shown when onCreateNew is provided */}
            {onCreateNew && (
              <CommandGroup>
                <CommandItem
                  value="__create_new_item__"
                  onSelect={() => {
                    const cmdkInput = document.querySelector('[cmdk-input]') as HTMLInputElement;
                    const currentSearch = cmdkInput?.value || '';

                    if (!onCreateNew) return;

                    setIsCreating(true);
                    // Pass empty string if no search query, let the handler deal with it
                    onCreateNew(currentSearch.trim())
                      .then((newId) => {
                        const newValues = [...selectedValues, newId];
                        if (value === undefined) {
                          setInternalValue(newValues);
                        }
                        onValueChange?.(newValues);
                        setSearchQuery("");
                        setOpen(false);
                      })
                      .catch((error) => {
                        console.error("Failed to create new item:", error);
                      })
                      .finally(() => {
                        setIsCreating(false);
                      });
                  }}
                  disabled={isCreating}
                  className="cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      {createNewText}
                    </>
                  )}
                </CommandItem>
              </CommandGroup>
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
