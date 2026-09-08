"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ReportTemplateFormPage } from "@/components/report-templates/report-template-form-page";
import type { Id } from "@/convex/_generated/dataModel";

export default function EditReportTemplatePage() {
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const params = useParams();
  const templateId = params.id as Id<"reportTemplates">;

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("supportData") },
    { label: tBreadcrumbs("reports"), href: "/report-templates" },
    { label: tBreadcrumbs("editReport") },
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ReportTemplateFormPage mode="edit" templateId={templateId} />
      </div>
    </>
  );
}
