"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileEdit } from "lucide-react";

interface RequestStatusBadgeProps {
  status?: string;
}

/**
 * Status badge for requested processes. With the no-approval model there are
 * two states: "draft" (still being built) and "solicitado" (finalized — a live
 * process). Legacy values render under the closest equivalent.
 */
export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  const t = useTranslations("ProcessRequests");

  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="gap-1">
          <FileEdit className="h-3 w-3" />
          {t("statusDraft")}
        </Badge>
      );
    case "solicitado":
    case "submitted":
    case "pending":
    case "approved":
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3" />
          {t("statusSolicitado")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status ?? "—"}</Badge>;
  }
}
