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
    <header className="flex h-auto min-h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-12 w-full max-w-full py-2 px-4">
      <SidebarTrigger className="-ml-1 flex-shrink-0" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4 flex-shrink-0"
      />
      <Breadcrumb className="min-w-0 flex-1 max-w-full overflow-hidden">
        <BreadcrumbList className="flex-nowrap overflow-hidden">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <div key={index} className="contents">
                {index > 0 && (
                  <BreadcrumbSeparator className="hidden md:block flex-shrink-0" />
                )}
                <BreadcrumbItem className="hidden md:block min-w-0 max-w-[120px] lg:max-w-[150px]">
                  {isLast || !breadcrumb.href ? (
                    <BreadcrumbPage className="truncate block">{breadcrumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={breadcrumb.href} className="truncate block">{breadcrumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto mr-40">
          {children}
        </div>
      )}
    </header>
  )
}
