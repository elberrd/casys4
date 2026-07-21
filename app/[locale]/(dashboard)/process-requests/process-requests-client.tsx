"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import {
  ClientRequestsTable,
  type ClientRequestGroup,
} from "@/components/process-requests/client-requests-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, FileText } from "lucide-react";
import type { ProcessRequestListItem } from "@/components/process-requests/types";

export function ProcessRequestsClient() {
  const t = useTranslations("ProcessRequests");
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const currentUser = useQuery(api.userProfiles.getCurrentUser, {});
  const processRequests = useQuery(api.processRequests.list, {}) as
    | ProcessRequestListItem[]
    | undefined;

  const removeGroup = useMutation(api.processRequests.removeGroup);
  const removeDraft = useMutation(api.processRequests.removeDraft);

  const [pendingDelete, setPendingDelete] = useState<ClientRequestGroup | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("processManagement") },
    { label: tBreadcrumbs("processRequests") },
  ];

  // Group rows into one row per multi-candidate request batch for both roles
  // (fallback to the row id for legacy rows without a group).
  const requestGroups = useMemo<ClientRequestGroup[]>(() => {
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
          documentationStartedAt: candidates.find(
            (candidate) => candidate.documentationStartedAt !== undefined,
          )?.documentationStartedAt,
          legalFrameworkName: representative.legalFramework?.name,
          urgent: candidates.some((r) => r.urgent),
          updatedAt: Math.max(...candidates.map((r) => r.updatedAt)),
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [processRequests]);

  // Row click / "Ver detalhes": open the full detail page (shows the status).
  const openDetails = (group: ClientRequestGroup) => {
    router.push(`/process-requests/${group.representative._id}`);
  };

  // "Continuar": resume a draft in the wizard.
  const continueGroup = (group: ClientRequestGroup) => {
    if (group.requestGroupId) {
      router.push(`/process-requests/new?group=${group.requestGroupId}`);
    } else {
      router.push(`/process-requests/new?id=${group.representative._id}`);
    }
  };

  const confirmDelete = async () => {
    const group = pendingDelete;
    if (!group) return;
    try {
      setIsDeleting(true);
      if (group.requestGroupId) {
        await removeGroup({ requestGroupId: group.requestGroupId });
      } else {
        // Legacy singleton without a group — delete its draft rows directly.
        for (const candidate of group.candidates) {
          if (candidate.requestStatus === "draft") {
            await removeDraft({ id: candidate._id });
          }
        }
      }
      toast.success(t("requestDeleted"));
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error(t("createError"));
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
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

        {!isAdmin && processRequests.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noRequests")}</p>
            <Button onClick={() => router.push("/process-requests/new")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("newRequest")}
            </Button>
          </Card>
        ) : (
          <ClientRequestsTable
            groups={requestGroups}
            onOpen={openDetails}
            showRequester={isAdmin}
            onContinue={isAdmin ? undefined : continueGroup}
            onDelete={isAdmin ? undefined : (group) => setPendingDelete(group)}
          />
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteRequestTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteRequestBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
