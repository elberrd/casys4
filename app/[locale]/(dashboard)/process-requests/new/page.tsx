"use client";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ProcessRequestFormPage } from "@/components/process-requests/process-request-form-page";
import { useTranslations } from "next-intl";

export default function NewProcessRequestPage() {
  const tBreadcrumbs = useTranslations("Breadcrumbs");

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("processRequests"), href: "/process-requests" },
    { label: tBreadcrumbs("newProcessRequest") },
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ProcessRequestFormPage mode="create" />
      </div>
    </>
  );
}
