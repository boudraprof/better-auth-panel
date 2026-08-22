import { Link, useRouter } from '@tanstack/react-router'
import { Loader2, LogOut } from 'lucide-react'
import { useState } from 'react'

import { signOut, useSession } from '#/utils/auth-client'
import { normalizeRole } from '#/utils/permissions'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '#/components/ui/sidebar'
import { NAV_ITEMS } from '#/utils/utils'

export function AppSidebar() {
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { data: sessionData } = useSession()
  const userRole = normalizeRole(sessionData?.user?.role)

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole),
  )

  // Close the mobile sheet when a nav link is clicked; on desktop this is a
  // no-op (the sidebar is always visible).
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  const handleLogout = async () => {
    setIsSigningOut(true)
    await signOut()
    router.navigate({ to: '/auth/signin' })
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b ">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[active=true]:bg-transparent hover:bg-transparent"
            >
              <Link to={userRole === 'support' ? '/support-center' : '/'} className="flex items-center gap-2 no-underline text-foreground">
                <img src="/favicon.svg" alt="Logo" className="size-7" />
                <span className="text-base font-semibold">Better-auth panel</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent aria-label="Sidebar navigation" role="navigation">
        <SidebarGroup>
          <SidebarMenu>
            {visibleNavItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  asChild
                  onClick={closeMobile}
                  className="[&.active]:bg-sidebar-accent [&.active]:font-medium [&.active]:text-sidebar-accent-foreground"
                >
                  <Link to={item.to} activeOptions={item.activeOptions}>
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isSigningOut}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {isSigningOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              <span>{isSigningOut ? 'Signing out…' : 'Log out'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
