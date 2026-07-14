import { createClient } from '@supabase/supabase-js'

// Fall back to the standard Supabase local URL / a placeholder key when env is
// unset, so importing this module never throws in dev or tests. createClient
// makes no network call at construction; real requests still need real env.
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

export type Supabase = typeof supabase
