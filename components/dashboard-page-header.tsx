import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Link } from "@/i18n/routing"
import { NotificationBell } from "@/components/notifications/notification-bell"

export interface BreadcrumbItemType {
  label: string
  href?: string
}

export interface DashboardPageHeaderProps {
  breadcrumbs: BreadcrumbItemType[]
  children?: React.ReactNode
}

export function DashboardPageHeader({ breadcrumbs, children }: DashboardPageHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 overflow-hidden">
      <div className="flex items-center gap-2 px-4 min-w-0 flex-1">
        <SidebarTrigger className="-ml-1 flex-shrink-0" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4 flex-shrink-0"
        />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap">
            {breadcrumbs.map((breadcrumb, index) => {
              const isLast = index === breadcrumbs.length - 1

              return (
                <div key={index} className="contents">
                  {index > 0 && (
                    <BreadcrumbSeparator className="hidden md:block flex-shrink-0" />
                  )}
                  <BreadcrumbItem className="hidden md:block min-w-0">
                    {isLast || !breadcrumb.href ? (
                      <BreadcrumbPage className="truncate">{breadcrumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={breadcrumb.href} className="truncate">{breadcrumb.label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2 px-4 ml-auto flex-shrink-0">
        {children}
        <NotificationBell />
      </div>
    </header>
  )
}
