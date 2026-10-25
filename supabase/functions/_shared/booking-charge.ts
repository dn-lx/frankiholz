import { claimOperation, releaseOperation } from './payment-operation.ts';
// Used by host confirmation, the scheduler and non-refundable cancellation.
// Reuse the same PaymentIntent across these entry points; a bank debit can remain
// processing for days and must never trigger another charge or a failure email.
export async function chargeBooking(service: any, stripe: any, booking: any) {
  const { booking: b, token } = await claimOperation(service, booking.id, 'charge');
  const amount = Math.round(Number(b.total_price) * 100);
  if (!Number.isSafeInteger(amount) || amount < 50 || !b.stripe_customer_id || !b.stripe_payment_method_id) {
    await service.from('frankiholz_bookings').update({payment_status:'failed'}).eq('id',b.id).eq('payment_operation_token',token);
    await releaseOperation(service,b.id,token);
    throw new Error('Booking amount or saved payment method is invalid');
  }
  let pi;
  try { pi = b.stripe_payment_intent_id
    ? await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id)
    : await stripe.paymentIntents.create({
        amount, currency: 'eur', customer: b.stripe_customer_id,
        payment_method: b.stripe_payment_method_id, off_session: true, confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        excluded_payment_method_types: ['paypal'],
        description: `FrankiHolz ${b.reference}`,
        metadata: { booking_id: b.id, reference: b.reference, frankiholz_mode: b.payment_mode, payment_schedule_version: 'v2_14_day' },
      }, { idempotencyKey: `fh-v2-charge-${b.payment_mode}-${b.id}-${b.stripe_setup_intent_id || 'legacy'}` });
  } catch(error:any) {
    const rejected=error?.payment_intent;
    if(rejected?.id&&rejected.status==="requires_payment_method"){
      await service.from('frankiholz_bookings').update({payment_status:'failed',stripe_payment_intent_id:rejected.id}).eq('id',b.id).eq('payment_operation_token',token).neq('payment_status','paid');
      await releaseOperation(service,b.id,token);
      throw new Error('Payment requires customer attention');
    }
    throw new Error('Payment outcome needs reconciliation; please contact FrankiHolz');
  }
  const customer = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id;
  if (pi.metadata?.booking_id !== b.id || pi.amount !== amount || pi.currency !== 'eur' || customer !== b.stripe_customer_id) {
    throw new Error('Payment does not match booking');
  }
  const paid = pi.status === 'succeeded';
  const processing = pi.status === 'processing';
  const { error: saveError } = await service.from('frankiholz_bookings').update({
    stripe_payment_intent_id: pi.id,
    payment_status: paid ? 'paid' : processing ? 'processing' : 'failed',
    ...(paid ? { paid_at: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', b.id).eq('status','confirmed').eq('payment_operation_token',token).in('payment_status', ['processing', 'failed']);
  if (saveError) throw saveError;
  await releaseOperation(service,b.id,token);
  if (!paid && !processing) throw new Error('Payment requires customer attention');
  return pi;
}
