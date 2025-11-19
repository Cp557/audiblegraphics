"use client"

import Image from "next/image"
import Link from "next/link"

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
          asChild
          size="lg"
          className="gap-3 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <Link href="/" aria-label={`${title} home`}>
            <span className="flex aspect-square size-10 items-center justify-center transition-all group-data-[collapsible=icon]:size-8">
              <Image
                src={logoSrc}
                alt={`${title} logo`}
                width={24}
                height={24}
                className="size-8 transition-all group-data-[collapsible=icon]:size-6"
                priority
              />
            </span>
            <span className="truncate text-left text-base font-semibold leading-tight">
              {title}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
