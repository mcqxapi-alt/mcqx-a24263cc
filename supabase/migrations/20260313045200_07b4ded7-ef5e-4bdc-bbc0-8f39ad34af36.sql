
-- Leaderboard function: returns top players by different metrics
-- Uses SECURITY DEFINER to bypass profiles RLS
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_metric text DEFAULT 'accuracy',
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total_attempts integer,
  total_correct integer,
  accuracy numeric,
  streak_days integer,
  challenge_wins integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.display_name, 'Anonymous') AS display_name,
    p.avatar_url,
    p.total_attempts,
    p.total_correct,
    CASE WHEN p.total_attempts > 0 
      THEN ROUND((p.total_correct::numeric / p.total_attempts) * 100, 1)
      ELSE 0 
    END AS accuracy,
    p.streak_days,
    COALESCE((
      SELECT COUNT(*)::integer FROM challenges c
      WHERE c.status = 'finished'
        AND (
          (c.challenger_id = p.id AND c.challenger_score > c.opponent_score)
          OR (c.opponent_id = p.id AND c.opponent_score > c.challenger_score)
        )
    ), 0) AS challenge_wins
  FROM profiles p
  WHERE p.total_attempts >= 10  -- minimum threshold
  ORDER BY
    CASE p_metric
      WHEN 'accuracy' THEN CASE WHEN p.total_attempts > 0 
        THEN ROUND((p.total_correct::numeric / p.total_attempts) * 100, 1) ELSE 0 END
      WHEN 'streak' THEN p.streak_days::numeric
      WHEN 'attempts' THEN p.total_attempts::numeric
      ELSE 0
    END DESC NULLS LAST,
    p.total_attempts DESC
  LIMIT p_limit;
END;
$$;

-- Separate function for wins-based sorting (needs subquery in ORDER BY)
CREATE OR REPLACE FUNCTION public.get_leaderboard_by_wins(
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total_attempts integer,
  total_correct integer,
  accuracy numeric,
  streak_days integer,
  challenge_wins integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    COALESCE(p.display_name, 'Anonymous') AS display_name,
    p.avatar_url,
    p.total_attempts,
    p.total_correct,
    CASE WHEN p.total_attempts > 0 
      THEN ROUND((p.total_correct::numeric / p.total_attempts) * 100, 1)
      ELSE 0 
    END AS accuracy,
    p.streak_days,
    COALESCE((
      SELECT COUNT(*)::integer FROM challenges c
      WHERE c.status = 'finished'
        AND (
          (c.challenger_id = p.id AND c.challenger_score > c.opponent_score)
          OR (c.opponent_id = p.id AND c.opponent_score > c.challenger_score)
        )
    ), 0) AS challenge_wins
  FROM profiles p
  WHERE p.total_attempts >= 1
  ORDER BY challenge_wins DESC, p.total_attempts DESC
  LIMIT p_limit;
END;
$$;
