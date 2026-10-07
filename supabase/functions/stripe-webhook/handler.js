const json = (data, status = 200) => Response.json(data, { status });
const encoder = new TextEncoder();

export async function verifyStripeSignature(body, header, secret, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = header.split(",").map(part => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  for (const [name, value] of parts) {
    if (name !== "v1" || !/^[a-f0-9]{64}$/i.test(value ?? "")) continue;
    const signature = Uint8Array.from(value.match(/../g), byte => parseInt(byte, 16));
    if (await crypto.subtle.verify("HMAC", key, signature, encoder.encode(`${timestamp}.${body}`))) return true;
  }
  return false;
}

export function isCivicPurchase(session) {
  // success_url is set by the merchant, unlike client_reference_id which a
  // visitor can change. This prevents another product's payment granting access.
  try {
    const url = new URL(session.success_url);
    return url.protocol === "https:" && ["prepexamcivique.fr", "www.prepexamcivique.fr"].includes(url.hostname)
      && session.mode === "payment" && session.currency === "eur" && session.amount_total === 500;
  } catch { return false; }
}

export function createWebhookHandler({ secret, assignCode }) {
  return async (request) => {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!secret) return json({ error: "Webhook not configured" }, 503);
    const body = await request.text();
    if (!await verifyStripeSignature(body, request.headers.get("stripe-signature"), secret)) return json({ error: "Invalid signature" }, 400);
    let event;
    try { event = JSON.parse(body); } catch { return json({ error: "Invalid payload" }, 400); }
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return json({ received: true });
    const session = event.data?.object;
    if (!session || session.payment_status !== "paid") return json({ received: true });
    // A test payment must never consume a production activation code.
    if (event.livemode !== true || session.livemode !== true) return json({ received: true, ignored: "test_mode" });
    if (!isCivicPurchase(session)) return json({ received: true, ignored: "different_product" });
    if (typeof session.id !== "string" || !/^cs_live_[A-Za-z0-9]+$/.test(session.id)) return json({ error: "Invalid session" }, 400);
    try {
      await assignCode(session.id, session.customer_details?.email ?? session.customer_email ?? null);
      return json({ received: true });
    } catch {
      // Non-2xx triggers Stripe's retry. Never acknowledge an unfulfilled order.
      return json({ error: "Code assignment failed" }, 503);
    }
  };
}
