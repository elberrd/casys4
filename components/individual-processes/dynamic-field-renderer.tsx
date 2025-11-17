"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import type { FieldMetadata } from "@/lib/individual-process-fields";

interface DynamicFieldRendererProps {
  /** Field metadata to render */
  fieldsMetadata: FieldMetadata[];
  /** Current form data values */
  formData: Record<string, any>;
  /** Handler for field value changes */
  onFieldChange: (fieldName: string, value: any) => void;
  /** Loading state - shows skeleton loaders */
  isLoading?: boolean;
}

export function DynamicFieldRenderer({
  fieldsMetadata,
  formData,
  onFieldChange,
  isLoading = false,
}: DynamicFieldRendererProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");

  // Query options for reference fields
  const passports = useQuery(api.passports.list, {});
  const people = useQuery(api.people.list, {});
  const processTypes = useQuery(api.processTypes.list, {});
  const legalFrameworks = useQuery(api.legalFrameworks.list, {});
  const cbos = useQuery(api.cboCodes.list, {});

  const renderFieldInput = (field: FieldMetadata) => {
    const { fieldName, fieldType, referenceTable } = field;
    const label = t(`fields.${fieldName}` as any);

    // Render based on field type
    switch (fieldType) {
      case "string":
        return (
          <div key={fieldName} className="grid gap-2">
            <Label htmlFor={fieldName}>{label}</Label>
            <Input
              id={fieldName}
              value={formData[fieldName] || ""}
              onChange={(e) => onFieldChange(fieldName, e.target.value)}
            />
          </div>
        );

      case "date":
      case "datetime":
        return (
          <div key={fieldName} className="grid gap-2">
            <Label htmlFor={fieldName}>{label}</Label>
            <Input
              id={fieldName}
              type={fieldType === "date" ? "date" : "datetime-local"}
              value={formData[fieldName] || ""}
              onChange={(e) => onFieldChange(fieldName, e.target.value)}
            />
          </div>
        );

      case "reference":
        let options: any[] = [];
        let queryData: any = null;

        // Get the appropriate data based on reference table
        switch (referenceTable) {
          case "passports":
            queryData = passports;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: p.passportNumber || p._id,
            })) || [];
            break;
          case "people":
            queryData = people;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: p.fullName,
            })) || [];
            break;
          case "processTypes":
            queryData = processTypes;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: p.name,
            })) || [];
            break;
          case "legalFrameworks":
            queryData = legalFrameworks;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: p.name,
            })) || [];
            break;
          case "cboCodes":
            queryData = cbos;
            options = queryData?.map((p: any) => ({
              value: p._id,
              label: `${p.code} - ${p.title}`,
            })) || [];
            break;
        }

        return (
          <div key={fieldName} className="grid gap-2">
            <Label htmlFor={fieldName}>{label}</Label>
            <Combobox
              options={options}
              value={formData[fieldName]}
              onValueChange={(value) => onFieldChange(fieldName, value)}
              placeholder={tCommon("select")}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Show skeleton loaders during loading
  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="grid gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Render nothing if no fields
  if (fieldsMetadata.length === 0) {
    return null;
  }

  // Render all fields
  return (
    <div className="grid gap-4">
      {fieldsMetadata.map((field) => renderFieldInput(field))}
    </div>
  );
}
