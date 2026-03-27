import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const STORAGE_KEY = 'plank_assistant_data';

if (typeof window !== 'undefined') {
  window.getLeaderboard = getLeaderboard;
  window.migrateLocalData = migrateLocalData;
  window.getUserStats = getUserStats;
  window.saveSessionToCloud = saveSession;
  window.getSessionsFromCloud = getSessions;
}

export async function saveSession(sessionData) {
  if (!isSupabaseConfigured() || !supabase) {
    return saveSessionLocal(sessionData);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('sessions').insert({
    user_id: user.id,
    duration: sessionData.duration,
    mode: sessionData.mode,
    paused_count: sessionData.pausedCount || 0
  });

  if (error) {
    console.error('[DB] Error saving session:', error);
    return { error };
  }

  await updateUserStats(user.id);
  return { success: true };
}

export async function getSessions(limit = 50) {
  if (!isSupabaseConfigured()) {
    return getSessionsLocal(limit);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DB] Error fetching sessions:', error);
    return { data: [], error };
  }

  return { data };
}

export async function getUserStats() {
  if (!isSupabaseConfigured()) {
    return getUserStatsLocal();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[DB] Error fetching stats:', error);
    return { data: null, error };
  }

  return { data };
}

async function updateUserStats(userId) {
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('duration, completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (sessionsError) {
    console.error('[DB] Error calculating stats:', sessionsError);
    return;
  }

  const today = new Date().toDateString();
  const weekStart = getWeekStart(new Date());

  const todaySessions = sessions.filter(s => 
    new Date(s.completed_at).toDateString() === today
  );

  const weekSessions = sessions.filter(s => 
    new Date(s.completed_at) >= weekStart
  );

  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);

  const { error: upsertError } = await supabase
    .from('user_stats')
    .upsert({
      user_id: userId,
      total_sessions: sessions.length,
      total_duration: totalDuration,
      today_count: todaySessions.length,
      today_date: new Date().toDateString(),
      week_count: weekSessions.length,
      week_start_date: weekStart.toISOString().split('T')[0]
    }, {
      onConflict: 'user_id'
    });

  if (upsertError) {
    console.error('[DB] Error updating stats:', upsertError);
  }
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getLeaderboard(type = 'total_duration', limit = 10) {
  if (!isSupabaseConfigured()) {
    return { data: [] };
  }

  const { data, error } = await supabase
    .from('leaderboard')
    .select(`
      rank_position,
      rank_value,
      period_start,
      profiles (
        nickname,
        avatar_url
      )
    `)
    .eq('rank_type', type)
    .order('rank_position', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[DB] Error fetching leaderboard:', error);
    return { data: [], error };
  }

  return { data };
}

export async function migrateLocalData() {
  if (!isSupabaseConfigured()) return { migrated: 0 };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { migrated: 0 };

  const localData = loadLocalData();
  if (!localData.history || localData.history.length === 0) {
    return { migrated: 0 };
  }

  const existingSessions = await getSessions(1000);
  if (existingSessions.data.length > 0) {
    console.log('[DB] Already has sessions, skipping migration');
    return { migrated: 0 };
  }

  const sessionsToMigrate = localData.history.map(h => ({
    user_id: user.id,
    duration: h.duration,
    mode: h.mode,
    paused_count: h.pausedCount || 0,
    completed_at: h.date
  }));

  const { error } = await supabase.from('sessions').insert(sessionsToMigrate);

  if (error) {
    console.error('[DB] Migration error:', error);
    return { migrated: 0, error };
  }

  await updateUserStats(user.id);
  console.log('[DB] Migrated', sessionsToMigrate.length, 'sessions');
  return { migrated: sessionsToMigrate.length };
}

function loadLocalData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { todayCount: 0, weekCount: 0, totalTime: 0, history: [] };
  } catch {
    return { todayCount: 0, weekCount: 0, totalTime: 0, history: [] };
  }
}

function saveSessionLocal(sessionData) {
  const data = loadLocalData();
  data.todayCount = (data.todayCount || 0) + 1;
  data.weekCount = (data.weekCount || 0) + 1;
  data.totalTime = (data.totalTime || 0) + (sessionData.duration - (sessionData.pausedTime || 0));
  data.history = data.history || [];
  data.history.push({
    date: new Date().toISOString(),
    duration: sessionData.duration,
    mode: sessionData.mode,
    pausedCount: sessionData.pausedCount || 0,
    pausedTime: sessionData.pausedTime || 0
  });
  if (data.history.length > 100) {
    data.history = data.history.slice(-100);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return { success: true };
}

function getSessionsLocal(limit) {
  const data = loadLocalData();
  return { data: (data.history || []).slice(-limit).reverse() };
}

function getUserStatsLocal() {
  const data = loadLocalData();
  return {
    data: {
      today_count: data.todayCount || 0,
      week_count: data.weekCount || 0,
      total_duration: data.totalTime || 0
    }
  };
}
