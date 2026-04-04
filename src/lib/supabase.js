import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables. Multi-user features disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export const isSupabaseConfigured = () => !!supabase;

// Shared storage keys
export const STORAGE_KEY_BASE = 'plank_assistant_data';
export const SYNC_KEY = 'plank_last_sync';

export function getStorageKey(userId = null) {
  if (userId) {
    return `${STORAGE_KEY_BASE}_${userId}`;
  }
  return `${STORAGE_KEY_BASE}_anonymous`;
}

export function getLegacyStorageKey() {
  return STORAGE_KEY_BASE;
}
