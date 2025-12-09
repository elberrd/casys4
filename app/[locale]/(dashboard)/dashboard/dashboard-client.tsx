"use client"

import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { ProcessStatusWidget } from "@/components/dashboard/process-status-widget"
import { DocumentReviewWidget } from "@/components/dashboard/document-review-widget"
import { RecentActivityWidget } from "@/components/dashboard/recent-activity-widget"
import { OverdueTasksWidget } from "@/components/dashboard/overdue-tasks-widget"
import { UpcomingDeadlinesWidget } from "@/components/dashboard/upcoming-deadlines-widget"
import { CompletionRateWidget } from "@/components/dashboard/completion-rate-widget"
import { ClientProcessesWidget } from "@/components/dashboard/client-processes-widget"
import { ClientDocumentsWidget } from "@/components/dashboard/client-documents-widget"
import { ClientUpdatesWidget } from "@/components/dashboard/client-updates-widget"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"

export function DashboardClient() {
  const t = useTranslations("Dashboard")
  const tProcessWizard = useTranslations("ProcessWizard")
  const router = useRouter()
  const locale = useLocale()
  const currentUser = useQuery(api.userProfiles.getCurrentUser, {})

  const breadcrumbs = [
    { label: t("dashboard"), href: "/dashboard" },
  ]

  // Show loading state while fetching user profile
  if (currentUser === undefined) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  // If user is not authenticated or profile not found
  if (!currentUser) {
    return (
      <>
        <DashboardPageHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">{t("userProfileNotFound")}</p>
        </div>
      </>
    )
  }

  const isAdmin = currentUser.role === "admin"
  const isClient = currentUser.role === "client"

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => router.push('/process-wizard')}>
              <Plus className="mr-2 h-4 w-4" />
              {tProcessWizard("addProcess")}
            </Button>
          )}
        </div>

        {/* Admin Dashboard */}
        {isAdmin && (
          <>
            {/* Top Row - Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ProcessStatusWidget />
              <DocumentReviewWidget />
              <CompletionRateWidget />
            </div>

            {/* Middle Row - Alerts & Deadlines */}
            <div className="grid gap-4 md:grid-cols-2">
              <OverdueTasksWidget />
              <UpcomingDeadlinesWidget />
            </div>

            {/* Bottom Row - Activity Feed */}
            <div className="grid gap-4">
              <RecentActivityWidget />
            </div>
          </>
        )}

        {/* Client Dashboard */}
        {isClient && (
          <>
            {/* Top Row - Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <ClientProcessesWidget />
              <ClientDocumentsWidget />
              <UpcomingDeadlinesWidget />
            </div>

            {/* Bottom Row - Recent Updates */}
            <div className="grid gap-4">
              <ClientUpdatesWidget />
            </div>
          </>
        )}
      </div>
    </>
  )
}
