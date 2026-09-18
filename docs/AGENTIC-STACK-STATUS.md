# Agentic Stack Status — FrankiHolz

Legend: **In repo** = repository policy/config exists. **External** = requires a GitHub app, MCP/client connection, account or secret outside the repository. **Gap** = not yet implemented/verified.

| Layer | Status | Notes |
| --- | --- | --- |
| GitHub source of truth | In repo | `develop` is the development branch; production remains on `main`. |
| Agent Skills | In repo | Project skill(s) plus Context7, Frontend Design and Headroom pilot policy. |
| Graphify | In repo | Local code-graph workflow; generated graph is not authoritative. |
| ADRs | In repo | Agentic-engineering ADR added. |
| Context7 | In repo + External | Usage policy is in GitHub; MCP/client connection must be configured in the coding host. |
| Frontend Design | In repo | Project-specific frontend skill added. |
| Headroom | Pilot / External | Policy is in GitHub; install/configure only in agent host for measured trials. |
| Automated tests | Gap | Existing coverage varies; expand by risk/feature rather than claiming full E2E coverage. |
| Security scanning | Gap / verify externally | No repository-wide Semgrep gate confirmed in this audit. |
| Independent PR AI reviewer | External / Gap | Requires CodeRabbit, Cursor Bugbot or equivalent GitHub integration. Use one primary reviewer before adding overlap. |
| Sentry / runtime observability | External / Gap | No complete Sentry setup confirmed in this audit. |
| Daily Improvement Agent | Gap | Workflow/spec exists conceptually; automated daily data collection/reporting still needs implementation. |
| MemPalace | Later | Deliberately not adopted yet; GitHub/skills/ADRs remain authoritative. |

Do not mark an external integration as active until the actual client/account/GitHub app is connected and tested.
