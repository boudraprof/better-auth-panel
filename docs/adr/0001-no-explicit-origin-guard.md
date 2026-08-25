# ADR 0001: No explicit origin guard on custom admin endpoints

Date: 2026-08-25
Status: Accepted

## Context

`src/middleware/cors.ts` once contained an `originGuard(request)` helper designed to reject requests whose `Origin` header was present but not in the allow-list (403), intended to protect the custom endpoints in `src/routes/api.v1.admin.$.ts` from cross-origin writes. It was never wired into any route — zero call sites.

CORS response headers (`corsHeaders`, `withCors`, `corsJson`) remain and are applied to all API responses; those govern *reading* responses, not *sending* requests.

## Decision

Delete `originGuard` rather than wire it in. Custom admin endpoints that mutate state rely on:

1. **Session-cookie + SameSite semantics** — cross-site browser requests do not carry an authenticated session.
2. **Better Auth's trusted-origins / CSRF handling** for everything forwarded to `auth.handler`.
3. The admin session requirement (`assertAdmin`) on every custom endpoint.

## Consequences

- Architecture reviews should not re-propose wiring an explicit origin guard for these endpoints unless one of the assumptions above changes (e.g. cookies move to `SameSite=None`, or a non-browser client model is introduced).
- If a future endpoint is reachable without a session, this decision must be revisited.
