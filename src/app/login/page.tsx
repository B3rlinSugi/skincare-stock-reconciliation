import { login } from './actions'
import { Package } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const resolvedSearchParams = await searchParams
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto pt-20">
      <div className="flex flex-col items-center mb-8">
        <div className="p-3 bg-blue-100 rounded-full mb-4">
          <Package className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Skincare WMS</h1>
        <p className="text-slate-500 text-sm mt-1">Sistem Manajemen Stok & Rekonsiliasi</p>
      </div>

      <form className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          name="email"
          placeholder="admin@skincare.com"
          required
        />
        <label className="text-md" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        
        <button
          formAction={login}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-foreground mb-2"
        >
          Sign In
        </button>
        
        {resolvedSearchParams?.message && (
          <p className="mt-4 p-4 bg-red-100 text-red-700 text-center rounded-md">
            {resolvedSearchParams.message}
          </p>
        )}
      </form>
    </div>
  )
}
