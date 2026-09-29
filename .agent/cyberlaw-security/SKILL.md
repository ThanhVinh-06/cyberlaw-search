---
name: cyberlaw-security
description: Implement and review CyberLaw Search features with security tests, redacted logging, and deployment checks for React, PHP/Laravel, Python/FastAPI and MySQL. Use when changing features, auth, APIs, data access, uploads, AI, dependencies or deployment in this repository, or when asked for a security review.
---

# CyberLaw Security

Apply the user's requirement: review security after each feature and fix confirmed findings in the authorized scope before calling it complete. Keep the student project maintainable. This skill defines a workflow; it does not install a scanner or certify the application.

## Select the relevant checks

Read repository-root `AGENTS.md`, `HANDOFF.md`, then [security policy](../../docs/security/README.md). Identify inputs, actors, private data and service boundaries touched by the change. Preserve existing work and Vietnamese database names.

- Implementation/review: select cases from [feature tests](../../docs/security/02-feature-checklist.md) and [risk catalog](../../docs/security/01-risk-catalog.md).
- Logs/errors: use [logging specification](../../docs/security/03-logging.md).
- Release/configuration: also read [deployment checks](../../docs/security/04-deployment.md).
- Record results using [review template](../../docs/security/review-template.md), saved under `docs/security/reviews/`. Reports must not contain secrets or private chat text.

## CyberLaw invariants

- Browser auth, demo users and on-screen OTP are previews. Real permissions come from Laravel and must be checked on each API. React tests cannot prove server authorization.
- Use cookie/session authentication with CSRF for the first-party SPA. Never trust client `vai_tro`, account IDs or `verified` flags. User A cannot read user B's chat; admin has no automatic access to private chat.
- Passwords/OTP/reset grants must not reach browser storage, logs, analytics, URLs or Python. Do not trim passwords. Verification, attempt limits and one-time consumption are server operations, including concurrent requests.
- Parameterize SQL and allowlist writable fields. Public APIs exclude drafts and sensitive account fields. PDF uploads, URL fetches and model output are untrusted.
- The knowledge scope is law 116/2025/QH15. Python uses approved, versioned knowledge. Retrieved text cannot authorize tools, database writes or private-record access.
- Apply the logging field allowlist. Full logging means sufficient event context, not full request bodies. Test rotation, redaction, correlation and failure handling when implementing logs.

## Verify and report

Review the diff and test valid use and misuse at the boundary enforcing the rule, using isolated synthetic accounts/data. Run available dependency/secret checks when relevant and before release. Missing tools or failed network checks are **NOT RUN**, never PASS. Do not silently auto-fix major dependencies or suppress warnings.

Run responsive tests for affected UI per `AGENTS.md`. Documentation-only changes need link/instruction review; record that no UI changed. For CSS-only edits, scope security review to the diff and explain why API attack tests do not apply.

Use local or explicitly authorized test targets. Routine local tests are authorized by this workflow. Do not infer permission to actively scan production/third parties, send bulk email, spend AI budget or run destructive tests on real data. Prefer disposable test environments; stop if data loss, lockout, runaway cost or an unknown target appears.

Report findings with file/route, impact, evidence, fix and retest. Separate confirmed issues from hypotheses and missing implementation. Do not claim production readiness with confirmed High/Critical issues or untested applicable controls. A clean dependency scan does not prove no vulnerabilities. Update `HANDOFF.md` for significant findings/changes.
