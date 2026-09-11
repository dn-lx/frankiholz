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
        <p class="lead" style="margin:6px 0 0">Choose which Stripe environment new public booking requests use. Existing bookings keep the environment in which their card was authorized.</p>
      </div>
      <div id="stripeEnvironmentBadge" class="status">Loading…</div>
    </div>
    <div id="stripeEnvironmentBanner" class="notice" style="margin-bottom:14px"></div>
    <div class="form-grid">
      <div class="panel" style="margin:0;padding:16px">
        <strong>LIVE MODE</strong>
        <p class="muted" style="margin:7px 0 12px">Real card authorizations. Accepting a booking captures real money.</p>
        <div id="stripeLiveConnection" class="status">Checking…</div>
        <button id="useStripeLive" class="btn secondary" type="button" style="margin-top:12px">Use LIVE mode</button>
      </div>
      <div class="panel" style="margin:0;padding:16px">
        <strong>TEST MODE</strong>
        <p class="muted" style="margin:7px 0 12px">Stripe test cards only. No real money is collected.</p>
        <div id="stripeTestConnection" class="status">Checking…</div>
        <button id="useStripeTest" class="btn ghost" type="button" style="margin-top:12px">Use TEST mode</button>
      </div>
    </div>
    <p class="muted" style="font-size:12px;margin:13px 0 0">This control is visible only in FrankiHolz Admin. The public booking page does not display a LIVE/TEST switch.</p>
    <div id="stripeEnvironmentStatus"></div>`;
  panelHost.prepend(section);

  const badge=document.getElementById('stripeEnvironmentBadge');
  const banner=document.getElementById('stripeEnvironmentBanner');
  const liveStatus=document.getElementById('stripeLiveConnection');
  const testStatus=document.getElementById('stripeTestConnection');
  const liveBtn=document.getElementById('useStripeLive');
  const testBtn=document.getElementById('useStripeTest');
  const status=document.getElementById('stripeEnvironmentStatus');
  let state=null;

  const fmtDate=v=>v?new Date(v).toLocaleString():'Not yet verified';
  function render(){
    if(!state)return;
    const isLive=state.environment==='live';
    badge.textContent=isLive?'LIVE MODE':'TEST MODE';
    badge.className=`status ${isLive?'confirmed':''}`;
    badge.style.cssText=isLive?'background:#dff7e9;color:#17603b':'background:#fff3cd;color:#7a5a00';
    banner.className=`notice ${isLive?'success':''}`;
    banner.innerHTML=isLive
      ? '<b>LIVE Stripe is active.</b> New guests authorize real cards and an accepted booking captures real money.'
      : '<b>TEST Stripe is active.</b> New bookings use Stripe test mode and no real money is collected.';
    liveStatus.textContent=state.live_ready?`Connected · verified ${fmtDate(state.live_verified_at)}`:'Not verified';
    testStatus.textContent=state.test_ready?`Connected · verified ${fmtDate(state.test_verified_at)}`:'Verification required';
    liveStatus.className=`status ${state.live_ready?'confirmed':'cancelled'}`;
    testStatus.className=`status ${state.test_ready?'confirmed':'cancelled'}`;
    liveBtn.disabled=isLive||!state.live_ready;
    testBtn.disabled=!isLive||!state.test_ready;
    liveBtn.textContent=isLive?'LIVE mode active':'Use LIVE mode';
    testBtn.textContent=!isLive?'TEST mode active':(state.test_ready?'Use TEST mode':'TEST verification required');
  }

  async function load(){
    status.innerHTML='';
    const {data,error}=await sb.rpc('frankiholz_get_payment_environment_state');
    if(error){status.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
    state=data?.[0]||null;
    render();
  }

  async function switchTo(target){
    if(!state)return;
    const word=target==='live'?'LIVE':'TEST';
    const warning=target==='live'
      ? 'LIVE mode uses real card authorizations and real money. Type LIVE to confirm.'
      : 'TEST mode stops real payment collection for new bookings. Type TEST to confirm.';
    const typed=window.prompt(warning,'');
    if(typed!==word)return;
    liveBtn.disabled=true;testBtn.disabled=true;
    status.innerHTML='<div class="notice">Updating Stripe payment environment…</div>';
    const {data,error}=await sb.rpc('frankiholz_set_payment_environment',{p_environment:target});
    if(error){status.innerHTML=`<div class="notice">${esc(error.message)}</div>`;await load();return}
    status.innerHTML=`<div class="notice success">Payment environment changed to <b>${esc(String(data).toUpperCase())}</b>.</div>`;
    await load();
  }

  liveBtn.addEventListener('click',()=>switchTo('live'));
  testBtn.addEventListener('click',()=>switchTo('test'));

  const wait=()=>{
    if(document.getElementById('dashboard')?.hidden)return setTimeout(wait,250);
    load();
  };
  wait();
})();
