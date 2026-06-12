/**
 * Shared types between the VastuPlan 2D client (src/) and the
 * collaboration server (server/src/).
 *
 * Why this file exists (Q-9): the `PlanUpdateEvent` type was previously
 * duplicated in `src/types.ts` and `server/src/index.ts` with a near-
 * identical shape but a few diverging fields (`PlanUpdate` on the server
 * had no `userName`; the client's `data: any` was wider than the server's
 * understanding). The server has no `tsc` in CI (see `docs/CODE_REVIEW`
 * §S-24) so the type would silently rot. Centralizing here forces the
 * server's `tsc --noEmit` step to catch any drift on the next build.
 *
 * Both packages are expected to import from this file:
 *   - Client: `import { PlanUpdateEvent } from './types/shared'`
 *   - Server: `import { PlanUpdateEvent } from '../../src/types/shared'`
 *   (the relative path on the server is the price of not having a
 *   workspace package; see the doc note in `docs/CODE_REVIEW` §Q-9.)
 *
 * If you add a field, add it here — both sides will see the change on
 * the next build.
 */

/**
 * Emitted by the client and broadcast by the server whenever a
 * collaborator mutates a floor plan. The server normalizes any
 * client-specific extras; `userName` is included for UI friendliness
 * but should not be trusted on the server (use `userId` for auth).
 */
export interface PlanUpdateEvent {
  type: 'room' | 'plan' | 'element';
  action: 'add' | 'update' | 'delete' | 'move';
  data: unknown;
  timestamp: number;
  userId: string;
  userName: string;
}
