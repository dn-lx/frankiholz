export async function claimOperation(service: any, bookingId: string, operation: string) {
  const { data, error } = await service.rpc('frankiholz_claim_payment_operation', {
    p_booking_id: bookingId, p_operation: operation,
  });
  if (error || !data?.token) throw new Error(error?.message || 'Another payment operation is in progress');
  return data;
}

export async function releaseOperation(service: any, bookingId: string, token: string) {
  const { error } = await service.from('frankiholz_bookings').update({
    payment_operation_token: null, payment_operation_started_at: null,
  }).eq('id', bookingId).eq('payment_operation_token', token);
  if (error) throw error;
}
