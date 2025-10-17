"use client"

import * as React from "react"
import {
  AudioWaveform,
  Command,
  FileText,
  FolderKanban,
  GalleryVerticalEnd,
  Globe,
  LayoutDashboard,
  ListTodo,
  Settings2,
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

const staticData = {
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const viewer = useQuery(api.myFunctions.viewer)
  const t = useTranslations('Navigation')

  // Build navigation data with translations
  const navMain = [
    {
      title: t('dashboard'),
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: [],
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
          title: t('mainProcesses'),
          url: "/main-processes",
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
      title: t('documents'),
      url: "/documents",
      icon: FileText,
      items: [],
    },
    {
      title: t('tasks'),
      url: "/tasks",
      icon: ListTodo,
      items: [],
    },
    {
      title: t('supportData'),
      url: "#",
      icon: Globe,
      items: [
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
          title: t('consulates'),
          url: "/consulates",
        },
        {
          title: t('documentTypes'),
          url: "/document-types",
        },
      ],
    },
    {
      title: t('settings'),
      url: "/settings",
      icon: Settings2,
      items: [],
    },
  ]

  const user = {
    name: viewer ?? "User",
    email: viewer ?? "user@example.com",
    avatar: "/avatars/shadcn.jpg",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={staticData.teams} />
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
