"use client";

import { useTranslations } from "next-intl";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ReportTemplateFormPage } from "@/components/report-templates/report-template-form-page";

export default function NewReportTemplatePage() {
  const tBreadcrumbs = useTranslations("Breadcrumbs");

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("supportData") },
    { label: tBreadcrumbs("reports"), href: "/report-templates" },
    { label: tBreadcrumbs("newReport") },
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ReportTemplateFormPage mode="create" />
      </div>
    </>
  );
}
