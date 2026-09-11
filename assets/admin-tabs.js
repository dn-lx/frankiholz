(()=>{
  const tabs=[...document.querySelectorAll('[data-admin-tab]')];
  const panels=[...document.querySelectorAll('[data-admin-panel]')];
  if(!tabs.length||!panels.length)return;

  const valid=new Set(tabs.map(t=>t.dataset.adminTab));
  const initial=(location.hash||'').replace('#','');
  const saved=sessionStorage.getItem('frankiholz-admin-tab');
  const fallback='bookings';
  const start=valid.has(initial)?initial:(valid.has(saved)?saved:fallback);

  function activate(name,updateHash=true){
    if(!valid.has(name))name=fallback;
    tabs.forEach(tab=>{
      const on=tab.dataset.adminTab===name;
      tab.classList.toggle('active',on);
      tab.setAttribute('aria-selected',on?'true':'false');
      tab.tabIndex=on?0:-1;
    });
    panels.forEach(panel=>{
      const on=panel.dataset.adminPanel===name;
      panel.hidden=!on;
      panel.classList.toggle('tab-visible',on);
    });
    sessionStorage.setItem('frankiholz-admin-tab',name);
    if(updateHash&&history.replaceState)history.replaceState(null,'',`#${name}`);
    const active=tabs.find(t=>t.dataset.adminTab===name);
    active?.scrollIntoView({block:'nearest',inline:'nearest'});
  }

  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(tab.dataset.adminTab));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      let next=index;
      if(event.key==='ArrowRight')next=(index+1)%tabs.length;
      if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=tabs.length-1;
      tabs[next].focus();
      activate(tabs[next].dataset.adminTab);
    });
  });
  window.addEventListener('hashchange',()=>{
    const name=location.hash.replace('#','');
    if(valid.has(name))activate(name,false);
  });
  activate(start,false);
  if(!document.querySelector('script[data-frankiholz-admin-authorization]')){
    const s=document.createElement('script');
    s.src='/assets/admin-authorization-flow.js?v=20260911-auth2';
    s.dataset.frankiholzAdminAuthorization='1';
    document.body.appendChild(s);
  }
})();
