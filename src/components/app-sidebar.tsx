"use client"

import * as React from "react"
import { SquarePlus } from "lucide-react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Presentation } from "@/lib/local/presentations"

const data = {
  brand: {
    title: "AudibleGraphics",
  },
  navMain: [
    {
      title: "New Infographic",
      url: "/",
      icon: SquarePlus,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  presentations?: Presentation[]
}

export function AppSidebar({ presentations = [], ...props }: AppSidebarProps) {
  const pathname = usePathname()

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
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="font-semibold text-sm truncate">{data.brand.title}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
