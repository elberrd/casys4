"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { SafeLink } from "@/components/ui/safe-link";
import { usePathname } from "@/i18n/routing";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const isPathActive = (url: string) =>
    url !== "#" && (pathname === url || pathname.startsWith(`${url}/`));

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isItemActive =
            isPathActive(item.url) ||
            item.items?.some((subItem) => isPathActive(subItem.url)) === true;

          return item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || isItemActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isItemActive}
                    asChild
                  >
                    <SafeLink
                      href={item.url}
                      aria-current={isPathActive(item.url) ? "page" : undefined}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SafeLink>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => {
                      const isSubItemActive = isPathActive(subItem.url);
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            isActive={isSubItemActive}
                            asChild
                          >
                            <SafeLink
                              href={subItem.url}
                              aria-current={
                                isSubItemActive ? "page" : undefined
                              }
                            >
                              <span>{subItem.title}</span>
                            </SafeLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isItemActive}
                asChild
              >
                <SafeLink
                  href={item.url}
                  aria-current={isItemActive ? "page" : undefined}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SafeLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
