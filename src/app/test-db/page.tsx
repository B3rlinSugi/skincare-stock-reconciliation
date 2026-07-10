// src/app/test-db/page.tsx — Isolated DB test (delete after debugging)
// This page avoids ALL shared components to isolate the crash source

export default async function TestDBPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  let result: any = 'Not tested'

  try {
    // Direct fetch - no supabase client library
    const res = await fetch(`${url}/rest/v1/products?select=id,sku,name&limit=5&order=name.asc`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'count=exact',
      },
      cache: 'no-store',
    })
    const data = await res.json()
    result = { status: res.status, count: res.headers.get('content-range'), data }
  } catch (e: any) {
    result = { error: e?.message, stack: e?.stack }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', color: 'white', background: '#0a0a0a', minHeight: '100vh' }}>
      <h1 style={{ color: '#4ade80', marginBottom: '1rem' }}>✅ Test DB Page Loaded Successfully</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
        URL: {url?.slice(0, 40)}... <br />
        Key: {serviceKey?.slice(0, 25)}...
      </p>
      <pre style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}
