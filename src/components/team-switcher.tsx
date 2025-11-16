"use client"

import Image from "next/image"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type TeamSwitcherProps = {
  logoSrc: string
  title: string
}

export function TeamSwitcher({ logoSrc, title }: TeamSwitcherProps) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="pointer-events-none gap-3 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Image
              src={logoSrc}
              alt={`${title} logo`}
              width={24}
              height={24}
              className="size-6"
              priority
            />
          </span>
          <span className="truncate text-left text-base font-semibold leading-tight">
            {title}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
