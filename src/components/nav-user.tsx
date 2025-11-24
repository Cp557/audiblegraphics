"use client"

import * as React from "react"
import {
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Settings,
  Sparkles,
  User,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { SettingsSheet } from "@/components/SettingsSheet"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    subscription_tier?: "Pro" | "Ultra" | null
  }
  }) {
  const [isManagingSubscription, setIsManagingSubscription] = React.useState(false)
  const [isSigningOut, setIsSigningOut] = React.useState(false)
  const [showSignOutDialog, setShowSignOutDialog] = React.useState(false)
  const [showSettingsSheet, setShowSettingsSheet] = React.useState(false)
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const { isMobile } = useSidebar()

  const handleManageSubscription = React.useCallback(async () => {
    if (isManagingSubscription) return
    
    setIsManagingSubscription(true)
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      })

      const data = await response.json()
      
      if (data.error) {
        console.error(data.error)
        return
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsManagingSubscription(false)
    }
  }, [isManagingSubscription])

  const handleUpgrade = React.useCallback(() => {
    window.location.href = "/#pricing"
  }, [])

  const handleSettingsClick = React.useCallback(() => {
    setShowSettingsSheet(true)
    setIsMenuOpen(false)
  }, [])

  const handleSignOutClick = React.useCallback(() => {
    setShowSignOutDialog(true)
    setIsMenuOpen(false)
  }, [])

  const handleConfirmSignOut = React.useCallback(async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    setShowSignOutDialog(false)
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to sign out")
      }

      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsSigningOut(false)
    }
  }, [isSigningOut])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{(user.subscription_tier || "Basic") + " Plan"}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{(user.subscription_tier || "Basic") + " Plan"}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {user.subscription_tier === "Pro" || user.subscription_tier === "Ultra" ? (
                <DropdownMenuItem
                  onSelect={handleManageSubscription}
                  disabled={isManagingSubscription}
                  className="cursor-pointer"
                >
                  <CreditCard />
                  {isManagingSubscription ? "Loading..." : "Manage Subscription"}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={handleUpgrade}
                  className="cursor-pointer"
                >
                  <Sparkles />
                  Upgrade
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  handleSettingsClick()
                }}
                className="cursor-pointer"
              >
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                handleSignOutClick()
              }}
              disabled={isSigningOut}
              className="cursor-pointer"
            >
              <LogOut />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be redirected to the home page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowSignOutDialog(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSignOut} disabled={isSigningOut}>
                {isSigningOut ? "Signing out..." : "Sign out"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SettingsSheet
          open={showSettingsSheet}
          onOpenChange={setShowSettingsSheet}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
