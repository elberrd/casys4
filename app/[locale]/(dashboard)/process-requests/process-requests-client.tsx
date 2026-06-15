"use client";

import { useState } from "react";
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
    // Drafts resume in the wizard; everything else opens the detail dialog.
    if (request.status === "draft") {
      router.push(`/process-requests/new?id=${request._id}`);
      return;
    }
    setSelectedRequest(request);
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
            {processRequests.map((request) => (
              <Card
                key={request._id}
                role="button"
                tabIndex={0}
                onClick={() => openRequest(request)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openRequest(request);
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">
                      {request.candidatePerson?.fullName ||
                        request.processType?.name ||
                        t("newRequest")}
                    </span>
                    {request.version ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        v{request.version}
                      </Badge>
                    ) : null}
                    {request.isUrgent && (
                      <Badge variant="destructive" className="text-xs">
                        {t("urgent")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {request.processType?.name ? `${request.processType.name} · ` : ""}
                    {t("updatedAt")}: {formatDate(
                      new Date(request.updatedAt).toISOString().slice(0, 10),
                      locale
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <RequestStatusBadge status={request.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
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
