"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ProcessRequestsDataGrid } from "@/components/process-requests/process-requests-data-grid";
import { RequestDetailsDialog } from "@/components/process-requests/request-details-dialog";
import { RequestStatusBadge } from "@/components/process-requests/request-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronRight, FileText } from "lucide-react";
import { formatDate } from "@/lib/format-field-value";
import type { ProcessRequestListItem } from "@/components/process-requests/types";

export function ProcessRequestsClient() {
  const t = useTranslations("ProcessRequests");
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const locale = useLocale();
  const router = useRouter();

  const currentUser = useQuery(api.userProfiles.getCurrentUser, {});
  const processRequests = useQuery(api.processRequests.list, {}) as
    | ProcessRequestListItem[]
    | undefined;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<ProcessRequestListItem | null>(null);

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("processManagement") },
    { label: tBreadcrumbs("processRequests") },
  ];

  const openRequest = (request: ProcessRequestListItem) => {
    // The client resumes their own draft in the wizard; admins (and finalized
    // requests) open the read-only detail dialog.
    if (request.requestStatus === "draft" && currentUser?.role === "client") {
      router.push(`/process-requests/new?id=${request._id}`);
      return;
    }
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  // Group the client's rows into one card per multi-candidate request batch
  // (fallback to the row id for legacy rows without a group).
  const requestGroups = useMemo(() => {
    if (!processRequests) return [];
    const byKey = new Map<string, ProcessRequestListItem[]>();
    for (const request of processRequests) {
      const key = request.requestGroupId ?? request._id;
      const list = byKey.get(key) ?? [];
      list.push(request);
      byKey.set(key, list);
    }
    return Array.from(byKey.entries())
      .map(([key, rows]) => {
        const candidates = [...rows].sort((a, b) => a.createdAt - b.createdAt);
        const representative = candidates[0];
        const anyDraft = candidates.some((r) => r.requestStatus === "draft");
        return {
          key,
          requestGroupId: representative.requestGroupId,
          representative,
          candidates,
          requestStatus: anyDraft ? "draft" : representative.requestStatus,
          legalFrameworkName: representative.legalFramework?.name,
          urgent: candidates.some((r) => r.urgent),
          updatedAt: Math.max(...candidates.map((r) => r.updatedAt)),
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [processRequests]);

  const openGroup = (group: (typeof requestGroups)[number]) => {
    if (group.requestStatus === "draft" && currentUser?.role === "client") {
      if (group.requestGroupId) {
        router.push(`/process-requests/new?group=${group.requestGroupId}`);
      } else {
        router.push(`/process-requests/new?id=${group.representative._id}`);
      }
      return;
    }
    setSelectedRequest(group.representative);
    setDetailsOpen(true);
  };

  const isLoading = !currentUser || processRequests === undefined;

  if (isLoading) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </>
    );
  }

  const isAdmin = currentUser.role === "admin";

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isAdmin ? t("allRequests") : t("myRequests")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? t("adminDescription") : t("clientDescription")}
            </p>
          </div>

          {!isAdmin && (
            <Button onClick={() => router.push("/process-requests/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("newRequest")}
            </Button>
          )}
        </div>

        {isAdmin ? (
          <ProcessRequestsDataGrid
            processRequests={processRequests}
            onRowClick={openRequest}
          />
        ) : processRequests.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noRequests")}</p>
            <Button onClick={() => router.push("/process-requests/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("newRequest")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {requestGroups.map((group) => {
              const count = group.candidates.length;
              const names = group.candidates
                .map((c) => c.person?.fullName)
                .filter(Boolean)
                .join(", ");
              const title =
                count === 1
                  ? group.candidates[0].person?.fullName ||
                    group.legalFrameworkName ||
                    t("newRequest")
                  : t("candidatesCount", { count });
              return (
                <Card
                  key={group.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => openGroup(group)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openGroup(group);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{title}</span>
                      {group.urgent && (
                        <Badge variant="destructive" className="text-xs">
                          {t("urgent")}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {group.legalFrameworkName
                        ? `${group.legalFrameworkName} · `
                        : ""}
                      {count > 1 && names ? `${names} · ` : ""}
                      {t("updatedAt")}:{" "}
                      {formatDate(
                        new Date(group.updatedAt).toISOString().slice(0, 10),
                        locale,
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <RequestStatusBadge status={group.requestStatus} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <RequestDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        requestId={selectedRequest?._id ?? null}
        currentUserRole={currentUser.role}
        currentUserId={currentUser.userId}
      />
    </>
  );
}
