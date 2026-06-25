"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ProcessRequestWizard } from "@/components/process-requests/process-request-wizard";

export default function NewProcessRequestPage() {
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  const idParam = searchParams.get("id");
  const requestId = idParam ? (idParam as Id<"individualProcesses">) : undefined;

  // Gate: only clients can create/resume requests; redirect admins away.
  const currentUser = useQuery(api.userProfiles.getCurrentUser);

  useEffect(() => {
    if (currentUser && currentUser.role !== "client") {
      router.replace(`/${locale}/process-requests`);
    }
  }, [currentUser, locale, router]);

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("processRequests"), href: "/process-requests" },
    { label: tBreadcrumbs("newProcessRequest") },
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {!currentUser || currentUser.role !== "client" ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ProcessRequestWizard requestId={requestId} />
        )}
      </div>
    </>
  );
}
