(()=>{
  const q=new URLSearchParams(location.search).get('lang');
  const stored=localStorage.getItem('frankiholz-lang');
  const wanted=(q==='en'||q==='de')?q:((stored==='en'||stored==='de')?stored:null);
  if(wanted&&typeof currentLang!=='undefined'&&currentLang!==wanted){currentLang=wanted;applyLanguage();}

  const repairBrandLogo=()=>{
    const img=document.querySelector('.brand-logo-image');
    if(!img||img.dataset.logoFallbackApplied==='1')return;
    const fallback='/assets/frankiholz-logo-for-dark.png?v=20260918b';
    const applyFallback=()=>{
      if(img.dataset.logoFallbackApplied==='1')return;
      img.dataset.logoFallbackApplied='1';
      img.src=fallback;
    };
    img.addEventListener('error',applyFallback,{once:true});
    if(img.complete&&img.naturalWidth===0)applyFallback();
  };

  repairBrandLogo();
  requestAnimationFrame(repairBrandLogo);
})();
