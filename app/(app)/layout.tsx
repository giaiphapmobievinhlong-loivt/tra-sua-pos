import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-[#f8f5f0]">
      <Sidebar username={user.full_name || user.username} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
