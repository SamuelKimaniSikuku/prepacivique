// Supabase Edge Function: translate
// Proxies civic-exam question translation through Anthropic so the API key
// stays server-side (never shipped to the browser bundle).
//
// Set the secret before deploying:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Deploy with:
//   supabase functions deploy translate

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const LANG_NAMES: Record<string, string> = {
  en: "English", ar: "Arabic", es: "Spanish", pt: "Portuguese", it: "Italian",
  de: "German", tr: "Turkish", zh: "Chinese", ro: "Romanian", pl: "Polish",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: "Server missing ANTHROPIC_API_KEY" }, 500);

  let payload: { questions?: unknown; lang?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { questions, lang } = payload;
  if (!Array.isArray(questions) || questions.length === 0) {
    return json({ error: "questions must be a non-empty array" }, 400);
  }
  if (questions.length > 20) {
    return json({ error: "Max 20 questions per request" }, 400);
  }
  const langName = LANG_NAMES[String(lang)];
  if (!langName) return json({ error: "Unsupported lang" }, 400);

  const compact = questions.map((q: any) => ({ q: q.q, c: q.c, e: q.e }));

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.2,
        messages: [{
          role: "user",
          content:
            `Translate these French civic exam questions into ${langName}. ` +
            `Return ONLY a valid JSON array, no markdown. Keep numbers, dates, proper nouns unchanged. ` +
            `Structure: [{"q":"...","c":["...","...","...","..."],"e":"..."}]\n` +
            JSON.stringify(compact),
        }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Anthropic error (${res.status})`, detail }, 502);
    }

    const data = await res.json();
    const text = (data.content ?? [])
      .map((b: any) => b.text ?? "")
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return json({ error: "Bad translation response" }, 502);

    return json({ translations: parsed });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Translation failed" }, 502);
  }
});
