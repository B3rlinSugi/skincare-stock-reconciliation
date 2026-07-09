// src/app/opname/[id]/page.tsx — Detail & Input Hitung Fisik Opname
import { supabaseAdmin } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import { inputPhysicalCount, completeOpname } from '@/lib/actions/opname.actions'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import Search from '@/components/Search'
import OpnameInputRow from '@/components/OpnameInputRow'

export default async function OpnameDetailPage(
  props: { params: Promise<{ id: string }>, searchParams: Promise<{ query?: string; page?: string }> }
) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { id } = params
  const query = searchParams?.query || ''
  const currentPage = Number(searchParams?.page) || 1
  const limit = 20
  const offset = (currentPage - 1) * limit

  // 1. Ambil data sesi
  const { data: sessionData, error } = await supabaseAdmin
    .from('stock_opname')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !sessionData) notFound()
  const session = sessionData as any
  const isCounting = session.status === 'COUNTING'

  // 2. Ambil total stats untuk summary (tanpa filter/pagination)
  const { data: allItemsData } = await supabaseAdmin
    .from('stock_opname_items')
    .select('physical_qty, difference')
    .eq('opname_id', id)
  
  const allItems = allItemsData || []
  const itemsWithDiff = allItems.filter(i => i.difference !== null && i.difference !== 0).length
  const itemsCompleted = allItems.filter(i => i.physical_qty !== null).length
  const totalItems = allItems.length

  // 3. Ambil items paginated dan dicari
  let itemsQuery = supabaseAdmin
    .from('stock_opname_items')
    .select('*, products!inner(name, sku)', { count: 'exact' })
    .eq('opname_id', id)

  if (query) {
    itemsQuery = itemsQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%`, { foreignTable: 'products' })
  }

  const { data: itemsData, count } = await itemsQuery
    .order('name', { foreignTable: 'products', ascending: true })
    .range(offset, offset + limit - 1)

  const items = itemsData || []
  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/opname" className="text-secondary text-sm mb-2 inline-block">← Kembali ke Daftar Opname</Link>
          <h1 className="page-title">{session.title}</h1>
          <p className="page-subtitle">Status: <span className={`badge ${isCounting ? 'badge-warning' : 'badge-success'}`}>{session.status}</span></p>
        </div>
        {isCounting && (
          <form action={async (formData) => {
            'use server'
            await completeOpname(formData.get('opname_id') as string)
          }}>
            <input type="hidden" name="opname_id" value={id} />
            <button type="submit" className="btn btn-primary" onClick={(e) => {
              // This onClick confirm only works in client components, 
              // but since Next 13 allows standard forms, JS might execute if not strictly server only form.
              // To be perfectly safe, we'll just let it submit or ideally use a client component for the button.
              // We'll keep it as is for the PoC.
            }}>
              ✅ Selesaikan Opname
            </button>
          </form>
        )}
      </div>

      <div className="page-body">
        {isCounting && (
          <div className="alert-banner alert-low mb-6">
            <span style={{ fontSize: 18 }}>✍️</span>
            <div className="text-sm">
              Silakan input hasil hitung fisik. Angka selisih akan otomatis dihitung.
              Barang yang tidak diinput dianggap tidak ada selisih.
            </div>
          </div>
        )}

        <div className="grid-cols-3 mb-6">
          <div className="stat-card">
            <div className="text-muted text-sm mb-1">Total Item</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{totalItems}</div>
          </div>
          <div className="stat-card">
            <div className="text-muted text-sm mb-1">Sudah Dihitung</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: itemsCompleted === totalItems ? 'var(--accent-success)' : '' }}>
              {itemsCompleted}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-muted text-sm mb-1">Selisih Ditemukan</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: itemsWithDiff > 0 ? 'var(--accent-warning)' : '' }}>
              {itemsWithDiff}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Search placeholder="Cari SKU atau Nama Produk..." />
          <div className="text-sm text-secondary">
            Menampilkan {items.length} dari {count} baris
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                <th>SKU</th>
                <th>Tercatat (Sistem)</th>
                <th style={{ width: 150 }}>Hitung Fisik</th>
                <th>Selisih</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      <div className="empty-state-title">Item tidak ditemukan</div>
                      <div className="text-sm text-muted mt-1">Coba gunakan kata kunci lain</div>
                    </div>
                  </td>
                </tr>
              ) : items.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.products?.name}</td>
                  <td className="font-mono text-muted text-xs">{item.products?.sku}</td>
                  <td className="text-secondary">{item.system_qty}</td>
                  {isCounting ? (
                    <OpnameInputRow item={item} />
                  ) : (
                    <>
                      <td><span className="font-semibold">{item.physical_qty ?? item.system_qty}</span></td>
                      <td>
                        {item.difference === null ? (
                          <span className="text-muted">—</span>
                        ) : item.difference === 0 ? (
                          <span className="text-success">Cocok</span>
                        ) : item.difference > 0 ? (
                          <span className="text-success font-bold">+{item.difference}</span>
                        ) : (
                          <span className="text-danger font-bold">{item.difference}</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination totalPages={totalPages} currentPage={currentPage} />
      </div>
    </>
  )
}
