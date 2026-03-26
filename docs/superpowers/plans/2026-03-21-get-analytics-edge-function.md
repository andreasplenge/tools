# get-analytics Edge Function Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public read-only Supabase edge function that returns all `page_visits` rows as JSON, and update `Analytics.tsx` to fetch from it instead of using the Supabase JS SDK.

**Architecture:** A new Deno edge function (`get-analytics`) queries the `page_visits` table using the service role key and returns the rows as a bare JSON array. The frontend fetches from this URL using a plain `fetch()` call, removing the Supabase SDK dependency from the analytics page entirely.

**Tech Stack:** Deno (Supabase Edge Functions), TypeScript, React, Vite, `@supabase/supabase-js` (server-side only in the new function)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/get-analytics/index.ts` | Read-only edge function; queries `page_visits`, returns JSON array |
| Modify | `supabase/config.toml` | Disable JWT verification for the new function |
| Modify | `src/pages/Analytics.tsx` | Replace SDK call with plain `fetch()` |

---

### Task 1: Create the `get-analytics` edge function

**Files:**
- Create: `supabase/functions/get-analytics/index.ts`

The directory name `get-analytics` is required — it becomes the URL slug (`/functions/v1/get-analytics`).

Copy the `corsHeaders` constant verbatim from `supabase/functions/page-visit/index.ts` (lines 3–7). It must include the exact same `Access-Control-Allow-Headers` list for CORS to work in all browsers.

- [ ] **Step 1: Create the file**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("page_visits")
      .select("*")
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data ?? []), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/get-analytics/index.ts
git commit -m "feat: add get-analytics edge function"
```

---

### Task 2: Register the function in `supabase/config.toml`

**Files:**
- Modify: `supabase/config.toml`

Supabase verifies JWTs on edge functions by default. Without `verify_jwt = false`, all unauthenticated browser requests return `401` before the function code runs.

Current `supabase/config.toml`:
```toml
project_id = "ahzrpcexavpjilrlscgt"

[functions.page-visit]
verify_jwt = false
```

- [ ] **Step 1: Add the new function entry**

Append to `supabase/config.toml`:
```toml

[functions.get-analytics]
verify_jwt = false
```

Result:
```toml
project_id = "ahzrpcexavpjilrlscgt"

[functions.page-visit]
verify_jwt = false

[functions.get-analytics]
verify_jwt = false
```

- [ ] **Step 2: Commit**

```bash
git add supabase/config.toml
git commit -m "feat: disable JWT verification for get-analytics function"
```

---

### Task 3: Update `Analytics.tsx` to use plain fetch

**Files:**
- Modify: `src/pages/Analytics.tsx`

The goal is to remove the Supabase SDK import and replace the SDK query with a plain `fetch()`. Everything else in the file (derived data, chart rendering, UI) stays exactly the same.

Current code in `Analytics.tsx` (lines 2, 61–68):
```typescript
// line 2
import { supabase } from "@/integrations/supabase/client";

// lines 60–69
useEffect(() => {
  supabase
    .from("page_visits")
    .select("*")
    .order("timestamp", { ascending: true })
    .then(({ data }) => {
      setVisits((data as PageVisit[]) ?? []);
      setLoading(false);
    });
}, []);
```

- [ ] **Step 1: Remove the supabase import (line 2)**

Delete the line:
```typescript
import { supabase } from "@/integrations/supabase/client";
```

- [ ] **Step 2: Replace the useEffect body**

Replace the existing `useEffect` with:
```typescript
useEffect(() => {
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-analytics`)
    .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
    .then((data: PageVisit[]) => { setVisits(data ?? []); setLoading(false); })
    .catch((err) => { console.error("Analytics fetch failed:", err); setLoading(false); });
}, []);
```

`VITE_SUPABASE_URL` is already in the local `.env`. It must also be added to the GitHub Pages build environment (e.g. as a GitHub Actions repository variable/secret) — without it, the fetch URL will be `"undefined/functions/v1/get-analytics"` and the dashboard will be blank.

- [ ] **Step 3: Verify the build compiles**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Analytics.tsx
git commit -m "feat: fetch analytics data from edge function instead of Supabase SDK"
```
