// src/lib/supabase.ts
// Centralized Supabase Client for KaushalSetu
// Strict browser-safe configuration using public anon key only.
// NO privileged keys, database credentials, or service-role keys are imported or exposed.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'FATAL CONFIGURATION ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required environment variables. ' +
    'Please configure them in your environment or .env file before launching the KaushalSetu frontend.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'kaushalsetu_supabase_auth',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
