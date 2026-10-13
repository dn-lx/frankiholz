---
name: frontend-design
description: Guide intentional, production-quality frontend design for FrankiHolz while preserving project architecture, accessibility and brand constraints.
---

# Frontend Design — FrankiHolz

Use this skill for new screens, substantial UI changes, component redesigns or visual-system work. Do not invoke it for a tiny text correction or purely backend change.

## Before coding

1. Read the active page/component and existing styles before proposing a new visual direction.
2. State the user goal, information hierarchy, primary action and responsive behavior.
3. Reuse existing design tokens, spacing, typography and components where they are coherent.
4. Prefer one intentional design direction over a mixture of trendy patterns.
5. Keep accessibility, keyboard/focus behavior, touch targets and reduced-motion needs in scope.

## Project design direction

Keep a warm, premium hospitality direction with strong room imagery, calm spacing, readable booking information and clear trust signals. Preserve the existing FrankiHolz brand, German/English parity, accessibility and mobile booking usability. Do not trade booking clarity for decorative effects. Keep authorization/payment states visually explicit and distinct.

## Implementation rules

- Avoid generic AI-generated dashboard/card repetition when a simpler hierarchy works better.
- Do not introduce a framework, icon system, animation library or design-system dependency solely for appearance.
- Keep motion purposeful and subtle; core tasks must work without animation.
- Preserve user-visible states: loading, empty, validation, error, success, disabled and offline where relevant.
- When a design change touches business-critical interaction, verify the behavior before and after the visual change.
- Prefer semantic HTML/roles and existing accessible controls.
- For responsive work, check narrow mobile, ordinary desktop and any project-specific dense/admin layout.

## Verification

For affected UI, inspect the rendered page, console, responsive behavior and relevant interaction path. Use Playwright/browser automation when available. Include screenshots or a short visual note in the PR for meaningful redesigns.

This repository skill is inspired by the idea of deliberate, distinctive frontend design, but it is project-specific and does not override current product or security constraints.
## Canonical brand assets

Before implementing branded UI, read `.agents/skills/brand-assets/SKILL.md` and inspect `brand/`. Reuse approved repository logos/icons. Do not generate, redraw or approximate a brand mark when a canonical asset exists.

