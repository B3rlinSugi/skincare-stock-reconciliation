// src/app/master/products/page.tsx
import { supabaseAdmin } from '@/lib/db/client'
import Link from 'next/link'
import { ClientButton } from '@/components/ClientButton'

export default async function MasterProductsPage() {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*, categories(name), suppliers(name)')
    .order('name', { ascending: true })

  if (error) {
    if (error.code === '42703') {
       // Missing category_id or supplier_id column
       return (
        <div className="page-body flex items-center justify-center p-12 text-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Kolom Produk Belum Lengkap</h2>
            <p className="text-secondary mb-4">Silakan jalankan migration_6.sql di Supabase SQL Editor untuk memperbarui struktur tabel.</p>
          </div>
        </div>
      )
    }
    return <div>Error loading products: {error.message}</div>
  }

  return (
    <div className="page-body">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-lg">Katalog Produk</h2>
        <ClientButton className="btn btn-primary btn-sm">+ Tambah Produk</ClientButton>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nama Produk</th>
              <th>Base Price</th>
              <th>Sell Price</th>
              <th>Aktif?</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products?.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-secondary">Belum ada produk</td></tr>
            ) : (
              products?.map(prod => (
                <tr key={prod.id}>
                  <td className="font-mono text-xs">{prod.sku}</td>
                  <td className="font-medium">{prod.name}</td>
                  <td className="text-muted">Rp 0</td>
                  <td>Rp {(prod.price || 0).toLocaleString('id-ID')}</td>
                  <td>
                    {prod.is_active ? 
                      <span className="badge badge-success">Aktif</span> : 
                      <span className="badge badge-neutral">Nonaktif</span>
                    }
                  </td>
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
