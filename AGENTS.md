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

The agentic stack status is tracked in [docs/AGENTIC-STACK-STATUS.md](docs/AGENTIC-STACK-STATUS.md). Current source, tests and accepted ADRs override agent memory, compressed context or stale graph output.

- [Brand Assets](.agents/skills/brand-assets/SKILL.md) is mandatory for logos/icons/documents; reuse repo assets and never generate a replacement mark when an approved asset exists.

## Mandatory release workflow

Before creating or merging a PR, preparing a production release, applying a hotfix, changing deployment rules, or touching `main`, read and follow [Release Workflow](.agents/skills/release-workflow/SKILL.md).

The production rule is strict: **only this repository's `develop` branch may merge into `main`**, and `develop → main` requires the `production-approved` label plus the repository's required checks. Feature, fix, and chore branches merge into `develop`, never directly into `main`.

## Testing and security efficiency

Before changing CI, adding tests, reviewing release readiness, or choosing test scope, read and follow [Quality Gates](.agents/skills/quality-gates/SKILL.md). Use fast cross-browser/security checks for ordinary PRs and reserve the heavier mobile/release matrix for `develop → main`.

## Engineering integrations

Use [Engineering Integrations](docs/ENGINEERING-INTEGRATIONS.md) as the current inventory for coding, testing, security, deployment and observability tools. Prefer active integrations listed there; do not reintroduce retired scaffolds without a concrete requirement.
