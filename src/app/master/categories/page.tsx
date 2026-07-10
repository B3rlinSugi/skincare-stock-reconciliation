// src/app/master/categories/page.tsx
import { supabaseAdmin } from '@/lib/db/client'
import { ClientButton } from '@/components/ClientButton'

export default async function CategoriesPage() {
  const { data: categories, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    // If table doesn't exist yet, show a friendly message
    if (error.code === '42P01') {
      return (
        <div className="page-body flex items-center justify-center p-12 text-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Tabel Kategori Belum Dibuat</h2>
            <p className="text-secondary mb-4">Silakan jalankan migration_6.sql di Supabase SQL Editor.</p>
          </div>
        </div>
      )
    }
    return <div>Error loading categories: {error.message}</div>
  }

  return (
    <div className="page-body">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg">Daftar Kategori</h2>
        <ClientButton className="btn btn-primary btn-sm">+ Tambah Kategori</ClientButton>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nama Kategori</th>
              <th>Deskripsi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {categories?.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-secondary">Belum ada kategori</td></tr>
            ) : (
              categories?.map(cat => (
                <tr key={cat.id}>
                  <td className="font-medium">{cat.name}</td>
                  <td className="text-secondary">{cat.description || '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      <ClientButton className="btn btn-secondary btn-sm">Edit</ClientButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
