export function normalizeCode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, "");
}

export const CODE_MESSAGES = {
  checking: "⏳ Vérification…",
  ok: "✅ Accès débloqué !",
  invalid: "❌ Code introuvable. Vérifiez le code reçu après votre achat.",
  unavailable: "⚠️ Vérification indisponible. Réessayez dans quelques instants.",
};

export async function requestActivation(url, key, payload, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${url}/functions/v1/activation`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
    signal: signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Activation service unavailable");
  return response.json();
}
