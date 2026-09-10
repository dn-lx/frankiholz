# FrankiHolz guest email setup

FrankiHolz guest-email automation is implemented server-side through the Supabase Edge Function **`frankiholz-guest-email`**. It is intentionally inactive until the Resend production credentials are added to Supabase secrets.

## Sending identity

- Sending subdomain: `mail.frankiflow.de`
- From: `FrankiHolz <booking@mail.frankiflow.de>`
- Reply-To: `info@frankiflow.de`

Using a dedicated sending subdomain keeps transactional mail separate from the existing normal mailbox configuration.

## One-time activation

1. Create/sign in to Resend.
2. Add the domain `mail.frankiflow.de`.
3. Add only the DNS records Resend supplies in IONOS.
4. Do **not** delete or replace the existing FrankiFlow MX/SPF/DKIM/DMARC records or Netlify web records.
5. Wait until Resend shows the sending domain as verified.
6. Create a Resend API key for FrankiHolz production.
7. Store the following directly in Supabase Edge Function secrets; never put them in GitHub, browser code, or chat:

```text
RESEND_API_KEY=<Resend production key>
FRANKIHOLZ_EMAIL_FROM=FrankiHolz <booking@mail.frankiflow.de>
FRANKIHOLZ_EMAIL_REPLY_TO=info@frankiflow.de
```

No frontend redesign is required after these secrets are added.

## Implemented email events

1. **Booking request received** — the public booking flow triggers the email after a valid booking request is created.
2. **Booking approved / payment requested** — FrankiHolz Admin triggers the email after Stripe Checkout has been created. The message includes the secure payment link and payment deadline.
3. **Booking rejected / cancelled** — FrankiHolz Admin triggers the email after the request/payment hold has been cancelled.
4. **Payment confirmed** — `frankiholz-stripe-webhook` triggers the email only after Stripe confirms successful payment.

All templates use `frankiholz_bookings.language`, so a German booking receives German email and an English booking receives English email.

## Duplicate protection

`public.frankiholz_email_events` records successfully sent lifecycle messages. A unique booking/event rule prevents accidental duplicate lifecycle emails when a button is retried or Stripe re-delivers an event.

## Security

The Resend API key stays exclusively in Supabase Edge Function secrets. Browser JavaScript never sees the provider key. Public request-received email calls must match the new booking reference and guest email and come from an allowed FrankiHolz origin; approval/rejection emails require an authenticated FrankiHolz admin; payment-confirmation email is triggered internally by the Stripe webhook.
