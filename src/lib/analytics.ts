// ============================================================
// Analytics — configure your endpoint here
// ============================================================

export const ANALYTICS_ENDPOINT = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/page-visit`;

// ============================================================
// Helpers
// ============================================================

function getSessionId(): string {
  const key = "ap_session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function markReturnVisit(): boolean {
  const key = "ap_visited";
  const isReturn = localStorage.getItem(key) === "1";
  localStorage.setItem(key, "1");
  return isReturn;
}

function deviceType(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

// ============================================================
// Payload
// ============================================================

export interface AnalyticsPayload {
  page: string;
  timestamp: string;
  session_id: string;
  referrer: string;
  is_return_visit: boolean;
  device_type: "mobile" | "tablet" | "desktop";
  screen_width: number;
  duration_ms?: number;
  scroll_depth_pct?: number;
  click?: string;
}

// ============================================================
// Track
// ============================================================

export function track(
  page: string,
  extras: Partial<Pick<AnalyticsPayload, "duration_ms" | "scroll_depth_pct" | "click">> = {}
) {
  if (!ANALYTICS_ENDPOINT || ANALYTICS_ENDPOINT.includes("your-project")) return;

  const payload: AnalyticsPayload = {
    page,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    referrer: document.referrer,
    is_return_visit: markReturnVisit(),
    device_type: deviceType(),
    screen_width: window.innerWidth,
    ...extras,
  };

  // sendBeacon is fire-and-forget, survives page unload
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    // Use text/plain to avoid CORS preflight (sendBeacon can't handle preflight)
    navigator.sendBeacon(ANALYTICS_ENDPOINT, body);
  } else {
    fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}
