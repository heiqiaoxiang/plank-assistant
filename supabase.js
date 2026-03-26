import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://lvpotadtfhqunpibfhwy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_q01svXqt_TSip57lmUMdMw_O58NJg2L';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'plank_supabase_session',
    autoRefreshToken: true
  }
});

export const STORAGE_KEY = 'plank_assistant_data';
export const SYNC_KEY = 'plank_last_sync';
