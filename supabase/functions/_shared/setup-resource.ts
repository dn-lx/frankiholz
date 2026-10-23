import { releaseOperation } from './payment-operation.ts';

// stripe-node 22.4.0 distinguishes validation (400 InvalidRequestError) from
// idempotency conflicts, rate limits, transport errors and server failures.
// Only the known non-mutating validation rejection is safe to unlock here.
export async function createSetupResource(service: any, bookingId: string, token: string, create: () => Promise<any>) {
  try { return await create(); }
  catch (error: any) {
    if (error?.type === 'StripeInvalidRequestError' && error.statusCode === 400
      && error.headers?.['stripe-should-retry'] !== 'true') {
      await releaseOperation(service, bookingId, token);
    }
    throw error;
  }
}
