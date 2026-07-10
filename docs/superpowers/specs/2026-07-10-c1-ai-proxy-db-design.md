# C1 AI Proxy + Database Architecture — Design Spec

> **Status:** Approved 2026-07-10.
> **Scope:** Move Gemini + Ollama AI calls behind `server/` on Railway, architect the public Supabase schema (6 tables), and replace the client-side Gemini SDK with an authenticated fetch wrapper.
> **Branch:** `feat/c1-ai-proxy-db` (off `main`).
> **Prerequisite for:** M-2 Razorpay, v0.2 monetization wedge.

## Motivation

The Gemini API key is currently exposed in the browser bundle (`VITE_GEMINI_API_KEY` in `src/services/gemini.ts` → `new GoogleGenAI({ apiKey: key })`). This is the single Critical finding from the 2026-07-07 codebase audit (C1). Any visitor can extract the key and consume quota.

The fix: move ALL AI calls behind `server/` on Railway. The client sends authenticated requests to `POST /api/ai/analyze` and `POST /api/ai/edit-image`; the server holds the keys and routes to the configured provider (Gemini or Ollama). The client never sees an API key.

At the same time, the Supabase `public` schema is empty — the server's `plans`, `sync`, and `share` API routes reference tables that don't exist. This design creates those tables plus new ones for AI usage tracking (lead gen) and user entitlements (v0.2 Pro Export).

## Section 1: Server-side AI Proxy

### Directory structure

```
server/src/ai/
  index.ts          — Express router, mounts /api/ai/* routes
  gemini.ts         — Gemini provider (text analysis + image editing)
  ollama.ts         — Ollama provider (text analysis only)
  types.ts          — Shared types (AiProvider, AnalyzeRequest, etc.)
```

### Endpoints

Both behind `authenticate` middleware (Supabase JWT).

| Endpoint | Method | Backends | Notes |
|---|---|---|---|
| `/api/ai/analyze` | POST | Gemini or Ollama | Text-in/text-out Vastu analysis. Provider chosen by `AI_PROVIDER` env var. |
| `/api/ai/edit-image` | POST | Gemini only | Multipart form data (image + prompt). Returns 501 if Ollama is configured. |

### Provider configuration

Provider selection: `AI_PROVIDER=gemini|ollama` env var.

```
# Gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash          # for analyze
GEMINI_IMAGE_MODEL=gemini-2.0-flash    # for edit-image

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-v4-pro           # or glm-5.2, minimax-m3, kimi-k2.7, etc.
```

### Error handling

| Scenario | Status | Response |
|---|---|---|
| Ollama unreachable | 502 | `{"error":"AI service unavailable","provider":"ollama"}` |
| Gemini quota exceeded | 429 | `{"error":"AI service quota exceeded","provider":"gemini"}` |
| Image edit on Ollama | 501 | `{"error":"Image editing requires Gemini","configured_provider":"ollama"}` |
| Missing auth | 401 | `{"error":"Unauthorized"}` |
| Invalid request body | 400 | `{"error":"..."}` |

### Request/Response shapes

**`POST /api/ai/analyze`**
```json
// Request
{ "plan": <FloorPlan>, "currentFloor": 0 }

// Response (200)
{ "text": "# Vastu Analysis\n\n..." }
```

**`POST /api/ai/edit-image`**
```
// Request: multipart/form-data
//   image: <File>
//   prompt: "Add a window to the north wall"

// Response (200)
{ "imageUrl": "data:image/png;base64,..." }
```

### Server dependency

Add `@google/genai` to `server/package.json` (the Gemini SDK). Ollama uses raw `fetch` — no additional dependency.

## Section 2: Database Architecture

Six tables in `public` schema. Three the server code already references (but don't exist), three new for C1 + v0.2.

### Existing (referenced by server API routes)

```sql
-- 1. users (mirrors auth.users for JOINs)
CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. plans
CREATE TABLE public.plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  data_json   JSONB DEFAULT '{}',
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. plan_shares
CREATE TABLE public.plan_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share_uuid  UUID NOT NULL UNIQUE,
  permissions TEXT DEFAULT 'read',  -- 'read' | 'write' | 'comment'
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. sync_queue
CREATE TABLE public.sync_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  operation   TEXT NOT NULL,  -- 'add' | 'update' | 'delete' | 'move'
  data_json   JSONB,
  synced      BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### New (C1 + v0.2)

```sql
-- 5. ai_usage — lead gen + activity tracking
CREATE TABLE public.ai_usage (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  endpoint      TEXT NOT NULL,  -- 'analyze' | 'edit-image'
  provider      TEXT NOT NULL,  -- 'gemini' | 'ollama'
  model         TEXT,           -- e.g. 'gemini-2.5-flash'
  status        TEXT NOT NULL,  -- 'success' | 'error'
  error_message TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 6. user_entitlements — server-side Pro claims (replaces localStorage trust)
CREATE TABLE public.user_entitlements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  tier          TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'consultant'
  source        TEXT NOT NULL,  -- 'manual' | 'razorpay' | 'promo'
  expires_at    TIMESTAMPTZ,    -- NULL = never expires
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### Auto-create trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### RLS policies

All tables: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Policies scoped to `auth.uid() = user_id` for row ownership. `plan_shares` additionally allows read access via valid `share_uuid`.

### Indexes

- `plans(user_id, updated_at)` — list plans by user, sorted by recency
- `ai_usage(user_id, created_at)` — query usage history per user
- `sync_queue(plan_id, synced)` — find pending syncs for a plan
- `plan_shares(share_uuid)` — lookup by share link

### Migration

Single SQL file: `server/db/001_public_schema.sql`. Applied via Supabase MCP `apply_migration` tool.

## Section 3: Client Changes

### `src/services/gemini.ts` — thin fetch wrapper

Replace the `GoogleGenAI` SDK with authenticated `fetch` calls to the server:

```typescript
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL;

export async function analyzeFloorPlan(plan: FloorPlan, currentFloor: number) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_URL}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ plan, currentFloor }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI analysis failed');
  }
  return (await res.json()).text;
}

export async function editFloorPlanImage(imageFile: File, promptText: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const form = new FormData();
  form.append('image', imageFile);
  form.append('prompt', promptText);
  const res = await fetch(`${API_URL}/api/ai/edit-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Image editing failed');
  }
  return (await res.json()).imageUrl;
}
```

### Files changed

| File | Change |
|---|---|
| `src/services/gemini.ts` | Replace GoogleGenAI SDK with fetch |
| `src/vite-env.d.ts` | Remove `VITE_GEMINI_API_KEY`, add `VITE_API_URL` |
| `.env.example` | Remove `VITE_GEMINI_API_KEY`, add `VITE_API_URL` |
| `server/src/ai/index.ts` | New — Express router |
| `server/src/ai/gemini.ts` | New — Gemini provider |
| `server/src/ai/ollama.ts` | New — Ollama provider |
| `server/src/ai/types.ts` | New — shared types |
| `server/src/api/index.ts` | Mount `/api/ai` router with `authenticate` |
| `server/.env.example` | Add AI provider config vars |
| `server/package.json` | Add `@google/genai` dependency |
| `server/db/001_public_schema.sql` | New — migration file |

### No changes to call sites

`usePlanEditor.ts` (line 526) and `ImageEditor.tsx` (line 29) already import from `src/services/gemini.ts`. Function signatures are unchanged — only the implementation changes.

## Out of scope

- Redis rate limiter (separate task — needs Upstash/Redis provisioning)
- Razorpay / `payments` table (M-2)
- Referral / `referrals` table (M-11)
- Collaboration room persistence (in-memory Map is sufficient for now)
- Ollama image models (none of the listed models support image generation)
- Removing `@google/genai` from the client `package.json` (it becomes unused; remove in a follow-up dep cleanup)

## Related

- [[server-architecture-decisions-2026-07-10]] — the 6 architecture decisions this design follows
- [[codebase-audit-2026-07-07]] — the audit that flagged C1 as Critical
- [[m1-vector-pdf-watermark-wip]] — M-1 (completed); M-2 is the next monetization step after C1
- `server/src/api/plans.ts` — references `plans`, `users`, `plan_shares` tables
- `server/src/api/sync.ts` — references `sync_queue` table
- `src/services/gemini.ts` — current client-side Gemini SDK (to be replaced)
