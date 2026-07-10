-- VastuPlan 2D public schema: users, plans, shares, sync, AI usage, entitlements.
-- Apply via Supabase SQL Editor or CLI: supabase db push

-- 1. users (mirrors auth.users for JOINs)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- 2. plans
CREATE TABLE IF NOT EXISTS public.plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  data_json   JSONB DEFAULT '{}',
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own plans"
  ON public.plans FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read public plans"
  ON public.plans FOR SELECT
  USING (is_public = true);

CREATE INDEX idx_plans_user_updated ON public.plans(user_id, updated_at DESC);

-- 3. plan_shares
CREATE TABLE IF NOT EXISTS public.plan_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share_uuid  UUID NOT NULL UNIQUE,
  permissions TEXT DEFAULT 'read',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plan_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage shares for own plans"
  ON public.plan_shares FOR ALL
  USING (auth.uid() = created_by);

CREATE POLICY "Anyone can read valid share links"
  ON public.plan_shares FOR SELECT
  USING (expires_at IS NULL OR expires_at > now());

CREATE INDEX idx_plan_shares_uuid ON public.plan_shares(share_uuid);

-- 4. sync_queue
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  operation   TEXT NOT NULL,
  data_json   JSONB,
  synced      BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access sync queue for own plans"
  ON public.sync_queue FOR ALL
  USING (
    auth.uid() = (SELECT user_id FROM public.plans WHERE id = plan_id)
  );

CREATE INDEX idx_sync_queue_plan_synced ON public.sync_queue(plan_id, synced);

-- 5. ai_usage
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  endpoint      TEXT NOT NULL,
  provider      TEXT NOT NULL,
  model         TEXT,
  status        TEXT NOT NULL,
  error_message TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI usage"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Server can insert AI usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_usage_user_created ON public.ai_usage(user_id, created_at DESC);

-- 6. user_entitlements
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  tier          TEXT NOT NULL DEFAULT 'free',
  source        TEXT NOT NULL,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entitlements"
  ON public.user_entitlements FOR SELECT
  USING (auth.uid() = user_id);

-- 7. Auto-create public.users row on auth.user insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
