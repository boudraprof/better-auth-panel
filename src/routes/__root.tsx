import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ToastContainer } from 'react-toastify'
import { useEffect } from 'react'

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ErrorBoundary } from '../components/ErrorBoundary'
import Footer from '../components/Footer'
import Header from '../components/Header'

import appCss from '../styles.css?url'
import { documentTitle, titleForPath } from '#/utils/app-name'
import { isDemoMode, matchPaths } from '#/utils/utils'
import NotFound from '#/components/NotFound'


const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: documentTitle(),
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '128x128',
        href: '/bp128.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '512x512',
        href: '/bp512.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {

  const showLayout = matchPaths()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // Signal that React has hydrated so tests (and observers) can wait for
  // interactivity instead of racing the initial server-rendered HTML.
  useEffect(() => {
    document.documentElement.setAttribute('data-hydrated', 'true')
  }, [])

  useEffect(() => {
    document.title = titleForPath(pathname)
  }, [pathname])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
      {isDemoMode() && (
        <div
          role="status"
          className="w-full bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-black"
        >
          Demo mode — changes are disabled. You can browse the panel but
          cannot modify any data.
        </div>
      )}
      <SidebarProvider>
        {showLayout && <AppSidebar />}
        <div className="font-sans antialiased wrap-anywhere selection:bg-[rgba(79,184,178,0.24)] w-full h-screen flex flex-col">
        {showLayout && <Header />}
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        {showLayout && <Footer />}
        </div>
        <ToastContainer
          position="bottom-right"
          hideProgressBar
          toastClassName="bg-accent-foreground! text-accent/90! "
        />
          </SidebarProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}


