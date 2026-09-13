from pathlib import Path

site_path=Path('assets/site.js')
hook_path=Path('assets/email-hook.js')
site=site_path.read_text()
hook=hook_path.read_text()

# Customer-facing wording and labels.
site=site.replace("pendingNote:'Your request remains pending and does not block the dates. If the host approves it, you will receive a limited-time payment link.'","pendingNote:'After submitting, you will securely save a card with Stripe. You are not charged now. If the host confirms, the card is charged 14 days before check-in, or immediately if check-in is within 14 days.'",1)
site=site.replace("statusLead:'Pending requests do not block dates. Once the host approves your request, a payment link becomes available for a limited time.'","statusLead:'Check whether your card is saved, whether the booking is confirmed, and when the automatic charge is scheduled.'",1)
site=site.replace("payNow:'Pay now'","payNow:'Continue',cancelBooking:'Cancel booking',cancelFullRefund:'Full refund available',cancelNonRefundable:'Non-refundable within 14 days',scheduledCharge:'Scheduled charge'",1)
site=site.replace("pendingNote:'Ihre Anfrage bleibt zunächst offen und blockiert die Daten noch nicht. Nach Bestätigung erhalten Sie einen zeitlich begrenzten Zahlungslink.'","pendingNote:'Nach dem Absenden hinterlegen Sie Ihre Karte sicher bei Stripe. Es erfolgt jetzt keine Belastung. Bei Bestätigung wird die Karte 14 Tage vor Check-in belastet – oder sofort, wenn der Check-in innerhalb von 14 Tagen liegt.'",1)
site=site.replace("statusLead:'Offene Anfragen blockieren keine Daten. Nach Bestätigung durch den Gastgeber steht für begrenzte Zeit ein Zahlungslink bereit.'","statusLead:'Prüfen Sie, ob Ihre Karte gespeichert ist, ob die Buchung bestätigt wurde und wann die automatische Belastung geplant ist.'",1)
site=site.replace("payNow:'Jetzt bezahlen'","payNow:'Weiter',cancelBooking:'Buchung stornieren',cancelFullRefund:'Volle Erstattung möglich',cancelNonRefundable:'Innerhalb von 14 Tagen nicht erstattungsfähig',scheduledCharge:'Geplante Belastung'",1)

# Use a production-only v2 booking RPC with the existing public form fields.
old="const {data,error}=await sb.rpc('frankiholz_create_booking',payload);"
new="const {data,error}=await sb.rpc('frankiholz_create_booking_payment_v2',payload);"
if old not in site: raise SystemExit('booking RPC marker changed')
site=site.replace(old,new,1)

# After the ordinary Netlify notification, open live Stripe setup instead of resetting immediately.
old="}catch(err){console.warn('Booking notification submission failed',err)}start=end=null;updateSummary();e.target.reset();await loadCalendar()});"
new="}catch(err){console.warn('Booking notification submission failed',err)}try{const setup=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-create-authorization-v2`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.supabaseKey},body:JSON.stringify({reference:b.reference,email:payload.p_guest_email})});const setupJson=await setup.json();if(!setup.ok||!setupJson.checkout_url)throw new Error(setupJson.error||'Could not open secure Stripe card setup');location.href=setupJson.checkout_url;return}catch(err){out.innerHTML+=`<div class=\"notice\">${escapeHtml(err.message)}</div>`}start=end=null;updateSummary();e.target.reset();await loadCalendar()});"
if old not in site: raise SystemExit('booking completion marker changed')
site=site.replace(old,new,1)

# Add public live cancellation helper before the status button handler.
marker="$('checkStatusBtn').onclick=async()=>{"
helper="async function cancelCurrentBooking(ref,email,out){if(!confirm(currentLang==='de'?'Möchten Sie diese Buchung wirklich stornieren?':'Do you really want to cancel this booking?'))return;const r=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-cancel-booking`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.supabaseKey},body:JSON.stringify({reference:ref,email})});const j=await r.json().catch(()=>({}));if(!r.ok){out.innerHTML+=`<div class=\"notice\">${escapeHtml(j.error||'Cancellation failed')}</div>`;return}out.innerHTML=`<div class=\"notice success\">${j.refundable?(currentLang==='de'?'Buchung storniert. Volle Erstattung gilt.':'Booking cancelled. Full refund applies.'):(currentLang==='de'?'Buchung storniert. Innerhalb von 14 Tagen ist sie nicht erstattungsfähig.':'Booking cancelled. It is non-refundable within 14 days.')}</div>`;}\n"
if marker not in site: raise SystemExit('status handler marker changed')
site=site.replace(marker,helper+marker,1)

# Replace old status RPC/rendering with v2 status, scheduled charge and policy/cancel controls.
old="const {data,error}=await sb.rpc('frankiholz_booking_status',{p_reference:ref,p_email:email});"
new="const {data,error}=await sb.rpc('frankiholz_booking_status_v2',{p_reference:ref,p_email:email});"
if old not in site: raise SystemExit('status RPC marker changed')
site=site.replace(old,new,1)
old="const paymentLabel=String(b.payment_status||'not_started').replaceAll('_',' '),action=b.payment_url&&b.payment_status==='awaiting_payment'?`<a class=\"btn secondary\" href=\"${b.payment_url}\" target=\"_blank\" rel=\"noopener\" style=\"display:inline-block;text-decoration:none;margin-top:12px\">${tr('payNow')}</a>`:'';out.innerHTML=`<div class=\"notice ${b.payment_status==='paid'?'success':''}\"><b>${escapeHtml(b.reference)}</b> · ${escapeHtml(b.room_name)}<br>${b.check_in} → ${b.check_out} · ${money(b.total_price)}<br>${tr('booking')}: <b>${escapeHtml(b.booking_status)}</b> · ${tr('payment')}: <b>${escapeHtml(paymentLabel)}</b>${b.payment_due_at?`<br>${tr('paymentDeadline')}: ${new Date(b.payment_due_at).toLocaleString(currentLang==='de'?'de-DE':'en-DE')}`:''}${action}</div>`};"
new="const paymentLabel=String(b.payment_status||'not_started').replaceAll('_',' '),action=b.payment_url&&b.payment_status==='awaiting_payment'?`<a class=\"btn secondary\" href=\"${b.payment_url}\" style=\"display:inline-block;text-decoration:none;margin-top:12px\">${tr('payNow')}</a>`:'';const due=b.charge_due_at?`<br>${tr('scheduledCharge')}: <b>${new Date(b.charge_due_at).toLocaleString(currentLang==='de'?'de-DE':'en-DE')}</b>`:'';const policy=b.cancel_refund_eligible?`<div style=\"margin-top:10px\"><b>${tr('cancelFullRefund')}</b></div>`:`<div style=\"margin-top:10px\"><b>${tr('cancelNonRefundable')}</b></div>`;const cancel=b.booking_status!=='cancelled'?`<button class=\"btn ghost\" id=\"cancelBookingBtn\" type=\"button\" style=\"margin-top:12px\">${tr('cancelBooking')}</button>`:'';out.innerHTML=`<div class=\"notice ${b.payment_status==='paid'?'success':''}\"><b>${escapeHtml(b.reference)}</b> · ${escapeHtml(b.room_name)}<br>${b.check_in} → ${b.check_out} · ${money(b.total_price)}<br>${tr('booking')}: <b>${escapeHtml(b.booking_status)}</b> · ${tr('payment')}: <b>${escapeHtml(paymentLabel)}</b>${due}${policy}${action}${cancel}</div>`;$('cancelBookingBtn')?.addEventListener('click',()=>cancelCurrentBooking(ref,email,out));};"
if old not in site: raise SystemExit('status render marker changed')
site=site.replace(old,new,1)

# Ensure request-received email hook recognizes the surgical production v2 RPC.
old="if(name==='frankiholz_create_booking'&&!result.error&&result.data?.[0]?.reference)"
new="if((name==='frankiholz_create_booking'||name==='frankiholz_create_booking_payment_v2')&&!result.error&&result.data?.[0]?.reference)"
if old not in hook: raise SystemExit('email hook marker changed')
hook=hook.replace(old,new,1)

site_path.write_text(site)
hook_path.write_text(hook)
