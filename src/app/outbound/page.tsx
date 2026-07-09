import { supabaseAdmin } from '@/lib/db/client'
import OutboundForm from './outbound-form'

export default async function OutboundPage() {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, sku, name')
    .eq('is_active', true)
    .order('name')

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Keluar Manual</h1>
          <p className="page-subtitle">Catat barang keluar yang tidak terhubung ke pesanan marketplace</p>
        </div>
      </div>

      <div className="page-body">
        <OutboundForm products={products ?? []} />
      </div>
    </>
  )
}
