// Quire AI — one secure endpoint for ChatGPT (OpenAI), Claude (Anthropic),
// Gemini (Google) and Copilot (Azure OpenAI).
//
// API keys live only in Supabase secrets; the browser never sees them.
// Only users signed in to this Quire project (and, if QUIRE_AI_ALLOWED_EMAILS
// is set, only those emails) can use it.
//
// Request body:
//   { task: "providers" }
//   { task: "chat", provider, model?, system?, messages: [{role, content}] }
//   { task: "article", provider, model?, payload }   // Quire Copilot schema_version 2
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Msg = { role: "user" | "assistant"; content: string };

const env = (k: string) => Deno.env.get(k) ?? "";

const PROVIDERS = {
  openai: {
    label: "ChatGPT",
    configured: () => Boolean(env("OPENAI_API_KEY")),
    model: () => env("OPENAI_MODEL") || "gpt-5",
  },
  anthropic: {
    label: "Claude",
    configured: () => Boolean(env("ANTHROPIC_API_KEY")),
    model: () => env("ANTHROPIC_MODEL") || "claude-sonnet-5-5",
  },
  gemini: {
    label: "Gemini",
    configured: () => Boolean(env("GEMINI_API_KEY")),
    model: () => env("GEMINI_MODEL") || "gemini-2.5-pro",
  },
  azure: {
    label: "Copilot (Azure OpenAI)",
    configured: () => Boolean(env("AZURE_OPENAI_API_KEY") && env("AZURE_OPENAI_ENDPOINT") && env("AZURE_OPENAI_DEPLOYMENT")),
    model: () => env("AZURE_OPENAI_DEPLOYMENT"),
  },
} as const;
type ProviderId = keyof typeof PROVIDERS;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function readError(res: Response, name: string) {
  let detail = "";
  try { detail = (await res.text()).slice(0, 400); } catch { /* ignore */ }
  return new Error(`${name} returned ${res.status}${detail ? `: ${detail}` : ""}`);
}

async function callOpenAICompatible(url: string, headers: Record<string, string>, model: string | null, system: string, messages: Msg[], name: string) {
  const body: Record<string, unknown> = {
    messages: [...(system ? [{ role: "system", content: system }] : []), ...messages],
  };
  if (model) body.model = model;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw await readError(res, name);
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? "");
}

async function callProvider(provider: ProviderId, model: string, system: string, messages: Msg[]): Promise<string> {
  if (provider === "openai") {
    return callOpenAICompatible("https://api.openai.com/v1/chat/completions",
      { Authorization: `Bearer ${env("OPENAI_API_KEY")}` }, model, system, messages, "OpenAI");
  }
  if (provider === "azure") {
    const base = env("AZURE_OPENAI_ENDPOINT").replace(/\/+$/, "");
    const version = env("AZURE_OPENAI_API_VERSION") || "2024-10-21";
    const url = `${base}/openai/deployments/${encodeURIComponent(env("AZURE_OPENAI_DEPLOYMENT"))}/chat/completions?api-version=${version}`;
    return callOpenAICompatible(url, { "api-key": env("AZURE_OPENAI_API_KEY") }, null, system, messages, "Azure OpenAI");
  }
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 4096, ...(system ? { system } : {}), messages }),
    });
    if (!res.ok) throw await readError(res, "Anthropic");
    const data = await res.json();
    return (data?.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  }
  // Gemini
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env("GEMINI_API_KEY") },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    }),
  });
  if (!res.ok) throw await readError(res, "Gemini");
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

// Keep the last 30 turns, start with the user and merge consecutive same-role turns
// (e.g. several AIs answering in "Compare all"), which some providers reject.
function normaliseMessages(input: Msg[]): Msg[] {
  const out: Msg[] = [];
  input
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && String(m?.content ?? "").trim())
    .slice(-30)
    .forEach((m) => {
      const content = String(m.content).slice(0, 20000);
      const prev = out[out.length - 1];
      if (prev && prev.role === m.role) prev.content += "\n\n" + content;
      else out.push({ role: m.role, content });
    });
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

// Pull the first JSON object out of a model reply (models sometimes wrap it in ``` fences).
function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The AI did not return JSON.");
  return JSON.parse(raw.slice(start, end + 1));
}

async function authorise(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const allowed = env("QUIRE_AI_ALLOWED_EMAILS").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(String(data.user.email ?? "").toLowerCase())) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const user = await authorise(req);
  if (!user) return json({ error: "Sign in to Quire (Account & cloud) to use the AI assistant." }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

  if (body.task === "providers") {
    return json({
      providers: (Object.keys(PROVIDERS) as ProviderId[]).map((id) => ({
        id, label: PROVIDERS[id].label, configured: PROVIDERS[id].configured(), model: PROVIDERS[id].configured() ? PROVIDERS[id].model() : null,
      })),
    });
  }

  const provider = String(body.provider ?? "") as ProviderId;
  if (!(provider in PROVIDERS)) return json({ error: "Unknown AI provider." }, 400);
  if (!PROVIDERS[provider].configured()) return json({ error: `${PROVIDERS[provider].label} is not set up yet. Add its API key as a Supabase secret.` }, 400);
  const model = String(body.model || PROVIDERS[provider].model());

  try {
    if (body.task === "chat") {
      const messages = normaliseMessages(Array.isArray(body.messages) ? body.messages : []);
      if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Send a message first." }, 400);
      const text = await callProvider(provider, model, String(body.system ?? "").slice(0, 20000), messages);
      return json({ provider, model, text });
    }

    if (body.task === "article") {
      const payload = body.payload as Record<string, unknown>;
      const system = "You are Quire Copilot, a careful research assistant. " + String(payload?.instruction ?? "") +
        " Respond with a single JSON object only.";
      const text = await callProvider(provider, model, system, [{ role: "user", content: JSON.stringify(payload).slice(0, 120000) }]);
      return json({ provider, model, ...extractJson(text) });
    }
    return json({ error: "Unknown task." }, 400);
  } catch (err) {
    return json({ error: String((err as Error)?.message ?? err) }, 502);
  }
});
