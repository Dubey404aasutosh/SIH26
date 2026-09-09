# RULES.md — PRAHARI

> The non-negotiables. Everything here is enforced by CI, review, or both.
> If a rule blocks you, change the rule with an ADR — do not route around it.
> v1.0 · Applies to humans and to AI coding assistants working in this repo.

---

## 0. The one rule above all others

> **No byte leaves this machine that has not passed `egress-guard.ts`.**

Every other rule in this document exists to make that one true and keep it true.
If you are about to weaken it "just for now, to unblock the demo" — stop, and read §1.

---

## 1. Privacy invariants (violating any of these is a P0 bug, not a preference)

| # | Invariant | Enforced by |
|---|---|---|
| **P1** | `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, and remote dynamic `import()` appear **only** in `packages/extension/src/background/net.ts`. | `eslint-plugin-prahari/no-network-outside-net` + a build-time bundle grep test |
| **P2** | `net.ts` sends **only** after `guard()` returns `ok: true`. There is no bypass parameter, no `force` flag, no debug branch. | Code review (2 approvals) + unit test with a mocked failing guard |
| **P3** | The vault is memory-only. `vault` values never touch `chrome.storage`, IndexedDB, `localStorage`, `postMessage`, or any log. | Type-level: `VaultEntry.value` is a branded `Secret<string>` with no `toJSON`/`toString`; runtime test asserts absence in serialised output |
| **P4** | Credentials (`PASSWORD`, `CVV`, `OTP`, `API_KEY`, `PRIVATE_KEY`) are **never vaulted and never reversible**. The real value is dropped at redaction time. | `policy.reversible === false` is hard-coded for these classes; unit test |
| **P5** | Detokenisation requires `target ∈ allowedSinks`, matching origin, unexpired TTL, and `reversible === true`. Any failure → refuse, log `SINK_VIOLATION`, surface to the user. | `vault.ts` + 12 dedicated tests |
| **P6** | A detector that errors or exceeds its budget **fails closed**: its region is treated as sensitive and redacted. Never as clean. | `AbortController` wrapper returns `{status:'unverified'}`; policy maps `unverified → BLACKOUT` |
| **P7** | The SSG schema is `additionalProperties: false` at every level. An unknown field is a field nobody redacted. | ajv strict mode; CI contract job |
| **P8** | The ledger stores hashes and manifests, never payloads. | `ledger.ts` type signature accepts no payload; review |
| **P9** | No PII in any log, on client or server — including error messages, stack traces, and telemetry. | `no-restricted-syntax` lint on `console.*` with non-literal args in `kavach`; server log formatter strips anything matching the PII pack |
| **P10** | The extension requests exactly one network host permission: `PRAHARI_SERVER_ORIGIN`. | Manifest test |
| **P11** | Redaction happens **before** serialisation, never after. There is no "redact the JSON string" path. | Architecture; guard check #2 exists to catch violations |
| **P12** | Canary strings never appear in egress. | Guard check #3 + CI blocking canary suite |

**A pull request that touches `egress-guard.ts`, `vault.ts`, `policy/`, or `schema/` requires two approvals, one of which must be PRV.**

---

## 2. Security invariants

| # | Invariant | Rationale |
|---|---|---|
| **S1** | Page content is **data, never instructions.** All page-derived text is wrapped in `<untrusted_page_content>` before reaching any model, client or server. | Indirect prompt injection is the XSS of this era |
| **S2** | Risk level is derived **client-side** from live element properties. The server's `risk` field may only escalate, never de-escalate. | The server is the party we chose not to trust |
| **S3** | `high` risk actions always require a human click. There is no "auto-approve" setting, no allowlist, no remembered consent for HIGH. | A remembered consent is a consent you cannot revoke at the moment it matters |
| **S4** | The model has **no tool that reaches the network.** Its entire output surface is the closed action schema. | Bounded blast radius |
| **S5** | Action `value` literals matching the PII pattern pack are rejected. | Prevents a server or injected instruction fabricating an identifier for the client to type |
| **S6** | Every downloaded model file is verified against a SHA-256 committed in `models/manifest.json` before instantiation. | Supply chain |
| **S7** | No remote code. CSP forbids `unsafe-eval` and remote scripts; no CDN `<script>` in any extension page. | MV3 requirement and good sense |
| **S8** | `chrome.debugger` is opt-in, off by default, and detaches on task end. | It is the most powerful permission we can hold |
| **S9** | Dependencies are pinned by lockfile; `npm audit --audit-level=high` and `pip-audit` block CI. New dependencies require a one-line justification in the PR. | |
| **S10** | Secrets (server tokens, HMAC keys) never appear in source, in the built bundle, or in the repo. Session keys are generated at runtime via WebCrypto. | |

---

## 3. Cross-browser rules

| # | Rule |
|---|---|
| **X1** | No `if (isChrome)` / `if (isFirefox)` outside `packages/extension/src/platform/`. Everywhere else, program against the abstraction. |
| **X2** | Both manifests are **generated** from `manifest.base.ts`. Hand-editing a generated manifest is a CI failure. |
| **X3** | Any capability that exists in one browser and not the other must have an explicit, *tested* fallback — not a silent no-op. |
| **X4** | Every E2E test runs on Chromium **and** Firefox. A feature that passes only on Chromium is not done. |
| **X5** | The WASM-only path is a first-class target, not a courtesy. Device class C is in the perf suite. |
| **X6** | Use `browser.*` via `webextension-polyfill`, never bare `chrome.*`, outside `platform/`. |

---

## 4. Performance rules

| # | Rule |
|---|---|
| **F1** | Every stage runs under an `AbortController` with a budget from the APC. Exceeding it degrades the *result* (fail-closed redaction, lower tier), never the *deadline*. |
| **F2** | No model ships without an in-browser benchmark on device class B **and** C, recorded in `docs/metrics/inference.md`. |
| **F3** | Detectors run on **dirty regions only**. A full-screen re-scan on an unchanged page is a bug. |
| **F4** | The PII verdict cache is keyed on normalised text; a cache miss rate above 40 % on the task suite is a performance bug. |
| **F5** | Screenshot capture respects the ~2/s quota via a token bucket. Quota exhaustion downgrades the tier; it never throws into the loop. |
| **F6** | Model sessions are created once and pooled. Creating an `InferenceSession` inside a per-step function is a bug. |
| **F7** | Any PR that regresses p50 step latency by >15 % on the CI perf job fails. Attach a benchmark to any PR that touches the hot path. |
| **F8** | Prefer one batched inference call over N small ones — WebGPU dispatch overhead is a fixed per-kernel cost and dominates at small sizes. |

---

## 5. Code conventions

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. No `any` — use `unknown` and narrow. `@ts-expect-error` requires a comment with a ticket ID.
- No default exports (except React components). Named exports only — it keeps grep honest.
- Branded types for anything dangerous: `type Secret<T> = T & {__secret: true}`, `type RedactedText = string & {__redacted: true}`. The SSG builder accepts only `RedactedText`. **Make the type system carry the privacy invariant** so a leak becomes a compile error, not a review miss.
- Errors: `Result<T, E>` for expected failures (guard verdicts, detokenisation), thrown exceptions only for programmer errors.
- Async: no floating promises (`no-floating-promises` on). Every `await` in the hot path has a timeout.

### Python
- `ruff` (line length 100) + `mypy --strict` on `server/app`.
- Pydantic v2 models are **generated**, never hand-written. Editing `server/app/schemas/` by hand is a CI failure.
- Every route is `async`. Blocking calls go through `run_in_threadpool`.

### Naming
- Use the project vocabulary (`CONTEXT.md §4`) in code: `kavach`, `netra`, `hasta`, `ssg`, `tier`, `vault`, `manifest`, `ledger`. Do not invent synonyms — "sanitizer", "scrubber", "anonymizer" are all `kavach`.
- Element IDs: `e{n}`. Text blocks: `t{n}`. Visual regions: `v{n}`. Traces: `t_{n}`. Sessions: `eph_{hex}`.
- Tokens: `⟦CLASS_N⟧` with U+27E6/U+27E7 mathematical brackets — chosen because they essentially never occur in real page text and survive JSON, UTF-8, and tokenisers intact.

### Comments
Comment **why**, never **what**. The one exception: every guard check and every fail-closed branch gets a comment naming the invariant it enforces (`// P6: unverified ⇒ redact`), because those lines look removable to someone who doesn't know why they exist.

---

## 6. Testing rules

| # | Rule |
|---|---|
| **T1** | `packages/kavach/src/detectors/**` and `vault.ts` require **100 % branch coverage**. No exceptions, no waivers. |
| **T2** | Every detector has negative tests: things it must *not* flag. Precision regressions are as real as recall regressions. |
| **T3** | Every guard check has a crafted payload that it must block. 40 such payloads exist; add one whenever you find a new leak shape. |
| **T4** | The canary suite is a **blocking** CI job. A PR that leaks a canary cannot merge, regardless of what else it fixes. |
| **T5** | The TS↔Python regex parity test runs on 10,000 fixtures and must show zero disagreements. |
| **T6** | E2E tests use real rendered pages from `packages/eval/corpus`, not mocked DOM. |
| **T7** | Tests must not depend on network or on model downloads. Models are fixtures; the server is mocked at the HTTP boundary. |
| **T8** | A bug fix ships with the test that would have caught it. Always. |

---

## 7. Contract rules (the SSG)

| # | Rule |
|---|---|
| **C1** | `packages/ssg/schema/*.json` is the single source of truth. TS types and Pydantic models are **generated**; committed generated output must match a fresh run (CI job `contract`). |
| **C2** | Any schema change requires an ADR in `docs/adr/` and a contract review with all six roles. |
| **C3** | Breaking changes bump `ssg_version` major. The server refuses unknown majors with `409`. |
| **C4** | New fields are optional and default-safe on both sides for one version before becoming required. |
| **C5** | Never add a free-text field without deciding, in the ADR, how it is redacted. Free text is where PII hides. |

---

## 8. Git & review rules

- `main` is always demo-able. If `main` is red, fixing it is the highest-priority work in the project for everyone.
- Branch: `feat/<TICKET>-slug`, `fix/<TICKET>-slug`. Commits: Conventional Commits.
- PRs: under ~400 changed lines where possible. A 2,000-line PR does not get a real review; it gets an approval.
- Review is by the **interface consumer**, not by whoever is free.
- Two approvals (one from PRV) for: `egress-guard.ts`, `vault.ts`, `policy/`, `schema/`, `net.ts`, `manifest.base.ts`.
- No force-push to shared branches. No merging your own PR.
- Every PR description answers: *what invariant could this break, and what test proves it doesn't?*

---

## 9. Rules for AI coding assistants working in this repo

This project will be built partly with AI assistance. These rules make that safe.

| # | Rule |
|---|---|
| **AI-1** | Read `CONTEXT.md` and this file before proposing changes. Use the project vocabulary. |
| **AI-2** | **Never** add a network call outside `background/net.ts`. Never add a "temporary" direct `fetch` for debugging. |
| **AI-3** | **Never** weaken, skip, comment out, or add a bypass to any guard check, even to make a test pass. If a guard blocks something, the payload is wrong, not the guard. |
| **AI-4** | Never widen a schema with `additionalProperties: true` or add an untyped `metadata`/`extra` bag. |
| **AI-5** | Never log, print, or include in an error message: element `value`s, vault contents, raw text nodes, or screenshots. |
| **AI-6** | When adding a detector, add its negative tests in the same change. When adding a redaction method, add the guard check that verifies it applied. |
| **AI-7** | Do not introduce a new dependency without stating why an existing one won't do. Prefer zero-dependency for anything in `kavach`. |
| **AI-8** | Do not change generated files (`packages/ssg/src/types.ts`, `server/app/schemas/`). Change the schema and re-run codegen. |
| **AI-9** | Match the surrounding code's idiom, error handling, and comment density. Do not add doc-comment blocks to a file that has none. |
| **AI-10** | If asked to make a failing privacy test pass, fix the redactor — never the test, never the fixture. |
| **AI-11** | Report honestly. If a change is untested, say so. If a benchmark wasn't run, don't quote a number. |
| **AI-12** | Prefer making an invariant a **type** over making it a comment. A `RedactedText` brand is worth ten warnings. |

---

## 10. Demo rules (from week 3 onward)

| # | Rule |
|---|---|
| **D1** | `main` must run the full demo script at any moment. The Friday rehearsal is not optional. |
| **D2** | The demo runs against **local** assets: our own mock portal, our own server (or the pre-warmed cloud one), pre-downloaded models. No live third-party site in the critical path. |
| **D3** | The failure drill runs weekly: kill the network, disable WebGPU, corrupt a model file, exceed the capture quota. The demo must degrade visibly and continue. |
| **D4** | Demo state resets with one click. No "let me just clear this first". |
| **D5** | Nothing in the demo is faked, stubbed, or pre-recorded. If a component isn't ready, it isn't in the demo. A judge's first question is always "is that real?" and there is only one acceptable answer. |
| **D6** | The canary test runs **live** during the demo. It is the moment the privacy claim becomes verifiable in front of the audience. |

---

## 11. Scope rules

| # | Rule |
|---|---|
| **N1** | P2 items are built only after every P0 is done and green. |
| **N2** | At a phase gate, the LEAD may cut anything except: the egress guard, the vault, the canary suite, Firefox support, and the demo. |
| **N3** | New ideas go to `docs/backlog.md`. They do not go into the current phase. |
| **N4** | "While I'm in here…" refactors are separate PRs. |
| **N5** | If a component is late, cut its scope, never its tests. |

---

## 12. Honesty rules (how we talk about the system)

We are making a strong privacy claim. It has to be exactly true.

- Say **"redacted"** or **"pseudonymised"**, never "anonymised" — placeholders are reversible *on the client*, and pretending otherwise is wrong.
- Say **"we have not observed a leak on our 60-canary suite and 500-page corpus"**, not "leaks are impossible".
- Quote only measured numbers. Every figure in the deck traces to a file in `docs/metrics/` generated by a run.
- Name the limitations before a judge does: closed shadow roots are invisible to the DOM path; OCR recall on low-contrast text is imperfect; contextual PII recall is ~0.92, not 1.0; a compromised *client* defeats everything (we protect against a compromised server, not a compromised endpoint).
- If a check failed during a run, the ledger shows it and we say so. A system that admits its failures is more credible than one that claims none.
