import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { Spinner } from '@/components/ui/Feedback'

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:ps-64">
        <Header />
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-8 md:pb-12">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
