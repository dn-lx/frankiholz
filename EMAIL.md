# FrankiHolz guest email setup

FrankiHolz guest-email automation is implemented server-side through the Supabase Edge Function **`frankiholz-guest-email`**.

## Sending identity

- Sending domain: `frankiflow.de`
- From: `FrankiHolz <stay@frankiflow.de>`
- Reply-To: `info@frankiflow.de`
- Internal/admin booking notifications: `info@frankiflow.de`

All FrankiHolz-originated lifecycle email uses `stay@frankiflow.de` as the sender. Guest confirmations continue to go to the guest's email address. Internal booking notifications go to `info@frankiflow.de`, with the guest address used as Reply-To where appropriate.

The sender and internal recipient are intentionally fixed in the server-side email function so an outdated environment variable cannot silently revert FrankiHolz to another mailbox.

## Provider configuration

1. Keep the verified `frankiflow.de` sending domain configured in Resend.
2. Keep the Resend production API key in Supabase Edge Function secrets; never put it in GitHub or browser code.
3. Do **not** replace existing FrankiFlow DNS records unless the email provider explicitly requires a verified change.

Required server secret:

```text
RESEND_API_KEY=<Resend production key>
```

The sender identity and Reply-To are defined by `frankiholz-guest-email` as `stay@frankiflow.de` and `info@frankiflow.de`.

## Implemented email events

1. **Booking request received** — the public booking flow triggers the email after a valid booking request is created.
2. **Payment method saved / authorization updates** — payment flows trigger the matching guest lifecycle email.
3. **Booking confirmed / rejected / cancelled** — FrankiHolz Admin triggers the corresponding lifecycle email.
4. **Payment confirmed / failed** — Stripe webhook or scheduled charge flow triggers the corresponding lifecycle email.

All templates use `frankiholz_bookings.language`, so a German booking receives German email and an English booking receives English email.

## Duplicate protection

`public.frankiholz_email_events` records successfully sent lifecycle messages. A unique booking/event rule prevents accidental duplicate lifecycle emails when a button is retried or Stripe re-delivers an event.

## Security

The Resend API key stays exclusively in Supabase Edge Function secrets. Browser JavaScript never sees the provider key. Public request-received email calls must match the new booking reference and guest email and come from an allowed FrankiHolz origin; administrative lifecycle emails require an authenticated FrankiHolz admin or trusted internal service call; payment-confirmation email is triggered internally by the Stripe/webhook workflow.
