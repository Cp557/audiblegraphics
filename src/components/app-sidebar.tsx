"use client"

import * as React from "react"
import { SquarePlus } from "lucide-react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "./team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Presentation } from "@/lib/supabase/presentations"

const data = {
  defaultUser: {
    name: "AudibleGraphics",
    email: "hello@audiblegraphics.com",
    avatar: "/avatars/shadcn.jpg",
  },
  brand: {
    title: "AudibleGraphics",
    logoSrc: "/logo.svg",
  },
  navMain: [
    {
      title: "New Infographic",
      url: "/dashboard",
      icon: SquarePlus,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: {
    name: string
    email: string
    avatar?: string
    subscription_tier?: "Pro" | "Ultra" | null
  }
  presentations?: Presentation[]
}

export function AppSidebar({ user, presentations = [], ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const resolvedUser = {
    ...data.defaultUser,
    ...user,
  }

  // Map presentations to project format
  const projects = presentations.map((presentation) => ({
    id: presentation.id,
    name: presentation.title,
    url: `/dashboard/${presentation.id}`,
  }))

  const navItems = data.navMain.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher logoSrc={data.brand.logoSrc} title={data.brand.title} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            ...resolvedUser,
            avatar: resolvedUser.avatar ?? data.defaultUser.avatar,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
