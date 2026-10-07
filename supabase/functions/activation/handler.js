const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

// The legacy `used` column means issued/reserved, not an expired license.
// A lifetime code must continue to work after payment and on a new device.
export function createActivationHandler({ url, serviceKey, fetchImpl = fetch }) {
  const database = async (query, options = {}) => {
    const response = await fetchImpl(`${url}/rest/v1/activation_codes?${query}`, {
      ...options,
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Database unavailable");
    return response.json();
  };
  return async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!url || !serviceKey) return json({ error: "Service unavailable" }, 503);
    let payload;
    try { payload = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
    if (!payload || typeof payload !== "object") return json({ error: "Invalid request" }, 400);
    try {
      if (payload.action === "lookup") {
        // A Stripe session ID is an unguessable purchase receipt. Never look up
        // codes by email or return customer details to the browser.
        if (typeof payload.sessionId !== "string" || !/^cs_(live|test)_[A-Za-z0-9]{20,200}$/.test(payload.sessionId)) {
          return json({ error: "Invalid session" }, 400);
        }
        const rows = await database(new URLSearchParams({ stripe_session_id: `eq.${payload.sessionId}`, used: "eq.true", select: "code", order: "used_at.desc.nullslast,id.desc", limit: "1" }));
        return json(rows.length ? { status: "ready", code: rows[0].code } : { status: "pending" });
      }
      if (payload.action !== "activate" || typeof payload.code !== "string") return json({ error: "Invalid request" }, 400);
      const code = payload.code.trim().toUpperCase().replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, "");
      if (!/^[A-Z0-9-]{8,64}$/.test(code)) return json({ valid: false });
      const rows = await database(new URLSearchParams({ code: `eq.${code}`, select: "id,used", limit: "1" }));
      if (!rows.length) return json({ valid: false });
      if (!rows[0].used) {
        // Persist issuance before reporting success; failed writes must not
        // silently grant access. Repeated calls are intentionally idempotent.
        await database(new URLSearchParams({ id: `eq.${rows[0].id}`, used: "is.false", select: "id" }), {
          method: "PATCH", body: JSON.stringify({ used: true, used_at: new Date().toISOString() }),
        });
      }
      return json({ valid: true });
    } catch { return json({ error: "Service unavailable" }, 503); }
  };
}
