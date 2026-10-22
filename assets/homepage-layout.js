/* Move existing homepage nodes; keep their IDs, state and event handlers. */
(() => {
  const sections = [
    ['fhReviewsBand','Guest reviews','Airbnb rating and guest feedback'],
    ['roomsSection','Rooms','Room photos, prices and availability links'],
    ['hostMessage','Message from your host','Host photo and personal welcome'],
    ['guestInfoPublic','Guest information','House rules, amenities, about us and contact'],
    ['bookingSection','Room details & booking','Appears when a guest chooses a room'],
    ['location','Location','Address, directions and map'],
    ['cancellationPolicy','Cancellation & payment policy','The existing booking and payment policy'],
    ['bookingStatusSection','Booking status','Booking and payment status lookup']
  ];
  const defaults = sections.map(([id]) => id), key = 'fhHomepageOrder';
  function parseOrder(raw) {
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) && value.length === defaults.length && new Set(value).size === defaults.length && value.every(id => defaults.includes(id)) ? value : null;
    } catch { return null; }
  }
  window.FrankiHolzLayout = {
    applyOrder(raw) {
      const main = document.querySelector('main');
      if (!document.getElementById('roomsSection') || !main) return;
      const nodes = (parseOrder(raw) || defaults).map(id => document.getElementById(id));
      if (nodes.every(node => node?.parentElement === main)) main.append(...nodes);
    }
  };

  const list = document.getElementById('homepageSectionOrder');
  if (!list) return;
  const status = document.getElementById('homepageLayoutStatus');
  const save = document.getElementById('saveHomepageLayout');
  const reset = document.getElementById('resetHomepageLayout');
  const reload = document.getElementById('reloadHomepageLayout');
  let order = [...defaults], saved = [...defaults], busy = true, loaded = false, loading = false, dragged = null;
  const dirty = () => JSON.stringify(order) !== JSON.stringify(saved);
  function render(focusId, action) {
    list.replaceChildren();
    order.forEach((id, index) => {
      const [,title,description] = sections.find(section => section[0] === id);
      const row = document.createElement('li');
      row.dataset.sectionId = id; row.draggable = !busy && loaded; row.tabIndex = -1;
      const grip = document.createElement('span'); grip.className = 'layout-grip'; grip.textContent = '⠿'; grip.setAttribute('aria-hidden','true');
      const position = document.createElement('span'); position.className = 'layout-position'; position.textContent = index + 1;
      const text = document.createElement('div'); text.className = 'layout-section-text';
      const name = document.createElement('strong'); name.textContent = title;
      const detail = document.createElement('span'); detail.textContent = description; text.append(name,detail);
      const controls = document.createElement('div'); controls.className = 'layout-move-controls';
      for (const [direction,label,symbol] of [[-1,'up','↑'],[1,'down','↓']]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn ghost small';
        button.textContent = symbol; button.dataset.move = label; button.setAttribute('aria-label',`Move ${title} ${label}`);
        button.disabled = busy || !loaded || index + direction < 0 || index + direction >= order.length;
        button.onclick = () => move(id,index + direction,label); controls.append(button);
      }
      row.append(grip,position,text,controls);
      row.ondragstart = event => {
        if (busy) { event.preventDefault(); return; }
        dragged = id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain',id); row.classList.add('layout-dragging');
      };
      row.ondragover = event => { if (!busy && dragged && dragged !== id) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; row.classList.add('layout-drop-target'); } };
      row.ondragleave = event => { if (!row.contains(event.relatedTarget)) row.classList.remove('layout-drop-target'); };
      row.ondrop = event => {
        event.preventDefault(); if (!busy && dragged && dragged !== id) move(dragged,order.indexOf(id));
        dragged = null;
      };
      row.ondragend = () => { dragged = null; list.querySelectorAll('li').forEach(item => item.classList.remove('layout-dragging','layout-drop-target')); };
      list.append(row);
    });
    save.disabled = busy || !loaded || !dirty(); reset.disabled = busy || !loaded; reload.disabled = busy;
    if (focusId) {
      const row = [...list.children].find(item => item.dataset.sectionId === focusId);
      const button = action && row?.querySelector(`[data-move="${action}"]`);
      (button && !button.disabled ? button : row)?.focus();
    }
  }
  function move(id, destination, action) {
    if (busy || !loaded || !order.includes(id) || destination < 0 || destination >= order.length) return;
    order.splice(order.indexOf(id),1); order.splice(destination,0,id); render(id,action);
    status.textContent = `${sections.find(section => section[0] === id)[1]} moved to position ${destination + 1} of ${order.length}. ${dirty() ? 'Unsaved changes.' : 'Matches the saved order.'}`;
  }
  async function authorized() {
    const {data:{session}} = await sb.auth.getSession();
    if (!session) throw new Error('Please sign in to edit the homepage order.');
    const {data:allowed,error} = await sb.rpc('frankiholz_admin_access_check');
    if (error || !allowed) throw new Error('Not authorized to edit the homepage order.');
  }
  async function load() {
    if (loading) return;
    loading = true; busy = true; render(); status.textContent = 'Loading section order…';
    try {
      await authorized();
      const {data,error} = await sb.from('frankiholz_copy').select('copy_key,text_en,text_de').eq('copy_key',key).maybeSingle();
      if (error) throw error;
      const parsed = parseOrder(data?.text_en), needsRepair = data && (!parsed || data.text_en !== data.text_de);
      order = parsed || [...defaults]; saved = needsRepair ? [] : [...order]; loaded = true;
      status.textContent = needsRepair ? 'Saved order needs updating. Check the order below and save to repair it for both languages.' : 'Order loaded. Drag sections or use the arrow buttons, then save.';
    } catch (error) { status.textContent = error.message || 'Could not load the homepage order. Use Reload saved order to retry.'; }
    finally { busy = false; loading = false; render(); }
  }
  save.onclick = async () => {
    if (busy || !loaded || !dirty()) return;
    busy = true; render(); status.textContent = 'Saving order…';
    const value = JSON.stringify(order);
    try {
      await authorized();
      const {error} = await sb.from('frankiholz_copy').upsert([{copy_key:key,label:'Homepage section order',text_en:value,text_de:value,sort_order:480,updated_at:new Date().toISOString()}],{onConflict:'copy_key'});
      if (error) throw error;
      const {data,error:readError} = await sb.from('frankiholz_copy').select('text_en,text_de').eq('copy_key',key).maybeSingle();
      if (readError || data?.text_en !== value || data?.text_de !== value) throw new Error('Save could not be verified. Reload the saved order to check.');
      saved = [...order]; status.textContent = 'Homepage order saved and verified. It applies to English and German.';
    } catch (error) { status.textContent = error.message || 'Could not save the homepage order.'; }
    finally { busy = false; render(); }
  };
  reset.onclick = () => { if (busy || !loaded) return; order = [...defaults]; render(); status.textContent = dirty() ? 'Default order restored. Save order to publish this change.' : 'Already using the default order.'; };
  reload.onclick = load;
  render();
  async function initialize() { if (!loaded && !loading) await load(); }
  sb.auth.onAuthStateChange((_event,session) => { if (session) setTimeout(initialize,0); });
  setTimeout(initialize,0);
})();
