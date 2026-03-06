import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-[#f8f5f0]">
      <Sidebar username={user.full_name || user.username} />
      {/* Mobile: pt-14 = topbar, pb-16 = bottom nav | Desktop: no padding */}
      <main className="flex-1 flex flex-col overflow-hidden pt-14 pb-16 md:pt-0 md:pb-0">
        <div className="flex-1 overflow-auto h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
