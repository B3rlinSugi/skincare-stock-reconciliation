// src/lib/db/browser.ts
// Browser-safe Supabase client (anon key only — NEVER use service role key here)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase public environment variables')
}

// Safe to use in Client Components and browser context
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
