(()=>{
  const panelHost=document.querySelector('[data-admin-panel="integrations"]');
  if(!panelHost)return;

  const section=document.createElement('section');
  section.className='panel';
  section.style.marginBottom='20px';
  section.innerHTML=`
    <div class="section-heading" style="margin-bottom:14px">
      <div>
        <span class="section-kicker">Payments</span>
        <h2 style="margin:0;color:#17343d">Stripe payment environment</h2>
        <p class="lead" style="margin:6px 0 0">Choose whether new public booking requests use Stripe TEST or LIVE mode.</p>
      </div>
    </div>
    <div class="stripe-mode-control">
      <div class="stripe-mode-copy">
        <div class="stripe-mode-state-row">
          <span id="stripeModeLabel" class="stripe-mode-label">Loading…</span>
          <span id="stripeEnvironmentBadge" class="status">Loading…</span>
        </div>
        <div id="stripeModeDescription" class="muted">Checking Stripe configuration…</div>
        <div id="stripeConnectionSummary" class="stripe-connection-summary"></div>
      </div>
      <label class="stripe-toggle" aria-label="Switch Stripe payment environment">
        <span class="stripe-toggle-text">TEST</span>
        <input id="stripeEnvironmentToggle" type="checkbox" role="switch" aria-label="Stripe LIVE mode">
        <span class="stripe-toggle-track"><span class="stripe-toggle-thumb"></span></span>
        <span class="stripe-toggle-text">LIVE</span>
      </label>
    </div>
    <div id="stripeEnvironmentStatus"></div>
    <p class="muted" style="font-size:12px;margin:13px 0 0">Existing bookings keep the Stripe environment in which their card was authorized. This switch is visible only in FrankiHolz Admin.</p>
    <style>
      .stripe-mode-control{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:20px;border:1px solid #dce8e5;border-radius:20px;background:#f8fbfa}
      .stripe-mode-copy{min-width:0;flex:1}.stripe-mode-state-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}.stripe-mode-label{font-size:18px;font-weight:800;color:#17343d}.stripe-connection-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.stripe-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;flex:0 0 auto}.stripe-toggle input{position:absolute;opacity:0;pointer-events:none}.stripe-toggle-track{position:relative;width:62px;height:34px;border-radius:999px;background:#d9e4e2;box-shadow:inset 0 0 0 1px #cad9d6;transition:.2s ease}.stripe-toggle-thumb{position:absolute;width:26px;height:26px;left:4px;top:4px;border-radius:50%;background:#fff;box-shadow:0 2px 7px rgba(12,52,71,.22);transition:.2s ease}.stripe-toggle input:checked+.stripe-toggle-track{background:#0c3447}.stripe-toggle input:checked+.stripe-toggle-track .stripe-toggle-thumb{transform:translateX(28px)}.stripe-toggle input:focus-visible+.stripe-toggle-track{outline:3px solid rgba(20,169,165,.28);outline-offset:3px}.stripe-toggle input:disabled+.stripe-toggle-track{opacity:.55;cursor:not-allowed}.stripe-toggle-text{font-size:12px;font-weight:850;letter-spacing:.05em;color:#47636b}
      @media(max-width:700px){.stripe-mode-control{align-items:flex-start;flex-direction:column}.stripe-toggle{align-self:flex-start}}
    </style>`;
  panelHost.prepend(section);

  const badge=document.getElementById('stripeEnvironmentBadge');
  const modeLabel=document.getElementById('stripeModeLabel');
  const description=document.getElementById('stripeModeDescription');
  const connectionSummary=document.getElementById('stripeConnectionSummary');
  const toggle=document.getElementById('stripeEnvironmentToggle');
  const status=document.getElementById('stripeEnvironmentStatus');
  let state=null;
  let busy=false;

  const fmtDate=v=>v?new Date(v).toLocaleString():'Not yet verified';
  const connectionPill=(label,ready,verifiedAt)=>`<span class="status ${ready?'confirmed':'cancelled'}">${label}: ${ready?`Connected · ${fmtDate(verifiedAt)}`:'Not verified'}</span>`;

  function render(){
    if(!state)return;
    const isLive=state.environment==='live';
    toggle.checked=isLive;
    toggle.disabled=busy || (isLive ? !state.test_ready : !state.live_ready);
    modeLabel.textContent=isLive?'LIVE mode':'TEST mode';
    badge.textContent=isLive?'LIVE':'TEST';
    badge.className=`status ${isLive?'confirmed':''}`;
    badge.style.cssText=isLive?'background:#dff7e9;color:#17603b':'background:#fff3cd;color:#7a5a00';
    description.textContent=isLive
      ? 'Real card authorizations are active. Accepting a booking captures real money.'
      : 'Stripe test cards only. No real money is collected.';
    connectionSummary.innerHTML=
      connectionPill('LIVE',state.live_ready,state.live_verified_at)+
      connectionPill('TEST',state.test_ready,state.test_verified_at);
  }

  async function load(){
    status.innerHTML='';
    const {data,error}=await sb.rpc('frankiholz_get_payment_environment_state');
    if(error){status.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
    state=data?.[0]||null;
    render();
  }

  async function switchTo(target){
    if(!state||busy)return;
    if(target==='live'){
      const typed=window.prompt('LIVE mode uses real card authorizations and real money. Type LIVE to confirm.','');
      if(typed!=='LIVE'){render();return;}
    }
    busy=true;render();
    status.innerHTML=`<div class="notice">Switching Stripe to <b>${target.toUpperCase()}</b>…</div>`;
    const {data,error}=await sb.rpc('frankiholz_set_payment_environment',{p_environment:target});
    if(error){status.innerHTML=`<div class="notice">${esc(error.message)}</div>`;busy=false;await load();return}
    status.innerHTML=`<div class="notice success">Stripe is now using <b>${esc(String(data).toUpperCase())}</b> mode.</div>`;
    busy=false;
    await load();
  }

  toggle.addEventListener('change',()=>switchTo(toggle.checked?'live':'test'));

  const wait=()=>{
    if(document.getElementById('dashboard')?.hidden)return setTimeout(wait,250);
    load();
  };
  wait();
})();