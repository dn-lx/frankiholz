(()=>{
  const q=new URLSearchParams(location.search).get('lang');
  const stored=localStorage.getItem('frankiholz-lang');
  const wanted=(q==='en'||q==='de')?q:((stored==='en'||stored==='de')?stored:null);
  if(wanted&&typeof currentLang!=='undefined'&&currentLang!==wanted){currentLang=wanted;applyLanguage();}

  const repairBrandLogo=()=>{
    const img=document.querySelector('.brand-logo-image');
    if(!img||img.dataset.logoFallbackApplied==='1')return;
    const fallback='https://drive.google.com/thumbnail?id=1QF0Hhrxdan6fk5lOv9XSVQ8427Xq-M7y&sz=w1000';
    const applyFallback=()=>{
      if(img.dataset.logoFallbackApplied==='1')return;
      img.dataset.logoFallbackApplied='1';
      img.style.visibility='hidden';
      const show=()=>{img.style.visibility='visible';img.removeEventListener('load',show)};
      img.addEventListener('load',show);
      img.src=fallback;
    };
    img.addEventListener('error',applyFallback,{once:true});
    if(img.complete&&img.naturalWidth===0)applyFallback();
  };

  repairBrandLogo();
  requestAnimationFrame(repairBrandLogo);
})();
