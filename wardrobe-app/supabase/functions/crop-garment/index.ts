/**
 * crop-garment — AI image cropping + cutout for the whiteboard thumbnail (doc-11).
 *
 * Pipeline (all server-side so it works identically on web AND native — no WASM
 * or onnxruntime in the client bundle):
 *   1. DETECT  — Gemini 2.5 Flash returns a tight bounding box for the garment.
 *   2. CROP    — ImageScript crops to that box (pure-Deno, no native deps).
 *   3. CUTOUT  — Gemini 2.5 Flash Image isolates the garment on a clean neutral
 *                field ("image filler"); skipped gracefully if unavailable.
 *   4. COMPRESS— downscale + re-encode so cutouts stay small for Storage.
 *
 * Architecture rule (locked): this is image work only. Outfit generation and
 * gap analysis stay pure local tag math — this function never scores anything.
 *
 * Deploy:  supabase functions deploy crop-garment
 * Secrets: supabase secrets set GEMINI_API_KEY=...
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { decode, Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
const DETECT_MODEL = 'gemini-2.5-flash';
const CUTOUT_MODEL = 'gemini-2.5-flash-image-preview';

/** Longest edge of the returned cutout (px) — keeps Storage + thumbnails small. */
const MAX_EDGE = 768;

const DETECT_PROMPT = `Detect the single main clothing garment in this image (ignore the person, hangers, background).
Return ONLY a JSON object, no prose:
{ "box_2d": [ymin, xmin, ymax, xmax] }
Coordinates are integers normalized to 0-1000 of the image's height (y) and width (x).`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Same auth gate as tag-garment: only signed-in users may spend model calls.
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

    const { image_base64, mime_type = 'image/jpeg', cutout = true } = await req.json();
    if (!image_base64) return json({ error: 'image_base64 is required' }, 400);

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) return json({ error: 'GEMINI_API_KEY is not configured' }, 500);

    // 1. DETECT bounding box ------------------------------------------------
    const box = await detectBox(image_base64, mime_type, geminiKey);

    // 2. CROP to the box (+ a small margin) ---------------------------------
    const original = await decode(base64ToBytes(image_base64));
    if (!(original instanceof Image)) return json({ error: 'Unsupported image' }, 422);
    const cropped = cropToBox(original, box);

    // 3. CUTOUT (optional "image filler") -----------------------------------
    let cutoutBytes: Uint8Array | null = null;
    if (cutout) {
      cutoutBytes = await isolateGarment(cropped, geminiKey).catch(() => null);
    }

    // 4. COMPRESS + encode --------------------------------------------------
    const finalImage = cutoutBytes ? await decode(cutoutBytes) : cropped;
    const out = finalImage instanceof Image ? finalImage : cropped;
    out.resize(...fitWithin(out.width, out.height, MAX_EDGE));
    const png = await out.encode(); // PNG preserves any transparency from the cutout

    return json(
      {
        box_2d: box,
        cutout: !!cutoutBytes,
        width: out.width,
        height: out.height,
        image_base64: bytesToBase64(png),
        mime_type: 'image/png',
      },
      200
    );
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

async function detectBox(
  imageB64: string,
  mime: string,
  key: string
): Promise<[number, number, number, number]> {
  const res = await fetch(`${GEMINI}/${DETECT_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mime, data: imageB64 } },
            { text: DETECT_PROMPT },
          ],
        },
      ],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini detect error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const match = text.match(/\[[^\]]*\]/);
  if (!match) throw new Error('Gemini returned no box');
  const arr = JSON.parse(match[0]) as number[];
  if (arr.length !== 4) throw new Error('Malformed box');
  return arr as [number, number, number, number];
}

/** Crop an ImageScript image to a Gemini box_2d ([ymin,xmin,ymax,xmax], 0-1000) with margin. */
function cropToBox(img: Image, box: [number, number, number, number]): Image {
  const [ymin, xmin, ymax, xmax] = box;
  const margin = 0.04; // 4% breathing room so edges aren't clipped
  const x0 = clamp((xmin / 1000 - margin) * img.width, 0, img.width - 1);
  const y0 = clamp((ymin / 1000 - margin) * img.height, 0, img.height - 1);
  const x1 = clamp((xmax / 1000 + margin) * img.width, x0 + 1, img.width);
  const y1 = clamp((ymax / 1000 + margin) * img.height, y0 + 1, img.height);
  return img.clone().crop(Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0));
}

/** Send the crop to Gemini's image model and get back the garment on a clean field. */
async function isolateGarment(cropped: Image, key: string): Promise<Uint8Array> {
  const b64 = bytesToBase64(await cropped.encode());
  const res = await fetch(`${GEMINI}/${CUTOUT_MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: 'image/png', data: b64 } },
            {
              text:
                'Return ONLY this exact garment isolated on a plain, evenly-lit neutral light-grey background. ' +
                'Remove any person, hands, hangers, and the original background. Keep the garment centered, ' +
                'unchanged in color and shape. Do not add text or props.',
            },
          ],
        },
      ],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!res.ok) throw new Error(`Gemini cutout error ${res.status}`);
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p: any) => p.inline_data?.data || p.inlineData?.data);
  const b = imgPart?.inline_data?.data ?? imgPart?.inlineData?.data;
  if (!b) throw new Error('Gemini returned no image');
  return base64ToBytes(b);
}

function fitWithin(w: number, h: number, max: number): [number, number] {
  if (w <= max && h <= max) return [w, h];
  return w >= h ? [max, Math.round((h / w) * max)] : [Math.round((w / h) * max), max];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
