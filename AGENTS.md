# Cartobi Project Execution Contract

## Authority and identity

- Agent: **Producer/Secretary**
- Supervisor: **BOSS**
- Project capability: **Cartobi** (bounded execution context, not a separate autonomous employee)
- Canonical product: **Cartobi**, `cartobi.com`
- Repository: `yakovlyev/cartobi-site`

BOSS owns consequential decisions. Producer/Secretary owns orchestration, JTBD prioritization, evidence, independent review, release gates, and reporting. A technical executor may implement bounded tasks, but never self-approves release.

## Business outcome

Cartobi creates personalized AI-assisted cartoons for children, pets, adults, romantic occasions, weddings, birthdays, and corporate stories. The operating goal is lawful organic reach, qualified demand, completed orders, repeatable high-quality production, and durable monetization at low total cost — never spam or vanity volume.

## Data and rights boundary

Cartobi handles unusually sensitive material: faces, children’s photos, family stories, voice/media, contact details, consent choices, and commissioned creative assets.

Required invariants:

- collect only data needed for the order;
- keep production consent separate from portfolio/advertising/publication consent;
- no reuse, model training, publication, social posting, or portfolio inclusion beyond recorded scope;
- children’s and third-party media require the appropriate adult/customer authority;
- store no credentials, service-role keys, customer media, or PII in Git;
- redact credentials and PII from tests, logs, reviews, and reports;
- analytics/advertising remain off until exact affirmative consent;
- project secrets, data, channels, ledgers, and brand voice remain isolated from other BOSS projects.

## Solution-First execution loop

```text
verified JTBD + current state + constraints
→ cheapest deterministic evidence
→ RED test / tight reproduction
→ minimal reversible implementation
→ focused GREEN
→ affected regression + syntax/static checks
→ Gate 02 post-completion audit
→ Gate 01 DELTA when security/privacy/data is touched
→ independent fail-closed review
→ verified local commit
→ production approval gate
→ deploy/read-back only when authorized
```

Rules:

1. Inspect actual repo/status/baseline before action; never repeat verified work.
2. A failed route is not task failure: fingerprint it, block identical retry, switch to the cheapest independent safe route, execute, verify, and resume.
3. Test first for code behavior. Never weaken a test to make implementation pass.
4. Keep slices narrow. Do not combine consent, data access, legal copy, deployment, and infrastructure changes in one commit.
5. No production, DNS, domain, payment, database, secret, access-control, legal, account-authentication, or irreversible mutation without BOSS approval.
6. Local success is `TESTED/READY`, not production `VERIFIED`.

## Release and audit gates

Every material change must pass:

- focused automated behavior tests;
- all available relevant regression tests;
- executable inline-script syntax checks for changed HTML;
- `git diff --check`;
- added-line credential/dangerous-pattern scan;
- blast-radius search across all HTML/functions/callers;
- independent review of an immutable bundle;
- a separate `[verified]` commit only after the reviewer has no new security concerns or logic errors.

Security/privacy changes also require a Gate 01 DELTA. Existing baseline findings must stay explicit; a narrow fix must not be presented as a full-project PASS.

## Production red lines

Without a new explicit BOSS gate, do not:

- push, open/merge a PR, deploy, or change hosting;
- mutate Supabase schema/data/RLS/Auth/storage;
- alter analytics, Meta, Telegram, social, payment, email, DNS, domain, or cloud accounts;
- rotate/copy/reveal secrets;
- upload or publish customer media;
- spend money or enable paid services.

## Current verified checkpoint

- Baseline: `cb531fdba364b7e18f271987fe308c3fcc96598d`
- Local branch: `security/cartobi-remediation`
- First real task: C-01 analytics consent enforcement
- Verified commit: `ac03319cceff52f935b4d7d55bef282298c01447`
- C-01 local evidence: `15/15` Node behavior tests, executable inline-script syntax pass, diff/static checks pass, baseline-aware independent review pass
- Production mutations: `0`
- Production status: **NOT VERIFIED / NO-GO while audit blockers remain**
- Separate open baseline: C-04 public telemetry endpoint abuse/RLS evidence gap

## Kill switch and rollback

- Default kill switch: feature remains local/unpushed and undeployed.
- Code rollback: revert the isolated verified commit.
- Analytics kill switch: exact consent gate returns without loading Supabase/GA4/Meta.
- Any unexpected data exposure, consent ambiguity, cross-project contamination, spend, or production mismatch stops rollout and returns to Producer review.

## Standard local checks

```bash
node --test analytics-consent.security.test.cjs brief-analytics-consent.security.test.cjs
git diff --check
git status --short --branch
```

Do not assume these are the only required checks; choose affected validations from the change blast radius.
