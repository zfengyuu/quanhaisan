-- Quán Hải Sản: server-authoritative virtual economy.
-- Apply to a NEW Supabase project via Dashboard > SQL Editor.
-- No payment or banking data is stored here.
CREATE TABLE IF NOT EXISTS public.game_saves (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins bigint NOT NULL DEFAULT 1200 CHECK(coins >= 0),
  gems integer NOT NULL DEFAULT 22 CHECK(gems >= 0),
  xp integer NOT NULL DEFAULT 0 CHECK(xp >= 0),
  upgrades integer NOT NULL DEFAULT 0 CHECK(upgrades >= 0),
  area integer NOT NULL DEFAULT 1 CHECK(area BETWEEN 1 AND 3),
  inventory jsonb NOT NULL DEFAULT '{"ca-thu":3,"ca-ngu":1,"tom":4,"muc":1,"so":6,"cua":0,"hau":2}'::jsonb,
  last_fished_at timestamptz NOT NULL DEFAULT 'epoch'::timestamptz,
  lifetime_caught integer NOT NULL DEFAULT 0,
  lifetime_sold integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_saves FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.game_saves TO authenticated;
DROP POLICY IF EXISTS "select_own_game" ON public.game_saves;
CREATE POLICY "select_own_game" ON public.game_saves FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- The client may read only its own game. Mutations go through validated RPCs.
CREATE OR REPLACE FUNCTION public.get_game_state()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_user uuid := (SELECT auth.uid());
DECLARE v_game public.game_saves%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Đăng nhập để lưu game'; END IF;
  INSERT INTO public.game_saves(user_id) VALUES(v_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_game FROM public.game_saves WHERE user_id = v_user;
  RETURN jsonb_build_object(
    'coins',v_game.coins,'gems',v_game.gems,
    'xp',v_game.xp,'level',(v_game.xp/100)+1,
    'upgrades',v_game.upgrades,'area',v_game.area,
    'inventory',v_game.inventory,
    'lastFishAt',(EXTRACT(EPOCH FROM v_game.last_fished_at)*1000)::bigint,
    'lifetimeCaught',v_game.lifetime_caught,'lifetimeSold',v_game.lifetime_sold
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_game_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_state() TO authenticated;

CREATE OR REPLACE FUNCTION public.game_action(p_action text,p_item text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_game public.game_saves%ROWTYPE;
  v_cost integer;
  v_price integer;
  v_qty integer;
  v_caught text;
  v_pool text[];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập'; END IF;
  INSERT INTO public.game_saves(user_id) VALUES(v_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_game FROM public.game_saves WHERE user_id = v_user FOR UPDATE;

  IF p_action = 'fish' THEN
    IF clock_timestamp() - v_game.last_fished_at < INTERVAL '3 seconds' THEN
      RAISE EXCEPTION 'Cá chưa cắn câu, đợi 3 giây nhé!';
    END IF;
    IF v_game.area = 1 THEN
      v_pool := ARRAY['ca-thu','ca-thu','tom','so','ca-ngu'];
    ELSE
      v_pool := ARRAY['ca-thu','tom','so','ca-ngu','muc','cua','hau'];
    END IF;
    v_caught := v_pool[1 + floor(random() * array_length(v_pool, 1))::int];
    v_qty := COALESCE((v_game.inventory ->> v_caught)::integer, 0) + 1;
    UPDATE public.game_saves SET
      inventory = jsonb_set(v_game.inventory, ARRAY[v_caught], to_jsonb(v_qty), true),
      xp = xp + 15, lifetime_caught = lifetime_caught + 1,
      last_fished_at = clock_timestamp(),updated_at=now()
    WHERE user_id = v_user;
  ELSIF p_action = 'buy' OR p_action = 'sell' THEN
    IF p_item IS NULL OR p_item NOT IN ('ca-thu','ca-ngu','tom','muc','so','cua','hau') THEN
      RAISE EXCEPTION 'Loại hải sản không hợp lệ';
    END IF;
    v_cost := CASE p_item WHEN 'ca-thu' THEN 95 WHEN 'ca-ngu' THEN 145
      WHEN 'tom' THEN 80 WHEN 'muc' THEN 125 WHEN 'so' THEN 55
      WHEN 'cua' THEN 175 WHEN 'hau' THEN 110 END;
    v_price := CASE p_item WHEN 'ca-thu' THEN 60 WHEN 'ca-ngu' THEN 90
      WHEN 'tom' THEN 50 WHEN 'muc' THEN 80 WHEN 'so' THEN 35
      WHEN 'cua' THEN 110 WHEN 'hau' THEN 70 END;
    v_qty := COALESCE((v_game.inventory ->> p_item)::integer,0);
    IF p_action = 'buy' THEN
      IF v_game.coins < v_cost THEN RAISE EXCEPTION 'Không đủ xu nhập hàng!'; END IF;
      UPDATE public.game_saves SET coins=coins-v_cost,
        inventory=jsonb_set(v_game.inventory,ARRAY[p_item],to_jsonb(v_qty+1),true),
        updated_at=now() WHERE user_id=v_user;
    ELSE
      IF v_qty < 1 THEN RAISE EXCEPTION 'Kho đã hết loại hải sản này!'; END IF;
      UPDATE public.game_saves SET coins=coins+v_price+upgrades*5,
        xp=xp+10,lifetime_sold=lifetime_sold+1,
        inventory=jsonb_set(v_game.inventory,ARRAY[p_item],to_jsonb(v_qty-1),true),
        updated_at=now() WHERE user_id=v_user;
    END IF;
  ELSIF p_action = 'upgrade' THEN
    v_cost := 300 + v_game.upgrades * 250;
    IF v_game.coins < v_cost THEN RAISE EXCEPTION 'Chưa đủ xu nâng cấp!'; END IF;
    UPDATE public.game_saves SET coins=coins-v_cost,upgrades=upgrades+1,xp=xp+30,
      updated_at=now() WHERE user_id=v_user;
  ELSIF p_action = 'unlock' THEN
    IF v_game.area >= 3 THEN RAISE EXCEPTION 'Đã mở hết vùng biển'; END IF;
    v_cost := 800 * v_game.area;
    IF v_game.coins < v_cost THEN RAISE EXCEPTION 'Chưa đủ xu mở vùng biển!'; END IF;
    UPDATE public.game_saves SET coins=coins-v_cost,area=area+1,xp=xp+50,
      updated_at=now() WHERE user_id=v_user;
  ELSE
    RAISE EXCEPTION 'Hành động không hợp lệ';
  END IF;
  RETURN public.get_game_state();
END; $$;
REVOKE ALL ON FUNCTION public.game_action(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_action(text,text) TO authenticated;
