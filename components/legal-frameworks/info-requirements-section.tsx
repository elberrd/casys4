"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  RESPONSIBLE_PARTY_OPTIONS,
  type EntityType,
} from "@/lib/field-registry";

interface InfoRequirementsSectionProps {
  legalFrameworkId: Id<"legalFrameworks">;
}

export function InfoRequirementsSection({
  legalFrameworkId,
}: InfoRequirementsSectionProps) {
  const t = useTranslations("LegalFrameworks");
  const tCommon = useTranslations("Common");

  const requirements =
    useQuery(api.legalFrameworkInfoRequirements.listAllByLegalFramework, {
      legalFrameworkId,
    }) ?? [];
  const createRequirement = useMutation(
    api.legalFrameworkInfoRequirements.create
  );
  const updateRequirement = useMutation(
    api.legalFrameworkInfoRequirements.update
  );
  const removeRequirement = useMutation(
    api.legalFrameworkInfoRequirements.remove
  );

  const [isAdding, setIsAdding] = useState(false);
  const [newEntityType, setNewEntityType] = useState<EntityType>("person");
  const [newFieldPath, setNewFieldPath] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newResponsibleParty, setNewResponsibleParty] = useState("client");
  const [newIsRequired, setNewIsRequired] = useState(true);

  const availableFields = FIELD_REGISTRY[newEntityType] ?? [];

  const unmappedFields = availableFields.filter(
    (f) =>
      !requirements.some(
        (r) => r.entityType === newEntityType && r.fieldPath === f.fieldPath
      )
  );

  const handleFieldSelect = (fieldPath: string) => {
    setNewFieldPath(fieldPath);
    const field = availableFields.find((f) => f.fieldPath === fieldPath);
    if (field) {
      setNewLabel(field.label);
    }
  };

  const handleAdd = async () => {
    if (!newFieldPath || !newLabel) return;

    const field = availableFields.find((f) => f.fieldPath === newFieldPath);

    try {
      await createRequirement({
        legalFrameworkId,
        entityType: newEntityType,
        fieldPath: newFieldPath,
        label: newLabel,
        labelEn: field?.labelEn,
        fieldType: field?.fieldType,
        responsibleParty: newResponsibleParty,
        isRequired: newIsRequired,
        sortOrder: requirements.length,
      });
      toast.success("Requisito adicionado");
      setNewFieldPath("");
      setNewLabel("");
      setNewIsRequired(true);
      setIsAdding(false);
    } catch (error) {
      toast.error("Erro ao adicionar requisito");
    }
  };

  const handleRemove = async (id: Id<"legalFrameworkInfoRequirements">) => {
    try {
      await removeRequirement({ id });
      toast.success("Requisito removido");
    } catch (error) {
      toast.error("Erro ao remover requisito");
    }
  };

  const handleToggleRequired = async (
    id: Id<"legalFrameworkInfoRequirements">,
    isRequired: boolean
  ) => {
    await updateRequirement({ id, isRequired });
  };

  const handleToggleActive = async (
    id: Id<"legalFrameworkInfoRequirements">,
    isActive: boolean
  ) => {
    await updateRequirement({ id, isActive });
  };

  const responsiblePartyBadgeColor = (party: string) => {
    switch (party) {
      case "client":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "company":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {t("infoRequirements") || "Requisitos de informacao"}
            </CardTitle>
            <CardDescription>
              {t("infoRequirementsDescription") ||
                "Campos de informacao que devem ser preenchidos para este amparo legal"}
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
              {tCommon("create") || "Adicionar"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add new requirement form */}
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
                        Todos os campos ja foram adicionados
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Label</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label do campo"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Responsavel</Label>
                <Select
                  value={newResponsibleParty}
                  onValueChange={setNewResponsibleParty}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSIBLE_PARTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
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

        {/* Existing requirements list */}
        {requirements.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum requisito de informacao configurado.
          </p>
        )}

        {requirements.map((req) => (
          <div
            key={req._id}
            className="flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{req.label}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {ENTITY_TYPE_LABELS[req.entityType as EntityType]?.label ??
                    req.entityType}
                </Badge>
                <Badge
                  className={`text-xs shrink-0 ${responsiblePartyBadgeColor(req.responsibleParty)}`}
                  variant="secondary"
                >
                  {RESPONSIBLE_PARTY_OPTIONS.find(
                    (o) => o.value === req.responsibleParty
                  )?.label ?? req.responsibleParty}
                </Badge>
                {!req.isActive && (
                  <Badge variant="destructive" className="text-xs">
                    Inativo
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={req.isRequired}
                  onCheckedChange={(checked) =>
                    handleToggleRequired(req._id, checked)
                  }
                />
                <span className="text-xs text-muted-foreground">Obrig.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={req.isActive}
                  onCheckedChange={(checked) =>
                    handleToggleActive(req._id, checked)
                  }
                />
                <span className="text-xs text-muted-foreground">Ativo</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleRemove(req._id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
