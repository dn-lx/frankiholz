// Progressive enhancement: native values and required validation remain authoritative.
(()=>{
  const copy={en:{select:'Select an option',required:'Please select an option.',guestSex:'Sex',guestReturning:'Have you stayed with us before?',guestCount:'Guests',female:'Female',male:'Male',non_binary:'Non-binary',other:'Other',prefer_not_to_say:'Prefer not to say',yes:'Yes',no:'No'},de:{select:'Bitte auswählen',required:'Bitte wählen Sie eine Option.',guestSex:'Geschlecht',guestReturning:'Waren Sie schon einmal bei uns?',guestCount:'Gäste',female:'Weiblich',male:'Männlich',non_binary:'Nichtbinär',other:'Andere Angabe',prefer_not_to_say:'Keine Angabe',yes:'Ja',no:'Nein'}};
  const widgets=[];
  for(const id of ['guestSex','guestReturning','guestCount']){
    const native=document.getElementById(id),label=document.querySelector(`label[for="${id}"]`);
    if(!native||!label)continue;
    const wrap=document.createElement('div');wrap.className='booking-select';native.before(wrap);wrap.append(native);
    native.classList.add('booking-select-native');native.tabIndex=-1;native.setAttribute('aria-hidden','true');
    const trigger=document.createElement('button');trigger.type='button';trigger.id=id+'Choice';trigger.className='booking-select-trigger';
    trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
    const value=document.createElement('span');value.id=id+'Value';trigger.append(value);
    const arrow=document.createElement('span');arrow.className='booking-select-arrow';arrow.setAttribute('aria-hidden','true');trigger.append(arrow);
    const list=document.createElement('div');list.id=id+'Options';list.className='booking-select-options';list.setAttribute('role','listbox');list.hidden=true;
    const error=document.createElement('p');error.id=id+'Error';error.className='booking-select-error';error.hidden=true;error.setAttribute('aria-live','polite');
    label.id=id+'Label';trigger.setAttribute('aria-labelledby',label.id+' '+value.id);trigger.setAttribute('aria-controls',list.id);trigger.setAttribute('aria-describedby',error.id);trigger.setAttribute('aria-required',String(native.required));list.setAttribute('aria-labelledby',label.id);
    // Retain the native label association; label activation focuses the visible control.
    label.addEventListener('click',e=>{e.preventDefault();trigger.focus();});
    native.addEventListener('focus',()=>trigger.focus());
    wrap.append(trigger,list,error);
    let active=0,search='',timer;
    const options=()=>[...native.options].filter(o=>o.value!==''&&!o.disabled);
    const words=()=>copy[document.documentElement.lang==='de'?'de':'en'];
    function close(){search='';clearTimeout(timer);list.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');}
    function highlight(index){active=Math.max(0,Math.min(index,options().length-1));[...list.children].forEach((n,i)=>n.classList.toggle('is-active',i===active));if(!list.hidden&&list.children[active]){trigger.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'});}}
    function render(){
      const c=words();label.textContent=c[id];value.textContent=native.value?(c[native.value]||native.selectedOptions[0]?.textContent):c.select;
      trigger.classList.toggle('is-placeholder',!native.value);trigger.disabled=native.disabled||!options().length;
      error.textContent=c.required;list.replaceChildren();
      options().forEach((o,i)=>{const item=document.createElement('div');item.id=id+'Option'+i;item.dataset.index=String(i);item.className='booking-select-option';item.setAttribute('role','option');item.setAttribute('aria-selected',String(o.selected));const text=document.createElement('span');text.textContent=c[o.value]||o.textContent;const tick=document.createElement('span');tick.setAttribute('aria-hidden','true');tick.textContent=o.selected?'✓':'';item.append(text,tick);list.append(item);});
      highlight(Math.max(0,options().findIndex(o=>o.selected)));
    }
    function open(){widgets.forEach(w=>w.close());render();if(trigger.disabled)return;const box=trigger.getBoundingClientRect(),viewport=window.visualViewport,top=viewport?.offsetTop||0,bottom=top+(viewport?.height||innerHeight),above=Math.max(0,box.top-top-16),below=Math.max(0,bottom-box.bottom-16),up=below<260&&above>below;list.style.maxHeight=Math.min(260,up?above:below)+'px';list.style.top=up?'auto':(trigger.offsetTop+trigger.offsetHeight+7)+'px';list.style.bottom=up?(wrap.offsetHeight-trigger.offsetTop+7)+'px':'auto';list.hidden=false;trigger.setAttribute('aria-expanded','true');highlight(active);}
    function choose(){const option=options()[active];if(!option)return;native.value=option.value;close();native.dispatchEvent(new Event('change',{bubbles:true}));}
    trigger.addEventListener('click',()=>list.hidden?open():close());
    list.addEventListener('mousedown',e=>e.preventDefault());list.addEventListener('click',e=>{const item=e.target.closest('[data-index]');if(item){active=Number(item.dataset.index);choose();}});
    trigger.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key==='Tab'){close();return;}
      if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const closed=list.hidden;if(closed)open();highlight(e.key==='Home'?0:e.key==='End'?options().length-1:closed?active:active+(e.key==='ArrowDown'?1:-1));return;}
      if(e.key==='Enter'||e.key===' '){e.preventDefault();list.hidden?open():choose();return;}
      if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(list.hidden)open();clearTimeout(timer);search+=e.key.toLocaleLowerCase();const i=options().findIndex(o=>(words()[o.value]||o.textContent).toLocaleLowerCase().startsWith(search));if(i>=0)highlight(i);timer=setTimeout(()=>search='',700);}
    });
    native.addEventListener('change',()=>{error.hidden=true;trigger.removeAttribute('aria-invalid');render();});
    native.addEventListener('invalid',e=>{e.preventDefault();error.hidden=false;trigger.setAttribute('aria-invalid','true');queueMicrotask(()=>{if(native.form?.querySelector('input:invalid,select:invalid,textarea:invalid')===native)trigger.focus();});});
    native.form?.addEventListener('reset',()=>queueMicrotask(()=>{close();error.hidden=true;trigger.removeAttribute('aria-invalid');render();}));
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))close();});wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))close();});
    new MutationObserver(()=>{close();render();}).observe(native,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled']});
    widgets.push({close,render});render();
  }
  new MutationObserver(()=>widgets.forEach(w=>{w.close();w.render();})).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
