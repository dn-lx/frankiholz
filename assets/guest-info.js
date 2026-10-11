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
    {key:'fhAirbnbReviewsUrl',label:'Reviews: official Airbnb listing URL (optional)',en:'',de:'',kind:'input',optional:true},
    {key:'fhHeroReviews',label:'Below-hero reviews: genuine Airbnb guest quotations (optional)',en:'',de:'',kind:'textarea',optional:true},
    {key:'fhAirbnbRating',label:'Airbnb listing rating (snapshot, manually updated)',en:'4.74',de:'4.74',kind:'input',optional:true},
    {key:'fhAirbnbCount',label:'Airbnb listing review count (snapshot, manually updated)',en:'35',de:'35',kind:'input',optional:true}
  ];
  const labels = {
    en: {
      welcome:'Before your stay',guestInfoTitle:'Your stay at FrankiHolz',guestInfoIntro:'House rules, shared facilities and ways to reach the host.',
      heroAbout:'Discover our place',heroMinor:'Thoughtful stays in Frankfurt-Sachsenhausen',heroNoteTop:'WELCOME TO FRANKIHOLZ',
      heroNoteTitle:'A comfortable base for your time in Frankfurt.',heroFact1:'Private rooms in a shared apartment',heroFact2:'Shared kitchen and practical amenities',heroFact3:'Direct contact with your host',
      explore:'EXPLORE THE STAY',quickRooms:'Our rooms',quickFacilities:'Amenities',quickRules:'House rules',quickLocation:'Location',
      rulesTitle:'House rules & important information',checkInTitle:'Check-in',checkOutTitle:'Check-out',quietTitle:'Quiet hours',
      extraGuestsTitle:'Additional guests',otherRulesTitle:'Taking care of the accommodation',
      facilitiesTitle:'Facilities & amenities',facilitiesIntro:'Available facilities and shared spaces. Please ask the host if a specific amenity is essential for your stay.',
      reviewsTitle:'Guest reviews',reviewsIntro:'Read reviews of our accommodation on Airbnb.',reviewsLink:'View Airbnb reviews ↗',
      heroReviewsEyebrow:'GUEST REVIEWS · AIRBNB',heroReviewsHeading:'Words from our guests',heroReviewsSource:'Read on Airbnb ↗',
      reviewBandKicker:'AIRBNB GUEST FEEDBACK',reviewBandTitle:'Guest reviews',reviewBandContext:'Feedback from our Airbnb listing.',
      reviewBandSnapshot:'Airbnb listing snapshot · not live',reviewBandTopics:'Topics guests mention',
      reviewTopicHost:'Hospitality',reviewTopicLocation:'Location',reviewTopicClean:'Cleanliness',reviewBandLink:'Read reviews on Airbnb ↗',
      contactTitle:'Contact your host',contactIntro:'Questions about arrival, facilities or your booking? Contact us directly.',
      mapKicker:'Location',mapTitle:'Find us on the map',mapPrivacy:'Map provided by Google Maps. Viewing it may share data with Google.',
      directions:'Open directions ↗'
    },
    de: {
      welcome:'Vor Ihrem Aufenthalt',guestInfoTitle:'Ihr Aufenthalt bei FrankiHolz',guestInfoIntro:'Hausregeln, Gemeinschaftsbereiche und Kontaktmöglichkeiten.',
      heroAbout:'Unsere Unterkunft entdecken',heroMinor:'Angenehm übernachten in Frankfurt-Sachsenhausen',heroNoteTop:'WILLKOMMEN BEI FRANKIHOLZ',
      heroNoteTitle:'Ihr gemütlicher Ausgangspunkt in Frankfurt.',heroFact1:'Private Zimmer in einer Wohngemeinschaft',heroFact2:'Gemeinschaftsküche und praktische Ausstattung',heroFact3:'Direkter Kontakt mit dem Gastgeber',
      explore:'UNTERKUNFT ENTDECKEN',quickRooms:'Unsere Zimmer',quickFacilities:'Ausstattung',quickRules:'Hausregeln',quickLocation:'Standort',
      rulesTitle:'Hausregeln & wichtige Informationen',checkInTitle:'Check-in',checkOutTitle:'Check-out',quietTitle:'Ruhezeiten',
      extraGuestsTitle:'Zusätzliche Gäste',otherRulesTitle:'Sorgsamer Umgang mit der Unterkunft',
      facilitiesTitle:'Ausstattung & Einrichtungen',facilitiesIntro:'Vorhandene Ausstattung und gemeinsam genutzte Bereiche. Bitte fragen Sie nach, wenn eine Ausstattung für Ihren Aufenthalt unverzichtbar ist.',
      reviewsTitle:'Gästebewertungen',reviewsIntro:'Lesen Sie Bewertungen unserer Unterkunft auf Airbnb.',reviewsLink:'Airbnb-Bewertungen ansehen ↗',
      heroReviewsEyebrow:'GÄSTEBEWERTUNGEN · AIRBNB',heroReviewsHeading:'Das sagen unsere Gäste',heroReviewsSource:'Auf Airbnb lesen ↗',
      reviewBandKicker:'AIRBNB-GÄSTEBEWERTUNGEN',reviewBandTitle:'Gästebewertungen',reviewBandContext:'Bewertungen aus unserem Airbnb-Inserat.',
      reviewBandSnapshot:'Airbnb-Momentaufnahme · nicht live',reviewBandTopics:'Häufig erwähnte Themen',
      reviewTopicHost:'Gastfreundschaft',reviewTopicLocation:'Lage',reviewTopicClean:'Sauberkeit',reviewBandLink:'Bewertungen auf Airbnb ansehen ↗',
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
  let heroReviewItems = [];
  let heroReviewIndex = 0;
  let heroReviewTimer = null;
  let heroReviewPaused = false;
  const heroReviewReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parseReviewEntries = (value) => String(value || '').split(/\r?\n/).map(line => {
    const parts = line.split('|').map(p => p.trim());
    if(parts.length !== 3 || !parts[0] || !parts[1] || !validListingUrl(parts[2])) return null;
    return {author:parts[0],quote:parts[1],url:parts[2]};
  }).filter(Boolean).slice(0,10);
  // Short, source-verified excerpts from the official listing review modal.
  // Only excerpts are stored: do not misrepresent these as complete reviews.
  const verifiedReviewExcerpts = [
    {author:'Imanol · Airbnb review excerpt',quote:'Very friendly and understanding.',url:'https://www.airbnb.com/rooms/1621684668409633226'},
    {author:'Anas · Airbnb review excerpt',quote:'Great place, great location, great host. Definitely recommended',url:'https://www.airbnb.com/rooms/1621684668409633226'},
    {author:'Ke · Airbnb review excerpt',quote:'Inura is very friendly. Very nice trip and stay there :)',url:'https://www.airbnb.com/rooms/1621684668409633226'}
  ];
  const heroReviewSourceLanguage = (lang) => {
    const local = parseReviewEntries(rows.fhHeroReviews?.['text_'+lang]);
    if(local.length) return local;
    const other = parseReviewEntries(rows.fhHeroReviews?.[lang==='de'?'text_en':'text_de']);
    return other.length ? other : verifiedReviewExcerpts;
  };
  function stopHeroReviewTimer(){
    if(heroReviewTimer !== null) {clearInterval(heroReviewTimer); heroReviewTimer=null;}
  }
  function startHeroReviewTimer(){
    stopHeroReviewTimer();
    if(heroReviewItems.length < 2 || heroReviewReducedMotion()) return;
    heroReviewTimer = setInterval(() => {
      if(!heroReviewPaused && document.visibilityState === 'visible'){
        heroReviewIndex=(heroReviewIndex+1)%heroReviewItems.length;
        showHeroReview();
      }
    },7500);
  }
  function showHeroReview(){
    if(!heroReviewItems.length)return;
    const item=heroReviewItems[heroReviewIndex];
    $('fhReviewQuote').textContent=item.quote;
    $('fhReviewAuthor').textContent=item.author;
    const link=$('fhReviewSource');
    link.href=item.url;
    const position=String(heroReviewIndex+1).padStart(2,'0');
    const count=String(heroReviewItems.length).padStart(2,'0');
    $('fhReviewProgress').textContent=position+' / '+count;
    $('fhReviewPrev').disabled=heroReviewItems.length<2;
    $('fhReviewNext').disabled=heroReviewItems.length<2;
    const slide=$('fhReviewSlide');
    if(!heroReviewReducedMotion()){
      slide.classList.remove('fh-review-enter');
      void slide.offsetWidth; // Restart the short visual transition on slide change.
      slide.classList.add('fh-review-enter');
    }
  }
  function renderHeroReviews(){
    const panel=$('fhHeroReviews');
    if(!panel)return;
    heroReviewItems=heroReviewSourceLanguage(uiLang());
    heroReviewIndex=0;
    panel.hidden=heroReviewItems.length===0;
    // The carousel now sits below the hero; keep the hero's full-width layout.
    if(heroReviewItems.length) showHeroReview();
    startHeroReviewTimer();
  }
  const validAirbnbUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && /(^|\.)airbnb\.(com|de|co\.uk|fr|es|it|nl|at|ch)$/.test(url.hostname.toLowerCase());
    } catch { return false; }
  };
  const validListingUrl = value => {
    if(!validAirbnbUrl(value))return false;
    const path=new URL(value).pathname;
    return /^\/(?:rooms\/\d+|h\/[a-z0-9-]+|slink\/[a-z0-9_-]+)\/?$/i.test(path);
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
    if($('fhHeroReviews'))$('fhHeroReviews').setAttribute('aria-label',lang==='de'?'Gästebewertungen':'Guest reviews');
    document.querySelectorAll('[data-fh-label]').forEach(node=>{node.textContent=labels[lang][node.dataset.fhLabel]||node.textContent;});
    renderHeroReviews();
    const listing = fieldValue('fhAirbnbReviewsUrl',lang);
    const href = validListingUrl(listing) ? new URL(listing).origin + new URL(listing).pathname
      : 'https://www.airbnb.com/rooms/1621684668409633226';
    const listingLink = $('fhReviewListingLink');
    if(listingLink)listingLink.href=href;
    const rating=Number(fieldValue('fhAirbnbRating',lang));
    if($('fhAirbnbRating'))$('fhAirbnbRating').textContent =
      Number.isFinite(rating)&&rating>=0&&rating<=5 ? rating.toFixed(2) : '4.74';
    const count=Number(fieldValue('fhAirbnbCount',lang));
    const safeCount=Number.isInteger(count)&&count>=0&&count<=100000?count:35;
    if($('fhAirbnbCount'))$('fhAirbnbCount').textContent =
      safeCount + ' ' + (lang==='de'?'Bewertungen':'reviews');
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
      reviewsSection.hidden = !validListingUrl(url) || heroReviewItems.length>0;
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
        if(f.key==='fhHeroReviews'){
          control.placeholder='Guest first name | Exact guest review | https://www.airbnb.com/rooms/123456789';
          control.rows=7;
        }
        control.value=fieldValue(f.key,lang);
        col.append(label,control);grid.appendChild(col);
      });
      block.appendChild(grid);
      if(f.key==='fhHeroReviews'){
        const help=document.createElement('p');
        help.className='fh-admin-form-help';
        help.textContent='Optional: genuine guest quotations appear in the reviews strip below the hero. One per line: Guest name | Exact review text | Public Airbnb listing URL (max 10). Do not invent or scrape quotations; always check the original.';
        block.appendChild(help);
      }
      if(f.key==='fhAirbnbRating'||f.key==='fhAirbnbCount'){
        const help=document.createElement('p');help.className='fh-admin-form-help';
        help.textContent='A snapshot only: the rating and review count do not sync automatically. Check the public Airbnb listing periodically before updating these values.';
        block.appendChild(help);
      }
      if(f.key==='fhAirbnbReviewsUrl'){
        const help=document.createElement('p');
        help.className='fh-admin-form-help';
        help.textContent='In Airbnb: Listings → choose listing → View → Share → Copy link. Paste the public listing URL, not your private calendar (.ics) link. Add the same URL to both language fields.';
        block.appendChild(help);
      }
      root.appendChild(block);
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
    if(updates.some(r=>!byKey[r.copy_key].optional&&(!r.text_en||!r.text_de))){
      status.textContent='Please fill out all guest information in both languages.';return;
    }
    const airbnb=updates.find(r=>r.copy_key==='fhAirbnbReviewsUrl');
    if(airbnb && [airbnb.text_en,airbnb.text_de].some(url=>url&&!validListingUrl(url))){
      status.textContent='The reviews link must be a valid HTTPS Airbnb listing URL.';return;
    }
    const reviewField=updates.find(r=>r.copy_key==='fhHeroReviews');
    if(reviewField){
      for(const [language,raw] of [['English',reviewField.text_en],['German',reviewField.text_de]]){
        const lines=raw.split(/\r?\n/).filter(line=>line.trim());
        if(lines.length>10 || lines.some(line=>{
          const parts=line.split('|').map(p=>p.trim());
          return parts.length!==3 || !parts[0] || !parts[1] || parts[0].length>70 || parts[1].length>650 || !validListingUrl(parts[2]);
        })){
          status.textContent=language+' reviews: use up to 10 lines of Guest name | Real review | Public Airbnb listing URL.';
          return;
        }
      }
    }
    for (const r of updates.filter(r=>r.copy_key==='fhAirbnbRating'||r.copy_key==='fhAirbnbCount')) {
      const values=[r.text_en,r.text_de].filter(Boolean);
      if(r.copy_key==='fhAirbnbRating'&&values.some(v=>!/^(?:[0-4](?:\.\d{1,2})?|5(?:\.0{1,2})?)$/.test(v))){
        status.textContent='Airbnb rating must be between 0 and 5, with up to two decimals.';return;
      }
      if(r.copy_key==='fhAirbnbCount'&&values.some(v=>!/^\d{1,6}$/.test(v)||Number(v)>100000)){
        status.textContent='Airbnb review count must be a whole number.';return;
      }
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
    const reviewsPanel=$('fhHeroReviews');
    if(reviewsPanel){
      reviewsPanel.addEventListener('mouseenter',()=>{heroReviewPaused=true;});
      reviewsPanel.addEventListener('mouseleave',()=>{heroReviewPaused=false;});
      reviewsPanel.addEventListener('focusin',()=>{heroReviewPaused=true;});
      reviewsPanel.addEventListener('focusout',event=>{if(!reviewsPanel.contains(event.relatedTarget))heroReviewPaused=false;});
      $('fhReviewPrev').addEventListener('click',()=>{
        if(heroReviewItems.length<2)return;
        heroReviewIndex=(heroReviewIndex-1+heroReviewItems.length)%heroReviewItems.length;
        showHeroReview(); startHeroReviewTimer();
      });
      $('fhReviewNext').addEventListener('click',()=>{
        if(heroReviewItems.length<2)return;
        heroReviewIndex=(heroReviewIndex+1)%heroReviewItems.length;
        showHeroReview(); startHeroReviewTimer();
      });
    }
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