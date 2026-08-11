"use client"

import * as React from "react"
import { Github, KeyRound, SquarePlus } from "lucide-react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SettingsSheet } from "@/components/SettingsSheet"
import { useSettings } from "@/contexts/SettingsContext"
import { usePresentationSummaries } from "@/hooks/use-presentations"

const data = {
  navMain: [
    {
      title: "New Infographic",
      url: "/",
      icon: SquarePlus,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar>

export function AppSidebar(props: AppSidebarProps) {
  const pathname = usePathname()
  const { presentations } = usePresentationSummaries()
  const { settingsOpen, setSettingsOpen } = useSettings()

  const projects = presentations.map((presentation) => ({
    id: presentation.id,
    name: presentation.title,
    url: `/presentations/${presentation.id}`,
  }))

  const navItems = data.navMain.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 shrink-0 justify-center p-0 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <NavMain items={navItems} />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="GitHub">
              <a
                href="https://github.com/Cp557/audiblegraphics"
                target="_blank"
                rel="noreferrer"
              >
                <Github />
                <span>GitHub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setSettingsOpen(true)}
              tooltip="Gemini key"
              className="cursor-pointer"
            >
              <KeyRound />
              <span>Gemini key</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  )
}
