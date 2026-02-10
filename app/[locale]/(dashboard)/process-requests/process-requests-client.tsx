"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ProcessRequestsDataGrid } from "@/components/process-requests/process-requests-data-grid";
import { ApproveRequestDialog } from "@/components/process-requests/approve-request-dialog";
import { RejectRequestDialog } from "@/components/process-requests/reject-request-dialog";
import { RequestDetailsDialog } from "@/components/process-requests/request-details-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { getFullName } from "@/lib/utils/person-names";

export function ProcessRequestsClient() {
  const t = useTranslations("ProcessRequests");
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const router = useRouter();

  // Get current user profile to determine role
  const currentUser = useQuery(api.userProfiles.getCurrentUser, {});

  // Get process requests
  const processRequests = useQuery(api.processRequests.list, {});

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] =
    useState<Id<"processRequests"> | null>(null);

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("processManagement") },
    { label: tBreadcrumbs("processRequests") },
  ];

  const handleApprove = (id: Id<"processRequests">) => {
    setSelectedRequestId(id);
    setApproveDialogOpen(true);
  };

  const handleReject = (id: Id<"processRequests">) => {
    setSelectedRequestId(id);
    setRejectDialogOpen(true);
  };

  const handleViewDetails = (id: Id<"processRequests">) => {
    setSelectedRequestId(id);
    setDetailsDialogOpen(true);
  };

  const handleSuccess = () => {
    // The data will automatically refresh due to Convex reactivity
    setSelectedRequestId(null);
  };

  const selectedRequest =
    processRequests?.find((req) => req._id === selectedRequestId) || null;

  const requestInfo = selectedRequest
    ? {
        company: selectedRequest.company?.name || "-",
        processType: selectedRequest.processType?.name || "-",
        contactPerson: selectedRequest.contactPerson ? getFullName(selectedRequest.contactPerson) : "-",
      }
    : undefined;

  // Loading state
  if (!currentUser || !processRequests) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {currentUser.role === "admin"
                ? t("adminDescription")
                : t("clientDescription")}
            </p>
          </div>

          {/* Client users can submit new requests */}
          {currentUser.role === "client" && (
            <Button onClick={() => router.push("/process-requests/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("newRequest")}
            </Button>
          )}
        </div>

        {/* Data Grid */}
        <ProcessRequestsDataGrid
          processRequests={processRequests}
          onApprove={currentUser.role === "admin" ? handleApprove : undefined}
          onReject={currentUser.role === "admin" ? handleReject : undefined}
          onViewDetails={handleViewDetails}
          userRole={currentUser.role}
        />
      </div>

      {/* Dialogs */}
      <ApproveRequestDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        requestId={selectedRequestId}
        requestInfo={requestInfo}
        onSuccess={handleSuccess}
      />

      <RejectRequestDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        requestId={selectedRequestId}
        requestInfo={requestInfo}
        onSuccess={handleSuccess}
      />

      <RequestDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        request={selectedRequest}
      />
    </>
  );
}
