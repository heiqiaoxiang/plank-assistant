import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const STORAGE_KEY = 'plank_assistant_data';

if (typeof window !== 'undefined') {
  window.initAuth = initAuth;
}

export async function initAuth() {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[Auth] Supabase not configured, using localStorage only');
    return null;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;

    if (session?.user) {
      console.log('[Auth] Existing session found:', session.user.id);
      return session.user;
    }

    const { data, error: signInError } = await supabase.auth.signInAnonymously();
    
    if (signInError) throw signInError;
    
    console.log('[Auth] Anonymous sign-in successful:', data.user?.id);
    return data.user;

  } catch (err) {
    console.error('[Auth] Error:', err.message);
    return null;
  }
}

export function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  return supabase?.auth?.getUser();
}

export async function onAuthStateChange(callback) {
  if (!isSupabaseConfigured()) return () => {};
  
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Auth] State changed:', event, session?.user?.id);
    callback(event, session);
  });
}

export function isLocalMode() {
  return !isSupabaseConfigured();
}
