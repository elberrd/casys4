"use client";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { CollectiveProcessFormPage } from "@/components/collective-processes/collective-process-form-page";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export default function NewCollectiveProcessPage() {
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const params = useParams();
  const locale = params.locale as string;

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: '/dashboard' },
    { label: tBreadcrumbs("collectiveProcesses"), href: '/collective-processes' },
    { label: tBreadcrumbs("newCollectiveProcess") },
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <CollectiveProcessFormPage mode="create" />
      </div>
    </>
  );
}
