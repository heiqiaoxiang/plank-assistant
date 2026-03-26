CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT DEFAULT '健身达人',
  avatar_url TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  duration INT NOT NULL CHECK (duration >= 10 AND duration <= 600),
  mode TEXT NOT NULL CHECK (mode IN ('classic', 'side-left', 'side-right', 'mountain')),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  paused_count INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_duration ON sessions(duration DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_completed ON sessions(user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_sessions INT DEFAULT 0,
  total_duration INT DEFAULT 0,
  today_count INT DEFAULT 0,
  today_date DATE DEFAULT CURRENT_DATE,
  week_count INT DEFAULT 0,
  week_start_date DATE DEFAULT date_trunc('week', CURRENT_DATE)::date,
  favorite_mode TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rank_type TEXT NOT NULL CHECK (rank_type IN ('total_duration', 'total_sessions', 'week_duration')),
  rank_value INT NOT NULL,
  rank_position INT,
  period_start DATE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, rank_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank_type ON leaderboard(rank_type, rank_position);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);