import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createWebhookHandler, verifyStripeSignature } from "../supabase/functions/stripe-webhook/handler.js";

const secret = "whsec_test_fixture_only";
const session = { id: "cs_live_testfixture12345678901234567890", livemode: true, payment_status: "paid", mode: "payment", currency: "eur", amount_total: 500, success_url: "https://prepexamcivique.fr/?payment=success&session_id={CHECKOUT_SESSION_ID}" };
const event = (overrides = {}) => ({ type: "checkout.session.completed", livemode: true, data: { object: { ...session, ...overrides } } });
function signedRequest(value, timestamp = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify(value);
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return new Request("https://example.test/webhook", { method: "POST", headers: { "stripe-signature": `t=${timestamp},v1=${digest}` }, body });
}
test("valid signed paid civic checkout reaches assignment", async () => {
  const sessions = [];
  const run = createWebhookHandler({ secret, assignCode: async (id) => sessions.push(id) });
  assert.equal((await run(signedRequest(event()))).status, 200);
  assert.deepEqual(sessions, [session.id]);
});
test("forged or stale signatures cannot issue a code", async () => {
  const run = createWebhookHandler({ secret, assignCode: async () => assert.fail("must not assign") });
  const forged = new Request("https://example.test", { method: "POST", body: JSON.stringify(event()) });
  assert.equal((await run(forged)).status, 400);
  assert.equal((await run(signedRequest(event(), Math.floor(Date.now()/1000) - 600))).status, 400);
  assert.equal(await verifyStripeSignature("tampered", "t=1,v1=garbage", secret), false);
});
test("unpaid, test-mode and other products never consume a production code", async () => {
  const run = createWebhookHandler({ secret, assignCode: async () => assert.fail("must not assign") });
  for (const change of [{ payment_status: "unpaid" }, { livemode: false }, { amount_total: 100 }, { success_url: "https://unrelated.example/" }, { success_url: "https://prepexamcivique.fr.attacker.example/" }]) {
    assert.equal((await run(signedRequest(event(change)))).status, 200);
  }
});
test("delayed paid checkout is fulfilled and a database failure asks Stripe to retry", async () => {
  const delayed = event(); delayed.type = "checkout.session.async_payment_succeeded";
  let assigned = 0;
  assert.equal((await createWebhookHandler({ secret, assignCode: async () => { assigned++; } })(signedRequest(delayed))).status, 200);
  assert.equal(assigned, 1);
  assert.equal((await createWebhookHandler({ secret, assignCode: async () => { throw new Error("database unavailable"); } })(signedRequest(event()))).status, 503);
});
