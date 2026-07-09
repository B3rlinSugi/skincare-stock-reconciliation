// src/app/api/reconciliation/daily/route.ts
// Cron endpoint untuk daily reconciliation check
// Setup di Vercel Cron atau panggil manual dari dashboard

import { NextRequest, NextResponse } from 'next/server'
import { ReconciliationEngine } from '@/lib/engine/reconciliation.engine'

export async function POST(req: NextRequest) {
  // Simple auth check untuk cron endpoint
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await ReconciliationEngine.runDailyCheck()
    return NextResponse.json({ success: true, report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reconciliation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const report = await ReconciliationEngine.runDailyCheck()
    return NextResponse.json({ success: true, report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reconciliation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
