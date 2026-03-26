# Design: get-analytics Edge Function

**Date:** 2026-03-21
**Status:** Draft

## Goal

Replace the Supabase SDK call in `Analytics.tsx` with a plain `fetch()` to a new read-only edge function, so the analytics dashboard can be deployed as a static site on GitHub Pages without any Supabase credentials in the frontend bundle.

## Architecture

Two concerns remain cleanly separated:

- **Ingest** — `supabase/functions/page-visit/index.ts` (unchanged): receives POST events from the tracking beacon, writes to `page_visits`
- **Read** — `supabase/functions/get-analytics/index.ts` (new): handles GET requests, returns all `page_visits` rows as JSON

The frontend (`Analytics.tsx`) fetches from the read endpoint at runtime. No Supabase SDK is needed in the analytics page.

## Components

### `supabase/functions/get-analytics/index.ts`

- The function **directory must be named `get-analytics`** (not just conventional — the directory name is the URL slug)
- Accepts `GET` only; returns `405` with CORS + `Content-Type: application/json` headers for all other methods (except `OPTIONS`)
- Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars (automatically injected by Supabase in production); if either is absent (e.g. local dev without a linked project), allow the unhandled throw to propagate — no explicit guard required
- Queries `page_visits` with `select('*')` (intentional — all columns) ordered by `timestamp` ascending; guard the result with `data ?? []` before serialising, so an empty table returns `[]` and not `null`
- Response headers on **200, 405, and 500 responses** include both the CORS headers and `Content-Type: application/json`, using the same `corsHeaders` object pattern as `supabase/functions/page-visit/index.ts` (same `Access-Control-Allow-Origin: *` and same `Access-Control-Allow-Headers` list)
- Handles `OPTIONS` preflight with CORS headers only (no `Content-Type`) and `204 No Content`, matching the ingest function pattern
- No `Authorization` header is required by callers; the endpoint is fully public
- Response body is a **bare JSON array** of row objects — no envelope wrapper (e.g. `{ data: [...] }`)
- Row objects include `referrer` from the DB but it is not part of the `PageVisit` interface in `Analytics.tsx` and should not be added — it will be unused by the frontend
- On DB error: returns `500` with `{ error: message }` and CORS + `Content-Type: application/json` headers

**URL pattern:** `https://<project-id>.supabase.co/functions/v1/get-analytics`

**`supabase/config.toml`:** Add an entry to disable JWT verification (matching the existing `page-visit` entry):
```toml
[functions.get-analytics]
verify_jwt = false
```
Without this, Supabase rejects all unauthenticated requests with `401` before the function code is reached.

### `src/pages/Analytics.tsx`

- Remove: `import { supabase } from "@/integrations/supabase/client"`
- Replace the `supabase.from("page_visits").select(...)` call with a plain `fetch` using `VITE_SUPABASE_URL` (this env var exists in the local `.env`; note that `src/lib/analytics.ts` uses `VITE_SUPABASE_PROJECT_ID` — that file is unchanged and the inconsistency is accepted):
  ```ts
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-analytics`)
    .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
    .then((data: PageVisit[]) => { setVisits(data ?? []); setLoading(false); })
    .catch((err) => { console.error("Analytics fetch failed:", err); setLoading(false); });
  ```
- On fetch failure the dashboard will render blank (no data shown) — this is an accepted limitation matching the existing SDK call behaviour
- **`VITE_SUPABASE_URL` must be added as a new variable in the GitHub Pages build environment** (e.g. as a repository secret in GitHub Actions). It is not currently used by any deployed code, so it will not be present unless explicitly added. If missing at build time, `fetch` will fail silently and the dashboard will be blank.
- No `Authorization` header is sent — the endpoint is public
- All derived data, chart rendering, and UI remain unchanged

## Data Flow

```
Browser (GitHub Pages)
  → GET /functions/v1/get-analytics
  → get-analytics function
  → Supabase DB (page_visits, service role, select *)
  → bare JSON array of rows
  → Analytics.tsx renders charts
```

## What Does Not Change

- `supabase/functions/page-visit/index.ts` — ingest function unchanged
- `src/lib/analytics.ts` — tracking beacon unchanged (uses `VITE_SUPABASE_PROJECT_ID`)
- `src/integrations/supabase/client.ts` — SDK client unchanged (may be used elsewhere)
- All chart logic and UI in `Analytics.tsx`

## Out of Scope

- Authentication on the read endpoint (public access is acceptable; rate limiting is also out of scope and accepted risk)
- Pagination or filtering (return all rows as-is)
- GitHub Pages deployment configuration
- Error UI in the dashboard on fetch failure
