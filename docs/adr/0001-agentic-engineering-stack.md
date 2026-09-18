# ADR 0001 — GitHub-centered agentic engineering stack

- Status: Accepted
- Date: 2026-09-18

## Context

The FrankiFlow project family is increasingly developed with AI coding agents across different clients. The engineering system must remain portable, reviewable and independent of any single chat, model vendor or developer laptop.

## Decision

GitHub is the canonical source of truth. Repository-local Agent Skills, ADRs and current source/tests carry durable knowledge. Graphify is used as a navigation/impact-analysis aid. Context7 is used from the agent host for current external documentation. Frontend Design is a repository-local skill for substantial UI work. Headroom is a measured, opt-in context-compression pilot and must not replace original-source review for high-risk logic.

Work is separated into Planner/Architect, Executor/Implementer and independent Reviewer/Test-Security roles. Model names are not hard-coded in repository policy; capability classes are used so the workflow survives model changes.

## Consequences

- Coding clients may change without rewriting project governance.
- Agent/session memory is supplementary, not authoritative.
- Sensitive changes receive independent review.
- Headroom adoption depends on measured benefit and no quality regression.
- Client-level integrations still require configuration outside GitHub; the repository records when and how to use them.
