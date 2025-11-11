"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Combobox, ComboboxProps, ComboboxOption } from "@/components/ui/combobox";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";

/**
 * Extended combobox props that support inline creation
 */
export interface ComboboxWithCreateProps<T extends string = string>
  extends ComboboxProps<T> {
  /**
   * Whether to show the "Create New" option
   */
  canCreate?: boolean;
  /**
   * Label for the "Create New" button
   */
  createButtonLabel?: string;
  /**
   * Callback when "Create New" is clicked
   */
  onCreateClick?: () => void;
  /**
   * Render prop for the creation dialog
   * This allows the parent to control the dialog state and handle creation
   */
  createDialog?: React.ReactNode;
}

/**
 * Enhanced Combobox component that supports inline creation of new items.
 *
 * This component wraps the base Combobox and adds a "Create New" option at the top
 * of the dropdown. When clicked, it triggers the creation flow via onCreateClick
 * or displays the createDialog.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * const [companies, setCompanies] = useState([...]);
 * const [selectedCompany, setSelectedCompany] = useState<Id<"companies">>();
 *
 * <ComboboxWithCreate
 *   options={companyOptions}
 *   value={selectedCompany}
 *   onValueChange={setSelectedCompany}
 *   placeholder="Select company"
 *   canCreate={true}
 *   createButtonLabel="Create new company"
 *   onCreateClick={() => setOpen(true)}
 * />
 *
 * <CompanyQuickCreateDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   onSuccess={(companyId) => {
 *     setSelectedCompany(companyId);
 *     setOpen(false);
 *   }}
 * />
 * ```
 */
export function ComboboxWithCreate<T extends string = string>({
  canCreate = false,
  createButtonLabel = "Create new...",
  onCreateClick,
  createDialog,
  options,
  ...comboboxProps
}: ComboboxWithCreateProps<T>) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  // If creation is not enabled, just render the regular Combobox
  if (!canCreate) {
    return <Combobox {...comboboxProps} options={options} />;
  }

  // Create a synthetic "create new" option to render at the top
  const createOption: ComboboxOption<T> = {
    value: "__create_new__" as T,
    label: createButtonLabel,
    icon: <Plus className="h-4 w-4" />,
  };

  // Combine create option with regular options
  // We'll handle the create option specially in the render
  const enhancedOptions = [createOption, ...options];

  // Handle selection - intercept the create option
  const handleValueChange = (value: T | undefined) => {
    if (value === "__create_new__") {
      onCreateClick?.();
      return;
    }
    comboboxProps.onValueChange?.(value);
  };

  return (
    <>
      <Combobox
        {...comboboxProps}
        options={enhancedOptions}
        onValueChange={handleValueChange}
      />
      {createDialog}
    </>
  );
}
