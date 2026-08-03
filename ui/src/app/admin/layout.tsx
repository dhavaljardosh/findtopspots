import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  // Note: admin check happens server-side via API calls in each page
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <nav className="flex gap-2">
            <a href="/admin" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">Overview</a>
            <a href="/admin/spots" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">Spots</a>
            <a href="/admin/claims" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">Claims</a>
          </nav>
        </div>
        {children}
      </div>
    </div>
  )
}
