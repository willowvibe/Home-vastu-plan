# Landing Page + Auth Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public marketing landing page at `/` (a 1:1 React port of the Cursor-design index.html), wire its email magic-link + Google OAuth sign-up/sign-in to Supabase, and redirect authenticated users to the existing planner at `/app`.

**Architecture:** Add `react-router-dom` v7 with three routes (`/` Landing, `/app` planner, `/auth/callback` AuthCallback). The landing reproduces the prototype's markup verbatim as JSX, with its CSS extracted to a `landing.css` scoped under a `.landing-scope` nesting wrapper so the warm-cream/terracotta design tokens and keyframes do not leak into the planner's Tailwind slate theme. `AuthContext` gains `sendMagicLink` (Supabase `signInWithOtp`) and `signInWithGoogle` (Supabase `signInWithOAuth`), both redirecting to `/auth/callback`, which watches auth state and forwards to `/app`. A Vercel SPA rewrite is added so client-side deep links resolve in production.

**Tech Stack:** TypeScript strict, React 19, Vite 6, Tailwind v4 (untouched — landing uses its own scoped CSS), `react-router-dom` v7, `@supabase/supabase-js` (already installed), Vitest + @testing-library/react.

## Global Constraints

- TypeScript strict, no `any` without justification.
- New dependency `react-router-dom@^7` is justified by the approved design (routing for the marketing site). No other new deps.
- Tests-with-change: every new source file gets a corresponding test file. Run with `npm test -- --run`.
- Tailwind v4 config-in-CSS (`src/index.css`) is untouched; the landing uses scoped CSS, not Tailwind utilities.
- Conventional commits: `feat:`, `test:`, `refactor:`, `docs:`.
- The Supabase client (`src/lib/supabase.ts`) already sets `detectSessionInUrl: true` with the PKCE flow — it auto-exchanges `?code=...` on a fresh page load. Do NOT call `exchangeCodeForSession` manually in AuthCallback (it would double-fire); watch auth state instead.
- Use relative imports (the codebase uses relative imports throughout, e.g. `../contexts/AuthContext`). The `@` alias maps to repo root but is not used for src cross-imports.
- Branch: `feat/landing-page` (already created off `main`).

## File Structure

- `src/pages/Landing.tsx` — route component rendering the marketing page (markup + interactive chrome + signed-in redirect + magic-link form + Google button).
- `src/pages/landing.css` — the landing's scoped stylesheet (Cursor design system, wrapped under `.landing-scope`).
- `src/pages/AuthCallback.tsx` — route component that materializes the session from a magic-link/OAuth redirect and forwards to `/app`.
- `src/pages/__tests__/Landing.test.tsx` — landing markup + form + Google wiring tests.
- `src/pages/__tests__/AuthCallback.test.tsx` — callback redirect tests.
- `src/main.tsx` (modify) — `BrowserRouter` + `<Routes>`.
- `src/contexts/AuthContext.tsx` (modify) — `sendMagicLink`, `signInWithGoogle`.
- `src/contexts/AuthContext.test.tsx` (modify) — new method tests.
- `src/services/analytics.ts` (modify) — three landing event keys.
- `vercel.json` (modify) — add `rewrites` for SPA deep links.
- `package.json` (modify) — add `react-router-dom`.

---

### Task 1: Routing shell + react-router-dom

**Files:**

- Create: `src/pages/Landing.tsx` (stub)
- Create: `src/pages/AuthCallback.tsx` (stub)
- Modify: `src/main.tsx`
- Modify: `package.json` (via npm install)

**Interfaces:**

- Produces: `export function Landing()` and `export function AuthCallback()` (stub exports consumed by `main.tsx`). Later tasks expand these.

- [ ] **Step 1: Install react-router-dom v7**

Run:

```bash
npm install react-router-dom@^7
```

Expected: package added to `dependencies`; `npm ls react-router-dom` prints a v7 version. React 19 satisfies its `react >=18` peer requirement.

- [ ] **Step 2: Create the Landing stub**

Create `src/pages/Landing.tsx`:

```tsx
export function Landing() {
  return <div className="landing-scope">VastuPlan landing</div>;
}
```

- [ ] **Step 3: Create the AuthCallback stub**

Create `src/pages/AuthCallback.tsx`:

```tsx
export function AuthCallback() {
  return <div>Auth callback</div>;
}
```

- [ ] **Step 4: Rewrite main.tsx with BrowserRouter + Routes**

Replace the entire contents of `src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import { Landing } from './pages/Landing';
import { AuthCallback } from './pages/AuthCallback';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { initSentry } from './services/sentry';
import './index.css';

// Initialize Sentry for error tracking
initSentry();

// Register service worker for PWA (unchanged). See git history for the
// /sw.js-vs-/src/services/sw.ts dev/prod split rationale.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = import.meta.env.DEV ? '/src/services/sw.ts' : '/sw.js';
    navigator.serviceWorker
      .register(swPath)
      .then((registration) => {
        console.log('ServiceWorker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/app" element={<App />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
```

- [ ] **Step 5: Verify typecheck + build**

Run:

```bash
npm run lint:tsc && npm run build
```

Expected: both pass with no errors. The planner is now mounted at `/app`; `/` shows the landing stub.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/main.tsx src/pages/Landing.tsx src/pages/AuthCallback.tsx
git commit -m "feat: add react-router-dom routing shell with landing + callback stubs"
```

---

### Task 2: Scoped landing CSS

**Files:**

- Create: `src/pages/landing.css`
- Modify: `src/pages/Landing.tsx` (import the CSS)

**Interfaces:**

- Produces: a stylesheet whose every selector is a descendant of `.landing-scope`, with tokens scoped to `.landing-scope` and keyframes renamed `lp-spin` / `lp-pulse` / `lp-zone-breathe` so they cannot collide with Tailwind's `animate-spin` / `animate-pulse`.

The source design lives at `/mnt/data2/git_repos/others/open-design/.od/projects/48ded72d-3103-40b1-8bf5-66f6fe8aaf2e/index.html`. Its `<style>` block (lines 14–537) is the verbatim source for this task. The scoping strategy uses **native CSS nesting**: wrap the whole stylesheet in one `.landing-scope { }` block so every flat selector inside becomes `.landing-scope <selector>` automatically — no per-selector hand-editing. Only the `:root`/`html`/`body` head and three keyframe names are edited by hand.

- [ ] **Step 1: Create landing.css with the scoped wrapper head**

Create `src/pages/landing.css`. Open the file with the `.landing-scope` wrapper, then paste the design tokens (the declarations from the index.html `:root { }` block, lines 16–94, de-indented) as direct properties of `.landing-scope`, then add the base styles (moved off the original `html`/`body` rules) and scoped resets:

```css
/* VastuPlan landing page — Cursor design system.
   Scoped under .landing-scope via native CSS nesting so tokens, keyframes,
   and selectors do not leak into the planner (Tailwind slate theme).
   Source: open-design project 48ded72d index.html <style> block. Keyframes
   are renamed with an `lp-` prefix to avoid colliding with Tailwind's
   animate-spin / animate-pulse. */
.landing-scope {
  --bg:      #f2f1ed;
  --surface: #ffffff;
  --surface-warm: #ebeae5;
  --surface-400: #e6e5e0;
  --fg:      #26251e;
  --fg-2:    rgba(38, 37, 30, 0.9);
  --muted:   rgba(38, 37, 30, 0.55);
  --meta:    rgba(38, 37, 30, 0.4);
  --border:  rgba(38, 37, 30, 0.1);
  --border-soft: rgba(38, 37, 30, 0.06);
  --border-strong: rgba(38, 37, 30, 0.55);

  --accent:       #f54e00;
  --accent-on:    #ffffff;
  --accent-hover: color-mix(in oklab, var(--accent), black 8%);
  --accent-active: color-mix(in oklab, var(--accent), black 14%);
  --accent-soft:  color-mix(in oklab, var(--accent) 10%, transparent);

  --success: #1f8a65;
  --error:   #cf2d56;
  --warn:    #eab308;

  --font-display: "Iowan Old Style", "Charter", Georgia, "Times New Roman", Times, serif;
  --font-body:    Georgia, "Times New Roman", Times, serif;
  --font-mono:    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --font-ui:      system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  --text-xs: 11px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 19.2px;
  --text-xl: 22px;
  --text-2xl: 26px;
  --text-3xl: 36px;
  --text-4xl: 72px;

  --fs-h1: clamp(38px, 7.2vw, 78px);
  --fs-h2: clamp(28px, 4.2vw, 48px);
  --fs-h3: clamp(20px, 2.2vw, 24px);
  --fs-lead: clamp(17px, 1.8vw, 21px);
  --fs-body: clamp(15px, 1.4vw, 17px);
  --fs-meta: clamp(11px, 1.1vw, 13px);
  --fs-ui: clamp(13px, 1.2vw, 14px);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  --gap-xs: 8px;
  --gap-sm: 12px;
  --gap-md: 20px;
  --gap-lg: 28px;
  --gap-xl: 40px;
  --gap-2xl: 72px;
  --section-y: clamp(64px, 10vw, 120px);
  --container: 1240px;
  --gutter: clamp(16px, 2.4vw, 24px);

  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-pill: 9999px;

  --elev-ring: 0 0 0 1px var(--border);
  --elev-raised:
    0 28px 70px rgba(0, 0, 0, 0.14),
    0 14px 32px rgba(0, 0, 0, 0.1),
    0 0 0 1px var(--border);
  --focus-ring: 0 4px 12px rgba(0, 0, 0, 0.1);
  --motion-fast: 150ms;
  --motion-base: 200ms;
  --ease-standard: ease;

  /* base styles — moved off the original html/body rules (body is app-controlled) */
  overflow-x: hidden;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  line-height: 1.55;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;

  /* scoped resets (originally global *, a, button, p, headings, img/svg) */
  *, *::before, *::after { box-sizing: border-box; }
  img, svg { display: block; max-width: 100%; }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; cursor: pointer; }
  p { text-wrap: pretty; }
  h1, h2, h3, h4 { text-wrap: pretty; }
```

- [ ] **Step 2: Paste the verbatim component rules inside the wrapper**

Continue inside the same `.landing-scope { }` block: paste the index.html stylesheet content from the `/* ─── layout primitives ─── */` comment (line 121) through the `.signup-form .input { flex: 1 1 100%; }` rule inside its `@media` block (line 536) **verbatim**. Because of native CSS nesting, every selector pasted here is automatically scoped to `.landing-scope` (e.g. `.container` becomes `.landing-scope .container`, `.h1, h1` becomes `.landing-scope .h1, .landing-scope h1`, nested `@media { .grid-2 {} }` becomes `@media { .landing-scope .grid-2 {} }`). Do not edit these selectors.

- [ ] **Step 3: Rename the three keyframes and their references**

While pasting (or after), apply exactly these six renames inside the wrapper:

| Find                         | Replace                         |
| ---------------------------- | ------------------------------- |
| `@keyframes spin`            | `@keyframes lp-spin`            |
| `@keyframes pulse`           | `@keyframes lp-pulse`           |
| `@keyframes zone-breathe`    | `@keyframes lp-zone-breathe`    |
| `animation: spin 60s`        | `animation: lp-spin 60s`        |
| `animation: pulse 4s`        | `animation: lp-pulse 4s`        |
| `animation: zone-breathe 6s` | `animation: lp-zone-breathe 6s` |

The `.pulse`, `.pulse-delay-1/2/3`, and `.energy-zone` class names stay unchanged (they are selector hooks, not keyframe names).

- [ ] **Step 4: Close the wrapper**

End the file with the closing brace for `.landing-scope`:

```css
} /* end .landing-scope */
```

- [ ] **Step 5: Import the CSS in the Landing stub**

Replace `src/pages/Landing.tsx` with:

```tsx
import './landing.css';

export function Landing() {
  return <div className="landing-scope">VastuPlan landing</div>;
}
```

- [ ] **Step 6: Verify build (CSS parses, nesting accepted)**

Run:

```bash
npm run build
```

Expected: build succeeds. If Vite reports an unknown at-rule or nesting error, confirm the six keyframe renames were applied and that the `.landing-scope { }` block is balanced (one open at the top, one close at the bottom).

- [ ] **Step 7: Commit**

```bash
git add src/pages/landing.css src/pages/Landing.tsx
git commit -m "feat: add scoped landing stylesheet (Cursor design system)"
```

---

### Task 3: Landing markup + interactive chrome + signed-in redirect

**Files:**

- Modify: `src/pages/Landing.tsx` (full markup; form is controlled but not yet auth-wired — Task 5 wires it)
- Test: `src/pages/__tests__/Landing.test.tsx`

**Interfaces:**

- Consumes: `useAuth()` from `src/contexts/AuthContext` (only `isAuthenticated` here; Task 5 adds `sendMagicLink`/`signInWithGoogle`).
- Produces: a `<Landing />` that renders the full marketing page, redirects to `/app` when `isAuthenticated`, sets `document.title`, enables smooth in-page scrolling for its lifetime, highlights the active nav section on scroll, and validates the email form (empty/invalid → error message; valid → clear). The `#signin` and `#signup` anchors both target the form section (`id="signup"`).

- [ ] **Step 1: Write the failing test**

Create `src/pages/__tests__/Landing.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Landing } from '../Landing';

const authState = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<div data-testid="app" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Landing', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
  });

  it('renders the hero headline', () => {
    renderLanding();
    expect(screen.getByText(/Design Indian homes that feel/i)).toBeInTheDocument();
  });

  it('renders the three feature cards', () => {
    renderLanding();
    expect(screen.getByText('Live Vastu score')).toBeInTheDocument();
    expect(screen.getByText('Smart floor plans')).toBeInTheDocument();
    expect(screen.getByText('AI design review')).toBeInTheDocument();
  });

  it('toggles the mobile nav open state', () => {
    renderLanding();
    const toggle = screen.getByLabelText('Open menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows an error on empty submit', () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }));
    expect(screen.getByText('Please enter your email address.')).toBeInTheDocument();
  });

  it('shows an error on an invalid email', () => {
    renderLanding();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'foo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }));
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
  });

  it('redirects to /app when already authenticated', () => {
    authState.isAuthenticated = true;
    renderLanding();
    expect(screen.getByTestId('app')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- --run src/pages/__tests__/Landing.test.tsx
```

Expected: FAIL — "Unable to find ... Design Indian homes" (the stub only renders "VastuPlan landing").

- [ ] **Step 3: Write the full Landing component**

Replace `src/pages/Landing.tsx` with:

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './landing.css';

export function Landing() {
  const { isAuthenticated } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [invalid, setInvalid] = useState(false);

  // Signed-in users skip the marketing page.
  if (isAuthenticated) return <Navigate to="/app" replace />;

  // Smooth-scroll for in-page anchor links, scoped to the landing's lifetime.
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  // Document title for the landing page (the planner sets its own elsewhere).
  useEffect(() => {
    const prev = document.title;
    document.title = 'VastuPlan 2D — Design Indian homes that feel right';
    return () => {
      document.title = prev;
    };
  }, []);

  // Active-section highlighting in the topnav.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'));
    const onScroll = () => {
      let current = '';
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top <= 120) current = sec.id;
      }
      setActiveId(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setInvalid(false);
    setMessageType('');
    setMessage('');
    if (!value) {
      setInvalid(true);
      setMessageType('error');
      setMessage('Please enter your email address.');
      return;
    }
    if (!valid) {
      setInvalid(true);
      setMessageType('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    // Task 5 wires this to sendMagicLink + Google. For now, just clear.
    setEmail('');
  };

  return (
    <div className="landing-scope">
      <header className="topnav" data-od-id="topnav">
        <div className="container topnav-inner">
          <span className="logo">VastuPlan</span>
          <button
            className="nav-toggle"
            id="navToggle"
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="topnavNav"
            onClick={() => setNavOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <nav id="topnavNav" className={navOpen ? 'is-open' : ''}>
            <a
              href="#how-it-works"
              className={activeId === 'how-it-works' ? 'is-active' : ''}
              onClick={() => setNavOpen(false)}
            >
              How it works
            </a>
            <a
              href="#features"
              className={activeId === 'features' ? 'is-active' : ''}
              onClick={() => setNavOpen(false)}
            >
              Features
            </a>
            <a
              href="#pricing"
              className={activeId === 'pricing' ? 'is-active' : ''}
              onClick={() => setNavOpen(false)}
            >
              Pricing
            </a>
            <a
              className="btn btn-accent btn-mobile"
              href="#signup"
              onClick={() => setNavOpen(false)}
            >
              Sign up
            </a>
          </nav>
          <div
            className="topnav-actions"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}
          >
            <a className="btn btn-ghost" href="#signup">
              Sign in
            </a>
            <a className="btn btn-primary" href="#signup">
              Sign up free
            </a>
          </div>
        </div>
      </header>

      <main id="content">
        <section className="section hero" id="hero" data-od-id="hero">
          <div className="container hero-center">
            <p className="eyebrow">Vastu-first home design</p>
            <h1>Design Indian homes that feel&nbsp;right.</h1>
            <p className="lead">
              Drag, drop, and align rooms to Vastu Shastra — with live scoring, zone guides, and AI
              feedback in one simple 2D planner.
            </p>
            <div className="hero-cta">
              <a className="btn btn-accent" href="#signup">
                Sign up free
              </a>
              <a className="btn btn-secondary" href="#how-it-works">
                See how it works
              </a>
            </div>
          </div>
        </section>

        <section className="section" id="features" data-od-id="features">
          <div className="container stack">
            <div className="section-header center">
              <p className="eyebrow">What’s different</p>
              <h2>Three things you’ll notice in the first ten minutes.</h2>
            </div>
            <div className="grid-3">
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l3 2" />
                  </svg>
                </div>
                <h3>Live Vastu score</h3>
                <p>
                  Every room is scored out of 100 as you move it. Green, yellow, and red zones show
                  exactly where your layout aligns with tradition.
                </p>
              </div>
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M4 7h16M4 12h10M4 17h16" />
                  </svg>
                </div>
                <h3>Smart floor plans</h3>
                <p>
                  Drag rooms, resize with handles, and let collision detection keep walls flush.
                  Multi-floor support for ground, first, and terrace levels.
                </p>
              </div>
              <div className="feature card">
                <div className="feature-mark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                    <path d="M12 3v18M3 12h18" />
                  </svg>
                </div>
                <h3>AI design review</h3>
                <p>
                  Send your plan to Gemini for an instant Vastu + architecture report. Get
                  plain-language fixes you can drag into place right away.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works" data-od-id="how-it-works">
          <div className="container">
            <div className="section-header center">
              <p className="eyebrow">How it works</p>
              <h2>Set your plot, place your rooms, check your score.</h2>
            </div>
            <div className="grid-2" style={{ alignItems: 'center' }}>
              <ul className="split-list">
                <li>Enter plot width, length, road facing, and north angle.</li>
                <li>Add bedrooms, kitchen, pooja room, parking, and more.</li>
                <li>Toggle the Vastu grid overlay to see zones instantly.</li>
                <li>Export PNG, PDF, SVG, or a shareable link for your architect.</li>
              </ul>
              <div className="product-mock" aria-label="Floor plan canvas mockup with Vastu zones">
                <div className="energy-ring" aria-hidden="true">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <g fill="none" stroke="var(--accent)" strokeWidth={0.6}>
                      <circle
                        cx="100"
                        cy="100"
                        r="78"
                        className="pulse pulse-delay-1"
                        opacity={0.35}
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="64"
                        className="pulse pulse-delay-2"
                        opacity={0.45}
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="50"
                        className="pulse pulse-delay-3"
                        opacity={0.55}
                      />
                    </g>
                    <g fill="none" stroke="var(--accent)" strokeWidth={0.4} opacity={0.25}>
                      <line x1="100" y1="14" x2="100" y2="186" />
                      <line x1="14" y1="100" x2="186" y2="100" />
                      <line x1="35" y1="35" x2="165" y2="165" />
                      <line x1="165" y1="35" x2="35" y2="165" />
                    </g>
                  </svg>
                </div>
                <svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="20"
                    y="20"
                    width="600"
                    height="360"
                    fill="var(--bg)"
                    stroke="var(--border)"
                    strokeWidth={2}
                    rx="12"
                  />
                  <g opacity={0.12}>
                    <line
                      x1="220"
                      y1="20"
                      x2="220"
                      y2="380"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                    <line
                      x1="420"
                      y1="20"
                      x2="420"
                      y2="380"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                    <line
                      x1="20"
                      y1="146"
                      x2="620"
                      y2="146"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                    <line
                      x1="20"
                      y1="272"
                      x2="620"
                      y2="272"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                  </g>
                  <rect
                    x="60"
                    y="180"
                    width="120"
                    height="140"
                    fill="var(--surface-400)"
                    stroke="var(--fg)"
                    strokeWidth={2}
                    rx="4"
                    className="energy-zone pulse-delay-1"
                  />
                  <rect
                    x="240"
                    y="60"
                    width="140"
                    height="100"
                    fill="var(--surface-400)"
                    stroke="var(--fg)"
                    strokeWidth={2}
                    rx="4"
                    className="energy-zone pulse-delay-2"
                  />
                  <rect
                    x="460"
                    y="180"
                    width="120"
                    height="140"
                    fill="var(--surface-400)"
                    stroke="var(--fg)"
                    strokeWidth={2}
                    rx="4"
                    className="energy-zone pulse-delay-3"
                  />
                  <text
                    x="120"
                    y="255"
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize={13}
                    fill="var(--muted)"
                  >
                    Bedroom
                  </text>
                  <text
                    x="310"
                    y="115"
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize={13}
                    fill="var(--muted)"
                  >
                    Kitchen
                  </text>
                  <text
                    x="520"
                    y="255"
                    textAnchor="middle"
                    fontFamily="var(--font-body)"
                    fontSize={13}
                    fill="var(--muted)"
                  >
                    Pooja
                  </text>
                  <circle
                    cx="320"
                    cy="310"
                    r="18"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                  />
                  <path d="M320 298 l6 12 h-12 z" fill="var(--accent)" />
                </svg>
                <span className="mock-label n">North</span>
                <span className="mock-label ne">NE — Water</span>
                <span className="mock-label se">SE — Fire</span>
                <span className="mock-label sw">SW — Earth</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" data-od-id="quote">
          <div className="container">
            <div className="section-header center">
              <div className="quote-mark">&ldquo;</div>
              <blockquote className="quote">
                We used VastuPlan to finalize our 35×45 ft layout in one evening. The score made the
                family discussion objective instead of circular.
              </blockquote>
              <p className="quote-author">— Ananya R., Bengaluru</p>
            </div>
          </div>
        </section>

        <section className="section" id="pricing" data-od-id="pricing">
          <div className="container">
            <div className="section-header center">
              <p className="eyebrow">Pricing</p>
              <h2>Free to plan. Fair to grow.</h2>
            </div>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="num-col">Free</th>
                  <th className="num-col">Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Drag-and-drop floor plans</td>
                  <td className="num-col">✓</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr>
                  <td>Vastu grid + live score</td>
                  <td className="num-col">✓</td>
                  <td className="num-col">✓</td>
                </tr>
                <tr>
                  <td>PNG / PDF / SVG export</td>
                  <td className="num-col">PNG</td>
                  <td className="num-col">All</td>
                </tr>
                <tr>
                  <td>Multi-floor projects</td>
                  <td className="num-col">1 floor</td>
                  <td className="num-col">Unlimited</td>
                </tr>
                <tr>
                  <td>AI design review</td>
                  <td className="num-col">3/month</td>
                  <td className="num-col">Unlimited</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--border-strong)' }}>
                  <td>
                    <strong>Monthly</strong>
                  </td>
                  <td className="num-col">
                    <strong>₹0</strong>
                  </td>
                  <td className="num-col">
                    <strong>₹499</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="section" id="signup" data-od-id="signup">
          <div className="container">
            <div className="section-header center">
              <p className="eyebrow">Create your account</p>
              <h2>Start your first Vastu plan today.</h2>
              <p className="lead" style={{ margin: '16px auto 32px' }}>
                Sign up free and start designing floor plans with live Vastu scoring. No credit card
                needed.
              </p>
            </div>
            <div
              className="signup-form-wrapper"
              style={{ maxWidth: '520px', marginInline: 'auto' }}
            >
              <form className="signup-form" onSubmit={handleSubmit} noValidate>
                <input
                  className={`input ${invalid ? 'is-invalid' : ''}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                />
                <button className="btn btn-accent" type="submit">
                  Sign up free
                </button>
              </form>
              <p className={`form-message ${messageType}`} aria-live="polite">
                {message}
              </p>
              <p className="meta" style={{ marginTop: '18px' }}>
                Already have an account?{' '}
                <a href="#signup" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="pagefoot" data-od-id="footer">
        <div className="container row-between">
          <span>© 2026 VastuPlan · Built for Indian homes</span>
          <span className="meta">contact@vastuplan.app</span>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm test -- --run src/pages/__tests__/Landing.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Verify typecheck + build**

Run:

```bash
npm run lint:tsc && npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Landing.tsx src/pages/__tests__/Landing.test.tsx
git commit -m "feat: render landing page markup with interactive chrome and auth redirect"
```

---

### Task 4: AuthContext — sendMagicLink + signInWithGoogle

**Files:**

- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/contexts/AuthContext.test.tsx`

**Interfaces:**

- Produces: `AuthContextValue.sendMagicLink(email: string): Promise<AuthResult>` and `AuthContextValue.signInWithGoogle(): Promise<AuthResult>`. Both pass `emailRedirectTo`/`redirectTo` equal to `${window.location.origin}/auth/callback`. Disabled fallback (when `supabase` is null) returns `{ error: new Error('Supabase Auth is not configured') }` — structurally identical to the existing `signIn`/`signUp` fallbacks (which are also untested in the current suite; we mirror that coverage level).

- [ ] **Step 1: Write the failing tests**

Open `src/contexts/AuthContext.test.tsx`. First, extend the `MockSupabaseClient['auth']` interface — add these two lines inside the `auth: { ... }` type block (after `resetPasswordForEmail`):

```ts
signInWithOtp: Mock<
  (args: {
    email: string;
    options: { emailRedirectTo: string };
  }) => Promise<{ error: Error | null }>
>;
signInWithOAuth: Mock<
  (args: { provider: string; options: { redirectTo: string } }) => Promise<{ error: Error | null }>
>;
```

Then add the two mocks to the `vi.mock('../lib/supabase', ...)` factory's `auth` object (after `resetPasswordForEmail: vi.fn(),`):

```ts
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
```

Then in the `beforeEach` block, add resets (after `mockAuth().resetPasswordForEmail.mockReset();`):

```ts
mockAuth().signInWithOtp.mockReset();
mockAuth().signInWithOAuth.mockReset();
```

Then add these three tests inside the `describe('AuthContext', ...)` block:

```tsx
it('sendMagicLink calls signInWithOtp with the email and /auth/callback redirect', async () => {
  mockAuth().signInWithOtp.mockResolvedValue({ error: null });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isEnabled).toBe(true));
  const res = await result.current.sendMagicLink('a@b.com');
  expect(res.error).toBeNull();
  expect(mockAuth().signInWithOtp).toHaveBeenCalledWith({
    email: 'a@b.com',
    options: { emailRedirectTo: expect.stringContaining('/auth/callback') },
  });
});

it('signInWithGoogle calls signInWithOAuth with provider google and /auth/callback redirect', async () => {
  mockAuth().signInWithOAuth.mockResolvedValue({ error: null });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isEnabled).toBe(true));
  const res = await result.current.signInWithGoogle();
  expect(res.error).toBeNull();
  expect(mockAuth().signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: expect.stringContaining('/auth/callback') },
  });
});

it('sendMagicLink surfaces supabase errors', async () => {
  mockAuth().signInWithOtp.mockResolvedValue({ error: new Error('nope') });
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isEnabled).toBe(true));
  const res = await result.current.sendMagicLink('a@b.com');
  expect(res.error?.message).toBe('nope');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- --run src/contexts/AuthContext.test.tsx
```

Expected: the three new tests FAIL — `result.current.sendMagicLink is not a function` / `signInWithGoogle is not a function`.

- [ ] **Step 3: Extend the AuthContextValue interface**

In `src/contexts/AuthContext.tsx`, add these two lines to the `AuthContextValue` interface, immediately after the `resetPassword` declaration:

```ts
/** Send a magic-link sign-in email (works for new and existing users). */
sendMagicLink: (email: string) => Promise<AuthResult>;
/** Start Google OAuth sign-in. */
signInWithGoogle: () => Promise<AuthResult>;
```

- [ ] **Step 4: Add disabled-fallback implementations**

In `src/contexts/AuthContext.tsx`, add these two lines to the `disabledValue` object, immediately after the `resetPassword` line:

```ts
  sendMagicLink: async () => ({ error: new Error('Supabase Auth is not configured') }),
  signInWithGoogle: async () => ({ error: new Error('Supabase Auth is not configured') }),
```

- [ ] **Step 5: Add the real implementations in the provider**

In `src/contexts/AuthContext.tsx`, add these two `useMemo` blocks immediately after the `resetPassword` `useMemo` block (and before the `value` `useMemo`):

```tsx
const sendMagicLink = useMemo(
  () =>
    async (email: string): Promise<AuthResult> => {
      if (!supabase) return { error: new Error('Supabase Auth is not configured') };
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      return { error: error ?? null };
    },
  []
);

const signInWithGoogle = useMemo(
  () => async (): Promise<AuthResult> => {
    if (!supabase) return { error: new Error('Supabase Auth is not configured') };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error ?? null };
  },
  []
);
```

- [ ] **Step 6: Wire the new methods into the context value**

In the `value` `useMemo` object, add `sendMagicLink,` and `signInWithGoogle,` to the returned object (e.g. after `resetPassword,` and before `signOut,`), and add `sendMagicLink,` and `signInWithGoogle,` to the dependency array. The updated `useMemo` should read:

```tsx
const value = useMemo<AuthContextValue>(
  () => ({
    isEnabled: !!supabase,
    isLoading,
    isAuthenticated: !!user,
    user,
    session,
    signIn,
    signUp,
    resetPassword,
    sendMagicLink,
    signInWithGoogle,
    signOut,
  }),
  [
    isLoading,
    user,
    session,
    signIn,
    signUp,
    resetPassword,
    sendMagicLink,
    signInWithGoogle,
    signOut,
  ]
);
```

- [ ] **Step 7: Run the tests to verify they pass**

Run:

```bash
npm test -- --run src/contexts/AuthContext.test.tsx
```

Expected: all tests PASS, including the three new ones.

- [ ] **Step 8: Verify typecheck**

Run:

```bash
npm run lint:tsc
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx
git commit -m "feat: add magic-link and Google OAuth methods to AuthContext"
```

---

### Task 5: Landing form wiring (magic link + Google) + analytics

**Files:**

- Modify: `src/pages/Landing.tsx` (wire the form to `sendMagicLink`, add the Google button, fire analytics events)
- Modify: `src/services/analytics.ts` (three new event keys)
- Modify: `src/pages/__tests__/Landing.test.tsx` (add wiring tests, extend the mocks)

**Interfaces:**

- Consumes: `AuthContextValue.sendMagicLink`, `AuthContextValue.signInWithGoogle` (added in Task 4); `trackEvent` and `EVENTS` from `src/services/analytics.ts`.
- Produces: a landing form that, on a valid email submit, calls `sendMagicLink(email)` and shows the success message "Check your inbox for a magic link to sign in." on success (or the error message on failure); a "Continue with Google" button that calls `signInWithGoogle()`. Fires `landing_signup_submit`, `landing_magic_link_sent`, and `landing_google_click` events.

- [ ] **Step 1: Add the analytics event keys**

In `src/services/analytics.ts`, find the `// Auth events` block in the `EVENTS` object (containing `USER_SIGNED_IN` and `USER_SIGNED_UP`). Add a new block immediately after it:

```ts
  // Landing page events
  LANDING_SIGNUP_SUBMIT: 'landing_signup_submit',
  LANDING_MAGIC_LINK_SENT: 'landing_magic_link_sent',
  LANDING_GOOGLE_CLICK: 'landing_google_click',
```

- [ ] **Step 2: Write the failing wiring tests**

Open `src/pages/__tests__/Landing.test.tsx`. Replace the `authState` hoisted declaration and its mock with versions that include the auth actions, and add an analytics mock. The top of the file (imports + mocks) becomes:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Landing } from '../Landing';

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock('../../services/analytics', () => ({
  trackEvent: analytics.trackEvent,
  EVENTS: {
    LANDING_SIGNUP_SUBMIT: 'landing_signup_submit',
    LANDING_MAGIC_LINK_SENT: 'landing_magic_link_sent',
    LANDING_GOOGLE_CLICK: 'landing_google_click',
  },
}));

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<div data-testid="app" />} />
      </Routes>
    </MemoryRouter>
  );
}
```

Update the `beforeEach` to reset the action mocks:

```tsx
describe('Landing', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.sendMagicLink.mockReset();
    authState.signInWithGoogle.mockReset();
    analytics.trackEvent.mockReset();
  });
```

Add these three tests inside the `describe`:

```tsx
it('sends a magic link on a valid email submit', async () => {
  authState.sendMagicLink.mockResolvedValue({ error: null });
  renderLanding();
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@b.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }));
  expect(authState.sendMagicLink).toHaveBeenCalledWith('a@b.com');
  expect(
    await screen.findByText('Check your inbox for a magic link to sign in.')
  ).toBeInTheDocument();
  expect(analytics.trackEvent).toHaveBeenCalledWith('landing_signup_submit');
  expect(analytics.trackEvent).toHaveBeenCalledWith('landing_magic_link_sent');
});

it('shows an error message when sendMagicLink fails', async () => {
  authState.sendMagicLink.mockResolvedValue({ error: new Error('rate limited') });
  renderLanding();
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@b.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }));
  expect(await screen.findByText('rate limited')).toBeInTheDocument();
});

it('starts Google OAuth when the Google button is clicked', () => {
  authState.signInWithGoogle.mockResolvedValue({ error: null });
  renderLanding();
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  expect(authState.signInWithGoogle).toHaveBeenCalled();
  expect(analytics.trackEvent).toHaveBeenCalledWith('landing_google_click');
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```bash
npm test -- --run src/pages/__tests__/Landing.test.tsx
```

Expected: the three new tests FAIL — `sendMagicLink` is not called / "Continue with Google" button not found.

- [ ] **Step 4: Wire the form and add the Google button**

In `src/pages/Landing.tsx`, add the analytics import at the top:

```tsx
import { trackEvent, EVENTS } from '../services/analytics';
```

Change the `useAuth` destructure to include the two actions:

```tsx
const { isAuthenticated, sendMagicLink, signInWithGoogle } = useAuth();
```

Add an `isSending` state alongside the other `useState` calls:

```tsx
const [isSending, setIsSending] = useState(false);
```

Replace the `handleSubmit` function with the async, auth-wired version:

```tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  const value = email.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  setInvalid(false);
  setMessageType('');
  setMessage('');
  if (!value) {
    setInvalid(true);
    setMessageType('error');
    setMessage('Please enter your email address.');
    return;
  }
  if (!valid) {
    setInvalid(true);
    setMessageType('error');
    setMessage('Please enter a valid email address.');
    return;
  }
  trackEvent(EVENTS.LANDING_SIGNUP_SUBMIT);
  setIsSending(true);
  const { error } = await sendMagicLink(value);
  setIsSending(false);
  if (error) {
    setMessageType('error');
    setMessage(error.message || 'Could not send magic link. Please try again.');
    return;
  }
  trackEvent(EVENTS.LANDING_MAGIC_LINK_SENT);
  setMessageType('success');
  setMessage('Check your inbox for a magic link to sign in.');
  setEmail('');
};

const handleGoogle = () => {
  trackEvent(EVENTS.LANDING_GOOGLE_CLICK);
  void signInWithGoogle();
};
```

Update the submit button to reflect the sending state:

```tsx
<button className="btn btn-accent" type="submit" disabled={isSending}>
  {isSending ? 'Sending…' : 'Sign up free'}
</button>
```

Add the Google button inside `.signup-form-wrapper`, between the `form-message` `<p>` and the "Already have an account?" `<p>`:

```tsx
<button
  type="button"
  className="btn btn-secondary"
  onClick={handleGoogle}
  style={{ width: '100%', marginTop: '8px' }}
>
  Continue with Google
</button>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
npm test -- --run src/pages/__tests__/Landing.test.tsx
```

Expected: all tests PASS (the 6 from Task 3 plus the 3 new ones).

- [ ] **Step 6: Verify typecheck + build**

Run:

```bash
npm run lint:tsc && npm run build
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Landing.tsx src/pages/__tests__/Landing.test.tsx src/services/analytics.ts
git commit -m "feat: wire landing magic-link + Google OAuth sign-in with analytics"
```

---

### Task 6: AuthCallback — session materialization + redirect

**Files:**

- Modify: `src/pages/AuthCallback.tsx`
- Test: `src/pages/__tests__/AuthCallback.test.tsx`

**Interfaces:**

- Consumes: `useAuth()` (`isAuthenticated`, `isLoading`), `useNavigate()` from react-router-dom, `useToast()` (`showToast(message, type)`).
- Produces: a component that renders "Signing you in…" and, via a `useEffect` watching auth state, navigates to `/app` once `isAuthenticated` is true; navigates to `/` with an error toast if the URL carries an `error` param (OAuth denial) or if no session materializes within 1500ms of loading completing. Uses a `handled` ref so it only navigates once. Relies on the Supabase client's existing `detectSessionInUrl: true` to auto-exchange the PKCE code (no manual `exchangeCodeForSession` call).

- [ ] **Step 1: Write the failing tests**

Create `src/pages/__tests__/AuthCallback.test.tsx`:

```tsx
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthCallback } from '../AuthCallback';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const authState = vi.hoisted(() => ({ isAuthenticated: false, isLoading: false }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => authState }));

const showToast = vi.fn();
vi.mock('../../components/Toast', () => ({ useToast: () => ({ showToast }) }));

describe('AuthCallback', () => {
  beforeEach(() => {
    navigate.mockReset();
    showToast.mockReset();
    authState.isAuthenticated = false;
    authState.isLoading = false;
    window.history.replaceState({}, '', '/auth/callback');
  });

  it('redirects to /app when authenticated', () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    render(<AuthCallback />);
    expect(navigate).toHaveBeenCalledWith('/app', { replace: true });
  });

  it('redirects to / with an error toast when the URL has an error param', () => {
    window.history.replaceState(
      {},
      '',
      '/auth/callback?error=access_denied&error_description=User+cancelled'
    );
    render(<AuthCallback />);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('cancelled'), 'error');
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('redirects to / after a timeout when no session materializes', () => {
    vi.useFakeTimers();
    authState.isAuthenticated = false;
    authState.isLoading = false;
    render(<AuthCallback />);
    expect(navigate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(showToast).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- --run src/pages/__tests__/AuthCallback.test.tsx
```

Expected: FAIL — the stub renders "Auth callback" and never calls `navigate`.

- [ ] **Step 3: Write the AuthCallback component**

Replace `src/pages/AuthCallback.tsx` with:

```tsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import './landing.css';

/**
 * Handles the redirect after a Supabase magic-link click or Google OAuth flow.
 * The Supabase client (src/lib/supabase.ts) sets `detectSessionInUrl: true` with
 * the PKCE flow, so on a fresh page load to /auth/callback?code=... it auto-
 * exchanges the code and fires onAuthStateChange → AuthContext marks the user
 * authenticated. This component watches that state and forwards to /app.
 * It does NOT call exchangeCodeForSession manually (that would double-fire).
 */
export function AuthCallback() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (errorCode) {
      handled.current = true;
      const desc = params.get('error_description') || 'Sign-in failed. Please try again.';
      showToast(desc, 'error');
      navigate('/', { replace: true });
      return;
    }

    if (isAuthenticated) {
      handled.current = true;
      navigate('/app', { replace: true });
      return;
    }

    if (!isLoading && !isAuthenticated) {
      // Give the URL-detection exchange a brief moment to resolve before bailing.
      const t = setTimeout(() => {
        handled.current = true;
        showToast('Sign-in link is invalid or has expired. Please try again.', 'error');
        navigate('/', { replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, isLoading, navigate, showToast]);

  return (
    <div
      className="landing-scope"
      style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}
    >
      <p className="meta" style={{ fontSize: '15px' }}>
        Signing you in…
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm test -- --run src/pages/__tests__/AuthCallback.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Verify typecheck + build**

Run:

```bash
npm run lint:tsc && npm run build
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AuthCallback.tsx src/pages/__tests__/AuthCallback.test.tsx
git commit -m "feat: add AuthCallback route for magic-link and OAuth redirects"
```

---

### Task 7: Vercel SPA rewrite + final verification

**Files:**

- Modify: `vercel.json`

**Interfaces:**

- Produces: a `rewrites` entry so client-side deep links (`/app`, `/auth/callback`) resolve to `index.html` in production. Vercel checks the filesystem first, so existing static assets (`/sw.js`, `/assets/*`) are still served directly and their existing `headers` still apply.

- [ ] **Step 1: Add the rewrites key**

Replace `vercel.json` with (only the `rewrites` key is new; all existing keys are preserved):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- [ ] **Step 2: Run the full CI gate locally**

Run:

```bash
npm run lint && npm test -- --run && npm run build
```

Expected: lint (tsc + eslint + prettier), all tests, and build all pass.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel SPA rewrite for client-side deep links"
```

- [ ] **Step 4: Push the branch and open a PR**

Run:

```bash
git push -u origin feat/landing-page
```

Then open a PR titled `feat: landing page + magic-link/Google auth redirect` targeting `main`, describing the four-section design (routing, landing component + scoped CSS, magic-link + Google auth + callback, Vercel SPA rewrite) and noting the new `react-router-dom` dependency. Reference the spec at `docs/superpowers/specs/2026-07-10-landing-page-design.md`.

---

## Notes for the implementer

- The landing's `#signin` and `#signup` anchors both point to `#signup` (the single magic-link form). Supabase `signInWithOtp` sends a link to both new and existing users, so one form serves sign-up and sign-in.
- Supabase configuration required for this to work end-to-end: the email provider must be enabled, and `https://vastuplan.app/auth/callback` must be added to the Supabase project's **Redirect URLs** allowlist; for Google, the Google OAuth provider must be configured with the same redirect URL. These are dashboard-side settings, not code — flag them to the user before merging.
- The landing CSS uses native CSS nesting (`.landing-scope { .container { } }`). All evergreen browsers support this since 2023, and Vite's CSS pipeline passes it through. If a `lightningcss`/esbuild nesting warning appears, confirm the `.landing-scope { }` block is balanced.
- `react-router-dom` v7 is chosen for React 19 compatibility. If the install resolves a v7 major, proceed; if npm reports a peer conflict with React 19, pin the latest v7 release explicitly (`npm install react-router-dom@7`).
