const CFG=window.FRANKIHOLZ_CONFIG;
const sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey);
const fallbackHero="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80";
const T={
 en:{heroMinor:'Thoughtful stays in Frankfurt-Sachsenhausen',gatewayNoticeTitle:'Secure payments with Stripe',gatewayNoticeText:'Available payment options are shown by Stripe. A payment does not confirm your stay; the host must approve your booking.',contactHost:'Contact the host',navRooms:'Rooms',bookNow:'Book now',eyebrow:'Accommodation in Frankfurt am Main',viewRooms:'View rooms',liveAvailability:'Live availability',approvedBlock:'Only approved bookings block dates',clearPricing:'Clear pricing',estimatedInstant:'See your estimated stay total instantly',directBooking:'Direct booking',directHost:'Send your request straight to the host',stayYourWay:'Stay your way',chooseRoom:'Choose your room',roomsLead:'Explore the rooms, open the gallery, and check real-time availability before you book.',liveBooking:'Live booking',detailsAvailability:'Room details & availability',bookingLead:'Choose a room, browse the photos and select only the dates that are available.',room:'Room',goCalendar:'Go to calendar',previous:'‹ Previous',next:'Next ›',available:'Available',unavailableBooked:'Unavailable / booked',bookRoom:'Book this room',checkIn:'Check-in',checkOut:'Check-out',estimatedTotal:'Estimated total',name:'Name',email:'Email',phone:'Phone',country:'Country',guests:'Guests',message:'Message',messagePlaceholder:'Arrival time, questions or notes',submitRequest:'Submit booking request',pendingNote:'After submitting, you will securely save a card with Stripe. You are not charged now. If the host confirms, the card is charged 14 days before check-in, or immediately if check-in is within 14 days.',stayFrankfurt:'Stay at FrankiHolz in Frankfurt',locationLead:'FrankiHolz offers private rooms in Frankfurt-Sachsenhausen with direct online availability and booking requests.',germany:'Germany',afterRequest:'After your request',checkBookingPayment:'Check booking & payment status',statusLead:'Check whether your card is saved, whether the booking is confirmed, and when the automatic charge is scheduled.',bookingReference:'Booking reference',bookingEmail:'Email used for booking',checkStatus:'Check status',upTo:'Up to',guestSingular:'guest',guestPlural:'guests',night:'/ night',viewAvailability:'View room & availability',noRooms:'No rooms are currently available.',loadRoomsError:'Could not load rooms.',chooseDates:'Choose your check-in date, then your check-out date.',chooseCheckout:'Now choose your check-out date.',blockedPeriod:'That period includes an unavailable night. Please choose another check-out date.',unavailable:'Unavailable',booked:'Booked',availablePrefix:'Available',nightSingular:'night',nightPlural:'nights',datesUnavailable:'Those dates are not available. Please choose again.',chooseDatesFirst:'Please choose an available check-in and check-out date first.',selectedBlocked:'The selected period contains unavailable dates.',requestSent:'Booking request sent.',reference:'Reference',estimated:'Estimated total',datesNotBlocked:'Your dates are not blocked until the host approves the request.',enterRefEmail:'Enter your booking reference and email.',noBooking:'No matching booking was found.',booking:'Booking',payment:'Payment',paymentDeadline:'Payment deadline',payNow:'Continue',saveCard:'Save card securely',cancelBooking:'Cancel booking',cancelFullRefund:'Full refund available',cancelNonRefundable:'Non-refundable within 14 days',cardSaved:'Card saved securely',scheduledCharge:'Scheduled charge'},
 de:{heroMinor:'Angenehm übernachten in Frankfurt-Sachsenhausen',gatewayNoticeTitle:'Sichere Zahlungen mit Stripe',gatewayNoticeText:'Stripe zeigt die verfügbaren Zahlungsoptionen. Eine Zahlung bestätigt Ihren Aufenthalt nicht; der Gastgeber muss Ihre Buchung genehmigen.',contactHost:'Gastgeber kontaktieren',navRooms:'Zimmer',bookNow:'Jetzt buchen',eyebrow:'Unterkunft in Frankfurt am Main',viewRooms:'Zimmer ansehen',liveAvailability:'Live-Verfügbarkeit',approvedBlock:'Nur bestätigte Buchungen blockieren Termine',clearPricing:'Transparente Preise',estimatedInstant:'Gesamtpreis für den Aufenthalt sofort sehen',directBooking:'Direktbuchung',directHost:'Anfrage direkt an den Gastgeber senden',stayYourWay:'Ihr Aufenthalt',chooseRoom:'Zimmer auswählen',roomsLead:'Zimmer ansehen, Galerie öffnen und die aktuelle Verfügbarkeit vor der Buchung prüfen.',liveBooking:'Direkte Buchung',detailsAvailability:'Zimmerdetails & Verfügbarkeit',bookingLead:'Zimmer auswählen, Fotos ansehen und nur verfügbare Daten wählen.',room:'Zimmer',goCalendar:'Zum Kalender',previous:'‹ Zurück',next:'Weiter ›',available:'Verfügbar',unavailableBooked:'Nicht verfügbar / gebucht',bookRoom:'Dieses Zimmer buchen',checkIn:'Check-in',checkOut:'Check-out',estimatedTotal:'Voraussichtlicher Gesamtpreis',name:'Name',email:'E-Mail',phone:'Telefon',country:'Land',guests:'Gäste',message:'Nachricht',messagePlaceholder:'Ankunftszeit, Fragen oder Hinweise',submitRequest:'Buchungsanfrage senden',pendingNote:'Nach dem Absenden hinterlegen Sie Ihre Karte sicher bei Stripe. Es erfolgt jetzt keine Belastung. Bei Bestätigung wird die Karte 14 Tage vor Check-in belastet – oder sofort, wenn der Check-in innerhalb von 14 Tagen liegt.',stayFrankfurt:'Bei FrankiHolz in Frankfurt übernachten',locationLead:'FrankiHolz bietet private Zimmer in Frankfurt-Sachsenhausen mit direkter Online-Verfügbarkeit und Buchungsanfragen.',germany:'Deutschland',afterRequest:'Nach Ihrer Anfrage',checkBookingPayment:'Buchungs- & Zahlungsstatus prüfen',statusLead:'Prüfen Sie, ob Ihre Karte gespeichert ist, ob die Buchung bestätigt wurde und wann die automatische Belastung geplant ist.',bookingReference:'Buchungsreferenz',bookingEmail:'Bei der Buchung verwendete E-Mail',checkStatus:'Status prüfen',upTo:'Bis zu',guestSingular:'Gast',guestPlural:'Gäste',night:'/ Nacht',viewAvailability:'Zimmer & Verfügbarkeit ansehen',noRooms:'Derzeit sind keine Zimmer verfügbar.',loadRoomsError:'Zimmer konnten nicht geladen werden.',chooseDates:'Wählen Sie zuerst Ihr Check-in- und anschließend Ihr Check-out-Datum.',chooseCheckout:'Wählen Sie jetzt Ihr Check-out-Datum.',blockedPeriod:'Der Zeitraum enthält eine nicht verfügbare Nacht. Bitte wählen Sie ein anderes Check-out-Datum.',unavailable:'Nicht verfügbar',booked:'Gebucht',availablePrefix:'Verfügbar',nightSingular:'Nacht',nightPlural:'Nächte',datesUnavailable:'Diese Daten sind nicht verfügbar. Bitte wählen Sie erneut.',chooseDatesFirst:'Bitte wählen Sie zuerst ein verfügbares Check-in- und Check-out-Datum.',selectedBlocked:'Der ausgewählte Zeitraum enthält nicht verfügbare Daten.',requestSent:'Buchungsanfrage gesendet.',reference:'Referenz',estimated:'Voraussichtlicher Gesamtpreis',datesNotBlocked:'Ihre Daten werden erst blockiert, wenn der Gastgeber die Anfrage bestätigt.',enterRefEmail:'Bitte Buchungsreferenz und E-Mail eingeben.',noBooking:'Keine passende Buchung gefunden.',booking:'Buchung',payment:'Zahlung',paymentDeadline:'Zahlungsfrist',payNow:'Weiter',saveCard:'Karte sicher speichern',cancelBooking:'Buchung stornieren',cancelFullRefund:'Volle Erstattung möglich',cancelNonRefundable:'Innerhalb von 14 Tagen nicht erstattungsfähig',cardSaved:'Karte sicher gespeichert',scheduledCharge:'Geplante Belastung'}
};
Object.assign(T.en,{paymentPageAction:'Continue to payment',paymentPageNote:'Choose your payment option on the next page. Your request stays pending until the host approves it.',promoCodeLabel:'Promo code (optional)',applyPromoLabel:'Apply code'});
Object.assign(T.de,{paymentPageAction:'Weiter zur Zahlung',paymentPageNote:'Wählen Sie Ihre Zahlungsoption auf der nächsten Seite. Ihre Anfrage bleibt bis zur Genehmigung durch den Gastgeber offen.',promoCodeLabel:'Gutscheincode (optional)',applyPromoLabel:'Code anwenden'});
Object.assign(T.en,{
 policyKicker:'Cancellation & payment',policyTitle:'Clear 14-day cancellation policy',
 policyBeforeTitle:'More than 14 days before check-in',policyBeforeText:'Cancel for a full refund. If your card has not been charged yet, no charge is made.',
 policyWithinTitle:'Within 14 days of check-in',policyWithinText:'The booking is non-refundable. Confirmed bookings are charged automatically 14 days before check-in, or after confirmation when check-in is already within 14 days.',
 policyCardPrivacy:'Your card is saved securely with Stripe. FrankiHolz does not store your card number.'
});
Object.assign(T.de,{
 policyKicker:'Stornierung & Zahlung',policyTitle:'Klare 14-Tage-Stornierungsbedingungen',
 policyBeforeTitle:'Mehr als 14 Tage vor dem Check-in',policyBeforeText:'Bei Stornierung erhalten Sie eine volle Erstattung. Wurde Ihre Karte noch nicht belastet, erfolgt keine Belastung.',
 policyWithinTitle:'Innerhalb von 14 Tagen vor dem Check-in',policyWithinText:'Die Buchung ist nicht erstattungsfähig. Bestätigte Buchungen werden automatisch 14 Tage vor dem Check-in belastet – oder nach der Bestätigung, wenn der Check-in bereits innerhalb von 14 Tagen liegt.',
 policyCardPrivacy:'Ihre Karte wird sicher bei Stripe hinterlegt. FrankiHolz speichert Ihre Kartennummer nicht.'
});
Object.assign(T.en,{calendarLoading:'Loading availability…',calendarError:'Availability could not be loaded. Please retry before choosing dates.',calendarRetry:'Retry availability',calendarUnknown:'Availability not loaded',statusLoading:'Loading booking status…',statusError:'Could not load booking status. Please try again.',cancelError:'Cancellation could not be confirmed. Check your booking status before trying again.'});
Object.assign(T.de,{calendarLoading:'Verfügbarkeit wird geladen …',calendarError:'Die Verfügbarkeit konnte nicht geladen werden. Bitte versuchen Sie es erneut, bevor Sie Daten wählen.',calendarRetry:'Verfügbarkeit erneut laden',calendarUnknown:'Verfügbarkeit nicht geladen',statusLoading:'Buchungsstatus wird geladen …',statusError:'Der Buchungsstatus konnte nicht geladen werden. Bitte versuchen Sie es erneut.',cancelError:'Die Stornierung konnte nicht bestätigt werden. Prüfen Sie vor einem erneuten Versuch den Buchungsstatus.'});
let currentLang=(new URLSearchParams(location.search).get('lang')||localStorage.getItem('frankiholz-lang')||((navigator.language||'en').toLowerCase().startsWith('de')?'de':'en'));
if(!['de','en'].includes(currentLang))currentLang='en';
let settings=null,rooms=[],images=[],calendarRows=[],selectedRoom=null,start=null,end=null,cursorMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
const $=id=>document.getElementById(id), tr=k=>T[currentLang][k]||T.en[k]||k, photoSoon=()=>currentLang==='de'?'Fotos folgen in Kürze':'Will be uploaded soon';
const fmt=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'), money=n=>new Intl.NumberFormat(currentLang==='de'?'de-DE':'en-DE',{style:'currency',currency:'EUR'}).format(Number(n||0));
const publicUrl=p=>p?`${CFG.supabaseUrl}/storage/v1/object/public/${CFG.mediaBucket}/${encodeURI(p)}`:null;
const roomName=r=>currentLang==='de'?(r.name_de||r.name):(r.name||r.name_de);
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function syncLanguageUrl(){const u=new URL(location.href);u.searchParams.set('lang',currentLang);history.replaceState({},'',u.pathname+u.search+u.hash)}
function applyLanguage(){document.documentElement.lang=currentLang;localStorage.setItem('frankiholz-lang',currentLang);syncLanguageUrl();document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=tr(el.dataset.i18n)});document.querySelectorAll('.lang-btn[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===currentLang));$('message').placeholder=tr('messagePlaceholder');if($('introHelp'))$('introHelp').textContent=currentLang==='de'?'Erzählen Sie uns von Ihrem Besuch und Ihrer Ankunftszeit.':'Tell us about your visit and arrival time.';if(settings){$('heroTitle').textContent=currentLang==='de'?(settings.hero_title_de||settings.hero_title):(settings.hero_title||settings.hero_title_de);$('heroSubtitle').textContent=currentLang==='de'?(settings.hero_subtitle_de||settings.hero_subtitle):(settings.hero_subtitle||settings.hero_subtitle_de);const title=currentLang==='de'?(settings.seo_title_de||settings.seo_title_en):(settings.seo_title_en||settings.seo_title_de);const desc=currentLang==='de'?(settings.seo_description_de||settings.seo_description_en):(settings.seo_description_en||settings.seo_description_de);if(title)document.title=title;if(desc){const m=document.querySelector('meta[name="description"]');if(m)m.content=desc;}}if(rooms.length)renderRooms();if(selectedRoom){renderSelectedRoom();renderCalendar();}if(!$('bookingSection').hidden&& !start && !end)$('calendarNotice').textContent=tr('chooseDates');paintPaymentEnvironmentNotice();paintPromoStatus();paintPaymentSetupNote();if(selectedRoom)paintCalendarState()}
async function triggerCalendarSync(){try{const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),8000);await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-sync-airbnb`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.supabaseKey,'x-frankiholz-source':'public-site'},body:'{}',signal:ctrl.signal});clearTimeout(timer)}catch(err){console.warn('Calendar sync could not complete before page load',err)}}
async function init(){applyLanguage();const settingsReady=loadSettings();await triggerCalendarSync();await Promise.all([settingsReady,loadRoomsAndImages()]);applyLanguage();$('calendarNotice').textContent=tr('chooseDates')}
async function loadSettings(){
 const {data}=await sb.from('frankiholz_site_settings').select('*').eq('id',1).maybeSingle();settings=data||{};
 const original=settings.hero_storage_path?publicUrl(settings.hero_storage_path):fallbackHero;
 const width=innerWidth<=650?960:innerWidth<=1000?1280:1920;
 const source=window.FrankiHolzMedia?.imageUrl(original,width,74)||original;
 $('hero').style.backgroundImage=`url('${source}')`;
 const preload=document.createElement('link');preload.rel='preload';preload.as='image';preload.href=source;preload.setAttribute('fetchpriority','high');document.head.append(preload);
 if(source!==original){const image=new Image();image.onerror=()=>{$('hero').style.backgroundImage=`url('${original}')`;};image.src=source;}
}
async function loadRoomsAndImages(){const [{data:r,error:re},{data:i,error:ie}]=await Promise.all([sb.from('frankiholz_rooms').select('*').eq('active',true).order('sort_order'),sb.from('frankiholz_room_images').select('*').order('sort_order').order('created_at')]);if(re||ie){$('rooms').innerHTML=`<div class="notice">${tr('loadRoomsError')}</div>`;return}rooms=r||[];images=i||[];renderRooms();$('roomSelect').innerHTML=rooms.map(r=>`<option value="${r.id}">${escapeHtml(roomName(r))}</option>`).join('')}
function roomImgs(id){return images.filter(x=>x.room_id===id)} function cover(r){const ri=roomImgs(r.id)[0];return ri?publicUrl(ri.storage_path):null}
function roomImageMarkup(original,alt,widths,sizes,loading='lazy'){
 const api=window.FrankiHolzMedia,source=api?.imageUrl(original,widths[1]||widths[0])||original;
 const candidates=api?.srcset(original,widths)||'';
 return `<img src="${escapeHtml(source)}" ${candidates?`srcset="${escapeHtml(candidates)}" sizes="${escapeHtml(sizes)}"`:''} data-original="${escapeHtml(original)}" onerror="window.FrankiHolzMedia?.fallback(this)" alt="${escapeHtml(alt)}" width="720" height="480" loading="${loading}" decoding="async">`;
}
function renderRooms(){
 $('rooms').innerHTML=rooms.map(r=>`<article class="room-card">${cover(r)?roomImageMarkup(cover(r),roomName(r),[400,720,1080],'(max-width:900px) calc(100vw - 32px), 380px'):`<div class="room-cover-placeholder" role="img" aria-label="${photoSoon()}" style="width:100%;display:grid;place-items:center;padding:24px;background:linear-gradient(135deg,var(--brand-ice),var(--brand-mint));color:var(--muted);font-weight:800;text-align:center">${photoSoon()}</div>`}<div class="room-body"><h3>${escapeHtml(roomName(r))}</h3><div class="price">${money(r.base_price)} <span class="muted" style="font-size:14px">${tr('night')}</span></div><button class="btn" onclick="selectRoom('${r.id}')" style="margin-top:14px">${tr('viewAvailability')}</button></div></article>`).join('')||`<div class="empty">${tr('noRooms')}</div>`;
 $('roomSelect').innerHTML=rooms.map(r=>`<option value="${r.id}" ${selectedRoom?.id===r.id?'selected':''}>${escapeHtml(roomName(r))}</option>`).join('');
}
window.selectRoom=async id=>{selectedRoom=rooms.find(r=>r.id===id);if(!selectedRoom)return;start=end=null;$('roomSelect').value=id;$('roomSelect').dispatchEvent(new Event('roomselectionchange'));$('bookingSection').hidden=false;$('calendarNotice').className='notice';$('calendarNotice').textContent=tr('chooseDates');renderSelectedRoom();updateSummary();await loadCalendar();if(selectedRoom?.id!==id)return;void refreshPaymentEnvironmentNotice();$('bookingSection').scrollIntoView({behavior:'smooth'})};
$('roomSelect').addEventListener('change',e=>selectRoom(e.target.value));$('jumpToCalendar').onclick=()=>$('calendarPanel').scrollIntoView({behavior:'smooth'});$('navBookBtn').onclick=$('heroRoomsBtn').onclick=()=>$('roomsSection').scrollIntoView({behavior:'smooth'});
function setGalleryPhoto(original,alt){
 const image=$('galleryMain'),api=window.FrankiHolzMedia;
 image.style.display='block';image.dataset.original=original;image.alt=alt;
 image.width=960;image.height=600;image.decoding='async';
 image.onerror=()=>api?.fallback(image);
 if(api){image.srcset=api.srcset(original,[480,960,1280],80);image.sizes='(max-width:900px) calc(100vw - 72px), 600px';}
 image.src=api?.imageUrl(original,960,80)||original;
}
function renderSelectedRoom(){
 const ri=roomImgs(selectedRoom.id),fallback=cover(selectedRoom),urls=ri.length?ri.map(x=>publicUrl(x.storage_path)):(fallback?[fallback]:[]);
 if(urls.length){
  setGalleryPhoto(urls[0],roomName(selectedRoom));
  $('thumbs').innerHTML=urls.map((u,k)=>`<button class="thumb ${k===0?'active':''}" type="button" aria-pressed="${k===0}" onclick="showPhoto('${u.replace(/'/g,'%27')}',this)">${roomImageMarkup(u,roomName(selectedRoom)+' '+(k+1),[80,160], '66px')}</button>`).join('');
 }else{
  const image=$('galleryMain');image.onerror=null;image.removeAttribute('src');image.removeAttribute('srcset');image.removeAttribute('sizes');image.alt='';image.style.display='none';
  $('thumbs').innerHTML=`<div role="img" aria-label="${photoSoon()}" style="width:100%;aspect-ratio:16/10;display:grid;place-items:center;padding:24px;border-radius:20px;background:linear-gradient(135deg,var(--brand-ice),var(--brand-mint));color:var(--muted);font-weight:800;text-align:center">${photoSoon()}</div>`;
 }
 $('selectedRoomName').textContent=roomName(selectedRoom);
 $('selectedRoomPrice').innerHTML=`${money(selectedRoom.base_price)} <span class="muted" style="font-size:14px">${tr('night')}</span>`;
 const guests=Number($('guestCount').value)||1;$('guestCount').innerHTML=Array.from({length:selectedRoom.max_guests},(_,i)=>`<option value="${i+1}"${i+1===guests?' selected':''}>${i+1}</option>`).join('');
}
window.showPhoto=(u,el)=>{
 setGalleryPhoto(u,el.querySelector('img')?.alt||roomName(selectedRoom));
 document.querySelectorAll('.thumb').forEach(x=>{x.classList.toggle('active',x===el);x.setAttribute('aria-pressed',String(x===el));});
};
let calendarRequestVersion=0,calendarContext={state:'idle'};
function calendarView(){return fmt(new Date(cursorMonth.getFullYear(),cursorMonth.getMonth(),1));}
function calendarReady(){return calendarContext.state==='ready'&&calendarContext.roomId===selectedRoom?.id&&calendarContext.view===calendarView();}
function calendarHasDate(key){return calendarReady()&&key>=calendarContext.from&&key<=calendarContext.to;}
function paintCalendarState(){
 const notice=$('calendarNotice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 if(calendarReady())return;
 notice.className='notice';notice.textContent=tr(calendarContext.state==='error'?'calendarError':'calendarLoading');
 if(calendarContext.state==='error'){
  const retry=document.createElement('button');retry.id='retryCalendar';retry.type='button';retry.className='btn secondary small';retry.textContent=tr('calendarRetry');retry.onclick=()=>loadCalendar();notice.append(' ',retry);
 }
}
async function loadCalendar(){
 if(!selectedRoom)return;
 const roomId=selectedRoom.id,view=calendarView(),version=++calendarRequestVersion;
 const viewEnd=fmt(new Date(cursorMonth.getFullYear(),cursorMonth.getMonth()+2,0));
 const from=start&&start<view?start:view,to=end&&end>viewEnd?end:viewEnd;
 calendarContext={state:'loading',roomId,view,from,to};calendarRows=[];estimateVersion++;promoState=null;$('sumTotal').textContent='—';
 renderCalendar();paintCalendarState();
 try{
  const {data,error}=await sb.rpc('frankiholz_get_calendar_rates',{p_room_id:roomId,p_from:from,p_to:to});
  if(version!==calendarRequestVersion||selectedRoom?.id!==roomId||calendarView()!==view)return;
  if(error||!Array.isArray(data))throw error||new Error('Invalid availability response');
  calendarRows=data;calendarContext={state:'ready',roomId,view,from,to};
  $('calendarNotice').className='notice';$('calendarNotice').textContent=tr(start?'chooseCheckout':'chooseDates');
  if(start&&end){if(rangeBlocked(start,end)){end=null;updateSummary();$('calendarNotice').textContent=tr('datesUnavailable');}else await estimate();}
 }catch(error){
  if(version!==calendarRequestVersion||selectedRoom?.id!==roomId||calendarView()!==view)return;
  calendarContext={state:'error',roomId,view,from,to};calendarRows=[];$('sumTotal').textContent='—';
 }finally{if(version===calendarRequestVersion&&selectedRoom?.id===roomId&&calendarView()===view){renderCalendar();paintCalendarState();}}
}
function blocked(key){if(!calendarHasDate(key))return true;const row=calendarRows.find(x=>x.date===key);return !!(row&&row.is_available===false)}
function rangeBlocked(a,b){if(!a||!b)return false;let d=new Date(a+'T12:00:00'),stop=new Date(b+'T12:00:00');while(d<stop){if(blocked(fmt(d)))return true;d.setDate(d.getDate()+1)}return false}
function canCheckOutOn(key){
  return !!(start && !end && key>start && !rangeBlocked(start,key));
}
function renderCalendar(){
  const calendar=$('calendar'),focused=calendar.contains(document.activeElement)?document.activeElement.dataset.date:null;
  const y=cursorMonth.getFullYear(),m=cursorMonth.getMonth();
  $('monthTitle').textContent=cursorMonth.toLocaleString(currentLang==='de'?'de-DE':'en-DE',{month:'long',year:'numeric'});
  const labels=currentLang==='de'?['Mo','Di','Mi','Do','Fr','Sa','So']:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let html=labels.map(x=>`<div class="dow">${x}</div>`).join('');
  const first=new Date(y,m,1,12),days=new Date(y,m+1,0).getDate(),pad=(first.getDay()+6)%7,today=fmt(new Date());
  for(let i=0;i<pad;i++)html+='<div></div>';
  for(let n=1;n<=days;n++){
    const key=fmt(new Date(y,m,n,12)),row=calendarRows.find(x=>x.date===key);
    const past=key<today,isBlocked=!!(row&&row.is_available===false),isBooked=!!(row&&row.availability_status==='booked');
    const isStart=start===key,isEnd=end===key,inRange=start&&end&&key>start&&key<end;
    // Blocked overnights remain unavailable; guests may leave on the first blocked morning.
    const checkoutOnly=!past&&isBlocked&&canCheckOutOn(key);
    const known=calendarHasDate(key),disabled=!known||past||(isBlocked&&!checkoutOnly&&!isStart&&!isEnd);
    const note=!known?tr('calendarUnknown'):isEnd?'Check-out':
      checkoutOnly?(currentLang==='de'?'Nur Check-out':'Check-out only'):
      isBlocked?(isBooked?tr('booked'):tr('unavailable')):(row?.nightly_price?money(row.nightly_price):'');
    const aria=(currentLang==='de'?'Datum ':'Date ')+key+
      (isStart?(currentLang==='de'?', Check-in ausgewählt':', check-in selected'):
        isEnd?(currentLang==='de'?', Check-out ausgewählt':', check-out selected'):
        checkoutOnly?(currentLang==='de'?', nur Check-out':', check-out only'):
        isBlocked?(currentLang==='de'?', nicht verfügbar':', unavailable'):'');
    html+=`<button type="button" data-date="${key}" aria-label="${escapeHtml(aria)}" aria-pressed="${isStart||isEnd?'true':'false'}" class="day ${past?'disabled':''} ${isBlocked?'blocked':''} ${isBooked?'booked-day':''} ${checkoutOnly?'checkout-only':''} ${isStart?'start':''} ${isEnd?'end':''} ${inRange?'inrange':''}" ${disabled?'disabled':''} onclick="pickDate('${key}')"><strong>${n}</strong><small>${escapeHtml(note)}</small></button>`;
  }
  calendar.innerHTML=html;calendar.setAttribute('aria-busy',String(calendarContext.state==='loading'));
  if(focused){const replacement=calendar.querySelector(`[data-date="${focused}"]`);if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});}
}
window.pickDate=async key=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key)||key<fmt(new Date())||!calendarHasDate(key))return;
  const isBlocked=blocked(key),checkoutOnly=canCheckOutOn(key);
  if(key===start){
    start=end=null;
    $('calendarNotice').className='notice';
    $('calendarNotice').textContent=tr('chooseDates');
  }else if(key===end){
    end=null;
    $('calendarNotice').className='notice';
    $('calendarNotice').textContent=tr('chooseCheckout');
  }else if(!start||end||key<start){
    if(isBlocked)return;
    start=key;end=null;
    $('calendarNotice').className='notice';
    $('calendarNotice').textContent=tr('chooseCheckout');
  }else if(isBlocked&&!checkoutOnly){
    return;
  }else if(rangeBlocked(start,key)){
    $('calendarNotice').className='notice';
    $('calendarNotice').textContent=tr('blockedPeriod');
  }else{
    end=key;
    await estimate();
  }
  renderCalendar();updateSummary();
};
let currentPaymentMode=null;
async function resolvePaymentMode(){
  // Both development and production use the same server-managed, Admin-only setting.
  // Never let a public query parameter bypass LIVE payment by forcing test mode.
  const {data,error}=await sb.rpc('frankiholz_get_payment_environment');
  if(error)throw new Error(currentLang==='de'?'Zahlungsumgebung ist vorübergehend nicht verfügbar.':'Payment environment is temporarily unavailable.');
  if(data!=='test'&&data!=='live')throw new Error(currentLang==='de'?'Zahlungsumgebung ist nicht korrekt konfiguriert.':'Payment environment is not configured correctly.');
  currentPaymentMode=data;
  paintPaymentEnvironmentNotice();
  return data;
}
function paintPaymentEnvironmentNotice(){
  const el=$('paymentEnvironmentNotice');
  if(!el)return;
  // LIVE uses the normal guest checkout flow; keep only the TEST-mode notice.
  el.hidden=currentPaymentMode!=='test';
  el.className='payment-environment-notice mode-test';
  el.textContent=el.hidden?'':(currentLang==='de'?'Stripe TEST: Hier wird kein echtes Geld belastet.':'Stripe TEST: No real money will be charged.');
}
async function refreshPaymentEnvironmentNotice(){
  const el=$('paymentEnvironmentNotice');
  if(!el)return;
  el.hidden=false;
  el.textContent=currentLang==='de'?'Stripe-Modus wird geprüft …':'Checking Stripe environment…';
  try{await resolvePaymentMode()}catch(err){
    el.className='payment-environment-notice mode-warning';
    el.textContent=err.message;
  }
}
function promoError(message){
  if(message==='Promo code is not valid')return currentLang==='de'?'Dieser Gutscheincode ist ungültig.':'This promo code is not valid.';
  if(message==='The discounted booking total must be at least EUR 0.50')return currentLang==='de'?'Der Gesamtpreis nach Rabatt muss mindestens 0,50 € betragen.':'The total after discount must be at least €0.50.';
  return message;
}
let estimateVersion=0,promoState=null;
function paintPromoStatus(){
  const el=$('promoStatus');if(!el)return;
  if(!promoState||promoState.roomId!==selectedRoom?.id||promoState.checkIn!==start||promoState.checkOut!==end||promoState.code!==$('promoCode').value.trim()){
    promoState=null;el.textContent='';return;
  }
  if(promoState.error){el.textContent=promoError(promoState.error);$('calendarNotice').textContent=el.textContent;return;}
  const q=promoState.quote;
  $('calendarNotice').textContent=`${tr('availablePrefix')}: ${q.nights} ${q.nights===1?tr('nightSingular'):tr('nightPlural')} · ${money(q.total_price)}`;
  el.textContent=(currentLang==='de'?`${q.discount_percent}% Rabatt: ${money(q.original_total_price)} → ${money(q.total_price)}`:`${q.discount_percent}% off: ${money(q.original_total_price)} → ${money(q.total_price)}`)+(q.discount_percent===100?(currentLang==='de'?' · Keine Zahlung erforderlich; Bestätigung durch den Gastgeber ausstehend.':' · No payment required; host approval still required.'):'');
}
async function estimate(){
  if(!selectedRoom||!start||!end||!calendarReady()||rangeBlocked(start,end))return;
  const version=++estimateVersion,roomId=selectedRoom.id,checkIn=start,checkOut=end;
  const code=$('promoCode').value.trim();
  const args={p_room_id:roomId,p_check_in:checkIn,p_check_out:checkOut};
  if(code)args.p_promo_code=code;
  const {data,error}=await sb.rpc(code?'frankiholz_quote_with_promo':'frankiholz_estimate_total',args);
  if(version!==estimateVersion||selectedRoom?.id!==roomId||start!==checkIn||end!==checkOut||$('promoCode').value.trim()!==code)return;
  const e=data?.[0];
  promoState=code?{roomId,checkIn,checkOut,code,error:error?.message,quote:e}:null;
  if(error){
    $('sumTotal').textContent='—';
    $('calendarNotice').className='notice';
    $('calendarNotice').textContent=promoError(error.message);
    $('promoStatus').textContent=promoError(error.message);
  }else if(!e?.available){
    promoState=null;end=null;$('calendarNotice').className='notice';$('calendarNotice').textContent=tr('datesUnavailable');
  }else{
    $('calendarNotice').className='notice success';
    $('calendarNotice').textContent=`${tr('availablePrefix')}: ${e.nights} ${e.nights===1?tr('nightSingular'):tr('nightPlural')} · ${money(e.total_price)}`;
    $('sumTotal').textContent=money(e.total_price);

  }
  updateSummary();renderCalendar();
}
$('promoCode').addEventListener('input',()=>{estimateVersion++;promoState=null;paintPaymentSetupNote();$('sumTotal').textContent='—';$('promoStatus').textContent='';$('calendarNotice').className='notice';$('calendarNotice').textContent=start&&end?(currentLang==='de'?'Code anwenden, um den Preis zu aktualisieren.':'Apply the code to update the price.'):tr('chooseDates');});
$('promoCode').addEventListener('change',()=>estimate());
function paintPaymentSetupNote(){const free=promoState?.quote?.discount_percent===100&&!promoState.error;$('paymentSetupNote').textContent=free?(currentLang==='de'?'Keine Zahlung erforderlich. Ihre Anfrage wartet auf die Bestätigung des Gastgebers.':'No payment required. Your request still needs host approval.'):tr('paymentPageNote');const button=$('bookingForm').querySelector('button[type=submit]');if(!button.disabled)button.textContent=free?(currentLang==='de'?'Buchungsanfrage senden':'Send booking request'):tr('paymentPageAction')}
$('applyPromo').onclick=()=>{if(!start||!end){$('promoStatus').textContent=tr('chooseDatesFirst');return}estimate();};
function updateSummary(){paintPromoStatus();paintPaymentSetupNote();$('sumIn').textContent=start||'—';$('sumOut').textContent=end||'—';if(!start||!end)$('sumTotal').textContent='—'}
$('prevMonth').onclick=async()=>{cursorMonth=new Date(cursorMonth.getFullYear(),cursorMonth.getMonth()-1,1);await loadCalendar()};$('nextMonth').onclick=async()=>{cursorMonth=new Date(cursorMonth.getFullYear(),cursorMonth.getMonth()+1,1);await loadCalendar()};
let bookingSubmitting=false;
function unlockBookingForm(){bookingSubmitting=false;$('bookingForm').querySelector('button[type=submit]').disabled=false;paintPaymentSetupNote();}
window.addEventListener('pageshow',event=>{if(event.persisted)unlockBookingForm();});
$('bookingForm').addEventListener('submit',async e=>{
 e.preventDefault();if(bookingSubmitting)return;
 const form=e.currentTarget,out=$('bookingResult');out.innerHTML='';
 if(selectedRoom&&!calendarReady()){paintCalendarState();out.textContent=tr('calendarError');return}
 if(!selectedRoom||!start||!end){out.innerHTML=`<div class="notice">${tr('chooseDatesFirst')}</div>`;return}
 if(rangeBlocked(start,end)){out.innerHTML=`<div class="notice">${tr('selectedBlocked')}</div>`;return}
 const languages=$('guestLanguages').value.split(/[,;]/).map(x=>x.trim()).filter(Boolean),intro=$('message').value.trim();
 if(languages.length===0||intro.length<20){out.innerHTML=`<div class="notice">${currentLang==='de'?'Bitte Sprache(n) angeben und eine kurze Vorstellung mit mindestens 20 Zeichen schreiben.':'Please add at least one language and a short introduction of at least 20 characters.'}</div>`;return}
 // Lock before the first asynchronous operation so repeated clicks share one attempt.
 bookingSubmitting=true;
 const submit=form.querySelector('button[type=submit]');submit.disabled=true;submit.textContent=currentLang==='de'?'Anfrage wird gespeichert …':'Saving request …';
 let navigating=false;
 try{
  const payload={p_room_id:selectedRoom.id,p_check_in:start,p_check_out:end,p_guest_name:$('guestName').value.trim(),p_guest_email:$('guestEmail').value.trim(),p_guest_phone:$('guestPhone').value.trim(),p_guest_country:$('guestCountry').value.trim(),p_guests:Number($('guestCount').value),p_message:intro,p_language:currentLang,p_guest_age:Number($('guestAge').value),p_guest_sex:$('guestSex').value,p_guest_languages:languages,p_guest_hobbies:$('guestHobbies').value.trim(),p_guest_returning:$('guestReturning').value==='yes'};
  const promoCode=$('promoCode').value.trim(),rpcName=promoCode?'frankiholz_create_booking_with_promo':'frankiholz_create_booking_v2';
  const rpcPayload=promoCode?{...payload,p_promo_code:promoCode}:payload;
  await resolvePaymentMode();
  const {data,error}=await sb.rpc(rpcName,rpcPayload);
  if(error)throw new Error(promoError(error.message));
  const b=data?.[0];if(!b?.reference)throw new Error(currentLang==='de'?'Die Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.':'Could not save your request. Please try again.');
  out.innerHTML=`<div class="notice success">${tr('requestSent')} ${tr('reference')} <b>${escapeHtml(b.reference)}</b>. ${tr('estimated')} <b>${money(b.total_price)}</b>.</div>`;
  try{sessionStorage.setItem('frankiholz-payment-email:'+b.reference,payload.p_guest_email)}catch(storageError){}
  location.assign((Number(b.total_price)===0?'/booking-status.html?reference=':'/payment.html?reference=')+encodeURIComponent(b.reference)+'&lang='+payload.p_language);
  navigating=true;
 }catch(error){
  out.innerHTML=`<div class="notice">${escapeHtml(error.message||'Could not save your request. Please try again.')}</div>`;
  await loadCalendar().catch(()=>{});
 }finally{if(!navigating)unlockBookingForm();}
});

let inlineStatusVersion=0,inlineStatusCurrent=null,inlineStatusCancelling=false;
function inlineStatusMatches(snapshot){return snapshot&&snapshot.version===inlineStatusVersion&&snapshot.ref===$('statusReference').value.trim()&&snapshot.email===$('statusEmail').value.trim();}
function invalidateInlineStatus(){inlineStatusVersion++;inlineStatusCurrent=null;$('statusResult').textContent='';if(!inlineStatusCancelling)$('checkStatusBtn').disabled=false;}
for(const id of ['statusReference','statusEmail'])$(id).addEventListener('input',invalidateInlineStatus);
async function cancelCurrentBooking(snapshot){
 if(inlineStatusCancelling||!inlineStatusMatches(snapshot))return;
 const question=currentLang==='de'?`Möchten Sie die Buchung ${snapshot.booking.reference} wirklich stornieren?`:`Do you really want to cancel booking ${snapshot.booking.reference}?`;
 if(!confirm(question)||!inlineStatusMatches(snapshot))return;
 inlineStatusCancelling=true;
 const out=$('statusResult'),button=$('cancelBookingBtn');
 for(const id of ['statusReference','statusEmail','checkStatusBtn'])$(id).disabled=true;
 if(button)button.disabled=true;
 try{
  const r=await fetch(`${CFG.supabaseUrl}/functions/v1/frankiholz-cancel-booking-v2`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CFG.supabaseKey},body:JSON.stringify({reference:snapshot.booking.reference,email:snapshot.email})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||tr('cancelError'));
  if(!inlineStatusMatches(snapshot))return;
  inlineStatusCurrent=null;inlineStatusVersion++;
  const message=j.policy==='no_payment'?(currentLang==='de'?'Buchung storniert. Keine Zahlung oder Erstattung erforderlich.':'Booking cancelled. No payment or refund required.'):j.refundable?(currentLang==='de'?'Buchung storniert. Volle Erstattung gilt.':'Booking cancelled. Full refund applies.'):(currentLang==='de'?'Buchung storniert. Innerhalb von 14 Tagen ist sie nicht erstattungsfähig.':'Booking cancelled. It is non-refundable within 14 days.');
  out.innerHTML=`<div class="notice success"><b>${escapeHtml(snapshot.booking.reference)}</b> · ${message}</div>`;
 }catch(error){if(inlineStatusMatches(snapshot)){let notice=$('inlineCancelError');if(!notice){notice=document.createElement('div');notice.id='inlineCancelError';notice.className='notice';out.append(notice);}notice.textContent=error.message||tr('cancelError');}}
 finally{inlineStatusCancelling=false;for(const id of ['statusReference','statusEmail','checkStatusBtn'])$(id).disabled=false;if(button?.isConnected)button.disabled=false;}
}
function renderInlineStatus(snapshot){
 const b=snapshot.booking,out=$('statusResult');
 const paymentLabels=currentLang==='de'?{not_required:'Keine Zahlung erforderlich (100%-Gutschein)',not_started:'Zahlung noch nicht gestartet',awaiting_payment:'Zahlungsdaten oder Überweisung ausstehend',payment_method_saved:'Zahlungsmethode sicher gespeichert',processing:'Zahlung wird verarbeitet',scheduled_charge:'Zahlung geplant',paid:'Bezahlt',failed:'Zahlung fehlgeschlagen',released:'Freigegeben',refunded:'Erstattet',expired:'Abgelaufen'}:{not_required:'No payment required (100% promo)',not_started:'Payment not started',awaiting_payment:'Payment details or bank transfer outstanding',payment_method_saved:'Payment method saved securely',processing:'Payment processing',scheduled_charge:'Payment scheduled',paid:'Paid',failed:'Payment failed',released:'Released',refunded:'Refunded',expired:'Expired'};
 const paymentLabel=paymentLabels[b.payment_status]||String(b.payment_status||'not_started').replaceAll('_',' ');
 const action=b.booking_status==='pending'&&['not_started','awaiting_payment','expired','failed'].includes(b.payment_status)?`<a class="btn secondary" href="/payment.html?reference=${encodeURIComponent(b.reference)}&amp;lang=${currentLang}" id="statusPaymentLink" style="display:inline-block;text-decoration:none;margin-top:12px">${tr('payNow')}</a>`:'';
 const due=b.charge_due_at?`<br>${tr('scheduledCharge')}: <b>${new Date(b.charge_due_at).toLocaleString(currentLang==='de'?'de-DE':'en-DE')}</b>`:(b.payment_due_at?`<br>${tr('paymentDeadline')}: ${new Date(b.payment_due_at).toLocaleString(currentLang==='de'?'de-DE':'en-DE')}`:'');
 const policy=b.payment_status==='not_required'?`<div class="status-policy refundable">${currentLang==='de'?'Keine Zahlung oder Erstattung erforderlich.':'No payment or refund required.'}</div>`:b.cancel_refund_eligible?`<div class="status-policy refundable">${tr('cancelFullRefund')}</div>`:`<div class="status-policy nonrefundable">${tr('cancelNonRefundable')}</div>`;
 const cancel=b.booking_status!=='cancelled'?`<button class="btn ghost" id="cancelBookingBtn" type="button" style="margin-top:12px">${tr('cancelBooking')}</button>`:'';
 out.innerHTML=`<div class="notice ${b.payment_status==='paid'?'success':''}"><b>${escapeHtml(b.reference)}</b> · ${escapeHtml(b.room_name)}<br>${escapeHtml(b.check_in)} → ${escapeHtml(b.check_out)} · ${money(b.total_price)}<br>${tr('booking')}: <b>${escapeHtml(b.booking_status)}</b> · ${tr('payment')}: <b>${escapeHtml(paymentLabel)}</b>${due}${policy}${action}${cancel}</div>`;
 $('statusPaymentLink')?.addEventListener('click',event=>{if(!inlineStatusMatches(snapshot)){event.preventDefault();return;}try{sessionStorage.setItem('frankiholz-payment-email:'+b.reference,snapshot.email)}catch(storageError){}});
 $('cancelBookingBtn')?.addEventListener('click',()=>cancelCurrentBooking(snapshot));
}
async function loadInlineStatus(){
 if(inlineStatusCancelling)return;
 const snapshot={version:++inlineStatusVersion,ref:$('statusReference').value.trim(),email:$('statusEmail').value.trim()},out=$('statusResult');
 inlineStatusCurrent=null;out.setAttribute('role','status');out.setAttribute('aria-live','polite');
 if(!snapshot.ref||!snapshot.email){out.textContent=tr('enterRefEmail');return;}
 $('checkStatusBtn').disabled=true;out.textContent=tr('statusLoading');
 try{
  const {data,error}=await sb.rpc('frankiholz_booking_status_v3',{p_reference:snapshot.ref,p_email:snapshot.email});
  if(!inlineStatusMatches(snapshot))return;if(error)throw error;
  const booking=data?.[0];if(!booking){out.textContent=tr('noBooking');return;}
  inlineStatusCurrent={...snapshot,booking};renderInlineStatus(inlineStatusCurrent);
 }catch(error){if(inlineStatusMatches(snapshot))out.textContent=tr('statusError');}
 finally{if(snapshot.version===inlineStatusVersion)$('checkStatusBtn').disabled=false;}
}
$('checkStatusBtn').onclick=loadInlineStatus;
document.querySelectorAll('.lang-btn[data-lang]').forEach(btn=>btn.addEventListener('click',()=>{const reloadStatus=Boolean(inlineStatusCurrent)&&!inlineStatusCancelling;currentLang=btn.dataset.lang;applyLanguage();if(reloadStatus)loadInlineStatus();else if(!inlineStatusCancelling)invalidateInlineStatus()}));
init();
