"use client"

import * as React from "react"
import {
  Briefcase,
  Calendar,
  FileText,
  FolderKanban,
  GalleryVerticalEnd,
  Globe,
  LayoutDashboard,
  ListTodo,
  Settings2,
  StickyNote,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useTranslations } from 'next-intl'

const brandingData = {
  name: "CASys",
  logo: GalleryVerticalEnd,
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const viewer = useQuery(api.myFunctions.viewer)
  const userProfile = useQuery(api.userProfiles.getCurrentUser)
  const t = useTranslations('Navigation')

  // Build navigation data with translations
  const navMain = [
    {
      title: t('dashboard'),
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: t('rnmCalendar'),
          url: "/rnm-calendar",
          icon: Calendar,
        },
      ],
    },
    {
      title: t('processManagement'),
      url: "#",
      icon: FolderKanban,
      isActive: false,
      items: [
        {
          title: t('processRequests'),
          url: "/process-requests",
        },
        {
          title: t('collectiveProcesses'),
          url: "/collective-processes",
        },
        {
          title: t('individualProcesses'),
          url: "/individual-processes",
        },
      ],
    },
    {
      title: t('peopleCompanies'),
      url: "#",
      icon: Users,
      items: [
        {
          title: t('people'),
          url: "/people",
        },
        {
          title: t('companies'),
          url: "/companies",
        },
        {
          title: t('passports'),
          url: "/passports",
        },
        {
          title: t('peopleCompanies'),
          url: "/people-companies",
        },
      ],
    },
    {
      title: t('documentsManagement'),
      url: "#",
      icon: FileText,
      items: [
        {
          title: t('documents'),
          url: "/documents",
        },
        {
          title: t('documentTypes'),
          url: "/document-types",
        },
        {
          title: t('documentTemplates'),
          url: "/document-templates",
        },
      ],
    },
    {
      title: t('tasks'),
      url: "/tasks",
      icon: ListTodo,
      items: [],
    },
    {
      title: t('notes'),
      url: "/notes",
      icon: StickyNote,
      items: [],
    },
    {
      title: t('supportData'),
      url: "#",
      icon: Globe,
      items: [
        {
          title: t('caseStatuses'),
          url: "/case-statuses",
        },
        {
          title: t('countries'),
          url: "/countries",
        },
        {
          title: t('states'),
          url: "/states",
        },
        {
          title: t('cities'),
          url: "/cities",
        },
        {
          title: t('processTypes'),
          url: "/process-types",
        },
        {
          title: t('legalFrameworks'),
          url: "/legal-frameworks",
        },
        {
          title: t('cboCodes'),
          url: "/cbo-codes",
        },
        {
          title: t('economicActivities'),
          url: "/economic-activities",
          icon: Briefcase,
        },
        {
          title: t('consulates'),
          url: "/consulates",
        },
      ],
    },
    {
      title: t('settings'),
      url: "#",
      icon: Settings2,
      items: [
        ...(userProfile?.role === "admin"
          ? [
              {
                title: t('users'),
                url: "/users",
              },
            ]
          : []),
        {
          title: t('settings'),
          url: "/settings",
        },
        {
          title: t('activityLogs'),
          url: "/activity-logs",
        },
      ],
    },
  ]

  const user = {
    name: userProfile?.fullName ?? "User",
    email: userProfile?.email ?? viewer ?? "user@example.com",
    avatar: userProfile?.photoUrl ?? "/avatars/default.svg",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher branding={brandingData} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
