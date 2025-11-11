"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { ComboboxOption } from "@/components/ui/combobox";

/**
 * Extended combobox props that support inline creation
 */
export interface ComboboxWithCreateProps<T extends string = string> {
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
   * Whether to show the "Create New" option
   */
  canCreate?: boolean;
  /**
   * Label for the "Create New" button (shown at top of list)
   */
  createButtonLabel?: string;
  /**
   * Callback when "Create New" is clicked
   * @param searchText - The text that was typed in the search box (if smart create is enabled)
   */
  onCreateClick?: (searchText?: string) => void;
  /**
   * Render prop for the creation dialog
   * This allows the parent to control the dialog state and handle creation
   */
  createDialog?: React.ReactNode;
  /**
   * Enable smart create: show "Create {typed text}" when search has no results
   */
  smartCreate?: boolean;
  /**
   * Label pattern for smart create. Use {text} as placeholder.
   * Example: "Create '{text}'"
   */
  smartCreateLabel?: string;
}

/**
 * Enhanced Combobox component that supports inline creation of new items.
 *
 * Features:
 * - Standard "Create New" option at the top of the list
 * - Smart create: Shows "Create 'typed text'" when no results found
 * - Pre-fills the creation dialog with the typed text
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * const [newCountryName, setNewCountryName] = useState("");
 *
 * <ComboboxWithCreate
 *   options={countryOptions}
 *   value={selectedCountry}
 *   onValueChange={setSelectedCountry}
 *   placeholder="Select country"
 *   canCreate={true}
 *   smartCreate={true}
 *   createButtonLabel="Create new country"
 *   smartCreateLabel="Create '{text}'"
 *   onCreateClick={(searchText) => {
 *     setNewCountryName(searchText || "");
 *     setOpen(true);
 *   }}
 * />
 *
 * <CountryQuickCreateDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   defaultName={newCountryName}
 *   onSuccess={(countryId) => {
 *     setSelectedCountry(countryId);
 *     setOpen(false);
 *   }}
 * />
 * ```
 */
export function ComboboxWithCreate<T extends string = string>({
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
  canCreate = false,
  createButtonLabel = "Create new...",
  smartCreateLabel = "Create '{text}'",
  onCreateClick,
  createDialog,
  smartCreate = false,
}: ComboboxWithCreateProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [internalValue, setInternalValue] = React.useState<T | undefined>(
    defaultValue,
  );

  // Use controlled value if provided, otherwise use internal state
  const selectedValue = value !== undefined ? value : internalValue;

  // Get the selected option
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  // Check if search text exactly matches any option (for smart create)
  const searchMatchesExactly = React.useMemo(() => {
    if (!searchValue.trim()) return false;
    const searchNormalized = normalizeString(searchValue.trim());
    return options.some((option) => {
      const labelNormalized = normalizeString(option.label);
      return labelNormalized === searchNormalized;
    });
  }, [options, searchValue]);

  // Compute the create button label based on current search
  const createLabel = React.useMemo(() => {
    if (smartCreate && searchValue.trim() && !searchMatchesExactly) {
      return smartCreateLabel.replace("{text}", searchValue.trim());
    }
    return createButtonLabel;
  }, [smartCreate, searchValue, searchMatchesExactly, smartCreateLabel, createButtonLabel]);

  const handleSelect = (optionValue: string) => {
    // Handle create new click
    if (optionValue === "__create_new__") {
      onCreateClick?.(smartCreate ? searchValue : undefined);
      return;
    }

    const newValue =
      optionValue === selectedValue ? undefined : (optionValue as T);

    if (value === undefined) {
      setInternalValue(newValue);
    }

    onValueChange?.(newValue);
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchValue("");
    }
  };

  // If creation is not enabled, don't render this special component
  if (!canCreate) {
    // Fallback to a basic implementation (you could import and use the regular Combobox here)
    return null;
  }

  return (
    <>
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
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
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
              // Always show the create option
              if (value === "__create_new__") return 1;

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
              onValueChange={setSearchValue}
            />
            <CommandList>
              {/* Always show "Create New" option at the top if enabled */}
              {canCreate && (
                <CommandGroup>
                  <CommandItem
                    value="__create_new__"
                    onSelect={handleSelect}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {createLabel}
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Show regular options */}
              <CommandGroup>
                {options.map((option) => (
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

              {/* Show empty state when smart create is disabled */}
              {!smartCreate && <CommandEmpty>{emptyText}</CommandEmpty>}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {createDialog}
    </>
  );
}
