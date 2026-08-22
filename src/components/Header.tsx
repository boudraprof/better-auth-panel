import { Link } from '@tanstack/react-router'
import { SidebarTrigger } from "#/components/ui/sidebar"
import ThemeToggle from './ThemeToggle'
import ServerStatus from './ServerStatus'
import AuthStatus from './AuthStatus'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background px-4">
      <nav className="page-wrap flex items-center justify-between py-3 sm:py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Link to="/" className="flex items-center gap-2 no-underline text-foreground">
              <img src="/ap-icon.svg" alt="AP logo" className="size-7" />
              <span className="text-base font-semibold">AP Admin Panel</span>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ServerStatus />
          <AuthStatus />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
