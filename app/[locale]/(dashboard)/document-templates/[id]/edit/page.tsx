"use client";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DocumentTemplateFormPage } from "@/components/document-templates/document-template-form-page";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

export default function EditDocumentTemplatePage() {
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const params = useParams();
  const templateId = params.id as Id<"documentTemplates">;

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("documentTemplates"), href: "/document-templates" },
    { label: tBreadcrumbs("editTemplate") },
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DocumentTemplateFormPage mode="edit" templateId={templateId} />
      </div>
    </>
  );
}
