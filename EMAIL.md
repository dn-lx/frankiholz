# FrankiHolz guest email setup

FrankiHolz should use a transactional email provider from Supabase Edge Functions. **Resend** is the recommended setup for this project.

## Recommended sending identity

- Sending subdomain: `mail.frankiflow.de`
- From: `FrankiHolz <booking@mail.frankiflow.de>`
- Reply-To: `info@frankiflow.de`

Using a dedicated sending subdomain keeps transactional mail separate from the existing normal mailbox configuration.

## One-time setup

1. Create/sign in to Resend.
2. Add the domain `mail.frankiflow.de`.
3. Add only the DNS records Resend supplies in IONOS.
4. Do **not** delete or replace the existing FrankiFlow MX/SPF/DKIM/DMARC records or Netlify web records.
5. Wait until Resend shows the sending domain as verified.
6. Create a Resend API key for FrankiHolz production.
7. Store the following directly in Supabase Edge Function secrets; never put them in GitHub or browser code:

```text
RESEND_API_KEY=<Resend production key>
FRANKIHOLZ_EMAIL_FROM=FrankiHolz <booking@mail.frankiflow.de>
FRANKIHOLZ_EMAIL_REPLY_TO=info@frankiflow.de
```

## Email events

The recommended guest flow is:

1. **Booking request received** — sent immediately after a valid request is created. Include booking reference, room, check-in/out, estimated amount and status-link instructions.
2. **Booking approved / payment requested** — sent when admin approves the request and Stripe Checkout is created. Include the secure payment URL and payment deadline.
3. **Booking rejected / cancelled** — sent when admin rejects or cancels the request.
4. **Payment confirmed** — sent only after the Stripe webhook confirms successful payment. Include the booking reference, room, dates, paid amount and FrankiHolz address.

All templates should use `frankiholz_bookings.language` so a German booking receives German email and an English booking receives English email.

## Security

Never send email directly from browser JavaScript with a provider API key. Email must be sent from a Supabase Edge Function or another trusted server-side function.
