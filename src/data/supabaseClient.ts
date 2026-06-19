// ============================================================
// Inmap — Supabase Client
// ============================================================
//
// Creates a Supabase client ONLY when the required environment
// variables are present. When they are absent (e.g. local dev
// without a backend), `supabase` is null and the app transparently
// falls back to the bundled local data (see repository.ts).
//
// Configure by creating a `.env.local` file (see `.env.example`):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when both Supabase env vars are configured. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The shared Supabase client, or `null` when not configured.
 * Always guard usage with `if (supabase) { ... }` or `isSupabaseConfigured`.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
