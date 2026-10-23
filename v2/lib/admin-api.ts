import type { SupabaseClient } from '@supabase/supabase-js';
import type { Room, RoomImage } from './types';

export type AdminCopy = {copy_key:string;label?:string;sort_order?:number;text_en:string;text_de:string};
export type AdminBooking = {id:string;reference:string;room_id:string;check_in:string;check_out:string;guest_name:string;guest_email:string;guest_phone?:string;guest_country?:string;guest_age?:number;guest_sex?:string;guest_languages?:string[];guest_hobbies?:string;guest_returning?:boolean;guests?:number;language?:string;message?:string;status:string;payment_status:string;payment_mode?:string;payment_collection_mode?:string;total_price:number;created_at:string;charge_due_at?:string;payment_due_at?:string;payment_schedule_version?:string;admin_deleted_at?:string;refund_review_required?:boolean;bank_transfer_review_required?:boolean;payment_operation_token?:string;frankiholz_rooms?:{name:string}};
export type PaymentState = {environment:'test'|'live';live_ready:boolean;test_ready:boolean;live_verified_at?:string;test_verified_at?:string};
export type AdminFeed = {id:string;room_id:string;provider:string;enabled:boolean;last_synced_at?:string;last_status?:string;last_error?:string};
export type AdminSettings = Record<string,string|number|null>;
export type AdminData = {rooms:Room[];images:RoomImage[];bookings:AdminBooking[];settings:AdminSettings;pricing:Record<string,number>;copy:AdminCopy[];feeds:AdminFeed[];payment:PaymentState|null};
export type AdminApi = {db:SupabaseClient;busy:boolean;execute:(label:string,job:()=>Promise<void>)=>Promise<boolean>;edge:(endpoint:string,body:unknown)=>Promise<Record<string,unknown>>;notify:(message:string,error?:boolean)=>void;reload:()=>Promise<void>};
export function checked<T>(result:{data:T;error:{message:string}|null}):T {if(result.error)throw Error(result.error.message);return result.data;}
export const updated=()=>new Date().toISOString();
export function assertRow<T>(row:T):NonNullable<T> {if(row===null||row===undefined)throw Error('No row was updated. Check your permissions and reload before retrying.');return row as NonNullable<T>;}
export const safeName=(name:string)=>name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').slice(-100);
export function validImage(file:File,maxMb=15,avatar=false){const types=avatar?['image/jpeg','image/png','image/webp']:['image/jpeg','image/png','image/webp','image/avif'];if(!types.includes(file.type)||!file.size||file.size>maxMb*1024*1024)throw Error(`Choose a supported image up to ${maxMb} MB.`);}
export function bucket(){return window.FRANKIHOLZ_CONFIG?.mediaBucket||'frankiholz-media';}
export function adminDate(value?:string){return value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(value)):'Not available';}
export const homeSections=[['fhReviewsBand','Guest reviews'],['roomsSection','Rooms'],['hostMessage','Message from your host'],['guestInfoPublic','Guest information'],['bookingSection','Room details & booking'],['location','Location'],['cancellationPolicy','Cancellation & payment policy'],['bookingStatusSection','Booking status']] as const;
export function parseHomeOrder(raw?:string){try{const value=JSON.parse(raw||'null');return Array.isArray(value)&&value.length===homeSections.length&&new Set(value).size===value.length&&value.every(id=>homeSections.some(([key])=>key===id))?value as string[]:null;}catch{return null;}}
