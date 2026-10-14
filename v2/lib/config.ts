import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type PublicConfig = { supabaseUrl:string; supabaseKey:string; mediaBucket:string };
declare global { interface Window { FRANKIHOLZ_CONFIG?: PublicConfig; } }
let cached:SupabaseClient|null = null;
export function client():SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (cached) return cached;
  // Reuse ONLY the already-public anon key from develop's approved browser config.
  const cfg=window.FRANKIHOLZ_CONFIG;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL || cfg?.supabaseUrl;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || cfg?.supabaseKey;
  if (!url || !key) return null;
  cached=createClient(url,key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
  return cached;
}
export const fallbackHero='https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2200&q=85';
export const mediaUrl=(path?:string|null)=>{
  if(!path)return '';
  const cfg=typeof window!=='undefined'?window.FRANKIHOLZ_CONFIG:undefined;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||cfg?.supabaseUrl||'https://bdeajozhylypiidrldka.supabase.co';
  return url+'/storage/v1/object/public/frankiholz-media/'+path.split('/').map(encodeURIComponent).join('/');
};
export const formatEuro=(value:number|string,lang:'en'|'de'='en')=>new Intl.NumberFormat(lang==='de'?'de-DE':'en-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(value)||0);
export const isPreviewHost=()=>typeof window!=='undefined'&&(/--frankiholz\.netlify\.app$/.test(location.hostname)||location.hostname==='localhost'||location.hostname==='127.0.0.1');
