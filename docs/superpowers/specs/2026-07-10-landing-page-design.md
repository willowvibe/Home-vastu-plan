# Landing Page + Auth Redirect — Design

> **Status:** Approved (2026-07-10). Next step: implementation plan via the writing-plans skill.
> **Branch:** `feat/landing-page` off `main`.

## Goal

Ship a public marketing **landing page** for VastuPlan 2D at `/`, built from the
Cursor-design-system prototype at
`/mnt/data2/git_repos/others/open-design/.od/projects/48ded72d-3103-40b1-8bf5-66f6fe8aaf2e/index.html`
(reproduced 1:1 in markup and CSS). The landing's sign-up / sign-in flow uses
**Supabase magic link** (email) and **Google OAuth**. After a successful sign-in,
the user is redirected to the actual webapp (the planner) at `/app`.

## Non-goals (YAGNI)

- Separate pricing / terms / privacy / blog pages.
- Hard auth-gating of `/app` (anonymous use stays allowed, matching today's optional-auth behavior).
- Converting the landing CSS to Tailwind. The landing keeps its own scoped CSS.
- Changes to the planner UI itself.

## Decisions (locked during brainstorming)

1. **React landing route** — port the index.html design into a React `<Landing />`
   component. The webapp (planner) moves to `/app`; `/` becomes the landing.
2. **Magic link + Google OAuth** — landing collects an email and sends a Supabase
   magic link; a "Continue with Google" button triggers Supabase OAuth. Both
   redirect to `/auth/callback` → `/app`.
3. **react-router-dom** (v7, React 19-compatible) for the three routes.

## Architecture

### Routing (`src/main.tsx`)

Replace the direct `<App />` mount with a `<BrowserRouter>` + `<Routes>`:

| Path             | Component        | Notes                                                         |
| ---------------- | ---------------- | ------------------------------------------------------------- |
| `/`              | `<Landing />`     | Marketing page. Redirects to `/app` if already authenticated. |
| `/app`           | `<App />`        | The existing planner, unchanged. Anonymous use allowed.       |
| `/auth/callback` | `<AuthCallback>` | Handles magic-link / OAuth / password-reset redirects.       |
| `*`              | `<Navigate to="/">` | Unknown paths fall back to the landing.                    |

- `AuthProvider` stays outside the router (in `main.tsx`), so it wraps all routes.
- The Vite `index.html` stays the single build entry; the service-worker
  registration in `main.tsx` is unchanged.
- **Vercel SPA rewrite** — the existing `vercel.json` (which has `framework`,
  `buildCommand`, `outputDirectory`, `cleanUrls`, `trailingSlash`, and `headers`
  but no `rewrites`) gets a `rewrites` key added:
  `rewrites: [{ source: "/(.*)", destination: "/index.html" }]`. No existing keys
  are changed. This closes the known Vercel SPA-rewrite gap so client-side deep
  links (`/app`, `/auth/callback`) resolve in production.

### The `<Landing />` component (`src/pages/Landing.tsx`)

- New `src/pages/` directory for route-level components.
- Reproduce the index.html markup as JSX: `topnav`, `hero`, `features`,
  `how-it-works` (with the animated SVG compass), `quote`, `pricing` table,
  `signup` form, `footer`. Preserve structure, copy, and the energy-ring / zone
  SVG animations 1:1.
- `document.title` is set to the landing title (`"VastuPlan 2D — Design Indian homes that feel right"`)
  via a small `useEffect` so the browser tab matches the page (the static
  `index.html` title stays generic for the planner).

### CSS scoping (`src/pages/landing.css`)

- Extract the index.html `<style>` block verbatim into `src/pages/landing.css`,
  imported by `Landing.tsx`.
- **Scope the design tokens** to avoid clashing with the planner's Tailwind slate
  theme: wrap the landing's `:root` token block under `:where(.landing-scope)`
  and prefix all section selectors (`.topnav`, `.hero`, `.card`, `.btn`, etc.)
  with `.landing-scope`. The landing root `<div>` carries `className="landing-scope"`.
- The CSS continues to reference `var(--bg)`, `var(--accent)`, etc. — now those
  resolve only inside `.landing-scope`, leaving the planner's `--accent` /
  Tailwind tokens untouched.

### Auth flow

**AuthContext additions** (`src/contexts/AuthContext.tsx` + `AuthContext.test.tsx`):

- `sendMagicLink(email: string): Promise<AuthResult>` — wraps
  `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + "/auth/callback" } })`.
  Works for both new sign-ups and existing sign-ins (Supabase sends a link
  either way), so the landing's "Sign up free" and "Sign in" links both drive
  this one form.
- `signInWithGoogle(): Promise<AuthResult>` — wraps
  `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth/callback" } })`.
- Both get disabled-fallback implementations that return
  `{ error: new Error("Supabase Auth is not configured") }` when `supabase` is null.
- `AuthContextValue` interface is extended with the two new methods.

**Landing form behavior** (preserving the existing email-validation logic from
the index.html script):

- Email field + "Sign up free" submit → validate with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  → on valid input, call `sendMagicLink(email)`, then show the design's existing
  success message "Check your inbox for a magic link to sign in." and clear the
  field. On error, show the existing error message styling.
- New **"Continue with Google"** button below the form, styled with the design
  system's `.btn-secondary` → calls `signInWithGoogle()`.
- The `#signin` and `#signup` nav anchors both scroll to the signup form (single
  magic-link form serves both intents).
- Track `landing_signup_submit`, `landing_magic_link_sent`, and
  `landing_google_click` via the existing `trackEvent` / `EVENTS` in
  `src/services/analytics.ts`.

**`<AuthCallback />` (`src/pages/AuthCallback.tsx`):**

- Renders a centered "Signing you in…" spinner state.
- On mount, calls `supabase.auth.exchangeCodeForSession(window.location.href)`
  (PKCE flow — supabase-js v2 default) to materialize the session from the URL.
  On success, `navigate("/app")`. On failure, `navigate("/")` and surface a toast
  via `useToast`.
- AuthContext's existing `onAuthStateChange` subscription keeps the session in
  sync app-wide once the callback resolves.

### Post-auth redirect

- Magic link: user enters email on `/` → sees "Check your inbox" → clicks the
  email link → lands on `/auth/callback` → session established → `/app`.
- Google: button on `/` → Google consent → back to `/auth/callback` → `/app`.
- Already-authenticated users hitting `/` are redirected to `/app` (no marketing
  page for signed-in users).

## Files

**New:**
- `src/pages/Landing.tsx`
- `src/pages/landing.css`
- `src/pages/AuthCallback.tsx`
- `src/pages/__tests__/Landing.test.tsx`
- `src/pages/__tests__/AuthCallback.test.tsx`

**Modified:**
- `src/main.tsx` — `BrowserRouter` + `<Routes>`; `AuthProvider` wraps the router.
- `src/contexts/AuthContext.tsx` — `sendMagicLink`, `signInWithGoogle`, interface.
- `src/contexts/AuthContext.test.tsx` — new methods + disabled fallbacks.
- `src/services/analytics.ts` — new landing event keys.
- `package.json` — add `react-router-dom`.
- `vercel.json` — add `rewrites` key (see Routing above); preserve all existing keys.

## Testing

Tests-with-change (per CLAUDE.md), using the existing `localStorage`-shim and
component-testing patterns:

- **`Landing.test.tsx`** — form validation (empty / invalid / valid email),
  magic-link submit calls `sendMagicLink` with the email and renders the success
  message, Google button calls `signInWithGoogle`, `#signin`/`#signup` anchors
  scroll to the form.
- **`AuthCallback.test.tsx`** — redirects to `/app` on a successful
  `exchangeCodeForSession`, redirects to `/` + shows a toast on failure.
- **`AuthContext.test.tsx`** — `sendMagicLink` and `signInWithGoogle` happy path
  (mocked supabase), disabled-fallback returns the "not configured" error,
  `emailRedirectTo` / `redirectTo` point at `/auth/callback`.

## Global constraints

- TypeScript strict, no `any` without justification.
- New dependency `react-router-dom` is justified by the locked decision (routing
  for the marketing site).
- Conventional commits: `feat:`, `test:`, `refactor:`, `docs:`.
- Tailwind v4 config-in-CSS (`src/index.css`) is untouched; the landing uses its
  own scoped CSS, not Tailwind.
- Branch off `main`; PR + green CI is the only path to merge.