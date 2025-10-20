"use client";

import * as React from "react";
import { Combobox, ComboboxOption } from "./combobox";

/**
 * MultiSelect component props
 */
export interface MultiSelectProps<T = string> {
  options: ComboboxOption<T>[];
  defaultValue?: T[];
  onValueChange?: (value: T[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelected?: number;
}

/**
 * MultiSelect component - a wrapper around Combobox with multiple selection enabled
 *
 * @example
 * <MultiSelect
 *   options={[
 *     { value: "pdf", label: "PDF" },
 *     { value: "jpg", label: "JPG" },
 *   ]}
 *   defaultValue={["pdf"]}
 *   onValueChange={(values) => console.log(values)}
 *   placeholder="Select file formats"
 * />
 */
export function MultiSelect<T extends string = string>({
  options,
  defaultValue,
  onValueChange,
  placeholder = "Select items...",
  disabled = false,
  className,
  maxSelected,
}: MultiSelectProps<T>) {
  return (
    <Combobox
      multiple
      options={options}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      triggerClassName={className}
      maxSelected={maxSelected}
    />
  );
}
