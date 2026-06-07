# P0 Fixes — Design

**Date:** 2026-06-07
**Status:** Approved (pending user review of this spec)
**Scope:** Fixes the 9 P0 bugs identified in `docs/CODE_REVIEW.md` (B-1, B-2, B-5, B-10, B-11, S-5, S-7, S-10, S-15). No new dependencies, no new state holders, no new top-level providers. Single PR.

---

## 1. Context

`docs/CODE_REVIEW.md` lists 20 bugs (B-1..B-20), 25 smells (S-1..S-25), 25 quality items (Q-1..Q-25), and 15 nice-to-haves (G-1..G-15). The P0 list (9 items, ~7.75 h total) contains data-loss and silent-failure bugs that should ship before `0.2.0`.

This spec covers all 9 P0 items in one PR. They're small and each fix is local; the PR is intentionally narrow so it can be reviewed and merged quickly.

### Cross-cutting constraint

P0 fixes are **local edits**. They must not grow `App.tsx` further (already 1,839 lines per CODE_REVIEW §S-1). Every fix that would add a new top-level state holder or new dependency is out of scope.

---

## 2. The 9 fixes

### B-1 — `useCollaboration` reconnects socket on every `plan` change

**File:** `src/hooks/useCollaboration.ts`

**Current behavior:** The socket-subscription `useEffect` at lines 61-195 has `[plan, onPlanChange, userId]` in its dependency array. Every time `plan` changes (i.e., on every drag tick), the effect tears down the old socket and creates a new one. The `eslint-disable-next-line react-hooks/exhaustive-deps` on line 194 hides this from lint, but the effect actually re-runs because `plan` IS in the deps.

**Fix:** Convert to the standard "socket inside React" pattern:

1. Add a `planRef = useRef<FloorPlan>(plan)` and a `userIdRef = useRef<string | null>(userId)`. Keep them in sync via a small `useEffect(() => { planRef.current = plan; }, [plan])` (and the same for `userIdRef`). These are the ONLY effects that depend on `plan` / `userId`.
2. Change the socket-subscription `useEffect` to have `[]` deps so it runs once on mount and is cleaned up on unmount. Remove the `eslint-disable-next-line` comment.
3. In `applyRemoteUpdate` and the broadcast handler, read `planRef.current` instead of `plan` from closure.
4. Change `applyRemoteUpdate` to use the **functional form** of `onPlanChange` (treat it as a state updater `(prev: FloorPlan) => FloorPlan`).

**Why functional setters:** the parent already passes a `setPlan`-style callback; functional updates let us compute the new plan from the latest state without depending on `plan` in closure. This eliminates B-2 as a side effect.

**Note on dead code:** `useCollaboration` is exported but never imported by any client component (verified 2026-06-07 with `grep -rn`). The server README documents it. The user has decided to fix the bugs as if it were live code, so we keep the file and ship correct behavior for whoever wires it up.

### B-2 — `applyRemoteUpdate` uses stale `plan` closure

**Same file as B-1.** The `useCallback` at lines 27-58 has `[plan, onPlanChange]` in deps. The `onPlanChange({ ...plan, rooms: [...] })` calls read `plan` from closure, which is whatever it was at the time the callback was memoized. A flood of remote updates can clobber local state.

**Fix:** Covered by the B-1 fix. Functional `onPlanChange` setter + `planRef` makes the callback closure-free.

### B-5 — view/comment mode does not lock canvas/keyboard

**Files:**
- `src/hooks/useKeyboardShortcuts.ts` — add `appMode: AppMode` to options, early-return at the top of `handleKeyDown` when not `edit`.
- `src/hooks/useCanvasDrag.ts` — same: accept `appMode`, early-return in `onMouseDown` / `onTouchStart` when not `edit`.
- `src/components/Canvas.tsx` — accept new `appMode: AppMode` prop, forward to `useCanvasDrag`. Backwards-compatible default of `'edit'`.
- `src/App.tsx` — pass `appMode` to `<Canvas appMode={appMode}>`. In every mutating handler (`addRoom`, `updateRoom`, `deleteRoom`, `duplicateRoom`, `rotateRoom`, the element add/update/rotate/delete handlers, the AI analysis trigger, the Sentry `setUser`/`addBreadcrumb` initialization effect), add `if (appMode !== 'edit') return;` at the top.

**Mode semantics:**
- `edit` — full UI.
- `view` — read-only. No clicks, no keyboard, no drag.
- `comment` — read-only for rooms. Comment placement UI doesn't exist in the client today (server has `chat-message` but no client surface), so in practice `comment === view` in 0.1.0. When comment UI lands, the comment placement handler will be the only handler exempt from the `appMode !== 'edit'` gate.

**AppMode type:** Currently the string union is duplicated in `App.tsx:118`, `Header.tsx`, and `useKeyboardShortcuts.ts`. Per Q-1, extract to `src/types.ts`:
```ts
export type AppMode = 'edit' | 'view' | 'comment';
```
This is a small ancillary change. Mark as in-scope here because every fix in B-5 references `AppMode`.

### B-10 — shared-link URL never cleared → refresh silently reverts edits

**File:** `src/App.tsx:153-178`

**Current behavior:** The `useEffect` decodes `?plan=…` and calls `resetPlan(decoded)`, but never strips the query string. On refresh, the URL is read again and the user's local edits are overwritten by the original shared plan.

**Fix:** At the end of the existing effect, call `window.history.replaceState(null, '', window.location.pathname)`. Wrap the whole body in `try / finally` so the URL is stripped even if decoding throws.

**Behavior after the fix:**

```
URL: /?mode=view&plan=eyJ...
  ↓ useEffect one-shot on mount
decode plan, resetPlan(plan), setAppMode('view'), setAnalysis(...)
  ↓
window.history.replaceState(null, '', '/')  // URL strip
  ↓
URL: /
  ↓
useFloorPlan continues, autosave writes to localStorage
  ↓
User edits, refreshes, App.tsx mounts again
  ↓
URL has no ?plan= → useEffect doesn't fire → localStorage wins
```

This is "share-once" semantics. Matches how Notion / Figma handle shared URLs.

### B-11 — `OfflineIndicator` SVG path malformed

**File:** `src/components/OfflineIndicator.tsx`

**Current behavior:** Lines 24-31 contain an inline `<svg>` with a hand-rolled, malformed `<path d="…">` (the `d` attribute is gibberish — likely copy-pasted from a broken icon font).

**Fix:** Replace the inline SVG with `<WifiOff className="w-4 h-4" />` from `lucide-react` (already a dependency, used throughout the app).

### S-5 — analytics reads `process.env.REACT_APP_*` (Vite-incompatible)

**File:** `src/services/analytics.ts`

**Current behavior:** Lines 9-13 read `process.env.REACT_APP_ANALYTICS_ENABLED` / `_DOMAIN` / `_API_HOST`. Under Vite, `process.env.REACT_APP_*` is `undefined` (Vite uses `import.meta.env.VITE_*`). Analytics is effectively disabled in production unless the user happened to inject env vars via a non-Vite build path.

**Fix:** Rename to `VITE_ANALYTICS_ENABLED`, `VITE_ANALYTICS_DOMAIN`, `VITE_ANALYTICS_API_HOST`. Read via `import.meta.env`. Update `.env.example` to advertise the new names. Note the rename in `CLAUDE.md` env-vars table.

### S-7 — Sentry `setUser` / `addBreadcrumb` called on un-init Sentry in dev

**File:** `src/services/sentry.ts`

**Current behavior:** `setUser`, `clearUser`, `setTag`, `addBreadcrumb` call `Sentry.setUser(…)` / `addBreadcrumb(…)` unconditionally. If `initSentry` was never called (e.g., dev mode, no DSN), the v10 SDK throws "Sentry hasn't been initialized" or warns. `App.tsx:140-150` calls `setUser` / `addBreadcrumb` on every mount, so dev consoles get spammed.

**Fix:** Track init state in a module-level `let initialized = false;` flag. `initSentry` sets it to `true` at the end of the function (only if both `enabled && dsn` are truthy). Expose `isSentryInitialized()`. Guard `setUser`, `clearUser`, `setTag`, `addBreadcrumb` with an early `if (!isSentryInitialized()) return;`.

### S-10 — `(window as any).showToast?.(...)` is a silent no-op

**File:** `src/App.tsx:219` and any other call sites

**Current behavior:** `App.tsx:219` calls `(window as any).showToast?.(\`Added ${type} room\`, 'success')`. The global is never assigned; the `?.` makes it a silent no-op. The `ToastProvider` is mounted at `App.tsx:609-1837` and exposes a real `useToast()` hook.

**Fix:** Add `useToast()` to `App.tsx` and replace the call with `showToast(\`Added ${type} room\`, 'success')`. Grep for any other `(window as any).showToast` and replace those too.

### S-15 — `PresentationExport` logo upload doesn't validate MIME

**File:** `src/components/PresentationExport.tsx`

**Current behavior:** `handleLogoUpload` (lines 28-37) accepts whatever the user selects and reads it as a data URL. The `accept` attribute is "image/png, image/jpeg" but a determined user can bypass that and upload a non-image (PDF, HTML, executable). The data URL is then passed to `pdf.addImage(logoUrl, 'PNG', ...)` which embeds it in the PDF.

**Fix:** Add a magic-byte sniffer:
```ts
async function isPngOrJpeg(file: File): Promise<boolean> {
  if (file.size > 5_000_000) return false;
  const head = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(head);
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  return isPng || isJpeg;
}
```
In `handleLogoUpload`: if the check returns false, show a `useToast` rejection ("Logo must be a PNG or JPEG under 5 MB") and don't update `logoUrl`. The new toast hook is in scope because S-10 also added it.

---

## 3. Files touched

| File                                           | Bugs addressed |
| ---------------------------------------------- | -------------- |
| `src/App.tsx`                                  | B-5, B-10, S-10 |
| `src/hooks/useCollaboration.ts`                | B-1, B-2 |
| `src/hooks/useKeyboardShortcuts.ts`            | B-5 |
| `src/hooks/useCanvasDrag.ts`                   | B-5 |
| `src/components/Canvas.tsx`                    | B-5 (prop passthrough) |
| `src/components/OfflineIndicator.tsx`          | B-11 |
| `src/components/PresentationExport.tsx`        | S-15 |
| `src/services/analytics.ts`                    | S-5 |
| `src/services/sentry.ts`                       | S-7 |
| `src/types.ts`                                 | Q-1 (AppMode extraction, in-scope of B-5) |
| `.env.example`                                 | S-5 |
| `CLAUDE.md`                                    | S-5 (note in §2 "Dev commands" pointing to the env-var rename) |
| `memory/dev-commands.md`                        | S-5 (env-var table rename: `REACT_APP_*` → `VITE_*`) |

**New test files:**
- `src/hooks/useCollaboration.test.ts` — B-1, B-2
- `src/hooks/useKeyboardShortcuts.test.ts` — B-5
- `src/hooks/useCanvasDrag.test.ts` — B-5
- `src/services/analytics.test.ts` — S-5
- `src/services/sentry.test.ts` — S-7
- `src/components/PresentationExport.test.tsx` — S-15

**E2E (Playwright) test:** add one to `tests/e2e/basic.spec.ts` covering B-10: load a `?plan=…` URL, edit, refresh, assert the edit persists.

---

## 4. Out of scope

- P1 items (B-3, B-7, B-8, B-9, B-13, S-2, S-9, S-16, S-17, B-17) — separate PR.
- Wiring `useCollaboration` into `App.tsx` (it's dead code; the user has chosen to fix-as-if-live rather than delete). If you want it deleted in a follow-up, that's a separate decision.
- Splitting `App.tsx` (S-1) — orthogonal refactor.
- Server-side commenting UI for `comment` mode (the lockout is in place; the comment placement UI ships later).

---

## 5. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| B-1 + B-2 changes touch a dead hook. If a future commit wires it in, the new behavior is what they want. | Document in commit message that the hook is currently unused; the fixes are correctness-only. |
| B-5 mode locking could break the existing E2E test if the test runs in a non-`edit` mode. | E2E tests don't set `?mode=`, so they default to `edit`. Verify with `npm run test:e2e` after the fix. |
| B-10 URL strip could confuse a user who shares a URL, the recipient refreshes, and the URL no longer contains `?plan=`. The recipient's localStorage now has the plan. | Acceptable. The point of B-10 is to prevent silent edit loss. If the recipient wants to re-share, they can re-generate the share link from the menu. |
| S-5 env-var rename breaks any deployed env that was setting `REACT_APP_ANALYTICS_*`. | `.env.example` will be updated. Deploy notes will mention the rename. There is no production deploy of this app yet (per the repo's alpha status), so the blast radius is small. |
| S-7 init-flag races: `setUser` called from a fast-mounting React effect while `initSentry` is still running. | `initSentry` is synchronous in this codebase. The effect in `App.tsx:140-150` runs after mount, and `initSentry` is called from `main.tsx` before `App` mounts. No race. |
| S-15 magic-byte check could false-positive on a non-image that happens to start with `89 50 4E 47`. | PNG magic is `89 50 4E 47 0D 0A 1A 0A` (8 bytes). The check above stops at byte 4. Acceptable trade-off: the only other file formats starting with `89 P` are extremely unlikely. A 4-byte check is the standard for client-side image validation. If we want byte 5-8 too, we add it; not in this PR. |

---

## 6. Validation

Before opening the PR:
- `npm run lint` — must pass.
- `npm test` — all unit tests pass; new tests in this PR cover the 9 fixes.
- `npm run test:e2e` — all 7 existing Playwright tests pass; the new B-10 test passes.
- `npm run build` — clean build, no new warnings.

---

## 7. Open questions

None remaining. All clarifying questions answered during brainstorming:

- B-1/B-2: fix the hook as if it's live (not delete).
- B-10: strip URL after first load; plan persists via localStorage.
- B-5: view = no input; comment = read-only rooms (no client comment UI today).
- S-5: rename to `VITE_*` prefix.
- S-15: magic-byte sniff, 5 MB cap.
