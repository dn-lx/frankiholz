---
name: headroom-pilot
description: Define the controlled Headroom context-compression pilot for FrankiHolz. Use only for large, repetitive context where exact raw source is not the primary safety boundary.
---

# Headroom Pilot — FrankiHolz

Headroom is an **optional agent-host optimization**, not an application/runtime dependency. The repository records the policy; installation/configuration lives in the coding environment (for example Cursor, Codex or another MCP-capable host).

Official references: https://docs.headroomlabs.ai/docs/mcp and https://docs.headroomlabs.ai/docs/proxy

## Good pilot use cases

- large repetitive logs or CI output,
- long search results,
- broad repository discovery,
- generated documentation or repetitive tool payloads,
- large Graphify/query output after the important source paths are known.

## Do not default to compressed context for

booking/payment state machines, Stripe authorization/capture logic, admin authorization, guest-data handling, migrations, or exact RPC/Edge Function contracts.

For those tasks, inspect the original source/contracts and tests directly. Compression may support navigation, but it must not become the only evidence.

## Pilot success metrics

For comparable large tasks, record whether Headroom changes:

- context/token volume,
- time to a correct implementation plan,
- number of agent retries,
- number of source rereads,
- CI/review corrections,
- factual or contract mistakes caused by missing detail.

Keep the pilot only if it reduces cost/context or time **without increasing rework or missed facts**.

## Operating rule

1. Start with normal repository navigation.
2. Use Headroom only when context size/repetition is a real bottleneck.
3. Retrieve/read the original source before changing high-risk logic.
4. If compressed context conflicts with source/tests/ADRs, source/tests/ADRs win.
5. Do not commit Headroom caches, compression stores or local configuration containing secrets.
