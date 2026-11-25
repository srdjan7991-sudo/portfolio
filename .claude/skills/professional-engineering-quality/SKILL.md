---
name: professional-engineering-quality
description: Maintain and audit the portfolio repository for behavior, architecture, reliability, and precise technical writing. Use when implementing a change, reviewing a diff, or preparing repository documentation and a pull request.
---

# Portfolio engineering quality

## Establish what the change must preserve

1. Read the repository instructions, current diff, callers, tests, and the relevant sections of [the architecture guide](../../../docs/architecture.md). Keep existing user changes separate.
2. Identify which paths are affected. GitHub Pages serves the public static portfolio. The HTTPS development path enables the API, administrator session and SQL-backed order. The guided request walkthrough and the live request must be distinguishable to visitors. Verify the real build and environment before claiming either path works.
3. Describe an architectural decision using the requirement it serves, the nearest simpler alternative, its failure behavior, and the evidence that supports it. Record durable decisions where maintainers look for them. Use a separate decision record only when a material tradeoff needs a durable explanation that would interrupt the architecture guide.

## Implement at the smallest existing boundary

- Name values, modules, and tests after the responsibility or observable event they describe. Prefer a direct function over a generic framework. Extract when more than one caller needs the same contract or a real lifecycle boundary makes the code easier to reason about.
- Trace who owns state, effects, resources, and cleanup. In React, verify all entry points that can interrupt the operation, such as a later request, unmount, history navigation, or a narrow viewport. Extract a hook when the lifecycle belongs together. Avoid copying derived state into an effect.
- Validate data at the boundary where it enters. Reuse the repository's HTTP contracts, error shapes, and configuration validation. Choose handling a caller can act on. Keep secrets, tokens, passwords, and private connection details out of logs, tests, docs, and diffs.
- For backend writes, identify the transaction and concurrency boundary across processes. Check the retry or rollback path. Explain ordering and isolation where a later edit could break the contract.
- Remove code made unreachable by the change. For a necessary temporary workaround, document its exact trigger and exit condition. Check callers before removing an apparently unused file, property, dependency, or branch.
- Preserve meaning across EN and SR. For interactive features, test the controls that the user can actually reach by keyboard or pointer. If motion carries information, verify the same information is available with reduced motion.

## Verify a claim with the right evidence

| Claim | Evidence to look for |
| --- | --- |
| Behavior survives a failure | A test that drives the public action, triggers the failure or cancellation, and observes the resulting UI, state, or HTTP response |
| Concurrent writes remain consistent | Separate requests or contexts against a shared database, with evidence of overlap and the final persisted state |
| A tooltip, focus target, or reduced-motion control works | A browser test at the relevant viewport or preference. A DOM-only test can still cover pure state transitions. |
| A static deployment works | The deployment run for the exact commit, followed by a request to the published HTTPS site and its affected resources |
| A CV downloads | The browser download completes and the bytes match the expected DOCX |

For each finding, name the file and relevant lines. Record the input or event sequence, expected and actual result, impact, severity, minimal fix, regression check, and remaining risk. Identify claims based on source reasoning, mocks, a live database, or manual validation. Report a gap as a gap when the reproduction or environment is unavailable.

## Use specific, natural language

Use the terminology in the UI and code. Explain the evidence, decision, or next action once, where the reader needs it. Remove introductory promises, unsupported adjectives, generic summaries, and comments that paraphrase statements. Keep technical and marketing claims within what the implementation demonstrates. Preserve factual authorship, attribution, licensing, security notices, and tool disclosures.

| Surface | Weak | Use instead |
| --- | --- | --- |
| README or guide | Provides a seamless and robust analytics experience. | Choose a quarter and category. Select a bar to highlight its value in the monthly table. |
| Architecture | Uses industry best practices for distributed state. | The SQL lock serializes reorder writes from separate API processes. The API can compare the client's previous order with the saved order inside the transaction. |
| Comment | Check if the session is expired. | Keep consumed refresh hashes until the session expires so a reused token can revoke that session. |
| Test | Handles auth edge cases correctly | Rejects a refresh using the previous cookie and revokes the replacement session |
| Commit | Improve the robustness of the user experience | Keep adjacent analytics bars clickable when the tooltip is open |
| PR description | Thoroughly tested the new implementation. | Reproduced the overlap at a 420 px viewport. Chromium selects both adjacent bars and updates the matching table rows. |

Confirm an example's behavior against the changed code before adapting its wording. Simplify repeated sentences, boilerplate docstrings, vague names, empty lists of pros and cons, and promotional words such as scalable or enterprise-grade without supporting evidence. Review phrasing for precision and repetition. Writing style alone cannot establish how text was authored.

## Before declaring the work ready

- [ ] Scope, user changes, unaffected entry points, and write permissions were checked.
- [ ] Each proposed fix addresses a concrete behavior or maintenance problem. Every accepted finding has evidence and a disposition.
- [ ] Tests exercise outcomes and relevant failure paths. Record commands, results, and what still needs a browser, SQL Server, or deployment.
- [ ] README, guides, and examples match real commands, file paths, behavior, and public links.
- [ ] Code, comments, localized UI copy, docs, commit messages, and PR text are concise and specific.
- [ ] The staged diff excludes secrets, local paths, and private agent files. Repository-owned instructions require explicit approval for publication. Existing commit history and attribution remain intact.
- [ ] Publication, merge, and release follow the user's current authorization.
