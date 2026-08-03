import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'
import { Navbar } from '@/components/layout/Navbar'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'FindTopSpots — Discover Amazing Places',
  description: 'Find and share the best spots in your city.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <ClerkProvider>
          <Providers>
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
