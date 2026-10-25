function renderRooms(){
  $('roomEditors').innerHTML=rooms.map(r=>`
    <div class="room-editor-shell">
      <div class="room-editor-top">
        <div class="room-details-editor">
          <h3 style="margin-top:0">${esc(r.name)} / ${esc(r.name_de||'')}</h3>
          <div class="bilingual-editor compact">
            <div><span class="language-heading">English</span><label for="rn-${r.id}">Room name</label><input id="rn-${r.id}" value="${attr(r.name)}"><label for="rd-${r.id}">Description</label><textarea id="rd-${r.id}" rows="3">${esc(r.description||'')}</textarea></div>
            <div><span class="language-heading">Deutsch</span><label for="rnd-${r.id}">Zimmername</label><input id="rnd-${r.id}" value="${attr(r.name_de||'')}"><label for="rdd-${r.id}">Beschreibung</label><textarea id="rdd-${r.id}" rows="3">${esc(r.description_de||'')}</textarea></div>
          </div>
          <div class="form-grid">
            <div><label for="rp-${r.id}">Base price / night</label><input id="rp-${r.id}" type="number" min="0" step="0.01" value="${r.base_price}"></div>
            <div></div>
          </div>
          <div class="form-grid">
            <div><label for="rg-${r.id}">Max guests</label><input id="rg-${r.id}" type="number" min="1" value="${r.max_guests}"></div>
            <div><label for="ra-${r.id}">Visible to guests</label><select id="ra-${r.id}"><option value="true" ${r.active?'selected':''}>Active</option><option value="false" ${!r.active?'selected':''}>Hidden</option></select></div>
          </div>
          <button class="btn secondary" onclick="saveRoom('${r.id}')" style="margin-top:10px">Save room details</button>
        </div>
        <div class="room-photos-editor">
          <h4>Room photos</h4>
          <label style="margin-top:0" for="rf-${r.id}">Upload room photos</label>
          <input id="rf-${r.id}" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif">
          <button class="btn" onclick="uploadRoomImages('${r.id}')" style="margin-top:10px">Upload photos</button>
          <div id="ri-${r.id}" class="image-admin-grid" style="margin-top:12px">
            ${roomImages(r.id).map(im=>`<div class="image-tile"><img src="${publicUrl(im.storage_path)}" alt="Room photo"><div class="actions"><button class="btn danger small" onclick="deleteRoomImage('${im.id}','${js(im.storage_path)}')">Delete</button></div></div>`).join('')||'<div class="empty">No uploaded photos yet.</div>'}
          </div>
        </div>
      </div>

      <div class="room-admin-calendar">
        <div class="section-heading room-calendar-heading"><h4>Availability</h4><button class="btn ghost small room-sync-button" onclick="syncAirbnb('${r.id}')">Sync this room’s Airbnb calendar</button></div>
        <div class="calendar-toolbar">
          <button class="btn ghost small" onclick="moveRoomMonth('${r.id}',-1)">‹ Previous</button>
          <strong id="rc-title-${r.id}">Calendar</strong>
          <button class="btn ghost small" onclick="moveRoomMonth('${r.id}',1)">Next ›</button>
        </div>
        <div id="rc-${r.id}" class="calendar"></div>
        <div class="calendar-status-legend">
          <span class="legend-chip"><i class="la"></i> Available</span>
          <span class="legend-chip"><i class="lb"></i> Blocked</span>
          <span class="legend-chip"><i class="lc"></i> Booked</span>
          <span class="legend-chip"><i class="lo"></i> Airbnb blocked · available here</span>
        </div>
        <p id="rc-sync-${r.id}" class="muted calendar-source-summary" role="status"></p>
        <div class="range-manager">
          <div class="range-summary">
            <span><b>Selected range</b></span>
            <span id="rc-range-${r.id}">Select a start date and an end date</span>
          </div>
          <div class="form-grid">
            <div><label for="rc-price-${r.id}">Price override (optional)</label><input id="rc-price-${r.id}" type="number" min="0" step="0.01" placeholder="Keep existing price"></div>
            <div><label for="rc-note-${r.id}">Admin note (optional)</label><input id="rc-note-${r.id}" placeholder="Maintenance, owner stay, etc."></div>
          </div>
          <div class="range-actions">
            <button class="btn available-action small" onclick="applyRoomRange('${r.id}','available')">✓ Make available</button>
            <button class="btn blocked-action small" onclick="applyRoomRange('${r.id}','blocked')">— Block range</button>
            <button class="btn booked-action small" onclick="applyRoomRange('${r.id}','booked')">● Mark booked</button>
          </div>
          <div class="airbnb-range-controls">
            <strong>Airbnb availability</strong>
            <p class="muted">Make imported Airbnb-blocked dates available here, preserving confirmed reservations. Overrides survive sync. Follow Airbnb again removes manual availability overrides in the selected range. Airbnb itself is unchanged.</p>
            <div class="range-actions">
              <button class="btn available-action small" onclick="applyAirbnbRange('${r.id}',true)">Airbnb blocked · make available here</button>
              <button class="btn ghost small" onclick="applyAirbnbRange('${r.id}',false)">Follow Airbnb again</button>
            </div>
          </div>
          <div id="rc-status-${r.id}"></div>
        </div>
      </div>
      <div id="rs-${r.id}"></div>
    </div>
  `).join('')
}

window.saveRoom=async id=>{
  const payload={
    name:$(`rn-${id}`).value.trim(),
    description:$(`rd-${id}`).value.trim(),
    name_de:$(`rnd-${id}`).value.trim(),
    description_de:$(`rdd-${id}`).value.trim(),
    base_price:Number($(`rp-${id}`).value),
    max_guests:Number($(`rg-${id}`).value),
    active:$(`ra-${id}`).value==='true',
    updated_at:new Date().toISOString()
  };
  if(!payload.name||!payload.name_de||!payload.description||!payload.description_de){
    roomMsg(id,'Please provide room names and descriptions in both languages.');return;
  }
  const {data:saved,error}=await sb.from('frankiholz_rooms').update(payload).eq('id',id)
    .select('id,name,name_de,description,description_de').maybeSingle();
  if(error||!saved){
    roomMsg(id,error?.message||'No room row was updated. Please check admin permissions and try again.');return;
  }
  if(saved.description!==payload.description||saved.description_de!==payload.description_de){
    roomMsg(id,'The saved descriptions did not match the submitted text. Please try again.');return;
  }
  await loadAll();
  roomMsg(id,'Room descriptions saved and verified.',true);
};

window.uploadRoomImages=async id=>{
  const inp=$(`rf-${id}`),files=[...inp.files];
  if(!files.length)return roomMsg(id,'Choose one or more images first.');
  const room=rooms.find(r=>r.id===id);
  for(const f of files){
    const path=`rooms/${room.slug}/${crypto.randomUUID()}-${safeName(f.name)}`;
    const {error:ue}=await sb.storage.from(CFG.mediaBucket).upload(path,f,{upsert:false,contentType:f.type,cacheControl:'3600'});
    if(ue){roomMsg(id,ue.message);return}
    const {error:ie}=await sb.from('frankiholz_room_images').insert({room_id:id,storage_path:path,sort_order:roomImages(id).length});
    if(ie){await sb.storage.from(CFG.mediaBucket).remove([path]);roomMsg(id,ie.message);return}
  }
  roomMsg(id,'Photo upload complete.',true);
  await loadAll()
};

window.deleteRoomImage=async(id,path)=>{
  const {error:se}=await sb.storage.from(CFG.mediaBucket).remove([path]);
  if(se){alert(se.message);return}
  const {error}=await sb.from('frankiholz_room_images').delete().eq('id',id);
  if(error){alert(error.message);return}
  await loadAll()
};

function roomMsg(id,t,ok=false){
  $(`rs-${id}`).innerHTML=`<div class="notice ${ok?'success':''}">${esc(t)}</div>`
}

