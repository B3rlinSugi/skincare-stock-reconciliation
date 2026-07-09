// src/app/api/marketplace/events/route.ts
// API Route: Simulasi & masa depan webhook marketplace
// Simulation source='SIMULATION', real webhook source='WEBHOOK'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db/client'
import { MarketplaceProcessor } from '@/lib/engine/marketplace-processor'
import { z } from 'zod'

const EventSchema = z.object({
  marketplace: z.enum(['SHOPEE', 'TIKTOK']),
  event_type: z.enum([
    'ORDER_CREATED',
    'ORDER_SHIPPED',
    'ORDER_IN_TRANSIT',
    'ORDER_CANCELLED',
    'RETURN_REQUESTED',
  ]),
  payload: z.record(z.string(), z.unknown()),
  source: z.enum(['SIMULATION', 'WEBHOOK']).default('SIMULATION'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = EventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { marketplace, event_type, payload, source } = parsed.data

    // Insert event ke queue
    const { data: event, error } = await supabaseAdmin
      .from('marketplace_events')
      .insert({ marketplace, event_type, payload, source, status: 'PENDING' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Process synchronously (untuk simulasi)
    // Pada production dengan real webhook: process via queue worker
    await MarketplaceProcessor.processEvent((event as { id: string }).id)

    return NextResponse.json({
      success: true,
      event_id: (event as { id: string }).id,
      message: `Event ${event_type} processed successfully`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('marketplace_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events: data })
}
