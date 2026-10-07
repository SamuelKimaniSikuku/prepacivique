import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCode, requestActivation } from "../src/activation.js";
import { createActivationHandler } from "../supabase/functions/activation/handler.js";

const request = (body) => new Request("https://example.test/activation", { method: "POST", body: JSON.stringify(body) });
const handler = (fetchImpl) => createActivationHandler({ url: "https://db.test", serviceKey: "test-only", fetchImpl });
const code = "CIVIC-TEST-TEST-TEST";

test("pasted lowercase codes with spaces and typographic hyphens normalize", () => {
  assert.equal(normalizeCode("  civic–test–test–test \n"), code);
});
test("a code assigned by Stripe is valid, including repeat activation", async () => {
  const run = handler(async (_url, options) => {
    assert.notEqual(options.method, "PATCH");
    return Response.json([{ id: 1, used: true }]);
  });
  for (let i = 0; i < 2; i++) assert.deepEqual(await (await run(request({ action: "activate", code }))).json(), { valid: true });
});
test("an unused manual code is marked issued before access is granted", async () => {
  const calls = [];
  const run = handler(async (url, options) => {
    calls.push({ url, options });
    return Response.json(options.method === "PATCH" ? [{ id: 1 }] : [{ id: 1, used: false }]);
  });
  assert.equal((await (await run(request({ action: "activate", code }))).json()).valid, true);
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[1].options.body).used, true);
});
test("failed database writes do not activate a code", async () => {
  const run = handler(async (_url, options) => options.method === "PATCH" ? new Response("", { status: 503 }) : Response.json([{ id: 1, used: false }]));
  assert.equal((await run(request({ action: "activate", code }))).status, 503);
});
test("unknown code and infrastructure failure are distinct", async () => {
  const missing = await handler(async () => Response.json([]))(request({ action: "activate", code }));
  assert.equal(missing.status, 200);
  assert.deepEqual(await missing.json(), { valid: false });
  const failed = await handler(async () => { throw new Error("offline"); })(request({ action: "activate", code }));
  assert.equal(failed.status, 503);
});
test("payment lookup is scoped to an exact receipt and returns no customer details", async () => {
  const sessionId = "cs_test_123456789012345678901234";
  const run = handler(async (url) => {
    const query = new URL(url).searchParams;
    assert.equal(query.get("stripe_session_id"), `eq.${sessionId}`);
    assert.equal(query.get("select"), "code");
    return Response.json([{ code }]);
  });
  assert.deepEqual(await (await run(request({ action: "lookup", sessionId }))).json(), { status: "ready", code });
  assert.equal((await run(request({ action: "lookup", email: "test@example.com" }))).status, 400);
});
test("pending payment never claims success", async () => {
  const response = await handler(async () => Response.json([]))(request({ action: "lookup", sessionId: "cs_test_123456789012345678901234" }));
  assert.deepEqual(await response.json(), { status: "pending" });
});
test("client throws on backend failures instead of labelling codes invalid", async () => {
  await assert.rejects(requestActivation("https://example.test", "test-key", { action: "activate", code }, { fetchImpl: async () => new Response("", { status: 503 }) }));
});
test("malformed payload does not touch the database", async () => {
  const run = handler(async () => { assert.fail("unexpected database access"); });
  assert.equal((await run(request(null))).status, 400);
  assert.deepEqual(await (await run(request({ action: "activate", code: "*" }))).json(), { valid: false });
});
