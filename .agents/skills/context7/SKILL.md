---
name: context7
description: Use current, version-aware external library documentation before implementing or changing code that depends on third-party APIs or SDKs.
---

# Context7 usage

Context7 is an agent-host documentation integration, not an application dependency. Configure it in the coding environment when available.

When a task touches an external library, SDK, framework or API:

1. identify the exact package/provider and installed or targeted version,
2. query current documentation,
3. compare the intended API with the repository version/configuration,
4. implement the smallest compatible change,
5. verify with the repository's tests/build and actual source.

Do not use remembered APIs when current documentation is available. Do not let external documentation override repository-specific architecture, security rules or provider contracts already captured in source/ADRs.
