import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AddSpotForm } from '@/components/spots/AddSpotForm'

export default async function NewSpotPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add a New Spot</h1>
        <p className="mt-2 text-gray-600">
          Share a great place you know with the community.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <AddSpotForm />
      </div>
    </div>
  )
}
