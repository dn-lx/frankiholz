import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PublicConfig = { supabaseUrl:string; supabaseKey:string; mediaBucket:string };
declare global { interface Window { FRANKIHOLZ_CONFIG?: PublicConfig } }
const approved: PublicConfig = {
  supabaseUrl: 'https://bdeajozhylypiidrldka.supabase.co',
  supabaseKey: 'sb_publishable_FX7QKUBZQmwykGcgv8SdfQ_lGRZF8n2',
  mediaBucket: 'frankiholz-media',
};
export function publicConfig(): PublicConfig {
  const supplied = typeof window !== 'undefined' ? window.FRANKIHOLZ_CONFIG : undefined;
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || supplied?.supabaseUrl || approved.supabaseUrl,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supplied?.supabaseKey || approved.supabaseKey,
    mediaBucket: supplied?.mediaBucket || approved.mediaBucket,
  };
}
let cached: SupabaseClient | null = null;
export function client(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!cached) {
    const cfg = publicConfig();
    cached = createClient(cfg.supabaseUrl, cfg.supabaseKey);
  }
  return cached;
}
export const fallbackHero = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80';
export function mediaUrl(path?:string|null) {
  if (!path) return '';
  const cfg = publicConfig();
  return `${cfg.supabaseUrl}/storage/v1/object/public/${cfg.mediaBucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
export const formatEuro = (value:number|string,lang:'en'|'de'='en') => new Intl.NumberFormat(lang==='de'?'de-DE':'en-DE',{style:'currency',currency:'EUR'}).format(Number(value)||0);
export function contactNumber(value:string) {
  const normalized=value.replace(/[^+0-9]/g,'');
  return /^\+[1-9][0-9]{6,14}$/.test(normalized) ? normalized : '';
}
