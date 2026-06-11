/**
 * Runtime configuration. Only EXPO_PUBLIC_* vars are ever visible here —
 * Anthropic and Stripe secret keys live exclusively in Supabase Edge Function
 * secrets (see supabase/functions/ and .env.example).
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export const supabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * Locked architecture rule: generation + gap analysis are local tag math.
 * This flag exists only for the optional single-Sonnet-call polish of the
 * "why it works" blurb. Default OFF — generation itself never calls an LLM.
 */
export const ENABLE_LLM_WHY_POLISH = false;
