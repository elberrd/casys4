"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  FIELD_REGISTRY,
  ENTITY_TYPE_LABELS,
  type EntityType,
} from "@/lib/field-registry";

export interface LocalFieldMapping {
  entityType: string;
  fieldPath: string;
  label: string;
  labelEn?: string;
  fieldType?: string;
  isRequired: boolean;
  sortOrder: number;
}

interface LocalFieldMappingsSectionProps {
  mappings: LocalFieldMapping[];
  onChange: (mappings: LocalFieldMapping[]) => void;
}

export function LocalFieldMappingsSection({
  mappings,
  onChange,
}: LocalFieldMappingsSectionProps) {
  const t = useTranslations("DocumentTypes");
  const tCommon = useTranslations("Common");

  const [isAdding, setIsAdding] = useState(false);
  const [newEntityType, setNewEntityType] = useState<EntityType>("person");
  const [newFieldPath, setNewFieldPath] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newIsRequired, setNewIsRequired] = useState(true);

  const availableFields = FIELD_REGISTRY[newEntityType] ?? [];

  // Filter out fields already mapped
  const unmappedFields = availableFields.filter(
    (f) =>
      !mappings.some(
        (m) => m.entityType === newEntityType && m.fieldPath === f.fieldPath
      )
  );

  const handleFieldSelect = (fieldPath: string) => {
    setNewFieldPath(fieldPath);
    const field = availableFields.find((f) => f.fieldPath === fieldPath);
    if (field) {
      setNewLabel(field.label);
    }
  };

  const handleAdd = () => {
    if (!newFieldPath || !newLabel) return;

    const field = availableFields.find((f) => f.fieldPath === newFieldPath);

    const newMapping: LocalFieldMapping = {
      entityType: newEntityType,
      fieldPath: newFieldPath,
      label: newLabel,
      labelEn: field?.labelEn,
      fieldType: field?.fieldType,
      isRequired: newIsRequired,
      sortOrder: mappings.length,
    };

    onChange([...mappings, newMapping]);
    setNewFieldPath("");
    setNewLabel("");
    setNewIsRequired(true);
    setIsAdding(false);
  };

  const handleRemove = (index: number) => {
    const updated = mappings.filter((_, i) => i !== index);
    // Re-index sortOrder
    onChange(updated.map((m, i) => ({ ...m, sortOrder: i })));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {t("fieldMappings")}
            </CardTitle>
            <CardDescription>
              {t("fieldMappingsDescription")}
            </CardDescription>
          </div>
          {!isAdding && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {tCommon("create")}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add new mapping form */}
        {isAdding && (
          <div className="space-y-3 rounded-lg border p-3 bg-muted/50">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Entidade</Label>
                <Select
                  value={newEntityType}
                  onValueChange={(v) => {
                    setNewEntityType(v as EntityType);
                    setNewFieldPath("");
                    setNewLabel("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITY_TYPE_LABELS).map(
                      ([key, labels]) => (
                        <SelectItem key={key} value={key}>
                          {labels.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Campo</Label>
                <Select
                  value={newFieldPath}
                  onValueChange={handleFieldSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar campo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unmappedFields.map((field) => (
                      <SelectItem
                        key={field.fieldPath}
                        value={field.fieldPath}
                      >
                        {field.label}
                      </SelectItem>
                    ))}
                    {unmappedFields.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Todos os campos ja foram vinculados
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Label</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label do campo"
                />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newIsRequired}
                    onCheckedChange={setNewIsRequired}
                  />
                  <Label className="text-xs">Obrigatorio</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewFieldPath("");
                  setNewLabel("");
                }}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAdd}
                disabled={!newFieldPath || !newLabel}
              >
                {tCommon("save")}
              </Button>
            </div>
          </div>
        )}

        {/* Existing mappings list */}
        {mappings.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum campo vinculado. Adicione pelo menos um campo.
          </p>
        )}

        {mappings.map((mapping, index) => (
          <div
            key={`${mapping.entityType}-${mapping.fieldPath}`}
            className="flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {mapping.label}
                </span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {ENTITY_TYPE_LABELS[mapping.entityType as EntityType]
                    ?.label ?? mapping.entityType}
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-xs shrink-0 font-mono"
                >
                  {mapping.fieldPath}
                </Badge>
                {mapping.isRequired && (
                  <Badge variant="default" className="text-xs shrink-0">
                    Obrig.
                  </Badge>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleRemove(index)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
