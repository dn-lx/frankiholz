// Keep the native select as the source of truth and no-JavaScript fallback.
(()=>{
  const select=document.getElementById('roomSelect');
  if(!select)return;
  const label=document.querySelector('label[for="roomSelect"]');
  const picker=document.createElement('div');picker.className='room-picker';
  picker.innerHTML='<button type="button" class="room-picker-trigger" id="roomPickerButton" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="roomPickerList"><span id="roomPickerValue"></span><span class="room-picker-chevron" aria-hidden="true"></span></button><div class="room-picker-list" id="roomPickerList" role="listbox" hidden></div>';
  select.after(picker);select.hidden=true;
  label.id='roomPickerLabel';label.htmlFor='roomPickerButton';
  const trigger=picker.querySelector('button'),list=picker.querySelector('[role=listbox]'),value=picker.querySelector('#roomPickerValue');
  trigger.setAttribute('aria-labelledby','roomPickerLabel roomPickerValue');
  list.setAttribute('aria-labelledby','roomPickerLabel');
  let active=0,search='',searchTimer;
  const options=()=>[...select.options];
  function highlight(index){
    active=Math.max(0,Math.min(index,options().length-1));
    list.querySelectorAll('[role=option]').forEach((node,i)=>node.classList.toggle('is-active',i===active));
    if(!list.hidden){trigger.setAttribute('aria-activedescendant','room-choice-'+active);list.children[active]?.scrollIntoView({block:'nearest'});}
  }
  function close(){list.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');}
  function render(){
    value.textContent=select.selectedOptions[0]?.textContent||'';
    trigger.disabled=!options().length;
    list.innerHTML=options().map((option,i)=>{
      const room=rooms.find(r=>r.id===option.value),image=room&&cover(room);
      const detail=room?`${tr('upTo')} ${room.max_guests} ${room.max_guests===1?tr('guestSingular'):tr('guestPlural')} · ${money(room.base_price)} ${tr('night')}`:'';
      return `<div class="room-picker-option" role="option" id="room-choice-${i}" data-index="${i}" aria-selected="${option.selected}">${image?`<img src="${escapeHtml(image)}" alt="">`:'<span class="room-picker-number" aria-hidden="true">'+(i+1)+'</span>'}<span><strong>${escapeHtml(option.textContent)}</strong><small>${escapeHtml(detail)}</small></span><span class="room-picker-check" aria-hidden="true">${option.selected?'✓':''}</span></div>`;
    }).join('');
    highlight(Math.max(0,select.selectedIndex));
  }
  function open(){render();if(trigger.disabled)return;list.hidden=false;trigger.setAttribute('aria-expanded','true');highlight(select.selectedIndex);}
  function choose(){const option=options()[active];if(!option)return;select.value=option.value;close();render();select.dispatchEvent(new Event('change',{bubbles:true}));}
  trigger.addEventListener('click',()=>list.hidden?open():close());
  // Keep combobox focus until the option click has completed.
  list.addEventListener('mousedown',event=>event.preventDefault());
  list.addEventListener('click',event=>{const option=event.target.closest('[data-index]');if(option){active=Number(option.dataset.index);choose();}});
  trigger.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key==='Tab'){close();return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();const wasClosed=list.hidden;if(wasClosed)open();
      highlight(event.key==='Home'?0:event.key==='End'?options().length-1:wasClosed?select.selectedIndex:active+(event.key==='ArrowDown'?1:-1));return;
    }
    if(event.key==='Enter'||event.key===' '){event.preventDefault();if(list.hidden)open();else choose();return;}
    if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      if(list.hidden)open();clearTimeout(searchTimer);search+=event.key.toLocaleLowerCase();
      const index=options().findIndex(option=>option.textContent.toLocaleLowerCase().startsWith(search));if(index>=0)highlight(index);
      searchTimer=setTimeout(()=>search='',700);
    }
  });
  document.addEventListener('click',event=>{if(!picker.contains(event.target))close();});
  picker.addEventListener('focusout',event=>{if(!picker.contains(event.relatedTarget))close();});
  select.addEventListener('change',render);select.addEventListener('roomselectionchange',render);
  new MutationObserver(()=>{close();render();}).observe(select,{childList:true,subtree:true,characterData:true});
  render();
})();
