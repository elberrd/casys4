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
