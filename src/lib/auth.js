import { supabase, isSupabaseConfigured } from './supabase.js';

export function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  return supabase?.auth?.getUser();
}

export function isLocalMode() {
  return !isSupabaseConfigured();
}

export async function signInWithEmail(email, password) {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { user: data.user };
  } catch (err) {
    return { error: err.message };
  }
}

export async function signUpWithEmail(email, password) {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return { user: data.user };
  } catch (err) {
    return { error: err.message };
  }
}

export function isEmailUser(user) {
  if (!user) return false;
  return user.email !== undefined && user.email !== null;
}

export async function signOut() {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}
