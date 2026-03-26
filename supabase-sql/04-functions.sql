CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  week_start DATE := date_trunc('week', CURRENT_DATE)::date;
BEGIN
  DELETE FROM leaderboard;
  
  INSERT INTO leaderboard (user_id, rank_type, rank_value, period_start)
  SELECT user_id, 'total_duration', SUM(duration), '1970-01-01'::date
  FROM sessions GROUP BY user_id ORDER BY SUM(duration) DESC;
  
  INSERT INTO leaderboard (user_id, rank_type, rank_value, period_start)
  SELECT user_id, 'total_sessions', COUNT(*), '1970-01-01'::date
  FROM sessions GROUP BY user_id ORDER BY COUNT(*) DESC;
  
  INSERT INTO leaderboard (user_id, rank_type, rank_value, period_start)
  SELECT user_id, 'week_duration', SUM(duration), week_start
  FROM sessions WHERE completed_at >= week_start GROUP BY user_id ORDER BY SUM(duration) DESC;
  
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY rank_value DESC) as pos FROM leaderboard
  )
  UPDATE leaderboard l SET rank_position = r.pos FROM ranked r WHERE l.id = r.id;
END;
$$;

CREATE OR REPLACE FUNCTION get_leaderboard(p_rank_type TEXT DEFAULT 'total_duration', p_limit INT DEFAULT 100)
RETURNS TABLE (rank_position INT, user_id UUID, nickname TEXT, avatar_url TEXT, rank_value INT, duration_formatted TEXT)
SECURITY DEFINER SET search_path = public LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT l.rank_position, l.user_id, p.nickname, p.avatar_url, l.rank_value,
    CASE
      WHEN l.rank_value >= 3600 THEN CONCAT(FLOOR(l.rank_value / 3600), 'h', FLOOR((l.rank_value % 3600) / 60), 'm')
      WHEN l.rank_value >= 60 THEN CONCAT(FLOOR(l.rank_value / 60), 'm ', l.rank_value % 60, 's')
      ELSE CONCAT(l.rank_value, 's')
    END as duration_formatted
  FROM leaderboard l JOIN profiles p ON l.user_id = p.id
  WHERE l.rank_type = p_rank_type ORDER BY l.rank_position LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_ranking(p_user_id UUID)
RETURNS TABLE (rank_type TEXT, rank_position INT, rank_value INT, total_users INT)
SECURITY DEFINER SET search_path = public LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT l.rank_type, l.rank_position, l.rank_value,
    (SELECT COUNT(DISTINCT user_id)::INT FROM leaderboard WHERE rank_type = l.rank_type) as total_users
  FROM leaderboard l WHERE l.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (total_sessions INT, total_duration INT, today_count INT, week_count INT, favorite_mode TEXT)
SECURITY DEFINER SET search_path = public LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT us.total_sessions, us.total_duration, us.today_count,
    (SELECT COUNT(*)::INT FROM sessions WHERE user_id = p_user_id AND completed_at >= date_trunc('week', CURRENT_DATE)) as week_count,
    (SELECT mode FROM sessions WHERE user_id = p_user_id GROUP BY mode ORDER BY COUNT(*) DESC LIMIT 1) as favorite_mode
  FROM user_stats us WHERE us.user_id = p_user_id;
END;
$$;