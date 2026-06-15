"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, FileEdit } from "lucide-react";

interface RequestStatusBadgeProps {
  status: string;
}

/**
 * Status badge for process requests across the new lifecycle:
 * draft | submitted | approved | rejected. Legacy "pending" rows render
 * as submitted-style for continuity.
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
    case "submitted":
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          {t("statusSubmitted")}
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3" />
          {t("statusApproved")}
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t("statusRejected")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
