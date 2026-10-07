import { createWebhookHandler } from "./handler.js";

Deno.serve(createWebhookHandler({
  secret: Deno.env.get("STRIPE_WEBHOOK_SECRET"),
  assignCode: async (sessionId: string, email: string | null) => {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const response = await fetch(`${url}/rest/v1/rpc/assign_checkout_code`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ checkout_session: sessionId, buyer_email: email }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok || typeof await response.json() !== "string") throw new Error("Assignment failed");
  },
}));
