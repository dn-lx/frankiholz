const closureEvents = new Set(['booking_cancelled', 'booking_rejected', 'authorization_expired']);

// The event belongs to the closing operation, not whichever endpoint is retried.
// Historical closed records without an origin need owner review, not a guessed email.
export async function notifyClosedBooking(service: any, bookingId: string, url: string, serviceRole: string, send = fetch) {
  const { data: booking, error } = await service.from('frankiholz_bookings')
    .select('id,status,payment_status,payment_mode,closure_notification_event').eq('id', bookingId).maybeSingle();
  if (error) throw error;
  if (!booking) throw new Error('Closed booking notification is unavailable. Please retry the same request.');
  if (booking.status !== 'cancelled') throw new Error('Booking closure was not completed. Please contact FrankiHolz.');
  if (!closureEvents.has(booking.closure_notification_event)) return { booking, notified: false };
  const response = await send(`${url}/functions/v1/frankiholz-guest-email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRole}` },
    body: JSON.stringify({ event_type: booking.closure_notification_event, booking_id: booking.id }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Booking is closed, but its notification was not accepted. Please retry the same request.');
  return { booking, notified: true };
}
