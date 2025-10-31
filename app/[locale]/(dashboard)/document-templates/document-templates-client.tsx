"use client";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DocumentTemplatesDataGrid } from "@/components/document-templates/document-templates-data-grid";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

export function DocumentTemplatesClient() {
  const t = useTranslations("DocumentTemplates");
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const router = useRouter();

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("documentTemplates") },
  ];

  // Fetch templates
  const templates = useQuery(api.documentTemplates.list, {});

  const handleView = (id: Id<"documentTemplates">) => {
    router.push(`/document-templates/${id}`);
  };

  const handleEdit = (id: Id<"documentTemplates">) => {
    router.push(`/document-templates/${id}/edit`);
  };

  const handleClone = (id: Id<"documentTemplates">) => {
    // TODO: Implement clone functionality
    console.log("Clone template:", id);
  };

  const handleDelete = (id: Id<"documentTemplates">) => {
    // TODO: Implement delete functionality
    console.log("Delete template:", id);
  };

  // Loading state
  if (!templates) {
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
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>

          <Button onClick={() => router.push("/document-templates/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("newTemplate")}
          </Button>
        </div>

        {/* Data Grid */}
        <DocumentTemplatesDataGrid
          templates={templates}
          onView={handleView}
          onEdit={handleEdit}
          onClone={handleClone}
          onDelete={handleDelete}
        />
      </div>
    </>
  );
}
