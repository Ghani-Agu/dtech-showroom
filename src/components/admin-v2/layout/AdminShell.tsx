import { AdminSidebar } from './AdminSidebar'
import { AdminTopBar } from './AdminTopBar'

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-admin-surface-base">
      <AdminSidebar />
      <div className="ml-[280px] min-h-screen flex flex-col">
        <AdminTopBar />
        <main className="flex-1 px-10 py-10 max-w-[1400px] w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
