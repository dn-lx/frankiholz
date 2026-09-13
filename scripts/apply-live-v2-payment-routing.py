from pathlib import Path
import re

p=Path('assets/site.js')
s=p.read_text()

# 1) Use the v2 booking RPC on both development and production.
pat=re.compile(r"const isDevelop=location\.hostname==='frankiholz\.shipstatic\.com'\|\|location\.hostname==='localhost'\|\|location\.hostname==='127\.0\.0\.1';const rpcName=isDevelop\?'frankiholz_create_booking_v2':'frankiholz_create_booking';const rpcPayload=isDevelop\?payload:\{.*?\};\n const submit=",re.S)
rep="const isDevelop=location.hostname==='frankiholz.shipstatic.com'||location.hostname==='localhost'||location.hostname==='127.0.0.1';const rpcName='frankiholz_create_booking_v2';const rpcPayload=payload;\n const submit="
s,n=pat.subn(rep,s,count=1)
if n!=1: raise SystemExit(f'booking RPC routing marker changed: {n}')

# 2) Open Stripe setup in both environments; use test endpoint only on develop.
pat=re.compile(r" if\(isDevelop\)\{try\{submit\.textContent=currentLang==='de'\?'Sichere Kartenseite wird geöffnet …':'Opening secure card setup …';const r=await fetch\(`\$\{CFG\.supabaseUrl\}/functions/v1/frankiholz-create-authorization-test`,\{method:'POST',headers:\{'Content-Type':'application/json','apikey':CFG\.supabaseKey\},body:JSON\.stringify\(\{reference:b\.reference,email:payload\.p_guest_email\}\)\}\);const j=await r\.json\(\);if\(!r\.ok\|\|!j\.checkout_url\)throw new Error\(j\.error\|\|'Could not open Stripe setup'\);location\.href=j\.checkout_url;return\}catch\(err\)\{out\.innerHTML\+=`<div class=\"notice\">\$\{escapeHtml\(err\.message\)\}</div>`\}\}\n submit\.disabled=false;",re.S)
rep=" const setupEndpoint=isDevelop?'frankiholz-create-authorization-test':'frankiholz-create-authorization-v2';try{submit.textContent=currentLang==='de'?'Sichere Kartenseite wird geöffnet …':'Opening secure card setup …';const r=await fetch(`${CFG.supabaseUrl}/functions/v1/${setupEndpoint}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.supabaseKey},body:JSON.stringify({reference:b.reference,email:payload.p_guest_email})});const j=await r.json();if(!r.ok||!j.checkout_url)throw new Error(j.error||'Could not open Stripe setup');location.href=j.checkout_url;return}catch(err){out.innerHTML+=`<div class=\"notice\">${escapeHtml(err.message)}</div>`}\n submit.disabled=false;"
s,n=pat.subn(rep,s,count=1)
if n!=1: raise SystemExit(f'setup endpoint marker changed: {n}')

# 3) Route public cancellation to test/live endpoints by hostname.
old="async function cancelCurrentBooking(ref,email,out){if(!confirm(currentLang==='de'?'Möchten Sie diese Buchung wirklich stornieren?':'Do you really want to cancel this booking?'))return;const r=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-cancel-booking-test`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.supabaseKey},body:JSON.stringify({reference:ref,email})});"
new="async function cancelCurrentBooking(ref,email,out){if(!confirm(currentLang==='de'?'Möchten Sie diese Buchung wirklich stornieren?':'Do you really want to cancel this booking?'))return;const isDevelop=location.hostname==='frankiholz.shipstatic.com'||location.hostname==='localhost'||location.hostname==='127.0.0.1';const cancelEndpoint=isDevelop?'frankiholz-cancel-booking-test':'frankiholz-cancel-booking';const r=await fetch(`${CFG.supabaseUrl}/functions/v1/${cancelEndpoint}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.supabaseKey},body:JSON.stringify({reference:ref,email})});"
if old not in s: raise SystemExit('cancel endpoint marker changed')
s=s.replace(old,new,1)

# 4) Status view uses v2 everywhere and shows charge date/policy/cancel in production too.
s=s.replace("const {data,error}=await sb.rpc(isDevelop?'frankiholz_booking_status_v2':'frankiholz_booking_status',{p_reference:ref,p_email:email});","const {data,error}=await sb.rpc('frankiholz_booking_status_v2',{p_reference:ref,p_email:email});",1)
s=s.replace("const due=isDevelop&&b.charge_due_at?","const due=b.charge_due_at?",1)
s=s.replace("const policy=isDevelop?(b.cancel_refund_eligible?`<div class=\"status-policy refundable\">${tr('cancelFullRefund')}</div>`:`<div class=\"status-policy nonrefundable\">${tr('cancelNonRefundable')}</div>`):'';","const policy=b.cancel_refund_eligible?`<div class=\"status-policy refundable\">${tr('cancelFullRefund')}</div>`:`<div class=\"status-policy nonrefundable\">${tr('cancelNonRefundable')}</div>`;",1)
s=s.replace("const cancel=isDevelop&&b.booking_status!=='cancelled'?","const cancel=b.booking_status!=='cancelled'?",1)

# 5) Bring customer-facing wording in line with the 14-day card-save flow.
s=s.replace("pendingNote:'Your request remains pending and does not block the dates. If the host approves it, you will receive a limited-time payment link.'","pendingNote:'After submitting, you will securely save a card with Stripe. You are not charged now. If the host confirms, the card is charged 14 days before check-in, or immediately if check-in is within 14 days.'",1)
s=s.replace("statusLead:'Pending requests do not block dates. Once the host approves your request, a payment link becomes available for a limited time.'","statusLead:'Check whether your card is saved, whether the booking is confirmed, and when the automatic charge is scheduled.'",1)
s=s.replace("pendingNote:'Ihre Anfrage bleibt zunächst offen und blockiert die Daten noch nicht. Nach Bestätigung erhalten Sie einen zeitlich begrenzten Zahlungslink.'","pendingNote:'Nach dem Absenden hinterlegen Sie Ihre Karte sicher bei Stripe. Es erfolgt jetzt keine Belastung. Bei Bestätigung wird die Karte 14 Tage vor Check-in belastet – oder sofort, wenn der Check-in innerhalb von 14 Tagen liegt.'",1)
s=s.replace("statusLead:'Offene Anfragen blockieren keine Daten. Nach Bestätigung durch den Gastgeber steht für begrenzte Zeit ein Zahlungslink bereit.'","statusLead:'Prüfen Sie, ob Ihre Karte gespeichert ist, ob die Buchung bestätigt wurde und wann die automatische Belastung geplant ist.'",1)

p.write_text(s)
