/* FrankiHolz guest information: public content + authenticated Admin editor.
   Uses existing bilingual frankiholz_copy records; does not change booking flows. */
(() => {
  const fields = [
    {key:'fhHostPhoto',label:'Host avatar photo',en:'/assets/host-inura.jpg',de:'/assets/host-inura.jpg',kind:'photo'},
    {key:'fhHostName',label:'Host message: host name',en:'Inura',de:'Inura',kind:'input'},
    {key:'fhHostRole',label:'Host message: short introduction',en:'Your host in Frankfurt',de:'Ihr Gastgeber in Frankfurt',kind:'input'},
    {key:'fhHostTitle',label:'Host message: heading',en:'Message from your host',de:'Eine Nachricht von Ihrem Gastgeber',kind:'input'},
    {key:'fhHostBody',label:'Host message (separate paragraphs with a blank line)',en:"We value our guests' privacy and personal space, while always being happy to help with recommendations for restaurants, nightlife, sightseeing or transportation.\n\nYour room is designed to be comfortable during the day, while warm ambient lighting and red mood lighting can create a more intimate atmosphere in the evening. Whether you're visiting Frankfurt alone, for work, nightlife, or enjoying a romantic stay together, you can make the space feel the way you like.\n\nEveryone is welcome. Come as you are, enjoy your privacy, and make yourself at home.",de:'Wir schätzen die Privatsphäre und den persönlichen Freiraum unserer Gäste und helfen Ihnen zugleich gerne mit Empfehlungen für Restaurants, das Nachtleben, Sehenswürdigkeiten oder Verkehrsmittel.\n\nIhr Zimmer ist tagsüber ein gemütlicher Rückzugsort. Am Abend sorgen warmes, stimmungsvolles Licht und rote Akzentbeleuchtung auf Wunsch für eine intimere Atmosphäre. Ob Sie Frankfurt allein, beruflich, wegen des Nachtlebens oder für einen romantischen Aufenthalt zu zweit besuchen – gestalten Sie die Atmosphäre so, wie Sie sich wohlfühlen.\n\nAlle sind willkommen. Kommen Sie, wie Sie sind, genießen Sie Ihre Privatsphäre und fühlen Sie sich wie zu Hause.',kind:'textarea'},
    {key:'fhHeatingRule',label:'House rules: heating controls',en:'Please keep the radiator thermostat on, at a setting no higher than 3. Do not turn it off. If your room feels too cold, please let us know.',de:'Bitte lassen Sie das Heizkörperthermostat eingeschaltet und stellen Sie es höchstens auf Stufe 3. Schalten Sie die Heizung nicht aus. Wenn es Ihnen zu kalt ist, sagen Sie uns bitte Bescheid.',kind:'textarea'},
    {key:'fhCheckIn',label:'House rules: check-in',en:'17:00',de:'17:00',kind:'input'},
    {key:'fhCheckOut',label:'House rules: check-out',en:'11:00',de:'11:00',kind:'input'},
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
      bookingContactTitle:'Your contact details',bookingProfileTitle:'A little about you',bookingMessageTitle:'Your arrival and message',
      websitePrompt:'Create your own website:',websiteContact:'Contact us',
      welcome:'Before your stay',guestInfoTitle:'Your stay at FrankiHolz',guestInfoIntro:'House rules, shared facilities and ways to reach the host.',
      heroAbout:'Discover our place',heroMinor:'Thoughtful stays in Frankfurt-Sachsenhausen',heroNoteTop:'WELCOME TO FRANKIHOLZ',
      heroNoteTitle:'A comfortable base for your time in Frankfurt.',heroFact1:'Private rooms in a shared apartment',heroFact2:'Shared kitchen and practical amenities',heroFact3:'Direct contact with your host',
      explore:'EXPLORE THE STAY',quickRooms:'Our rooms',quickFacilities:'Amenities',quickRules:'House rules',quickLocation:'Location',
      guideTitle:'A little guide to feeling at home',guideDescription:'House rules, shared spaces and useful arrival details.',guideDownload:'Read house rules',guideClose:'Close',rulesTitle:'House rules & important information',checkInTitle:'Check-in',checkOutTitle:'Check-out',quietTitle:'Quiet hours',
      extraGuestsTitle:'Additional guests',otherRulesTitle:'Taking care of the accommodation',
      facilitiesTitle:'Facilities & amenities',facilitiesIntro:'Available facilities and shared spaces. Please ask the host if a specific amenity is essential for your stay.',
      reviewsTitle:'Guest reviews',reviewsIntro:'Read reviews of our accommodation on Airbnb.',reviewsLink:'View Airbnb reviews ↗',
      heroReviewsEyebrow:'GUEST REVIEWS · AIRBNB',heroReviewsHeading:'Guest feedback',heroReviewsSource:'Read on Airbnb ↗',
      reviewBandKicker:'AIRBNB GUEST FEEDBACK',reviewBandTitle:'Guest reviews',reviewBandContext:'Feedback from our Airbnb listing.',
      reviewBandSnapshot:'Airbnb listing snapshot · not live',reviewBandTopics:'Topics guests mention',
      reviewTopicHost:'Hospitality',reviewTopicLocation:'Location',reviewTopicClean:'Cleanliness',reviewBandLink:'Read reviews on Airbnb ↗',
      contactTitle:'Contact your host',contactIntro:'Questions about arrival, facilities or your booking? Contact us directly.',
      mapKicker:'Location',mapTitle:'Find us on the map',mapPrivacy:'Google Maps stays unloaded until you choose to load it.',loadMap:'Load Google Maps',mapChoice:'Load the map to connect to Google. Your IP address and browser information may be shared with Google.',
      directions:'Open directions ↗'
    },
    de: {
      bookingContactTitle:'Ihre Kontaktdaten',bookingProfileTitle:'Ein wenig über Sie',bookingMessageTitle:'Ihre Ankunft und Nachricht',
      websitePrompt:'Ihre eigene Website erstellen:',websiteContact:'Kontaktieren Sie uns',
      welcome:'Vor Ihrem Aufenthalt',guestInfoTitle:'Ihr Aufenthalt bei FrankiHolz',guestInfoIntro:'Hausregeln, Gemeinschaftsbereiche und Kontaktmöglichkeiten.',
      heroAbout:'Unsere Unterkunft entdecken',heroMinor:'Angenehm übernachten in Frankfurt-Sachsenhausen',heroNoteTop:'WILLKOMMEN BEI FRANKIHOLZ',
      heroNoteTitle:'Ihr gemütlicher Ausgangspunkt in Frankfurt.',heroFact1:'Private Zimmer in einer Wohngemeinschaft',heroFact2:'Gemeinschaftsküche und praktische Ausstattung',heroFact3:'Direkter Kontakt mit dem Gastgeber',
      explore:'UNTERKUNFT ENTDECKEN',quickRooms:'Unsere Zimmer',quickFacilities:'Ausstattung',quickRules:'Hausregeln',quickLocation:'Standort',
      guideTitle:'Ein kleiner Wegweiser zum Wohlfühlen',guideDescription:'Hausregeln, gemeinsame Räume und Hinweise zur Anreise.',guideDownload:'Hausregeln lesen',guideClose:'Schließen',rulesTitle:'Hausregeln & wichtige Informationen',checkInTitle:'Check-in',checkOutTitle:'Check-out',quietTitle:'Ruhezeiten',
      extraGuestsTitle:'Zusätzliche Gäste',otherRulesTitle:'Sorgsamer Umgang mit der Unterkunft',
      facilitiesTitle:'Ausstattung & Einrichtungen',facilitiesIntro:'Vorhandene Ausstattung und gemeinsam genutzte Bereiche. Bitte fragen Sie nach, wenn eine Ausstattung für Ihren Aufenthalt unverzichtbar ist.',
      reviewsTitle:'Gästebewertungen',reviewsIntro:'Lesen Sie Bewertungen unserer Unterkunft auf Airbnb.',reviewsLink:'Airbnb-Bewertungen ansehen ↗',
      heroReviewsEyebrow:'GÄSTEBEWERTUNGEN · AIRBNB',heroReviewsHeading:'Gästestimmen',heroReviewsSource:'Auf Airbnb lesen ↗',
      reviewBandKicker:'AIRBNB-GÄSTEBEWERTUNGEN',reviewBandTitle:'Gästebewertungen',reviewBandContext:'Bewertungen aus unserem Airbnb-Inserat.',
      reviewBandSnapshot:'Airbnb-Momentaufnahme · nicht live',reviewBandTopics:'Häufig erwähnte Themen',
      reviewTopicHost:'Gastfreundschaft',reviewTopicLocation:'Lage',reviewTopicClean:'Sauberkeit',reviewBandLink:'Bewertungen auf Airbnb ansehen ↗',
      contactTitle:'Kontakt zum Gastgeber',contactIntro:'Fragen zur Anreise, Ausstattung oder Buchung? Kontaktieren Sie uns direkt.',
      mapKicker:'Standort',mapTitle:'Unser Standort auf der Karte',mapPrivacy:'Google Maps bleibt deaktiviert, bis Sie die Karte laden.',loadMap:'Google Maps laden',mapChoice:'Beim Laden wird eine Verbindung zu Google hergestellt. Ihre IP-Adresse und Browserinformationen können an Google übertragen werden.',
      directions:'Route öffnen ↗'
    }
  };
  const byKey = Object.fromEntries(fields.map(f=>[f.key,f]));
  let rows = {};
  const $ = id => document.getElementById(id);
  const uiLang = () => document.documentElement.lang === 'de' ? 'de' : 'en';
  const fieldValue = (key, lang) => {
    const saved = rows[key]?.['text_'+lang];
    const value=typeof saved === 'string' && saved.trim() ? saved.trim() : (byKey[key]?.[lang] ?? '');
    if(['fhCheckIn','fhCheckOut'].includes(key))return window.FrankiHolzGuest.parseTime(value,byKey[key][lang]);
    return value;
  };
  let heroReviewItems = [];
  let heroReviewIndex = 0;
  let heroReviewTimer = null;
  let heroReviewPaused = false;
  const heroReviewReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parseReviewEntries = (value) => String(value || '').split(/\r?\n/).map(line => {
    const parts = line.split('|').map(p => p.trim());
    if(![3,4].includes(parts.length) || !parts[0] || !parts[1] || !validListingUrl(parts[2])) return null;
    if(parts.length === 4 && !/^[1-5]$/.test(parts[3])) return null;
    return {author:parts[0],quote:parts[1],url:parts[2],rating:parts.length === 4 ? Number(parts[3]) : null,kind:'quote'};
  }).filter(Boolean).slice(0,12);
  // These are individually attributed paraphrases of 12 genuine five-star Airbnb reviews
  // observed in the public listing's review dialog on 2026-10-11. They are NOT verbatim
  // quotations or a live Airbnb reviews feed. Each links to the original listing.
  const verifiedReviewExcerpts = [
    {author:"Katharina",quote:"Central location, easy access to the city and a helpful, flexible host.",quote_de:"Zentrale Lage, gute Erreichbarkeit der Stadt und ein hilfsbereiter, flexibler Gastgeber.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Catarina",quote:"Welcoming hosts, a clean and comfortable room and convenient transportation. Check-in and check-out were easy.",quote_de:"Herzliche Gastgeber, ein sauberes, bequemes Zimmer und gute Verkehrsanbindung. Check-in und Check-out waren unkompliziert.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Ke",quote:"A friendly host and a pleasant stay.",quote_de:"Ein freundlicher Gastgeber und ein angenehmer Aufenthalt.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Imanol",quote:"Friendly and understanding hosting.",quote_de:"Freundliche und verständnisvolle Gastfreundschaft.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Anas",quote:"A great host and a well-located place that the guest recommends.",quote_de:"Ein toller Gastgeber und eine gut gelegene Unterkunft, die der Gast weiterempfiehlt.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Patricia",quote:"A friendly, accommodating host, with a cozy, clean room and a smooth stay.",quote_de:"Ein freundlicher, entgegenkommender Gastgeber, ein gemütliches, sauberes Zimmer und ein reibungsloser Aufenthalt.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Kai",quote:"Friendly hosting, a convenient location and good value for a budget-conscious traveler.",quote_de:"Freundliche Gastgeber, eine praktische Lage und eine gute Option für preisbewusste Reisende.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Josephin Alina",quote:"Everything went smoothly, and the guest would happily stay again.",quote_de:"Alles verlief problemlos, und der Gast würde gerne wiederkommen.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Abhiram",quote:"Comfortable, well-maintained accommodation with helpful hosts and a convenient location.",quote_de:"Bequeme, gepflegte Unterkunft mit hilfsbereiten Gastgebern und praktischer Lage.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Sophie",quote:"Welcoming and accommodating hosting, with a practical room for a short stay.",quote_de:"Herzlicher, zuvorkommender Gastgeber und ein praktisches Zimmer für einen kurzen Aufenthalt.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Alexander",quote:"A comfortable, clean space and an accommodating host, even when travel was delayed.",quote_de:"Eine gemütliche, saubere Unterkunft und ein zuvorkommender Gastgeber, auch bei verspäteter Anreise.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'},
    {author:"Dai",quote:"A comfortable room with excellent amenities, even during warm summer weather.",quote_de:"Ein bequemes Zimmer mit sehr guter Ausstattung, auch bei sommerlicher Wärme.",url:"https://www.airbnb.com/rooms/1621684668409633226",rating:5,kind:'summary'}
  ];
  const heroReviewSourceLanguage = (lang) => {
    const local = parseReviewEntries(rows.fhHeroReviews?.['text_'+lang]);
    if(local.length) return local;
    const other = parseReviewEntries(rows.fhHeroReviews?.[lang==='de'?'text_en':'text_de']);
    return other.length ? other : verifiedReviewExcerpts.map(item=>({
      ...item,
      quote:lang==='de'?item.quote_de:item.quote
    }));
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
    const lang=uiLang();
    const isSummary=item.kind==='summary';
    const nature=$('fhReviewNature');
    if(nature)nature.textContent=isSummary
      ? (lang==='de'?'Zusammenfassung der Airbnb-Bewertung':'Airbnb review summary')
      : (lang==='de'?'Airbnb-Gästebewertung':'Airbnb guest review');
    const stars=$('fhReviewStarRating');
    if(stars){
      const rating=Number(item.rating);
      const validRating=Number.isInteger(rating) && rating>=1 && rating<=5;
      stars.hidden=!validRating;
      if(validRating){
        $('fhReviewStarGlyphs').textContent='★'.repeat(rating)+'☆'.repeat(5-rating);
        $('fhReviewStarValue').textContent=rating+' / 5';
        stars.setAttribute('aria-label',lang==='de' ? rating+' von 5 Sternen' : rating+' out of 5 stars');
      }
    }
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
    document.querySelectorAll('[data-fh-time]').forEach(node=>{node.textContent=fieldValue(node.dataset.fhTime,lang);});
    renderGuide(lang);
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
    const hostBody=$('fhHostBody');
    if(hostBody){
      hostBody.replaceChildren();
      fieldValue('fhHostBody',lang).split(/\n\s*\n/).filter(text=>text.trim()).forEach(text=>{
        const paragraph=document.createElement('p');paragraph.textContent=text.trim();hostBody.append(paragraph);
      });
      $('fhHostInitial').textContent=Array.from(fieldValue('fhHostName',lang))[0]||'';
      const photo=$('fhHostPhoto'),source=hostPhotoUrl(fieldValue('fhHostPhoto','en'));
      photo.alt=fieldValue('fhHostName',lang);
      const defaultPhoto=source==='/assets/host-inura.jpg';
      photo.classList.toggle('fh-host-photo-default',defaultPhoto);
      if(defaultPhoto){photo.srcset='/assets/images/host-inura-200.webp 200w, /assets/images/host-inura-400.webp 400w';photo.sizes='100px';}
      else{photo.removeAttribute('srcset');photo.removeAttribute('sizes');}
      if(photo.getAttribute('src')!==source){photo.hidden=false;$('fhHostInitial').hidden=true;photo.src=source;}
      photo.onerror=()=>{photo.hidden=true;$('fhHostInitial').hidden=false;};
    }
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
    const whatsapp = $('fhWhatsappLink');
    if(whatsapp){
      const international = phone.replace(/[^+0-9]/g,'');
      const valid = /^\+[1-9][0-9]{6,14}$/.test(international);
      whatsapp.hidden = !valid;
      if(valid) whatsapp.href = 'https://wa.me/' + international.slice(1);
      else whatsapp.removeAttribute('href');
      whatsapp.setAttribute('aria-label',lang==='de'?'FrankiHolz über WhatsApp kontaktieren':'Message FrankiHolz on WhatsApp');
      whatsapp.title = lang==='de'?'Über WhatsApp schreiben':'Chat on WhatsApp';
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
  function renderGuide(lang) {
    const content=$('houseGuideContent');
    if(!content)return;
    content.lang=lang;content.replaceChildren();
    const dialog=$('houseGuideDialog');dialog.lang=lang;dialog.querySelectorAll('[data-fh-label]').forEach(node=>{node.textContent=labels[lang][node.dataset.fhLabel];});
    const checkIn=fieldValue('fhCheckIn',lang),checkOut=fieldValue('fhCheckOut',lang);
    document.querySelectorAll('[data-guide-lang]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.guideLang===lang));button.classList.toggle('active',button.dataset.guideLang===lang);});
    const appendSection=(title,items)=>{
      const section=document.createElement('section'),heading=document.createElement('h3'),list=document.createElement('ul');
      heading.textContent=title;
      items.forEach(text=>{const li=document.createElement('li');li.textContent=text;list.append(li);});
      section.append(heading,list);content.append(section);
    };
    const intro=document.createElement('p');intro.className='house-guide-welcome';
    intro.textContent=lang==='de'?'Schön, dass Sie bei uns sind. Mit ein wenig Rücksicht fühlen sich alle in unserem Zuhause wohl.':'We are happy to welcome you. A little care helps everyone feel at home.';
    content.append(intro);
    appendSection(lang==='de'?'Ihr Aufenthalt auf einen Blick':'Your stay at a glance',[
      'Check-in: '+checkIn+' · Check-out: '+checkOut,
      ...['fhQuietHours','fhExtraGuests','fhOtherRules'].map(key=>fieldValue(key,lang))
    ]);
    appendSection(lang==='de'?'Heizung & Raumtemperatur':'Heating & room temperature',[fieldValue('fhHeatingRule',lang)]);
    (window.FH_HOUSE_GUIDE?.[lang]||[]).forEach(section=>appendSection(section.title,section.items.map(text=>text.replace('11:00',checkOut))));
    const thanks=document.createElement('p');thanks.className='house-guide-welcome';
    thanks.textContent=lang==='de'?'Vielen Dank für Ihre Rücksicht. Wir wünschen Ihnen einen wunderbaren Aufenthalt!':'Thank you for your thoughtfulness. We wish you a wonderful stay!';content.append(thanks);
  }
  function renderAmenitiesEditor(root) {
    const section=document.createElement('section');section.id='amenitiesEditor';section.className='fh-field amenities-editor';
    const heading=document.createElement('h3');heading.textContent='Facilities & amenities';
    const help=document.createElement('p');help.className='field-help';help.textContent='Add an amenity with its English and German name. Keep at least one amenity. Save guest information to publish your changes.';
    const list=document.createElement('div');list.className='amenity-editor-list';
    const stores=['en','de'].map(lang=>{const input=document.createElement('textarea');input.id='fh-edit-fhFacilities-'+lang;input.hidden=true;section.append(input);return input;});
    const sync=()=>{stores.forEach((store,i)=>{store.value=[...list.children].map(row=>row.querySelectorAll('input')[i].value.trim()).join('\n');});list.querySelectorAll('button').forEach(button=>{button.disabled=list.children.length===1;});};
    function addRow(en='',de=''){
      const row=document.createElement('div');row.className='amenity-editor-row';
      [en,de].forEach((text,i)=>{const label=document.createElement('label');label.textContent=i?'Deutsch':'English';const input=document.createElement('input');input.value=text;input.placeholder=i?'z. B. Arbeitsplatz':'e.g. Dedicated workspace';input.addEventListener('input',sync);label.append(input);row.append(label);});
      const remove=document.createElement('button');remove.type='button';remove.className='btn ghost small';remove.textContent='Remove';remove.setAttribute('aria-label','Remove amenity');
      remove.onclick=()=>{const next=row.nextElementSibling||row.previousElementSibling;row.remove();sync();(next?.querySelector('input')||add).focus();};row.append(remove);list.append(row);sync();return row;
    }
    const add=document.createElement('button');add.type='button';add.className='btn secondary small';add.textContent='+ Add amenity';add.onclick=()=>addRow().querySelector('input').focus();
    section.prepend(heading,help);section.append(list,add);root.append(section);
    const en=fieldValue('fhFacilities','en').split(/\r?\n/),de=fieldValue('fhFacilities','de').split(/\r?\n/);
    for(let i=0;i<Math.max(en.length,de.length);i++)addRow(en[i]||'',de[i]||'');
  }
  function hostPhotoUrl(path){
    return /^host\/[a-z0-9-]+\.(?:jpg|png|webp)$/.test(path)?`${CFG.supabaseUrl}/storage/v1/object/public/${CFG.mediaBucket}/${path}`:'/assets/host-inura.jpg';
  }
  function renderHostPhotoEditor(root){
    const block=document.createElement('section');block.className='fh-field fh-host-photo-editor';
    block.innerHTML='<h3>Host avatar photo</h3><div class="fh-host-photo-controls"><div class="fh-host-avatar"><img id="fhHostPhotoPreview" alt="Current host avatar" width="100" height="100"></div><div><label for="fhHostPhotoFile">Choose a new photo</label><input id="fhHostPhotoFile" type="file" accept="image/jpeg,image/png,image/webp"><p class="field-help">JPG, PNG or WebP, up to 5 MB. A square portrait works best. Upload publishes the photo for both languages.</p><button type="button" class="btn secondary" id="fhUploadHostPhoto">Upload host photo</button><div id="fhHostPhotoStatus" role="status" aria-live="polite"></div></div></div>';
    root.append(block);
    const preview=$('fhHostPhotoPreview'),source=hostPhotoUrl(fieldValue('fhHostPhoto','en'));
    preview.src=source;preview.classList.toggle('fh-host-photo-default',source==='/assets/host-inura.jpg');
    $('fhUploadHostPhoto').onclick=uploadHostPhoto;
  }
  async function uploadHostPhoto(){
    const status=$('fhHostPhotoStatus'),button=$('fhUploadHostPhoto'),file=$('fhHostPhotoFile').files[0];
    const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    if(!file||!types[file.type]||file.size>5*1024*1024||!file.size){status.textContent='Choose a JPG, PNG or WebP photo up to 5 MB.';return;}
    button.disabled=true;status.textContent='Uploading…';
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session)throw new Error('Session expired. Please sign in again.');
      const {data:allowed,error:authError}=await sb.rpc('frankiholz_admin_access_check');
      if(authError||!allowed)throw new Error('Not authorized to change the host photo.');
      const path=`host/${crypto.randomUUID()}.${types[file.type]}`;
      const {error:uploadError}=await sb.storage.from(CFG.mediaBucket).upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
      if(uploadError)throw uploadError;
      const update={copy_key:'fhHostPhoto',label:'Host avatar photo',sort_order:490,text_en:path,text_de:path,updated_at:new Date().toISOString()};
      const {error:saveError}=await sb.from('frankiholz_copy').upsert([update],{onConflict:'copy_key'});
      if(saveError){await sb.storage.from(CFG.mediaBucket).remove([path]);throw saveError;}
      const {data:stored,error:readError}=await sb.from('frankiholz_copy').select('copy_key,text_en,text_de').in('copy_key',['fhHostPhoto']);
      const savedPhoto=stored?.find(row=>row.copy_key==='fhHostPhoto');
      if(readError||savedPhoto?.text_en!==path||savedPhoto?.text_de!==path)throw new Error('Photo save could not be verified. Reload to check before uploading again.');
      rows.fhHostPhoto=savedPhoto;const preview=$('fhHostPhotoPreview');preview.classList.remove('fh-host-photo-default');preview.src=hostPhotoUrl(path);
      $('fhHostPhotoFile').value='';status.textContent='Host photo saved and verified for both languages.';
    }catch(error){status.textContent=error.message||'Could not upload the host photo.';}finally{button.disabled=false;}
  }
  function renderAdmin() {
    const root=$('guestInfoEditor');
    if(!root)return;
    root.replaceChildren();
    fields.forEach(f=>{
      if(f.kind==='photo'){renderHostPhotoEditor(root);return;}
      if(f.key==='fhFacilities'){renderAmenitiesEditor(root);return;}
      const block=document.createElement('div');block.className='fh-field';
      const title=document.createElement('strong');title.textContent=f.label;
      block.appendChild(title);
      const grid=document.createElement('div');grid.className='bilingual-editor compact';
      ['en','de'].forEach(lang=>{
        const col=document.createElement('div'),label=document.createElement('label');
        label.textContent=lang==='en'?'English':'Deutsch';
        const control=document.createElement(f.kind==='input'?'input':'textarea');
        control.id='fh-edit-'+f.key+'-'+lang;label.htmlFor=control.id;
        if(f.kind!=='input')control.rows=f.key==='fhHostBody'?10:f.key==='fhAboutBody'?5:3;
        if(f.key==='fhAirbnbReviewsUrl')control.placeholder='https://www.airbnb.com/rooms/...';
        if(f.key==='fhHeroReviews'){
          control.placeholder='Guest name | Review text | https://www.airbnb.com/rooms/123456789 | 5';
          control.rows=7;
        }
        control.value=fieldValue(f.key,lang);
        col.append(label,control);grid.appendChild(col);
      });
      block.appendChild(grid);
      if(f.key==='fhHeroReviews'){
        const help=document.createElement('p');
        help.className='fh-admin-form-help';
        help.textContent='Optional: entries shown in the guest reviews slider. Use Guest name | Accurate review text | Public Airbnb listing URL | Star rating (1–5) on each line (max 12). The rating is optional if unknown. Do not invent reviews or ratings; check the original source.';
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
    if([...document.querySelectorAll('.amenity-editor-row input')].some(input=>!input.value.trim())){status.textContent='Please add both English and German names for every amenity, or remove the empty row.';return;}
    const updates=fields.filter(f=>f.kind!=='photo').map((f,i)=>({
      copy_key:f.key,label:f.label,sort_order:500+i*10,
      text_en:$('fh-edit-'+f.key+'-en').value.trim(),
      text_de:$('fh-edit-'+f.key+'-de').value.trim(),
      updated_at:new Date().toISOString()
    }));
    if(updates.some(r=>!byKey[r.copy_key].optional&&(!r.text_en||!r.text_de))){
      status.textContent='Please fill out all guest information in both languages.';return;
    }
    if(updates.filter(row=>['fhCheckIn','fhCheckOut'].includes(row.copy_key)).some(row=>[row.text_en,row.text_de].some(value=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)))){status.textContent='Please enter check-in and check-out as HH:MM (24-hour time) in both languages.';return;}
    const airbnb=updates.find(r=>r.copy_key==='fhAirbnbReviewsUrl');
    if(airbnb && [airbnb.text_en,airbnb.text_de].some(url=>url&&!validListingUrl(url))){
      status.textContent='The reviews link must be a valid HTTPS Airbnb listing URL.';return;
    }
    const reviewField=updates.find(r=>r.copy_key==='fhHeroReviews');
    if(reviewField){
      for(const [language,raw] of [['English',reviewField.text_en],['German',reviewField.text_de]]){
        const lines=raw.split(/\r?\n/).filter(line=>line.trim());
        if(lines.length>12 || lines.some(line=>{
          const parts=line.split('|').map(p=>p.trim());
          return ![3,4].includes(parts.length) || !parts[0] || !parts[1] || parts[0].length>70 || parts[1].length>650 || !validListingUrl(parts[2]) || (parts.length===4 && !/^[1-5]$/.test(parts[3]));
        })){
          status.textContent=language+' reviews: up to 12 lines of Name | Review | Public Airbnb URL | Optional star rating (1–5).';
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
    const guide=$('houseGuideDialog');
    if(guide){
      $('openHouseGuide').addEventListener('click',()=>{renderGuide(uiLang());guide.showModal();guide.querySelector('.house-guide-scroll').scrollTop=0;});
      $('closeHouseGuide').addEventListener('click',()=>guide.close());
      guide.addEventListener('close',()=>$('openHouseGuide').focus());
      document.querySelectorAll('[data-guide-lang]').forEach(button=>button.addEventListener('click',()=>{renderGuide(button.dataset.guideLang);guide.querySelector('.house-guide-scroll').scrollTop=0;}));
    }
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
    document.querySelectorAll('.lang-btn[data-lang]').forEach(btn=>btn.addEventListener('click',()=>{document.documentElement.lang=btn.dataset.lang;renderPublic();}));
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
  const loadMap=$('fhLoadMap');
  if(loadMap)loadMap.addEventListener('click',()=>{
    const frame=document.createElement('iframe');
    frame.title='FrankiHolz — Seehofstraße 20, Frankfurt am Main';
    frame.src='https://www.google.com/maps?q=Seehofstra%C3%9Fe%2020%2C%2060594%20Frankfurt%20am%20Main%2C%20Germany&output=embed';
    frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.allowFullscreen=true;
    $('fhMapTarget').replaceChildren(frame);
  },{once:true});
})();
