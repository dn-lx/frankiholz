export async function cancelTransfer(stripe:any,b:any,refundPaid:boolean){
  if(!b.stripe_payment_intent_id)throw new Error('Bank transfer requires owner reconciliation');
  const pi=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
  const customer=typeof pi.customer==='string'?pi.customer:pi.customer?.id;
  if(pi.metadata?.booking_id!==b.id||customer!==b.stripe_customer_id||pi.currency!=='eur'||pi.amount!==Math.round(Number(b.total_price)*100))throw new Error('Transfer does not match booking');
  if(pi.status==='processing')throw new Error('Transfer is processing; wait for settlement before cancelling');
  if(pi.status==='succeeded'){
    if(!refundPaid)return {payment_status:'paid',refund_review_required:false,stripe_refund_id:null};
    const refund=await stripe.refunds.create({payment_intent:pi.id,metadata:{booking_id:b.id,reference:b.reference,reason:'bank_booking_cancelled'}},{idempotencyKey:`fh-bank-refund-${b.payment_mode}-${b.id}`});
    // Pending/refund details requested by Stripe remain visible for owner review.
    return {payment_status:refund.status==='succeeded'?'refunded':'paid',refund_review_required:refund.status!=='succeeded',stripe_refund_id:refund.id};
  }
  if(pi.status!=='canceled')await stripe.paymentIntents.cancel(pi.id);
  // Cancelling the PI returns any partial funding to this customer's cash
  // balance. Issued bank details remain usable, so retain the booking/audit and
  // require owner review for partial, excess or late customer-balance funds.
  return {payment_status:'released',refund_review_required:false,stripe_refund_id:null};
}
