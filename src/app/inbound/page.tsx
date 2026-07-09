import { supabaseAdmin } from '@/lib/db/client'
import InboundForm from './inbound-form'

export default async function InboundPage() {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, sku, name')
    .eq('is_active', true)
    .order('name')

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Barang Masuk</h1>
          <p className="page-subtitle">Catat penerimaan barang dari maklon — setiap masuk tercatat di ledger</p>
        </div>
      </div>

      <div className="page-body">
        <InboundForm products={products ?? []} />
      </div>
    </>
  )
}
