/**
 * tag-garment — the app's ONLY LLM call (locked decision).
 * Image in → claude-haiku-4-5 → structured tag JSON out (~$0.003/item).
 * Prompt + schema: docs/02-tagging-schema.md. ANTHROPIC_API_KEY lives only
 * here as an Edge Function secret — never in the client bundle.
 *
 * Deploy:  supabase functions deploy tag-garment
 * Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TAGGING_PROMPT = `You are a fashion cataloguing assistant. Look at the clothing item in this image and return ONLY a JSON object matching this exact schema. If the image shows a person wearing multiple garments, tag only the single most prominent item unless told otherwise. Guess material and fit from visual cues; use "unknown" and set confidence to "low" rather than inventing detail. Never add fields outside the schema.

{
  "category": "top | bottom | dress | outerwear | shoes | accessory",
  "subtype": "t-shirt, button-up, sweater, jeans, trousers, sneakers, etc.",
  "primary_color": "single dominant color (named)",
  "secondary_colors": ["any other notable colors"],
  "pattern": "solid | striped | checked | floral | graphic | other",
  "material_guess": "cotton | denim | wool | leather | synthetic | unknown",
  "formality": "casual | smart-casual | formal",
  "season": ["spring", "summer", "fall", "winter"],
  "fit_silhouette": "slim | regular | relaxed | oversized | unknown",
  "neutral": true,
  "confidence": "high | medium | low"
}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the caller is a signed-in user (RLS-equivalent gate for functions)
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Not authenticated' }, 401);
    }

    const { image_base64, mime_type = 'image/jpeg' } = await req.json();
    if (!image_base64) {
      return json({ error: 'image_base64 is required' }, 400);
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mime_type, data: image_base64 },
              },
              { type: 'text', text: TAGGING_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return json({ error: `Anthropic API error (${response.status})`, detail }, 502);
    }

    const completion = await response.json();
    const text = completion.content?.[0]?.text ?? '';
    // Force JSON-only output: extract the first {...} block defensively
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return json({ error: 'Model did not return JSON', raw: text }, 502);
    }
    const schema = JSON.parse(match[0]);
    return json(schema, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
