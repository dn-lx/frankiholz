(()=>{
  const TEST_FN='frankiholz-create-payment-test';
  let injecting=false;

  function badge(status){
    const s=String(status||'not_started').replaceAll('_',' ');
    const ok=status==='paid';
    const bad=status==='failed'||status==='expired';
    return `<span class="status ${ok?'confirmed':bad?'cancelled':''}">TEST: ${esc(s)}</span>`;
  }

  async function createTestPayment(id,button){
    if(button){button.disabled=true;button.textContent='Creating TEST checkout…'}
    try{
      const {data:{session}}=await sb.auth.getSession();
      if(!session)throw new Error('Admin session expired. Please sign in again.');
      const res=await fetch(`${CFG.supabaseUrl}/functions/v1/${TEST_FN}`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':CFG.supabaseKey},
        body:JSON.stringify({booking_id:id})
      });
      const out=await res.json();
      if(!res.ok)throw new Error(out.error||'Could not create Stripe TEST payment');
      if(out.checkout_url)window.open(out.checkout_url,'_blank','noopener');
      setTimeout(injectStripeTestControls,350);
    }catch(e){alert(e.message||String(e));}
    finally{if(button){button.disabled=false;button.textContent='Create TEST payment'}}
  }
  window.createStripeTestPayment=(id,button)=>createTestPayment(id,button);

  async function injectStripeTestControls(){
    if(injecting)return;
    const host=document.getElementById('bookings');
    if(!host||!host.children.length)return;
    injecting=true;
    try{
      if(!document.getElementById('stripeSandboxNotice')){
        const notice=document.createElement('div');
        notice.id='stripeSandboxNotice';
        notice.className='notice';
        notice.style.marginBottom='12px';
        notice.innerHTML='<b>Stripe Sandbox</b> · TEST payments use the FrankiHolz sandbox account. They do not change the real booking status, do not block dates and do not charge real money.';
        host.parentElement?.insertBefore(notice,host);
      }

      const {data,error}=await sb.from('frankiholz_bookings')
        .select('id,reference,status,test_payment_status,test_payment_due_at,stripe_test_checkout_url')
        .order('created_at',{ascending:false});
      if(error)throw error;

      for(const b of data||[]){
        const row=[...host.querySelectorAll('.booking-row')].find(el=>el.textContent.includes(b.reference));
        if(!row||row.querySelector('.stripe-test-controls'))continue;
        const box=document.createElement('div');
        box.className='stripe-test-controls';
        box.style.cssText='margin-top:10px;padding-top:10px;border-top:1px dashed rgba(22,73,88,.22);display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        const st=b.test_payment_status||'not_started';
        const due=b.test_payment_due_at?` · due ${new Date(b.test_payment_due_at).toLocaleString()}`:'';
        let action='';
        if(st==='awaiting_payment'&&b.stripe_test_checkout_url){
          action=`<a class="btn small ghost" href="${b.stripe_test_checkout_url}" target="_blank" rel="noopener">Open TEST checkout</a>`;
        }else if(st!=='paid'&&b.status!=='cancelled'){
          action=`<button class="btn small ghost" type="button" data-test-booking="${b.id}">Create TEST payment</button>`;
        }
        box.innerHTML=`${badge(st)}<span class="muted">Sandbox only${due}</span>${action}`;
        const btn=box.querySelector('[data-test-booking]');
        if(btn)btn.addEventListener('click',()=>createTestPayment(b.id,btn));
        row.appendChild(box);
      }
    }catch(e){console.warn('Stripe sandbox controls could not be loaded',e)}
    finally{injecting=false}
  }

  const watch=()=>{
    const host=document.getElementById('bookings');
    if(!host)return setTimeout(watch,250);
    const mo=new MutationObserver(()=>setTimeout(injectStripeTestControls,0));
    mo.observe(host,{childList:true,subtree:false});
    injectStripeTestControls();
  };
  watch();
})();
