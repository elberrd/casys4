"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MultiSelect } from "@/components/ui/multi-select";
import { FILLABLE_FIELDS, type FieldMetadata } from "@/lib/individual-process-fields";
import { ComboboxOption } from "@/components/ui/combobox";

export interface FillableFieldsSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * FillableFieldsSelector component
 *
 * Allows admins to select which fields from individualProcesses
 * can be filled from a specific status. Uses i18n for field labels.
 *
 * @example
 * <FillableFieldsSelector
 *   value={["protocolNumber", "rnmNumber"]}
 *   onChange={(fields) => console.log(fields)}
 * />
 */
export function FillableFieldsSelector({
  value = [],
  onChange,
  disabled = false,
  className,
}: FillableFieldsSelectorProps) {
  const t = useTranslations("IndividualProcesses");

  // Transform field metadata into combobox options with i18n labels
  const options: ComboboxOption<string>[] = React.useMemo(() => {
    return FILLABLE_FIELDS.map((field: FieldMetadata) => ({
      value: field.fieldName,
      label: t(`fields.${field.fieldName}` as any),
    }));
  }, [t]);

  return (
    <MultiSelect
      options={options}
      defaultValue={value}
      onValueChange={onChange}
      placeholder={t("selectFieldsToFill")}
      disabled={disabled}
      className={className}
    />
  );
}
