import { createClient } from '@supabase/supabase-js'

/**
 * The Supabase Auth client (email + password). The backend trusts the JWT this
 * issues; `apiClient` attaches its access token to every request.
 *
 * Falls back to harmless placeholders when the env is unset so importing this
 * module never throws in tests/CI (real auth needs the real project values in
 * a gitignored `.env`; see `.env.example`).
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
