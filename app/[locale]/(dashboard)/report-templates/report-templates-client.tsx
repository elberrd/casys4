"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { ReportTemplatesTable } from "@/components/report-templates/report-templates-table";

export function ReportTemplatesClient() {
  const t = useTranslations("ReportTemplates");
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const templates = useQuery(api.reportTemplates.list, {}) ?? [];
  const removeTemplate = useMutation(api.reportTemplates.remove);

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("supportData") },
    { label: tBreadcrumbs("reports") },
  ];

  const handleEdit = useCallback(
    (id: Id<"reportTemplates">) => {
      router.push(`/report-templates/${id}/edit`);
    },
    [router],
  );

  const handleDelete = useCallback(
    async (id: Id<"reportTemplates">) => {
      try {
        await removeTemplate({ id });
        toast.success(t("deletedSuccess"));
      } catch (error) {
        toast.error(t("errorDelete"), {
          description: error instanceof Error ? error.message : undefined,
        });
        throw error;
      }
    },
    [removeTemplate, t],
  );

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Button onClick={() => router.push("/report-templates/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {tCommon("create")}
          </Button>
        </div>
        <ReportTemplatesTable
          templates={templates}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </>
  );
}
