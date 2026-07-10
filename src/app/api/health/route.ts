// src/app/api/health/route.ts — Diagnostic endpoint
import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Test Supabase connection with service role key
  let dbTest: any = null
  try {
    const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
      headers: {
        apikey: service ?? '',
        Authorization: `Bearer ${service}`,
      },
    })
    dbTest = {
      status: res.status,
      ok: res.ok,
      data: await res.json(),
    }
  } catch (e: any) {
    dbTest = { error: e?.message }
  }

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url ? '✅ SET' : '❌ MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? `✅ SET (${anon.slice(0, 20)}...)` : '❌ MISSING',
      SUPABASE_SERVICE_ROLE_KEY: service ? `✅ SET (${service.slice(0, 20)}...)` : '❌ MISSING',
    },
    supabase_query_test: dbTest,
    timestamp: new Date().toISOString(),
  })
}
