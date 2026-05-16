import { AdminHeader } from '@/components/admin/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-surface-base">
      <AdminHeader />
      <div className="px-6 py-8">{children}</div>
    </div>
  )
}
