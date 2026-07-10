// src/app/master/products/page.tsx
import { supabaseAdmin } from '@/lib/db/client'
import Link from 'next/link'

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
        <button className="btn btn-primary btn-sm">+ Tambah Produk</button>
      </div>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nama Produk</th>
              <th>Kategori</th>
              <th>Supplier</th>
              <th>Batas Min Stok</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products?.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-secondary">Belum ada produk</td></tr>
            ) : (
              products?.map(prod => (
                <tr key={prod.id}>
                  <td className="font-mono text-xs">{prod.sku}</td>
                  <td className="font-medium">{prod.name}</td>
                  <td>{prod.categories?.name || '-'}</td>
                  <td>{prod.suppliers?.name || '-'}</td>
                  <td>{prod.min_stock_threshold ?? 100}</td>
                  <td>
                    {prod.is_active ? 
                      <span className="badge badge-success">Aktif</span> : 
                      <span className="badge badge-neutral">Nonaktif</span>
                    }
                  </td>
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
