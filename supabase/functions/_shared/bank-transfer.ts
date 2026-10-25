import { claimOperation, releaseOperation } from './payment-operation.ts';

// Each booking has its own Stripe customer. Partial/excess/late transfers stay
// attached to that booking for reconciliation, including after cancellation.
export async function openBankTransfer(service: any, stripe: any, booking: any, mode: string) {
  if (booking.status !== 'pending' || booking.stripe_payment_method_id) throw new Error('This request cannot start a bank transfer');
  if (booking.payment_operation_token) throw new Error('Payment operation needs reconciliation; please contact FrankiHolz');
  if (['paid','processing','refunded'].includes(booking.payment_status)) throw new Error('A payment already exists');
  if (booking.stripe_payment_intent_id) {
    if (booking.payment_collection_mode !== 'bank_transfer' || booking.payment_mode !== mode) throw new Error('Payment environment mismatch');
    const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
    return transferResult(pi, booking);
  }
  const {data:environment,error:environmentError}=await service.rpc('frankiholz_get_payment_environment');
  if(environmentError||environment!==mode)throw new Error('Payment environment changed; please contact FrankiHolz');
  const {data:estimate,error:estimateError}=await service.rpc('frankiholz_estimate_total',{p_room_id:booking.room_id,p_check_in:booking.check_in,p_check_out:booking.check_out});
  if(estimateError||!estimate?.[0]?.available)throw new Error('Those dates are no longer available');
  const {booking: claimed, token} = await claimOperation(service, booking.id, 'setup');
  const {data:pricedTotal,error:priceError}=await service.rpc('frankiholz_prepare_collection_total',{
    p_booking_id:claimed.id,p_operation_token:token,p_collection_mode:'bank_transfer',
  });
  if(priceError||!Number.isFinite(Number(pricedTotal)))throw priceError||new Error('Payment amount unavailable');
  const b={...claimed,total_price:Number(pricedTotal)};
  const amount = Math.round(Number(b.total_price) * 100);
  if (!Number.isSafeInteger(amount) || amount < 50) {
    await releaseOperation(service,b.id,token);
    throw new Error('Booking total must be at least EUR 0.50');
  }
  if(b.stripe_checkout_session_id){
    const previous=await stripe.checkout.sessions.retrieve(b.stripe_checkout_session_id);
    if(previous.status==='open')await stripe.checkout.sessions.expire(previous.id);
    else if(previous.status!=='expired')throw new Error('Previous payment setup needs reconciliation; please contact FrankiHolz');
  }
  const customer = b.stripe_customer_id || (await stripe.customers.create({
    email:b.guest_email,name:b.guest_name,
    metadata:{booking_id:b.id,reference:b.reference,frankiholz_mode:mode},
  },{idempotencyKey:`fh-bank-customer-${mode}-${b.id}`})).id;
  const {error: customerError}=await service.from('frankiholz_bookings').update({
    stripe_customer_id:customer,payment_collection_mode:'bank_transfer',payment_mode:mode,
    payment_status:'awaiting_payment',charge_due_at:null,
  }).eq('id',b.id).eq('payment_operation_token',token);
  if(customerError)throw customerError;
  const pi=await stripe.paymentIntents.create({
    amount,currency:'eur',customer,confirm:true,
    automatic_payment_methods:{enabled:true,allow_redirects:'never'},
    payment_method_data:{type:'customer_balance'},
    payment_method_options:{customer_balance:{funding_type:'bank_transfer',bank_transfer:{type:'eu_bank_transfer',eu_bank_transfer:{country:'DE'}}}},
    description:`FrankiHolz ${b.reference}`,
    metadata:{booking_id:b.id,reference:b.reference,frankiholz_mode:mode,payment_schedule_version:'v2_14_day',payment_collection_mode:'bank_transfer'},
  },{idempotencyKey:`fh-bank-transfer-${mode}-${b.id}`});
  const result=transferResult(pi,{...b,stripe_customer_id:customer,payment_mode:mode});
  const {error}=await service.from('frankiholz_bookings').update({
    stripe_payment_intent_id:pi.id,stripe_checkout_url:result.checkout_url,
    stripe_checkout_session_id:null,payment_due_at:null,
    payment_status:pi.status==='succeeded'?'paid':'awaiting_payment',
    ...(pi.status==='succeeded'?{paid_at:new Date().toISOString()}:{}),updated_at:new Date().toISOString(),
  }).eq('id',b.id).eq('payment_operation_token',token).neq('payment_status','paid');
  if(error)throw error;
  await releaseOperation(service,b.id,token);
  return result;
}

function transferResult(pi:any,b:any){
  const customer=typeof pi.customer==='string'?pi.customer:pi.customer?.id;
  if(pi.metadata?.booking_id!==b.id||pi.currency!=='eur'||pi.amount!==Math.round(Number(b.total_price)*100)||customer!==b.stripe_customer_id)throw new Error('Transfer does not match booking');
  const url=pi.next_action?.display_bank_transfer_instructions?.hosted_instructions_url;
  if(pi.status!=='succeeded'&&(!url||!/^https:\/\/[^/]+\.stripe\.com\//.test(url)))throw new Error('Bank instructions unavailable; please check booking status');
  return {checkout_url:url||null,reference:b.reference,bank_transfer:true,payment_status:pi.status==='succeeded'?'paid':'awaiting_payment'};
}
