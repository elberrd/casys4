"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RequirementsChecklistCardProps {
  individualProcessId: Id<"individualProcesses">;
}

export function RequirementsChecklistCard({
  individualProcessId,
}: RequirementsChecklistCardProps) {
  const t = useTranslations("IndividualProcesses");

  const checklist = useQuery(
    api.lib.requirementsChecklist.getChecklist,
    { individualProcessId }
  );

  if (checklist === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!checklist || checklist.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("requirementsChecklist") || "Checklist de Requisitos"}
          </CardTitle>
          <CardDescription>
            {t("noLegalFramework") ||
              "Nenhum amparo legal definido para este processo"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { items, summary } = checklist;
  const progressPercent =
    summary.total > 0
      ? Math.round((summary.completed / summary.total) * 100)
      : 0;

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {t("requirementsChecklist") || "Checklist de Requisitos"}
            </CardTitle>
            <CardDescription>
              {summary.completed} de {summary.total} requisitos completos
            </CardDescription>
          </div>
          <Badge
            variant={progressPercent === 100 ? "default" : "secondary"}
            className="text-sm"
          >
            {progressPercent}%
          </Badge>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-2">
        <TooltipProvider>
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-md border px-3 py-2"
            >
              <StatusIcon status={item.completionStatus} />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeIcon type={item.type} />
                  <span className="text-sm font-medium">{item.label}</span>
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
                        <span>{item.document.deliveredDocument.fileName}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.document.deliveredDocument.status}
                        </Badge>
                      </>
                    ) : (
                      <span className="italic">
                        Documento nao enviado
                      </span>
                    )}

                    {/* Validity check badge */}
                    {item.document.validityCheck && item.document.validityCheck.status === "expired" && (
                      <Badge variant="destructive" className="text-[10px] gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {t("validity.expired") || "Vencido"}
                      </Badge>
                    )}
                    {item.document.validityCheck && item.document.validityCheck.status === "expiring_soon" && (
                      <Badge variant="warning" className="text-[10px] gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {t("validity.expiringSoon") || "Vencendo"}
                      </Badge>
                    )}
                    {item.document.validityCheck && item.document.validityCheck.status === "missing_date" && (
                      <Badge variant="outline" className="text-[10px]">
                        {t("validity.missingDate") || "Data ausente"}
                      </Badge>
                    )}

                    {/* Conditions */}
                    {item.document.conditions.length > 0 && (
                      <div className="flex gap-1">
                        {item.document.conditions.map((cond: { name: string; isFulfilled: boolean; expiresAt?: string }, ci: number) => (
                          <Tooltip key={ci}>
                            <TooltipTrigger>
                              <Badge
                                variant={
                                  cond.isFulfilled ? "default" : "outline"
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
                        ))}
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
            </div>
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
