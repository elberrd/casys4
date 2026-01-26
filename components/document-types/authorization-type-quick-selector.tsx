"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListChecks, AlertCircle } from "lucide-react";

interface AuthorizationTypeQuickSelectorProps {
  onApplySelection: (legalFrameworkIds: string[]) => void;
}

/**
 * Component that allows selecting an authorization type and automatically
 * selecting all associated legal frameworks in the document type form.
 */
export function AuthorizationTypeQuickSelector({
  onApplySelection,
}: AuthorizationTypeQuickSelectorProps) {
  const t = useTranslations("DocumentTypes");
  const [selectedProcessTypeId, setSelectedProcessTypeId] = useState<string>("");

  // Fetch active authorization types
  const processTypes = useQuery(api.processTypes.listActive);

  // Fetch legal framework IDs for selected authorization type
  const legalFrameworkIds = useQuery(
    api.processTypes.getLegalFrameworkIds,
    selectedProcessTypeId
      ? { processTypeId: selectedProcessTypeId as Id<"processTypes"> }
      : "skip"
  );

  // Loading state
  if (!processTypes) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    );
  }

  // No authorization types available
  if (processTypes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{t("noAuthorizationTypes")}</span>
        </div>
      </div>
    );
  }

  const handleApply = () => {
    if (!selectedProcessTypeId) return;

    if (!legalFrameworkIds || legalFrameworkIds.length === 0) {
      toast.error(t("noLegalFrameworksForAuthorizationType"));
      return;
    }

    const selectedProcessType = processTypes?.find(
      (pt) => pt._id === selectedProcessTypeId
    );
    const authorizationTypeName = selectedProcessType?.name ?? "";

    onApplySelection(legalFrameworkIds as string[]);

    toast.success(
      t("authorizationTypeApplied", {
        count: legalFrameworkIds.length,
        authorizationType: authorizationTypeName,
      })
    );

    // Reset selection after applying
    setSelectedProcessTypeId("");
  };

  const isLoading = Boolean(selectedProcessTypeId && legalFrameworkIds === undefined);
  const canApply = Boolean(selectedProcessTypeId && legalFrameworkIds && legalFrameworkIds.length > 0);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <Label className="text-sm font-medium text-muted-foreground">
        {t("selectByAuthorizationType")}
      </Label>
      <p className="text-xs text-muted-foreground">
        {t("selectByAuthorizationTypeDescription")}
      </p>
      <div className="flex gap-2">
        <Select
          value={selectedProcessTypeId}
          onValueChange={setSelectedProcessTypeId}
        >
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder={t("selectAuthorizationType")} />
          </SelectTrigger>
          <SelectContent>
            {processTypes.map((pt) => (
              <SelectItem key={pt._id} value={pt._id}>
                {pt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="secondary"
          onClick={handleApply}
          disabled={!canApply || isLoading}
        >
          <ListChecks className="mr-2 h-4 w-4" />
          {t("applySelection")}
        </Button>
      </div>
    </div>
  );
}
