(()=>{
  const testMode=new URLSearchParams(location.search).get('stripe_test')==='1';
  const flowText={
    en:{
      submit:'Continue to secure card authorization',
      pending:'Your card will be authorized for the booking amount, but it will not be charged yet. After authorization, the dates are held for up to 48 hours while FrankiHolz reviews your request. If accepted, the payment is captured. If rejected or not confirmed within 48 hours, the authorization is released automatically.',
      statusLead:'After card authorization, your dates are held for up to 48 hours while FrankiHolz confirms the request. You are charged only if the booking is accepted.',
      trust:'Card-authorized requests hold the dates for up to 48 hours',
      direct:'Authorize securely with Stripe, then wait for host confirmation',
      opening:'Opening secure Stripe authorization…',
      authFailed:'We could not start the secure card authorization. Your booking has not been confirmed.',
      deadline:'Host decision deadline',
      authorized:'On hold – awaiting host confirmation',
      awaiting:'Card authorization not completed',
      released:'Authorization released',
      expired:'Authorization expired / released',
      paid:'Paid & confirmed',
      retry:'Continue card authorization'
    },
    de:{
      submit:'Weiter zur sicheren Kartenautorisierung',
      pending:'Ihre Karte wird für den Buchungsbetrag autorisiert, aber noch nicht belastet. Nach der Autorisierung werden die Daten bis zu 48 Stunden für Sie vorgemerkt, während FrankiHolz die Anfrage prüft. Bei Bestätigung wird der Betrag eingezogen. Bei Ablehnung oder wenn innerhalb von 48 Stunden keine Bestätigung erfolgt, wird die Autorisierung automatisch freigegeben.',
      statusLead:'Nach der Kartenautorisierung werden Ihre Daten bis zu 48 Stunden vorgemerkt, während FrankiHolz die Anfrage bestätigt. Der Betrag wird nur bei Bestätigung der Buchung eingezogen.',
      trust:'Kartenautorisierte Anfragen halten die Daten bis zu 48 Stunden',
      direct:'Sicher über Stripe autorisieren und auf die Bestätigung warten',
      opening:'Sichere Stripe-Autorisierung wird geöffnet…',
      authFailed:'Die sichere Kartenautorisierung konnte nicht gestartet werden. Ihre Buchung ist noch nicht bestätigt.',
      deadline:'Bestätigungsfrist des Gastgebers',
      authorized:'Vorgemerkt – Bestätigung durch Gastgeber ausstehend',
      awaiting:'Kartenautorisierung noch nicht abgeschlossen',
      released:'Autorisierung freigegeben',
      expired:'Autorisierung abgelaufen / freigegeben',
      paid:'Bezahlt & bestätigt',
      retry:'Kartenautorisierung fortsetzen'
    }
  };
  const ft=()=>flowText[currentLang]||flowText.en;

  T.en.submitRequest=flowText.en.submit;
  T.de.submitRequest=flowText.de.submit;
  T.en.pendingNote=flowText.en.pending;
  T.de.pendingNote=flowText.de.pending;
  T.en.statusLead=flowText.en.statusLead;
  T.de.statusLead=flowText.de.statusLead;
  T.en.approvedBlock=flowText.en.trust;
  T.de.approvedBlock=flowText.de.trust;
  T.en.directHost=flowText.en.direct;
  T.de.directHost=flowText.de.direct;
  applyLanguage();

  const oldForm=$('bookingForm');
  if(oldForm){
    const form=oldForm.cloneNode(true);
    oldForm.replaceWith(form);
    const button=form.querySelector('button[type="submit"]');
    const note=form.parentElement?.querySelector('[data-i18n="pendingNote"]');
    if(note)note.textContent=ft().pending;
    const explainer=document.createElement('div');
    explainer.className='notice';
    explainer.style.marginTop='14px';
    explainer.innerHTML=currentLang==='de'
      ? '<b>So funktioniert es:</b> Stripe reserviert den Betrag auf Ihrer Karte. FrankiHolz hat anschließend 48 Stunden Zeit, die Buchung zu bestätigen. Erst bei Bestätigung wird der Betrag tatsächlich belastet.'
      : '<b>How it works:</b> Stripe places an authorization for the booking amount on your card. FrankiHolz then has 48 hours to accept the booking. The amount is captured only after acceptance.';
    form.insertAdjacentElement('beforebegin',explainer);

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const out=$('bookingResult');
      out.innerHTML='';
      if(!selectedRoom||!start||!end){out.innerHTML=`<div class="notice">${tr('chooseDatesFirst')}</div>`;return}
      if(rangeBlocked(start,end)){out.innerHTML=`<div class="notice">${tr('selectedBlocked')}</div>`;return}
      const payload={p_room_id:selectedRoom.id,p_check_in:start,p_check_out:end,p_guest_name:$('guestName').value.trim(),p_guest_email:$('guestEmail').value.trim(),p_guest_phone:$('guestPhone').value.trim(),p_guest_country:$('guestCountry').value.trim(),p_guests:Number($('guestCount').value),p_message:$('message').value.trim(),p_language:currentLang};
      const submit=button;
      if(submit){submit.disabled=true;submit.textContent=ft().opening}
      try{
        const {data,error}=await sb.rpc('frankiholz_create_booking',payload);
        if(error)throw error;
        const b=data?.[0];
        if(!b?.reference)throw new Error('Booking reference was not created');
        sessionStorage.setItem('frankiholz-last-reference',b.reference);
        sessionStorage.setItem('frankiholz-last-email',payload.p_guest_email);
        sessionStorage.setItem('frankiholz-last-lang',currentLang);
        const functionName=testMode?'frankiholz-create-authorization-test':'frankiholz-create-authorization';
        const res=await fetch(`${CFG.supabaseUrl}/functions/v1/${functionName}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.supabaseKey},body:JSON.stringify({reference:b.reference,email:payload.p_guest_email})});
        const auth=await res.json();
        if(!res.ok||!auth.checkout_url)throw new Error(auth.error||ft().authFailed);
        location.href=auth.checkout_url;
      }catch(err){
        console.error(err);
        out.innerHTML=`<div class="notice">${escapeHtml(err?.message||ft().authFailed)}</div>`;
        if(submit){submit.disabled=false;submit.textContent=ft().submit}
        await loadCalendar();
      }
    });
  }

  const statusButton=$('checkStatusBtn');
  if(statusButton){
    statusButton.onclick=async()=>{
      const ref=$('statusReference').value.trim(),email=$('statusEmail').value.trim(),out=$('statusResult');
      if(!ref||!email){out.innerHTML=`<div class="notice">${tr('enterRefEmail')}</div>`;return}
      const {data,error}=await sb.rpc('frankiholz_booking_status',{p_reference:ref,p_email:email});
      if(error){out.innerHTML=`<div class="notice">${escapeHtml(error.message)}</div>`;return}
      const b=data?.[0];if(!b){out.innerHTML=`<div class="notice">${tr('noBooking')}</div>`;return}
      const labels={authorized:ft().authorized,awaiting_payment:ft().awaiting,released:ft().released,expired:ft().expired,paid:ft().paid};
      const paymentLabel=labels[b.payment_status]||String(b.payment_status||'not_started').replaceAll('_',' ');
      const action=b.payment_url&&b.payment_status==='awaiting_payment'?`<a class="btn secondary" href="${b.payment_url}" style="display:inline-block;text-decoration:none;margin-top:12px">${ft().retry}</a>`:'';
      const deadline=b.payment_status==='authorized'&&b.payment_due_at?`<br>${ft().deadline}: <b>${new Date(b.payment_due_at).toLocaleString(currentLang==='de'?'de-DE':'en-GB')}</b>`:'';
      out.innerHTML=`<div class="notice ${['authorized','paid'].includes(b.payment_status)?'success':''}"><b>${escapeHtml(b.reference)}</b> · ${escapeHtml(b.room_name)}<br>${b.check_in} → ${b.check_out} · ${money(b.total_price)}<br>${tr('booking')}: <b>${escapeHtml(b.booking_status)}</b> · ${tr('payment')}: <b>${escapeHtml(paymentLabel)}</b>${deadline}${action}</div>`;
    };
  }
})();
