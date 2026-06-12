# Vercel Deployment — Design

**Date:** 2026-06-12
**Status:** Approved (pending user review of this spec)
**Scope:** Wire the VastuPlan 2D static SPA up to Vercel via the Vercel Git integration, so that every push to `willowvibe/Home-vastu-plan` produces a Preview deploy, and every merge to `main` produces a Production deploy. The change is config-only: **no source-code changes, no dependency changes, no new GitHub Actions file for the deploy itself**. The existing `ci.yml` continues to run lint + tests on every PR as a gate; Vercel handles the build + deploy in parallel.

---

## 1. Context

VastuPlan 2D is currently un-deployed. The web app builds into a self-contained static SPA in `dist/` (Vite 6 build). The optional collaboration server in `server/` is already wired to Render + Railway via `.github/workflows/deploy-server.yml`, but the frontend has no production hosting at all — developers run `npm run preview` locally to test the production build.

This spec adds a deployment target for the frontend only, using Vercel:

- Zero new dependencies.
- Zero source-code changes (Vite is already a first-class Vercel framework preset).
- Zero new GitHub Actions for the deploy (the existing `ci.yml` is unaffected).
- One new config file in the repo: `vercel.json` (~20 lines).
- A 1-paragraph "Deploy" section appended to `README.md` that points to this spec.
- All dashboard-side setup (linking the GitHub repo, configuring the project) happens in the Vercel UI and is documented in §6 below for whoever has admin access to the willowvibe org.

### Cross-cutting constraints

- **No SPA routes to rewrite.** The app reads only `window.location.search` (`?plan=…`) for deep-linking; there is no React Router, no client-side routing. A `rewrites` block in `vercel.json` would be a no-op and is deliberately omitted.
- **Build-time env vars are left unset on first deploy** (per user decision). `VITE_GEMINI_API_KEY` and `VITE_COLLAB_SERVER_URL` are not required for the app to render; both fail gracefully when missing. They can be added later from the Vercel UI without code changes.
- **Service worker correctness** is preserved. `vite.config.ts` already emits `dist/sw.js` (S-22, commit `b3507ca`) with a per-deploy cache name. The `vercel.json` headers pin the right `Cache-Control` and `Service-Worker-Allowed` directives so the SW continues to update on every deploy.

---

## 2. What changes

| File | Action | Why |
|---|---|---|
| `vercel.json` | **create** | Pin Vite framework, build command, output dir, and SW / asset cache headers. |
| `README.md` | **edit** (append ~5 lines) | Add a "Deploy" section that points here. |
| `docs/superpowers/specs/2026-06-12-vercel-deployment-design.md` | **create** (this file) | Per the brainstorming skill's spec convention. |
| `vite.config.ts` | unchanged | Already produces a deployable static build. |
| `package.json` | unchanged | No new scripts, no new deps. |
| `.github/workflows/ci.yml` | unchanged | Lint + test + build on every PR continues to run as a gate. |
| `.github/workflows/deploy-server.yml` | unchanged | Server deploys (Render + Railway) are out of scope. |
| Vercel project (out-of-repo) | **create** | One-time setup by the org admin; documented in §6. |

**Net diff vs. `main @ 2e53cfc`:** 2 new files (`vercel.json`, this spec), 1 small edit to `README.md`. No source-code changes.

---

## 3. `vercel.json` (the only real config)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false,
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
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### Why each key is here

| Key | Value | Why |
|---|---|---|
| `$schema` | `https://openapi.vercel.sh/vercel.json` | Enables editor IntelliSense in editors that support JSON Schema. Free, harmless. |
| `framework` | `"vite"` | Pins Vercel's auto-detection. Without it, Vercel falls back to "Other" and may pick a wrong install / dev command. |
| `buildCommand` | `"npm run build"` | Same command as `ci.yml`. Single source of truth for the build. |
| `outputDirectory` | `"dist"` | Vite's default output dir. Vercel would guess it; pinning removes drift risk. |
| `cleanUrls` | `true` | Drops `.html` from URLs. Pure cosmetic but standard for SPAs. |
| `trailingSlash` | `false` | `/foo` not `/foo/`. SPA-friendly, no server-side routing to break. |
| `headers` (sw.js) | `Cache-Control: public, max-age=0, must-revalidate` + `Service-Worker-Allowed: /` | The browser refuses to update a service worker that's served with a long cache. The `Service-Worker-Allowed: /` header lets the SW control the entire origin (the default scope is `/sw.js` which is too narrow). |
| `headers` (assets/) | `Cache-Control: public, max-age=31536000, immutable` | Vite emits `[name]-[hash].js` / `.css` files in `dist/assets/`. The hash changes on every build, so a 1-year immutable cache is safe and saves bandwidth. |

### What is deliberately NOT in `vercel.json`

- **`rewrites`** — no client-side routes to rewrite. The app uses `?plan=…` query strings only.
- **`redirects`** — no legacy URL migration in scope.
- **`crons` / `functions` / `edge-functions`** — this is a static site.
- **`regions`** — Vercel's default edge network is appropriate.
- **`github` block** — Vercel-side GitHub linking is configured in the Vercel UI, not in JSON.
- **`build.env`** — no build-time env vars on first deploy. (Adding them later is a Vercel-UI change, not a code change.)
- **`installCommand`** — `npm ci` is Vercel's default and matches `ci.yml`. Not pinned.

---

## 4. README addition

Append to `README.md`, after the existing "How to Use" section (line 68) and before the "Internals (for contributors)" section (line 139). The block is self-contained:

```markdown
## 🚀 Deploy

The web app deploys to **Vercel** via the Vercel Git integration. No GitHub Actions
file is required for the deploy — the existing `ci.yml` runs lint + tests on every
PR, and Vercel builds and deploys on every push/merge to `main` (production) and on
every PR (preview URLs).

To link the repo to Vercel: see the 7-step runbook in
[`docs/superpowers/specs/2026-06-12-vercel-deployment-design.md`](./docs/superpowers/specs/2026-06-12-vercel-deployment-design.md).
This is a one-time per-account setup. After that, every push deploys automatically.

The optional Socket.io collaboration server in `server/` is deployed separately
via `.github/workflows/deploy-server.yml` to Render + Railway.
```

---

## 5. Build-time env vars — current state and how to add them later

The deployed bundle bakes `VITE_*` env vars at build time (this is how Vite works — they're substituted into the static JS, not read at runtime).

### First deploy (this spec)

| Var | State | Effect |
|---|---|---|
| `VITE_GEMINI_API_KEY` | unset | "Analyze with AI" button throws `VITE_GEMINI_API_KEY not configured` error. Everything else works. |
| `VITE_COLLAB_SERVER_URL` | unset | App falls back to `http://localhost:3001` (in `src/hooks/useCollaboration.ts:6`). Real-time collab won't work in production until set. |
| `VITE_ANALYTICS_ENABLED` | unset → defaults `true` | Plausible analytics runs against the default domain. |
| `VITE_ANALYTICS_DOMAIN` | unset → defaults `vastuplan.app` | Plausible self-reports events to that domain. Update if you change the production URL. |
| `VITE_ANALYTICS_API_HOST` | unset → defaults `https://plausible.io` | Uses the Plausible cloud. |

### Adding env vars later

In the Vercel dashboard: Project → Settings → Environment Variables → add the var, choosing which environment (Production / Preview / Development) it applies to. Vercel automatically rebuilds + redeploys on env-var change. **No code change required.**

> ⚠️ **Security note on `VITE_GEMINI_API_KEY`:** any value set here is shipped in the public JS bundle. Anyone with browser dev tools can read it. Fine for a public demo / your own use of the app. **Do not do this** if you need to keep the key private (e.g., it has paid-tier quota). The correct solution is a server-side proxy that holds the key and exposes a small endpoint, but that's a follow-up feature out of scope for this spec.

---

## 6. Vercel-side runbook (one-time per account)

These steps happen in the Vercel UI, not in the repo. They're documented here so whoever does them has a checklist.

**Prerequisite:** a Vercel account that is a member of the `willowvibe` GitHub org. The org owner must install the Vercel GitHub App on the org (Settings → GitHub Apps → Install → choose `willowvibe` → grant access to `Home-vastu-plan`). This step **cannot be done from a `harishconti` account** — the willowvibe owner has to do it.

### Steps

1. **Sign in to Vercel** at https://vercel.com with the account linked to the willowvibe org.
2. **Create a new project**: Dashboard → "Add New…" → "Project" → select `willowvibe/Home-vastu-plan` from the repo picker.
3. **Configure the project**:
   - Framework Preset: **Vite** (auto-detected; `vercel.json` pins it).
   - Root Directory: `./` (the repo root — `package.json` is at the top level).
   - Build Command: `npm run build` (auto-filled; pinned in `vercel.json`).
   - Output Directory: `dist` (auto-filled; pinned in `vercel.json`).
   - Node.js Version: 20 (matches `.nvmrc` and `engines.node` in `package.json`).
4. **Environment Variables**: leave empty for now. The app ships without them and degrades gracefully.
5. **Branch deploys**: leave defaults — `main` → Production, every other branch + every PR → Preview.
6. **Click Deploy**. First build takes 1–2 minutes (Vite, cold cache). When it's green, the site is live at `https://vastuplan-2d-<vercel-generated-suffix>.vercel.app`.
7. **(Optional) Custom domain**: Project → Settings → Domains → add `vastuplan.app` (or whatever you own). Vercel will give you the DNS records to add at your registrar.

After step 6, **every** subsequent push to `main` triggers a new production build, and every PR gets a unique preview URL with a `[name]-[hash].vercel.app` slug.

---

## 7. Validation

A successful first deploy satisfies all of the following:

| Check | How to verify | Expected result |
|---|---|---|
| Production URL returns 200 | `curl -I https://vastuplan-2d-<suffix>.vercel.app` | `HTTP/2 200`, `content-type: text/html` |
| HTML loads with the right title | Open the URL in a browser, View Source | `<title>VastuPlan 2D — Indian Home Design & Vastu Compliance</title>` |
| JS bundle loads | Browser devtools → Network → filter `.js` | `dist/assets/index-[hash].js` returns 200 with `cache-control: public, max-age=31536000, immutable` |
| Service worker registers | Devtools → Application → Service Workers | `sw.js` listed as activated and running |
| SW cache name is the per-deploy hash | Devtools → Application → Cache Storage | Cache name matches `vastuplan-<hash>` where `<hash>` is derived from `index.html` content (see `src/services/buildHash.ts`) |
| App renders a canvas | Open the URL, add a room from the left sidebar | Room appears on the canvas, can be dragged |
| No console errors | Devtools → Console | No red errors on first load. The "VITE_GEMINI_API_KEY not configured" warning is acceptable on first load (only fires when AI features are used). |
| Preview URL on a PR | Open a PR against `main` | PR page shows a "Vercel" check with a green ✅ and a `https://fix-...vercel.app` URL |
| PR preview matches main | Visit the preview URL | Same UI as the production URL |

If any check fails, see §9 (Failure modes).

---

## 8. Out of scope

- **Server deploys.** The Socket.io collab server in `server/` already deploys to Render + Railway via `deploy-server.yml`. This spec does not touch that workflow.
- **Custom domain setup.** Optional, documented in step 7 above. Not part of the first deploy.
- **Lighthouse / performance audits on every PR.** Could be added as a follow-up via Vercel's `checks` config, but out of scope here.
- **Slack / Discord / Sentry / monitoring / alerting.** All out of scope. Can be added later via Vercel integrations.
- **Vercel-CLI or `vercel pull` automation.** The Vercel UI is sufficient for the first deploy. If the team later wants the build to be reproducible from a clean machine, that can be a follow-up.
- **Multi-environment matrix (e.g., separate staging deploys).** Not requested. `main` is the only production-equivalent branch.

---

## 9. Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails: "Cannot find module" | `npm ci` ran with stale lockfile or `node_modules` | Delete the Vercel build cache (Project → Settings → General → Clear Build Cache) and re-deploy. |
| Build fails: "TS error in `src/…`" | A recent change broke typecheck | The same change will have failed in `ci.yml` first — fix there. Vercel will pick up the fix on the next push. |
| Production URL returns 404 | `outputDirectory` mismatch | Confirm `dist/` exists after build. `vercel.json` pins this. |
| Service worker doesn't update after a deploy | The SW is being served from browser cache | Hard reload (Cmd-Shift-R) or unregister the SW in Devtools. The `Cache-Control: max-age=0, must-revalidate` on `/sw.js` is correct; the issue is always local browser state. |
| App shows "VITE_GEMINI_API_KEY not configured" | Expected behavior on first deploy | Add the var in Vercel env settings, or accept it (AI features are optional). |
| Collab button silently does nothing | Expected behavior on first deploy | Set `VITE_COLLAB_SERVER_URL` to the Render/Railway public URL, or accept it (collab requires the server to be reachable). |
| Preview URL 404s on a PR | PR was opened from a fork, not from a branch in the repo | Vercel only deploys PRs from branches in the same repo. PRs from forks don't get previews (security: prevents leaking secrets). |
| `Vercel` check missing on a PR | The Vercel GitHub App isn't installed on the org | Re-do the prerequisite in §6 (org owner installs the Vercel GitHub App on `willowvibe`). |

---

## 10. Open questions

None. The spec was brainstormed with the user on 2026-06-12 and the four open decisions (integration model, source repo, branch mapping, env vars) were resolved before this spec was written.

---

## 11. Implementation order

The actual implementation is small enough to be one commit. The order matters only insofar as the spec must be committed alongside the code so reviewers can find it:

1. Create `vercel.json` (the only real config).
2. Append the "Deploy" section to `README.md`.
3. Commit both plus this spec file to a branch.
4. Open a PR. Once merged, the willowvibe org owner does the Vercel-side setup in §6.

The implementation plan (from the `writing-plans` skill) will spell out the exact diff and validation steps.
