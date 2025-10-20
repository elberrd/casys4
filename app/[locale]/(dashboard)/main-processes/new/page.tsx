"use client";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { MainProcessFormPage } from "@/components/main-processes/main-process-form-page";
import { useTranslations } from "next-intl";

export default function NewMainProcessPage() {
  const tBreadcrumbs = useTranslations("Breadcrumbs");

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("mainProcesses"), href: "/main-processes" },
    { label: tBreadcrumbs("newMainProcess") },
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <MainProcessFormPage mode="create" />
      </div>
    </>
  );
}
