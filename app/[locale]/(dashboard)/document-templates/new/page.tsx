"use client";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DocumentTemplateFormPage } from "@/components/document-templates/document-template-form-page";
import { useTranslations } from "next-intl";

export default function NewDocumentTemplatePage() {
  const tBreadcrumbs = useTranslations("Breadcrumbs");

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("documentTemplates"), href: "/document-templates" },
    { label: tBreadcrumbs("newTemplate") },
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DocumentTemplateFormPage mode="create" />
      </div>
    </>
  );
}
