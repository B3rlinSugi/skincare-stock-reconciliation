// src/app/master/suppliers/page.tsx
import { supabaseAdmin } from '@/lib/db/client'

export default async function SuppliersPage() {
  const { data: suppliers, error } = await supabaseAdmin
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    if (error.code === '42P01') {
      return (
        <div className="page-body flex items-center justify-center p-12 text-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Tabel Supplier Belum Dibuat</h2>
            <p className="text-secondary mb-4">Silakan jalankan migration_6.sql di Supabase SQL Editor.</p>
          </div>
        </div>
      )
    }
    return <div>Error loading suppliers: {error.message}</div>
  }

  return (
    <div className="page-body">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg">Daftar Supplier</h2>
        <button className="btn btn-primary btn-sm">+ Tambah Supplier</button>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nama Supplier</th>
              <th>Kontak</th>
              <th>Telepon</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {suppliers?.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-secondary">Belum ada supplier</td></tr>
            ) : (
              suppliers?.map(sup => (
                <tr key={sup.id}>
                  <td className="font-medium">{sup.name}</td>
                  <td>{sup.contact_person || '-'}</td>
                  <td>{sup.phone || '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm">Edit</button>
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
