(async()=>{try{const {data,error}=await sb.from('frankiholz_copy').select('copy_key,text_en,text_de').order('sort_order');if(error)throw error;(data||[]).forEach(r=>{if(Object.prototype.hasOwnProperty.call(T.en,r.copy_key)&&r.text_en)T.en[r.copy_key]=r.text_en;if(Object.prototype.hasOwnProperty.call(T.de,r.copy_key)&&r.text_de)T.de[r.copy_key]=r.text_de;});applyLanguage();}catch(err){console.warn('Could not load editable FrankiHolz wording',err);}})();

(()=>{
  const NAVY='#07233b';
  const logo=document.querySelector('.site-nav .brand-logo-image');
  if(logo){
    logo.src='https://drive.google.com/uc?export=view&id=1QOYz56VWSgNg7Lq2imtze-Lb7xLoGOOS';
    logo.alt='FrankiHolz';
  }

  if(document.querySelector('#frankiholz-navy-header-theme'))return;
  const style=document.createElement('style');
  style.id='frankiholz-navy-header-theme';
  style.textContent=`
    .site-nav{
      background:${NAVY}!important;
      border-color:rgba(255,255,255,.16)!important;
      box-shadow:0 14px 40px rgba(2,15,27,.24)!important;
    }
    .site-nav .brand-logo-frame{
      background:${NAVY}!important;
      border-color:${NAVY}!important;
      box-shadow:none!important;
      overflow:hidden!important;
    }
    .site-nav .brand-logo-image{
      width:100%!important;
      height:100%!important;
      object-fit:contain!important;
      display:block!important;
    }
    .site-nav .nav-link{color:#fff!important}
    .site-nav .lang-switch{background:rgba(255,255,255,.12)!important;border-color:rgba(255,255,255,.18)!important}
    .site-nav .lang-btn{color:#fff!important}
    .site-nav .lang-btn.active{background:#fff!important;color:${NAVY}!important}
  `;
  document.head.append(style);
})();
