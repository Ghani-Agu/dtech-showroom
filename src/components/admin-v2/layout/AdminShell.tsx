import { ThemeProvider } from '../theme/ThemeProvider'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopBar } from './AdminTopBar'

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-admin-surface-base text-admin-text-primary">
        <AdminSidebar />
        <div className="ml-[280px] min-h-screen flex flex-col">
          <AdminTopBar />
          <main className="flex-1 px-8 lg:px-12 py-8 lg:py-10 max-w-[1600px] w-full">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
