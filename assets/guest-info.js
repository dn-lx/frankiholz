/* FrankiHolz guest information: public content + authenticated Admin editor.
   Uses existing bilingual frankiholz_copy records; does not change booking flows. */
(() => {
  const fields = [
    {key:'fhCheckIn',label:'House rules: check-in',en:'Check-in: Please agree on your arrival time with the host in advance.',de:'Check-in: Bitte stimmen Sie Ihre Ankunftszeit im Voraus mit dem Gastgeber ab.',kind:'textarea'},
    {key:'fhCheckOut',label:'House rules: check-out',en:'Check-out: Please confirm your departure time with the host before your stay.',de:'Check-out: Bitte klären Sie Ihre Abreisezeit vor dem Aufenthalt mit dem Gastgeber.',kind:'textarea'},
    {key:'fhQuietHours',label:'House rules: quiet hours',en:'Please respect neighbours and keep noise low, especially at night. Exact quiet hours will be confirmed by the host.',de:'Bitte nehmen Sie Rücksicht auf Nachbarn und vermeiden Sie insbesondere nachts Lärm. Die genauen Ruhezeiten bestätigt der Gastgeber.',kind:'textarea'},
    {key:'fhExtraGuests',label:'House rules: additional guests',en:'Only registered guests may stay overnight. Additional guests or visitors require the host’s approval in advance.',de:'Nur angemeldete Gäste dürfen übernachten. Zusätzliche Gäste oder Besucher benötigen die vorherige Zustimmung des Gastgebers.',kind:'textarea'},
    {key:'fhOtherRules',label:'House rules: additional information',en:'Please treat the apartment and shared areas with care.',de:'Bitte behandeln Sie die Wohnung und Gemeinschaftsbereiche sorgfältig.',kind:'textarea'},
    {key:'fhFacilities',label:'Facilities (one per line)',en:'Wi-Fi\nShared kitchen access\nLaundry (additional charge)\nGarden access\nHeating\nTV',de:'WLAN\nGemeinschaftsküche\nWäschewaschen (gegen Gebühr)\nGartennutzung\nHeizung\nFernseher',kind:'textarea'},
    {key:'fhAboutTitle',label:'About us: heading',en:'About FrankiHolz',de:'Über FrankiHolz',kind:'input'},
    {key:'fhAboutBody',label:'About us: introduction',en:'FrankiHolz offers private rooms in a shared three-bedroom apartment in Frankfurt am Main. Guests can contact the host directly with questions about their stay and the shared facilities. Our goal is to make expectations clear before arrival and offer a straightforward booking experience.',de:'FrankiHolz bietet private Zimmer in einer Dreizimmer-Wohngemeinschaft in Frankfurt am Main. Bei Fragen zum Aufenthalt und den gemeinschaftlich genutzten Bereichen können Gäste den Gastgeber direkt kontaktieren. Wir möchten die Erwartungen vor der Anreise transparent machen und eine unkomplizierte Buchung ermöglichen.',kind:'textarea'},
    {key:'fhContactPhone',label:'Contact: phone number',en:'+49 176 62493 041',de:'+49 176 62493 041',kind:'input'},
    {key:'fhAirbnbReviewsUrl',label:'Reviews: official Airbnb listing URL (optional)',en:'',de:'',kind:'input',optional:true}
  ];
  const labels = {
    en: {
      welcome:'Before your stay',guestInfoTitle:'Your stay at FrankiHolz',guestInfoIntro:'House rules, shared facilities and ways to reach the host.',
      rulesTitle:'House rules & important information',checkInTitle:'Check-in',checkOutTitle:'Check-out',quietTitle:'Quiet hours',
      extraGuestsTitle:'Additional guests',otherRulesTitle:'Taking care of the accommodation',
      facilitiesTitle:'Facilities & amenities',facilitiesIntro:'Available facilities and shared spaces. Please ask the host if a specific amenity is essential for your stay.',
      reviewsTitle:'Guest reviews',reviewsIntro:'Read reviews of our accommodation on Airbnb.',reviewsLink:'View Airbnb reviews ↗',
      contactTitle:'Contact your host',contactIntro:'Questions about arrival, facilities or your booking? Contact us directly.',
      mapKicker:'Location',mapTitle:'Find us on the map',mapPrivacy:'Map provided by Google Maps. Viewing it may share data with Google.',
      directions:'Open directions ↗'
    },
    de: {
      welcome:'Vor Ihrem Aufenthalt',guestInfoTitle:'Ihr Aufenthalt bei FrankiHolz',guestInfoIntro:'Hausregeln, Gemeinschaftsbereiche und Kontaktmöglichkeiten.',
      rulesTitle:'Hausregeln & wichtige Informationen',checkInTitle:'Check-in',checkOutTitle:'Check-out',quietTitle:'Ruhezeiten',
      extraGuestsTitle:'Zusätzliche Gäste',otherRulesTitle:'Sorgsamer Umgang mit der Unterkunft',
      facilitiesTitle:'Ausstattung & Einrichtungen',facilitiesIntro:'Vorhandene Ausstattung und gemeinsam genutzte Bereiche. Bitte fragen Sie nach, wenn eine Ausstattung für Ihren Aufenthalt unverzichtbar ist.',
      reviewsTitle:'Gästebewertungen',reviewsIntro:'Lesen Sie Bewertungen unserer Unterkunft auf Airbnb.',reviewsLink:'Airbnb-Bewertungen ansehen ↗',
      contactTitle:'Kontakt zum Gastgeber',contactIntro:'Fragen zur Anreise, Ausstattung oder Buchung? Kontaktieren Sie uns direkt.',
      mapKicker:'Standort',mapTitle:'Unser Standort auf der Karte',mapPrivacy:'Die Karte wird von Google Maps bereitgestellt. Bei der Anzeige können Daten an Google übertragen werden.',
      directions:'Route öffnen ↗'
    }
  };
  const byKey = Object.fromEntries(fields.map(f=>[f.key,f]));
  let rows = {};
  const $ = id => document.getElementById(id);
  const uiLang = () => document.documentElement.lang === 'de' ? 'de' : 'en';
  const fieldValue = (key, lang) => {
    const saved = rows[key]?.['text_'+lang];
    return typeof saved === 'string' && saved.trim() ? saved.trim() : (byKey[key]?.[lang] ?? '');
  };
  const validAirbnbUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && /(^|\.)airbnb\.(com|de|co\.uk|fr|es|it|nl|at|ch)$/.test(url.hostname.toLowerCase());
    } catch { return false; }
  };
  async function load() {
    const {data,error} = await sb.from('frankiholz_copy').select('copy_key,text_en,text_de').in('copy_key',fields.map(f=>f.key));
    if (error) { console.warn('FrankiHolz guest information unavailable',error.message); return; }
    rows = Object.fromEntries((data||[]).map(r=>[r.copy_key,r]));
    renderPublic();
    if ($('guestInfoEditor')) renderAdmin();
  }
  function renderPublic() {
    if (!$('guestInfoPublic')) return;
    const lang = uiLang();
    document.querySelectorAll('[data-fh-label]').forEach(node=>{node.textContent=labels[lang][node.dataset.fhLabel]||node.textContent;});
    document.querySelectorAll('[data-fh-info]').forEach(node=>{
      node.textContent = fieldValue(node.dataset.fhInfo,lang);
    });
    const amenities = $('fhAmenitiesList');
    if (amenities) {
      amenities.replaceChildren();
      fieldValue('fhFacilities',lang).split(/\r?\n/).map(s=>s.trim()).filter(Boolean).forEach(item=>{
        const li=document.createElement('li');li.textContent=item;amenities.appendChild(li);
      });
    }
    const phone = fieldValue('fhContactPhone',lang);
    const contact = $('fhContactPhoneLink');
    if (contact) {
      const tel = phone.replace(/[^+0-9]/g,'');
      contact.textContent = phone;
      contact.href = /^\+?[0-9]{7,16}$/.test(tel)?'tel:'+tel:'#contact';
    }
    const reviewsLink = $('fhAirbnbReviewsLink');
    const reviewsSection = $('fhAirbnbReviews');
    const url = fieldValue('fhAirbnbReviewsUrl',lang);
    if (reviewsSection && reviewsLink) {
      reviewsSection.hidden = !validAirbnbUrl(url);
      if (!reviewsSection.hidden) reviewsLink.href = url;
      else reviewsLink.removeAttribute('href');
    }
  }
  function renderAdmin() {
    const root=$('guestInfoEditor');
    if(!root)return;
    root.replaceChildren();
    fields.forEach(f=>{
      const block=document.createElement('div');block.className='fh-field';
      const title=document.createElement('strong');title.textContent=f.label;
      block.appendChild(title);
      const grid=document.createElement('div');grid.className='bilingual-editor compact';
      ['en','de'].forEach(lang=>{
        const col=document.createElement('div'),label=document.createElement('label');
        label.textContent=lang==='en'?'English':'Deutsch';
        const control=document.createElement(f.kind==='input'?'input':'textarea');
        control.id='fh-edit-'+f.key+'-'+lang;
        if(f.kind!=='input')control.rows=f.key==='fhAboutBody'?5:3;
        if(f.key==='fhAirbnbReviewsUrl')control.placeholder='https://www.airbnb.com/rooms/...';
        control.value=fieldValue(f.key,lang);
        col.append(label,control);grid.appendChild(col);
      });
      block.appendChild(grid);root.appendChild(block);
    });
  }
  async function save() {
    const status=$('guestInfoStatus');
    if(!status)return;
    const {data:{session}}=await sb.auth.getSession();
    if(!session){status.textContent='Session expired. Please sign in again.';return;}
    const {data:allowed,error:authError}=await sb.rpc('frankiholz_admin_access_check');
    if(authError||!allowed){status.textContent='Not authorized to edit FrankiHolz guest information.';return;}
    const updates=fields.map((f,i)=>({
      copy_key:f.key,label:f.label,sort_order:500+i*10,
      text_en:$('fh-edit-'+f.key+'-en').value.trim(),
      text_de:$('fh-edit-'+f.key+'-de').value.trim(),
      updated_at:new Date().toISOString()
    }));
    if(updates.some(r=>r.copy_key!=='fhAirbnbReviewsUrl'&&(!r.text_en||!r.text_de))){
      status.textContent='Please fill out all guest information in both languages.';return;
    }
    const airbnb=updates.find(r=>r.copy_key==='fhAirbnbReviewsUrl');
    if(airbnb && [airbnb.text_en,airbnb.text_de].some(url=>url&&!validAirbnbUrl(url))){
      status.textContent='The reviews link must be a valid HTTPS Airbnb listing URL.';return;
    }
    status.textContent='Saving…';
    const {error}=await sb.from('frankiholz_copy').upsert(updates,{onConflict:'copy_key'});
    if(error){status.textContent='Could not save: '+error.message;return;}
    const {data:stored,error:readError}=await sb.from('frankiholz_copy').select('copy_key,text_en,text_de').in('copy_key',fields.map(f=>f.key));
    const saved=new Map((stored||[]).map(r=>[r.copy_key,r]));
    const confirmed=!readError&&updates.every(r=>{
      const item=saved.get(r.copy_key);
      return item&&item.text_en===r.text_en&&item.text_de===r.text_de;
    });
    if(!confirmed){status.textContent='Save could not be verified. Please reload and check the fields.';return;}
    rows=Object.fromEntries(stored.map(r=>[r.copy_key,r]));
    status.textContent='Guest information saved and verified.';
  }
  if($('guestInfoPublic')){
    renderPublic();
    load();
    document.querySelectorAll('.lang-btn').forEach(btn=>btn.addEventListener('click',()=>{document.documentElement.lang=btn.dataset.lang;renderPublic();}));
  }
  if($('guestInfoEditor')){
    const saveBtn=$('saveGuestInfo');
    if(saveBtn)saveBtn.addEventListener('click',save);
    async function onAuthenticated(){
      const {data:{session}}=await sb.auth.getSession();
      if(!session)return;
      const {data:allowed,error}=await sb.rpc('frankiholz_admin_access_check');
      if(!error&&allowed)await load();
    }
    sb.auth.onAuthStateChange((event,session)=>{
      if(session)setTimeout(onAuthenticated,0);
    });
    setTimeout(onAuthenticated,0);
  }
})();