/**
 * style-assistant — the Capsule Stylist chat (Pro). Anthropic Haiku, grounded in
 * the caller's own wardrobe. Locked-rule-safe: this only TALKS about the closet;
 * scoring/generation stay client-side. Key stays server-side (same ANTHROPIC_API_KEY
 * as tag-garment — no Gemini billing needed).
 *
 * Abuse defenses (the whole point):
 *   1. Auth + Pro gate — only signed-in Pro users.
 *   2. Daily quota — DAILY_LIMIT answered messages/user (assistant_messages table).
 *   3. Relevance gate — a cheap Haiku yes/no rejects off-topic BEFORE the main call,
 *      so it can't be used as a free general chatbot.
 *   4. Hard caps — short max_tokens, truncated history/context.
 *
 * Deploy:  supabase functions deploy style-assistant
 * Secret:  ANTHROPIC_API_KEY (already set for tag-garment)
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MODEL = 'claude-haiku-4-5';
const DAILY_LIMIT = 30;
const MAX_REPLY_TOKENS = 450;
const MAX_MSG_CHARS = 600; // per message, to block essay-dumping
const MAX_HISTORY = 10; // turns kept

const SYSTEM = `You are the Capsule Stylist — a concise, friendly personal wardrobe assistant inside the Capsule app.
You ONLY help with: the user's clothes, building/choosing outfits, what to wear (weather/occasion), packing, capsule wardrobes, color/fit advice, and buy/keep decisions — all grounded in THEIR wardrobe, which is provided below.
Rules:
- Use the user's actual pieces from the WARDROBE context when relevant; refer to them naturally.
- If asked anything outside fashion/their wardrobe (coding, essays, general knowledge, math, etc.), briefly decline and steer back to styling. Do not comply.
- Be practical and specific. Keep replies short — a few sentences or a tight list. No preamble.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Not authenticated' }, 401);

    // Pro gate.
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    if (profile?.subscription_tier !== 'pro') {
      // 200 + error so the client can render the message without error plumbing.
      return json({ error: 'The stylist chat is a Pro feature.' }, 200);
    }

    // Daily quota (graceful if the table isn't applied yet).
    const since = startOfTodayISO();
    let used = 0;
    try {
      const { count } = await supabase
        .from('assistant_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since);
      used = count ?? 0;
    } catch {
      used = 0; // table missing — quota not enforced until migration is applied
    }
    if (used >= DAILY_LIMIT) {
      return json({ error: `You've reached today's ${DAILY_LIMIT}-message limit. Back tomorrow!`, remaining: 0 }, 200);
    }

    const body = await req.json();
    const rawMessages = (Array.isArray(body.messages) ? body.messages : []) as ChatMsg[];
    const context = typeof body.context === 'string' ? body.context.slice(0, 2000) : '';
    const messages = rawMessages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return json({ error: 'No message provided' }, 400);

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500);

    // 1. Relevance gate — cheap, blocks off-topic before the real call.
    const onTopic = await classify(lastUser.content, anthropicKey);
    if (!onTopic) {
      // Count it so the gate itself can't be spammed for free.
      await supabase.from('assistant_messages').insert({ user_id: user.id }).then(() => {}, () => {});
      return json(
        {
          reply:
            "I'm just your wardrobe stylist — I can help with outfits, what to wear, packing, and buy-or-keep calls from your closet. What are you trying to put together?",
          remaining: Math.max(0, DAILY_LIMIT - used - 1),
          offtopic: true,
        },
        200
      );
    }

    // 2. Grounded answer.
    const reply = await answer(context, messages, anthropicKey);

    // Log usage (after a successful answer).
    await supabase.from('assistant_messages').insert({ user_id: user.id }).then(() => {}, () => {});

    return json({ reply, remaining: Math.max(0, DAILY_LIMIT - used - 1) }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

async function classify(message: string, key: string): Promise<boolean> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 5,
      system:
        'Reply with only "yes" or "no". Is the user message about clothing, outfits, wardrobe, personal style, packing, or shopping for clothes? Anything else (coding, general questions, essays, math, etc.) is "no".',
      messages: [{ role: 'user', content: message.slice(0, MAX_MSG_CHARS) }],
    }),
  });
  if (!res.ok) return true; // fail open to a (capped) real answer rather than wrongly refusing
  const data = await res.json();
  const text = (data.content?.[0]?.text ?? '').toLowerCase();
  return text.includes('yes');
}

async function answer(context: string, messages: ChatMsg[], key: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      system: `${SYSTEM}\n\nWARDROBE:\n${context || '(no wardrobe details provided)'}`,
      messages,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "Sorry, I couldn't put that together — try rephrasing?";
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
