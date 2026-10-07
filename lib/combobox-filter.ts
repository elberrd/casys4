import { normalizeString } from "@/lib/utils";

export interface ComboboxFilterOption {
  value: string;
  label: string;
}

/**
 * cmdk scores an option for the current search. Matching uses the visible
 * label so Convex IDs in `value` do not hide results when the user types a name.
 *
 * Returns 1 when the label contains the search (accent/case insensitive), else 0.
 */
export function filterComboboxOptionByLabel(
  optionValue: string,
  search: string,
  options: ReadonlyArray<ComboboxFilterOption>,
): number {
  const option = options.find((opt) => String(opt.value) === optionValue);
  if (!option) return 0;

  const searchNormalized = normalizeString(search);
  const labelNormalized = normalizeString(option.label);
  return labelNormalized.includes(searchNormalized) ? 1 : 0;
}
