"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  FileText,
  Info,
  FileCheck,
  Paperclip,
  User,
  Shield,
  Building2,
  Plus,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RequirementsChecklistSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProcessId: Id<"individualProcesses">;
  userRole?: "admin" | "client";
}

/**
 * Hook to get checklist summary counts for the trigger button.
 * Returns { totalDocItems, addedDocItems, isLoading }.
 */
export function useChecklistSummary(individualProcessId: Id<"individualProcesses">) {
  const checklist = useQuery(
    api.lib.requirementsChecklist.getChecklist,
    { individualProcessId }
  );

  if (checklist === undefined) {
    return { totalDocItems: 0, addedDocItems: 0, isLoading: true };
  }

  if (!checklist || checklist.items.length === 0) {
    return { totalDocItems: 0, addedDocItems: 0, isLoading: false };
  }

  const docItems = checklist.items.filter(
    (item) => item.type === "document" || item.type === "document_with_info"
  );

  const totalDocItems = docItems.length;
  const addedDocItems = docItems.filter(
    (item) =>
      "document" in item &&
      item.document &&
      !!item.document.deliveredDocument
  ).length;

  return { totalDocItems, addedDocItems, isLoading: false };
}

/**
 * Trigger button for the checklist sheet.
 * Shows "Checklist (X/Y)" with color based on completeness.
 */
export function ChecklistTriggerButton({
  individualProcessId,
  onClick,
}: {
  individualProcessId: Id<"individualProcesses">;
  onClick: () => void;
}) {
  const { totalDocItems, addedDocItems, isLoading } =
    useChecklistSummary(individualProcessId);

  if (isLoading || totalDocItems === 0) {
    return null;
  }

  const allAdded = addedDocItems === totalDocItems;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className={cn(
        "gap-1.5 font-medium transition-colors",
        allAdded
          ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-950/50"
          : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
      )}
    >
      <ClipboardCheck className="h-4 w-4" />
      <span className="hidden sm:inline">Checklist</span>
      <span className="font-semibold">
        ({addedDocItems}/{totalDocItems})
      </span>
    </Button>
  );
}

export function RequirementsChecklistSheet({
  open,
  onOpenChange,
  individualProcessId,
  userRole = "client",
}: RequirementsChecklistSheetProps) {
  const t = useTranslations("IndividualProcesses");

  const checklist = useQuery(
    api.lib.requirementsChecklist.getChecklist,
    { individualProcessId }
  );

  const addMissing = useMutation(api.documentsDelivered.addMissingDocument);
  const syncAll = useMutation(api.documentsDelivered.syncMissingDocuments);

  const [addingId, setAddingId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Count missing documents
  const missingCount =
    checklist?.items.filter(
      (item) =>
        (item.type === "document" || item.type === "document_with_info") &&
        "document" in item &&
        item.document &&
        !item.document.deliveredDocument
    ).length ?? 0;

  const handleAddMissing = async (associationId: string) => {
    setAddingId(associationId);
    try {
      await addMissing({
        individualProcessId,
        documentTypeLegalFrameworkId:
          associationId as Id<"documentTypesLegalFrameworks">,
      });
      toast.success(t("addMissingSuccess"));
    } catch {
      toast.error(t("addMissingError"));
    } finally {
      setAddingId(null);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const result = await syncAll({ individualProcessId });
      toast.success(t("addAllMissingSuccess", { count: result.syncedCount }));
    } catch {
      toast.error(t("addMissingError"));
    } finally {
      setIsSyncingAll(false);
    }
  };

  /** Background color based on document state */
  const getItemBgClass = (item: NonNullable<typeof checklist>["items"][number]) => {
    if (item.type === "info") return "";
    if (!("document" in item) || !item.document) return "";

    if (!item.document.deliveredDocument) {
      return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30";
    }
    if (item.document.deliveredDocument.status === "not_started") {
      return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30";
    }
    return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30";
  };

  const StatusIcon = ({
    status,
  }: {
    status: "completed" | "partial" | "pending";
  }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
      case "partial":
        return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
      case "pending":
        return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  const TypeIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
      case "document_with_info":
        return <FileCheck className="h-4 w-4 text-indigo-500 shrink-0" />;
      case "info":
        return <Info className="h-4 w-4 text-orange-500 shrink-0" />;
      default:
        return null;
    }
  };

  const ResponsibleBadge = ({ party }: { party: string }) => {
    const icon =
      party === "client" ? (
        <User className="h-3 w-3" />
      ) : party === "admin" ? (
        <Shield className="h-3 w-3" />
      ) : (
        <Building2 className="h-3 w-3" />
      );
    const label =
      party === "client"
        ? "Cliente"
        : party === "admin"
          ? "Admin"
          : "Empresa";
    const colors =
      party === "client"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
        : party === "admin"
          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
          : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";

    return (
      <Badge variant="secondary" className={`text-xs gap-1 ${colors}`}>
        {icon}
        {label}
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 sm:px-6 border-b shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div className="space-y-1">
              <SheetTitle className="text-base">
                {t("requirementsChecklist") || "Checklist de Requisitos"}
              </SheetTitle>
              {checklist && (
                <SheetDescription>
                  {checklist.summary.completed} de {checklist.summary.total}{" "}
                  requisitos completos
                </SheetDescription>
              )}
            </div>
            {checklist && (
              <Badge
                variant={
                  checklist.summary.completed === checklist.summary.total
                    ? "default"
                    : "secondary"
                }
                className="text-sm shrink-0"
              >
                {checklist.summary.total > 0
                  ? Math.round(
                      (checklist.summary.completed / checklist.summary.total) *
                        100
                    )
                  : 0}
                %
              </Badge>
            )}
          </div>

          {checklist && (
            <div className="space-y-2 pt-1">
              <Progress
                value={
                  checklist.summary.total > 0
                    ? Math.round(
                        (checklist.summary.completed /
                          checklist.summary.total) *
                          100
                      )
                    : 0
                }
                className="h-2"
              />
              {userRole === "admin" && missingCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleSyncAll}
                  disabled={isSyncingAll}
                >
                  {isSyncingAll ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1.5" />
                  )}
                  {t("addAllMissing", { count: missingCount })}
                </Button>
              )}
            </div>
          )}
        </SheetHeader>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 sm:px-6 space-y-2">
            {checklist === undefined && (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {checklist && checklist.items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("noLegalFramework") ||
                  "Nenhum amparo legal definido para este processo"}
              </p>
            )}

            {checklist && checklist.items.length > 0 && (
              <TooltipProvider>
                {checklist.items.map((item, index) => {
                  const isMissing =
                    (item.type === "document" ||
                      item.type === "document_with_info") &&
                    "document" in item &&
                    item.document &&
                    !item.document.deliveredDocument;

                  const associationId =
                    "document" in item && item.document
                      ? (item.document as any).associationId
                      : null;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-2 rounded-md border px-3 py-2",
                        getItemBgClass(item)
                      )}
                    >
                      <StatusIcon status={item.completionStatus} />

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <TypeIcon type={item.type} />
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                          {item.isRequired && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1 py-0"
                            >
                              Obrig.
                            </Badge>
                          )}
                          <ResponsibleBadge party={item.responsibleParty} />
                        </div>

                        {/* Document status */}
                        {"document" in item && item.document && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {item.document.deliveredDocument ? (
                              <>
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate max-w-[200px]">
                                  {item.document.deliveredDocument.fileName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {item.document.deliveredDocument.status}
                                </Badge>
                              </>
                            ) : (
                              <span className="italic">
                                Documento nao enviado
                              </span>
                            )}

                            {item.document.validityCheck &&
                              item.document.validityCheck.status ===
                                "expired" && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] gap-0.5"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {t("validity.expired") || "Vencido"}
                                </Badge>
                              )}
                            {item.document.validityCheck &&
                              item.document.validityCheck.status ===
                                "expiring_soon" && (
                                <Badge
                                  variant="warning"
                                  className="text-[10px] gap-0.5"
                                >
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  {t("validity.expiringSoon") || "Vencendo"}
                                </Badge>
                              )}
                            {item.document.validityCheck &&
                              item.document.validityCheck.status ===
                                "missing_date" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {t("validity.missingDate") || "Data ausente"}
                                </Badge>
                              )}

                            {item.document.conditions.length > 0 && (
                              <div className="flex gap-1">
                                {item.document.conditions.map(
                                  (
                                    cond: {
                                      name: string;
                                      isFulfilled: boolean;
                                      expiresAt?: string;
                                    },
                                    ci: number
                                  ) => (
                                    <Tooltip key={ci}>
                                      <TooltipTrigger>
                                        <Badge
                                          variant={
                                            cond.isFulfilled
                                              ? "default"
                                              : "outline"
                                          }
                                          className="text-[10px] px-1"
                                        >
                                          {cond.name}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {cond.isFulfilled
                                          ? "Cumprido"
                                          : "Pendente"}
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Info fields status */}
                        {item.infoFields && item.infoFields.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.infoFields.map((field, fi) => (
                              <Badge
                                key={fi}
                                variant={field.isFilled ? "default" : "outline"}
                                className="text-[10px] gap-1"
                              >
                                {field.isFilled ? (
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                ) : (
                                  <Circle className="h-2.5 w-2.5" />
                                )}
                                {field.label}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Linked document option for info items */}
                        {"linkedDocumentType" in item &&
                          item.linkedDocumentType && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              <span>
                                Pode anexar: {item.linkedDocumentType.name}
                              </span>
                            </div>
                          )}
                      </div>

                      {/* Add button for missing documents (admin only) */}
                      {userRole === "admin" && isMissing && associationId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 h-7 px-2 text-xs"
                          onClick={() => handleAddMissing(associationId)}
                          disabled={addingId === associationId}
                        >
                          {addingId === associationId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              {t("addToDocumentList")}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </TooltipProvider>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
