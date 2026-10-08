"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NavigationBlockerProvider } from "@/contexts/navigation-blocker-context";
import { RoleGuard } from "@/components/role-guard";
import { useConvexAuth } from "convex/react";
import { useRouter } from "@/i18n/routing";
import { useEffect } from "react";
import { ScheduledNotificationsPopup } from "@/components/notifications/scheduled-notifications-popup";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <NavigationBlockerProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <RoleGuard>
            <SectionErrorBoundary>
              {children}
              <ScheduledNotificationsPopup />
            </SectionErrorBoundary>
          </RoleGuard>
        </SidebarInset>
      </SidebarProvider>
    </NavigationBlockerProvider>
  );
}
