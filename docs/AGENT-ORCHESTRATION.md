# Agent Orchestration

This project uses **capability roles**, not hard-coded model names. Model/product names change; the role contract should remain stable.

## 1. Planner / Architect

Use a high-reasoning model/agent for ambiguous, cross-module, architectural, migration, security/privacy or product-contract work.

Deliverable before execution:
- problem statement and assumptions,
- affected files/services/contracts,
- risk class,
- implementation sequence,
- tests/verification required,
- rollback or compatibility note for risky changes.

Planner normally does **not** merge code.

## 2. Executor / Implementer

Use a coding-capable agent optimized for repository edits and test execution. It receives the plan, reads current source and Agent Skills, and makes the smallest complete change on a feature/develop branch.

Required handoff:
- exact files changed,
- tests/checks run,
- known limitations,
- any deviation from the plan and why.

## 3. Reviewer / Test & Security

Use a fresh, independent high-reasoning reviewer whenever possible. It must not assume the implementation is correct because another agent produced it.

Review in this order:
1. requirement/contract correctness,
2. security/privacy/authorization,
3. regression and edge cases,
4. test adequacy,
5. simplicity/maintainability,
6. UI/accessibility when relevant.

Sensitive changes should not use the exact same agent/session as both sole author and sole approver.

## 4. Fast Utility Worker

Use a faster/lower-cost model for deterministic mechanical work such as formatting documentation, extracting inventories, updating repetitive references or summarizing green CI. It must escalate when decisions or ambiguous code changes are required.

## Routing by task

| Task | Planner | Executor | Independent reviewer |
| --- | --- | --- | --- |
| Tiny copy/style fix | optional | fast/coding agent | targeted checks |
| Normal feature | reasoning as needed | coding agent | fresh reviewer |
| Cross-module refactor | high reasoning | coding agent | high reasoning |
| Auth/security/privacy | high reasoning | coding agent | security-focused high reasoning |
| Migration/data model | high reasoning | coding agent | DB/security reviewer |
| Major UI redesign | product/design reasoning + Frontend Design | coding agent | visual/accessibility reviewer |
| External SDK/API change | reasoning + Context7 | coding agent | contract/test reviewer |

## Shared tool routing

- **Graphify**: dependency/call-path discovery and impact analysis.
- **Context7**: current third-party documentation.
- **Frontend Design**: substantial UI/design work.
- **Headroom**: optional large-context compression pilot only.
- **Tests/security checks**: authoritative evidence before review.
- **ADRs**: durable architecture decisions.

## Handoff rule

Each stage passes artifacts, not just chat context. Plans, tests, ADRs, PR descriptions and review findings should live in GitHub so a new agent can continue without relying on one conversation's memory.
