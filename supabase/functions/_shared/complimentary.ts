import { claimOperation, releaseOperation } from './payment-operation.ts';

export function isComplimentary(b: any) {
  return b.payment_collection_mode === 'complimentary' && b.payment_status === 'not_required'
    && b.payment_schedule_version === 'v2_14_day' && Number(b.total_price) === 0
    && b.promo_discount_percent === 100 && b.promo_code === 'FrankFlowGuest100';
}

export async function closeComplimentary(service: any, booking: any, eventType = 'booking_cancelled') {
  if (!isComplimentary(booking)) throw new Error('Invalid complimentary booking');
  const operation = await claimOperation(service, booking.id, 'cancel');
  try {
    const { error } = await service.rpc('frankiholz_close_complimentary_booking', {
      p_booking_id: booking.id, p_operation_token: operation.token, p_event_type: eventType,
    });
    if (error) throw error;
  } finally {
    await releaseOperation(service, booking.id, operation.token);
  }
}
