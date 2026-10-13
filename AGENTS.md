# FrankiHolz agent guidance

## Scope and branches

- Start by checking the current branch and working-tree changes. Preserve work that belongs to the user.
- This agent-tooling setup is authorized on `develop` only. Do not modify, merge into, or push `main`, deploy production, or change live services as part of it. Older deployment documents do not override this scope.
- For subsequent work, start from `develop` unless the user explicitly gives another branch instruction. A development frontend can still use the shared production Supabase backend; branch isolation does not isolate data, payments, or email.

## Repository skills

- Read [.agents/skills/frankiholz/SKILL.md](.agents/skills/frankiholz/SKILL.md) for the app structure, source-order caveats, and booking boundaries before changing this project.
- Use [.agents/skills/graphify/SKILL.md](.agents/skills/graphify/SKILL.md) when a local code graph would help trace dependencies. Verify graph findings against the current source, especially dynamically loaded scripts and remote RPCs.

## Coding simplicity (Ponytail-style)

- Make the smallest complete change that solves the requested problem. Keep the static HTML, CSS, and browser JavaScript architecture unless a migration is explicitly requested.
- Reuse the existing data access, translation, escaping, and UI helpers. Introduce a helper only when it removes real repetition or makes a complex operation clearer.
- Avoid new frameworks, dependencies, abstraction layers, configurable systems, and speculative fallback paths for a one-off need.
- Trace script order and the final event handler before editing a booking or admin flow. Do not add another override layer to hide an existing one.
- Keep unrelated formatting and refactors out of the change. Explain an existing conflict rather than silently choosing a different product rule.
- Simplicity must preserve admin authorization, server-owned payment decisions, guest-data handling, and German/English behavior.

## Verification

- Run `git diff --check` and inspect the final diff. Validate changed skill frontmatter and links for documentation/tooling work.
- For JavaScript changes, syntax-check affected files and verify the affected page and its script sequence. There is no package manifest or existing automated test suite in this checkout; do not claim an npm build or end-to-end payment test passed.
- Use mocked/offline checks where possible. Only exercise shared backend writes, real booking actions, payment decisions, or email delivery when the task explicitly authorizes them.
- Report exact files, checks performed, and pre-existing blockers. Keep generated analysis and local environments out of version control.

## FrankiFlow Projects shared agent stack

This repository belongs to the **FrankiFlow Projects** family. See [PROJECT-FAMILY.md](PROJECT-FAMILY.md) for the shared architecture and [docs/AGENT-ORCHESTRATION.md](docs/AGENT-ORCHESTRATION.md) for Planner → Executor → Reviewer routing.

Use these repository-local skills when relevant:

- [Context7 policy](.agents/skills/context7/SKILL.md) for current third-party API/SDK documentation.
- [Frontend Design](.agents/skills/frontend-design/SKILL.md) for substantial UI/design work.
- [Headroom pilot](.agents/skills/headroom-pilot/SKILL.md) only when large repetitive context is a measurable bottleneck; do not use compressed context as the sole evidence for high-risk logic.
- [Release Readiness](.agents/skills/release-readiness/SKILL.md) before a `develop` to `main` release review.
- [Security Boundary Review](.agents/skills/security-boundary-review/SKILL.md) for authentication, Supabase, storage or guest-data changes.
- [Payment Flow Review](.agents/skills/payment-flow-review/SKILL.md) for Stripe and booking-payment state changes.
- [Email Safety Review](.agents/skills/email-safety-review/SKILL.md) for transactional email changes.

The agentic stack status is tracked in [docs/AGENTIC-STACK-STATUS.md](docs/AGENTIC-STACK-STATUS.md). Current source, tests and accepted ADRs override agent memory, compressed context or stale graph output.

- [Brand Assets](.agents/skills/brand-assets/SKILL.md) is mandatory for logos/icons/documents; reuse repo assets and never generate a replacement mark when an approved asset exists.

## Mandatory release workflow

Before creating or merging a PR, preparing a production release, applying a hotfix, changing deployment rules, or touching `main`, read and follow [Release Workflow](.agents/skills/release-workflow/SKILL.md).

The production rule is strict: **only this repository's `develop` branch may merge into `main`**, and `develop → main` requires the `production-approved` label plus the repository's required checks. Feature, fix, and chore branches merge into `develop`, never directly into `main`.

## Testing and security efficiency

Before changing CI, adding tests, reviewing release readiness, or choosing test scope, read and follow [Quality Gates](.agents/skills/quality-gates/SKILL.md). Use fast cross-browser/security checks for ordinary PRs and reserve the heavier mobile/release matrix for `develop → main`.

## Universal agent continuity

At the start of a new coding-agent session, read [Project Memory](docs/PROJECT-MEMORY.md) and [Current Handoff](docs/CURRENT-HANDOFF.md) after this file. Read [Agent Platform Workflows](docs/AGENT-PLATFORM-WORKFLOWS.md) for ChatGPT/Codex, Claude Code, Gemini CLI, GitHub Copilot, Cursor, Cline, Roo Code, Windsurf/Devin Desktop and OpenCode. Read [MCP and Connector Setup](docs/MCP-SETUP.md) before using external systems.

`AGENTS.md` remains the canonical shared instruction source. Platform adapter files such as `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md` must stay thin and must not redefine product or release rules.

Before ending unfinished work, or after a material decision/external side effect, update `docs/CURRENT-HANDOFF.md` so the next agent can continue without relying on private chat/session memory.


## Agent Project Starter parity

FrankiHolz keeps its booking/payment/email-specific rules and stronger CI while adopting the reusable Agent Project Starter operating model.

- Read [MCP / Connector Usage](.agents/skills/mcp-usage/SKILL.md) before external-system work; verify the exact account/project/environment with a harmless read before writes.
- Read [Memory and Context Efficiency](.agents/skills/memory-context/SKILL.md) and [Memory / Context Policy](docs/MEMORY-CONTEXT-POLICY.md) before broad repository/context loading.
- Use [Model Routing Policy](docs/MODEL-ROUTING-POLICY.md) to choose agents by capability and risk rather than hard-coding one provider/model.
- Payment, guest-data, email, auth, secret and release changes require deterministic checks plus the applicable specialist skill and an independent capable review when practical.
- Run `node scripts/validate-agent-stack.mjs` when changing agent infrastructure and keep the Agent stack validation workflow green.
- [Project Bootstrap](.agents/skills/project-bootstrap/SKILL.md) and [New Project Bootstrap Checklist](docs/PROJECT-BOOTSTRAP-CHECKLIST.md) are for creating future projects, not routine FrankiHolz feature work.
- Reusable templates live under `docs/templates/`; the real FrankiHolz skill, Payment Flow Review and Email Safety Review remain authoritative for domain-specific work.

The starter-only placeholder project skill is intentionally not copied because this repository already has a real project-specific skill.
