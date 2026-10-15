/**
 * Next value after a Combobox option is chosen.
 *
 * cmdk can fire `onSelect` for the already-selected item when the list
 * remounts or the filter function identity changes. Toggling that into
 * `undefined` ping-pongs with parents that default empty country back to BR
 * (React #185). Clearing is the explicit X button, not re-select.
 */
export function nextComboboxSelection<T extends string>(
  optionValue: string,
): T {
  return optionValue as T;
}

/** Pre-fix behavior: re-selecting the current value cleared it. */
export function toggleOffComboboxSelection<T extends string>(
  optionValue: string,
  selectedValue: T | undefined,
): T | undefined {
  return optionValue === selectedValue ? undefined : (optionValue as T);
}

/**
 * Keep a Combobox controlled when the form stores "" for “no selection”.
 * Passing `undefined` makes it uncontrolled, so the X button leaves the
 * previous `internalValue` visible after the parent clears the field.
 */
export function toControlledComboboxValue<T extends string>(
  value: T | "" | undefined,
): T | "" {
  return value ?? "";
}

/**
 * Displayed Combobox value after the parent stores "" and the X is clicked.
 * Controlled empty string must win over a stale internal selection.
 */
export function resolveComboboxSelectedValue<T extends string>(
  value: T | "" | undefined,
  internalValue: T | undefined,
): T | "" | undefined {
  if (value !== undefined) {
    return value === "" ? undefined : value;
  }
  return internalValue;
}

/** Always drop the uncontrolled cache when the user clicks X. */
export function nextComboboxInternalValueAfterClear(): undefined {
  return undefined;
}
