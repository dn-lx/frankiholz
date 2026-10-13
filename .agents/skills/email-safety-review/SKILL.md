---
name: email-safety-review
description: Review FrankiHolz transactional email changes for privacy, validation, retries, duplicate delivery and safe rendering.
---

# Email safety review

- Trace who can trigger each message and which booking authorizes it.
- Keep provider keys and sending decisions server-side.
- Escape user-controlled content and validate every recipient.
- Avoid logging guest addresses, notes, tokens or full message bodies.
- Verify retry and idempotency behavior so callbacks do not send duplicates.
- Test with provider sandbox or mocked delivery; never send to real guests during routine validation.
