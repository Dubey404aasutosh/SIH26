# PRD.md — PRAHARI

> **Product Requirements Document** · v1.0 · SIH 2026 Software Edition
> Owner: Team Lead · Reviewers: all roles · Prerequisite reading: `CONTEXT.md`

---

## 1. One-paragraph summary

**PRAHARI** is a browser extension plus a redaction-aware server that lets a powerful cloud VLM drive a browser agent **without the cloud ever seeing the user's private data**. A local vision stack reads the rendered screen, a local privacy engine detects and redacts faces, credentials, and PII in both the DOM and the pixels, and only a **Sanitized Screen Graph** — typed placeholders, masked images, and geometry — crosses the network. The server understands the redaction grammar, reasons over the sanitized screen, and returns structured UI actions. The client resolves placeholders back to real values *locally* and executes. Every byte that leaves the machine is logged, hashed, and inspectable by the user.

---

## 2. Problem & opportunity

### 2.1 The user's problem
People want an AI agent that can actually *do things* in their browser — fill the 40-field government scheme form, reconcile a bank statement, book a hospital appointment, triage an inbox. The models capable of that reasoning live in the cloud. But those exact workflows are the ones saturated with Aadhaar numbers, account balances, medical history, and passwords. Today's options are:

| Option | Capability | Privacy | Verdict |
|---|---|---|---|
| Cloud agent (Operator-class, Comet, cloud CUA) | High | **Sends raw screenshots/DOM** | Unusable on sensitive workflows |
| Fully-local agent (small on-device model) | Low — fails multi-step reasoning | High | Doesn't complete the task |
| Manual (no agent) | n/a | High | The status quo: 25 minutes of typing |

PRAHARI is the fourth option: **cloud-grade capability at local-grade privacy**.

### 2.2 Why now
Three things became true in the last ~18 months and only now intersect:
1. **WebGPU shipped everywhere** (Chrome, Edge, Safari, Firefox 141+/145+) — real GPU compute in the browser, 5–20× WASM.
2. **Small vision models got good** — Florence-2-base at 230 M params beats VLMs 100× larger on grounded tasks; SmolVLM-256M decodes at ~80 tok/s on a laptop; GLiNER does zero-shot PII NER at edge sizes.
3. **Open-weights VLMs became genuinely agentic** — Qwen3-VL class models score competitively on OSWorld/AndroidWorld and can be deployed offline.

### 2.3 Why this matters in India specifically
Digital India put Aadhaar, PAN, UPI, DigiLocker, ABHA, and GST on the web for ~900 M users, mostly on **government and banking portals with long, hostile forms**. Those are exactly the workflows an agent should automate and exactly the data that must never leave the device. The **DPDP Act 2023** makes this a legal requirement, not a preference. A privacy-preserving browser agent with a native Indian identifier pack is not a demo — it is the only legally deployable shape this product can take here.

---

## 3. Users & jobs-to-be-done

| Persona | Job to be done | Pain today | PRAHARI's promise |
|---|---|---|---|
| **Asha** — 34, applies for a state subsidy scheme | "Fill this 6-page application from my documents" | 40 min, re-typing Aadhaar 4×, one typo = rejection | Agent fills it in 90 s; Aadhaar never leaves the laptop |
| **Ravi** — 41, small-business owner | "Reconcile this month's bank statement and flag odd charges" | Manual scan of 200 rows | Agent extracts & summarises; account numbers masked before the cloud sees them |
| **Dr. Meera** — 38, clinician | "Book follow-ups for these 8 patients on the hospital portal" | Repetitive clicking, patient names on screen | Agent drives the portal; patient identity masked as `⟦PERSON_n⟧` |
| **Sanjay** — 62, low vision | "Help me navigate this portal" | Screen readers fail on modern SPAs | Vision-grounded agent narrates and acts |
| **Priya** — 29, security/compliance lead | "Prove to me nothing sensitive left the endpoint" | Vendor's word | Signed Privacy Ledger + canary test that runs on demand |

**Primary persona for the SIH demo: Asha.** The government-form flow is the most legible, most Indian, and most convincing.

---

## 4. Product principles (decide arguments with these, in order)

1. **Privacy is structural, not aspirational.** If a leak is possible in principle, the design is wrong. One choke point; fail-closed; prove it with tests.
2. **Redact, don't destroy.** Typed, coreferent placeholders preserve the server's ability to reason. Deleting data makes the agent dumb *and* doesn't improve privacy.
3. **The cheapest sufficient observation wins.** Never send pixels when a 6 KB JSON suffices. Latency and privacy improve together — they are not in tension here.
4. **Show your work.** Every claim ("we redacted this") must be visible in the UI and reproducible in a test. Judges and users both need to *see* it.
5. **Degrade, never fail.** No WebGPU → WASM. No server → local Tier 0. No DOM → vision. No confidence → ask the user.
6. **The user is the last authority.** High-risk actions always stop for a human. There is always a visible kill switch.
7. **Two browsers, one codebase.** Chrome and Firefox parity is a requirement, not a stretch goal.

---

## 5. Scope

### 5.1 In scope for v1 (SIH submission)

**Client (extension)**

| ID | Requirement | Priority |
|---|---|---|
| C-01 | MV3 extension installing on Chrome 120+ **and** Firefox 141+ from one codebase | P0 |
| C-02 | Side panel UI: task input, live status, tier indicator, kill switch | P0 |
| C-03 | DOM + Accessibility extraction with stable element IDs and viewport-relative bboxes, across iframes and open shadow roots | P0 |
| C-04 | Screenshot capture (throttle-aware, ≤2 fps) + downscale + dirty-tile diffing | P0 |
| C-05 | **Local vision model** running via WebGPU (ONNX Runtime Web / Transformers.js) with WASM fallback | P0 |
| C-06 | Face detection + blur on `<img>`, `<video>`, `<canvas>` | P0 |
| C-07 | Credential blackout: password/CVV/OTP fields, in both DOM text and pixels | P0 |
| C-08 | PII detection: deterministic rules + Indian checksum validators + local NER | P0 |
| C-09 | Placeholder vault with deterministic per-session tokens and **sink binding** | P0 |
| C-10 | **Egress guard**: single choke point, final-pass scan, allowlisted host, fail-closed | P0 |
| C-11 | Action executor: click / type / select / scroll / key / navigate / extract, with risk gating | P0 |
| C-12 | **Privacy Ledger**: per-request record with hashes, manifest, and a "what the server saw" diff view | P0 |
| C-13 | Glass-box on-page overlay showing redactions live | P0 |
| C-14 | Canary mode: automated leak test, in-UI result | P1 |
| C-15 | Local-only mode (zero egress) | P1 |
| C-16 | Text detection + recognition inside images/canvas (pixel-only PII) | P1 |
| C-17 | Optional local VLM (Florence-2-base) for screen-state classification and grounding | P1 |
| C-18 | High-Fidelity Mode via `chrome.debugger` (full AX tree + trusted input events) | P2 |
| C-19 | Per-site / per-class privacy policy editor | P2 |
| C-20 | Indic-script PII (Devanagari, Tamil, Bengali) detection | P2 |

**Server**

| ID | Requirement | Priority |
|---|---|---|
| S-01 | `POST /v1/agent/step` accepting SSG (+ optional redacted image), returning a validated Action Plan | P0 |
| S-02 | Open-weights VLM served locally-deployable (vLLM + Qwen3-VL-8B / Qwen2.5-VL-7B) | P0 |
| S-03 | **Guided decoding** to a strict JSON action schema — zero parse failures | P0 |
| S-04 | Redaction-aware prompting: placeholder grammar + manifest injected into the system prompt | P0 |
| S-05 | **Ingress PII scanner** — rejects any payload containing unredacted PII with `422 REDACTOR_FAILURE` | P0 |
| S-06 | Prompt-injection defence: untrusted-content fencing, instruction hierarchy, injection classifier | P0 |
| S-07 | Session state keyed by ephemeral ID; no PII persisted; PII-free structured logs | P0 |
| S-08 | Planner/Grounder split with a text-only fast path | P1 |
| S-09 | SSE streaming of plan tokens for perceived latency | P1 |
| S-10 | `docker compose up` runs the whole server air-gapped | P1 |
| S-11 | Metrics endpoint (Prometheus) + trace IDs matching the client ledger | P2 |

**Evaluation harness**

| ID | Requirement | Priority |
|---|---|---|
| E-01 | Synthetic corpus: 500 pages × 10 templates with Faker-IN valid Aadhaar/PAN/IFSC | P0 |
| E-02 | Canary suite: 60 canaries across 8 injection surfaces incl. pixels and `data-*` | P0 |
| E-03 | Task suite: 40 end-to-end tasks with automated success checks | P0 |
| E-04 | Latency harness producing p50/p95 per tier per device class | P0 |
| E-05 | Adversarial suite: prompt injection, split-node PII, homoglyphs, zero-width chars | P1 |

### 5.2 Explicitly out of scope for v1
Mobile app · desktop (non-browser) screen capture · FHE/MPC/TEE · training a foundation model from scratch · multi-user/team features · billing · browser other than Chrome/Firefox (Edge works free via Chromium; not tested) · voice input.

---

## 6. Functional specification

### 6.1 The core loop (user-visible)

```
1. User opens the side panel, types a goal:
   "Apply for the PM-Kisan scheme with my saved profile."
2. PRAHARI captures the screen state (DOM + AX + optional screenshot).
3. NETRA (local vision) classifies the screen and detects elements/faces/text regions.
4. KAVACH detects sensitive content, applies the policy, redacts, and builds the SSG.
5. The Egress Guard verifies the payload is clean, logs it to LEKHA, and sends it.
6. MANTRI (server) returns an Action Plan in strict JSON.
7. HASTA validates, risk-gates, detokenizes locally, and executes.
8. Repeat from 2 until `done`, `fail`, or the user stops.
```

### 6.2 Escalation ladder (this is how R8 is answered)

| Tier | What is sent | When chosen | Target p50 |
|---|---|---|---|
| **Tier 0 — Local** | *nothing* | Action is unambiguous from the DOM + local policy (scroll, dismiss a known dialog, click the single obvious "Next", re-fill a field the plan already specified) | ≤ 120 ms |
| **Tier 1 — Structured** | SSG JSON only (~4–20 KB) | Page is DOM-rich and the local grounder is confident | ~1.0 s |
| **Tier 2 — Visual** | SSG + redacted JPEG (768 px long side, ~40–90 KB) | Canvas/video/image-heavy page, DOM ambiguity, low local confidence, or the server requested a re-look | ~1.8 s |

The **Adaptive Perception Controller** picks the tier from: DOM stability, perceptual-hash delta, local confidence/entropy, consecutive-failure count, page class, and a device-capability score measured at install. Tier can be forced by the user (a "Privacy: strict / balanced / fast" selector) and by per-site policy.

### 6.3 Redaction contract (SETU v1)

- Placeholder grammar: `⟦CLASS_N⟧` where `CLASS ∈` the taxonomy in `CONTEXT.md §5` and `N` is a per-session, per-class ordinal.
- Determinism: `token = ⟦CLASS_ + index(HMAC_sessionKey(normalise(value)))⟧`. Same value → same token *within* a session; unlinkable *across* sessions.
- Type preservation: `⟦AADHAAR_1⟧` renders at a width matching a 12-digit string, so layout metrics survive.
- The **redaction manifest** (counts, methods, detector versions, coverage confidence) is part of every request; the server's system prompt is built from it.
- **Reverse channel**: the server may emit `{"op":"type","target":"e17","value_ref":"⟦EMAIL_1⟧"}`. The client resolves `value_ref` from the vault **only if** `target ∈ allowed_sinks(token)`. Credentials are never resolvable by server request.

### 6.4 Action schema (server → client)

```
click | type | select | scroll | key | navigate | wait | extract | ask_user | done | fail
```
Targets are SSG element IDs (`e17`), not coordinates. A normalized `point(x,y)` fallback exists for canvas-only surfaces. Every action carries a `risk` ∈ `{safe, medium, high}`; `high` requires an explicit user confirmation dialog naming the action and the site.

### 6.5 Risk gating

| Risk | Examples | Behaviour |
|---|---|---|
| `safe` | scroll, read, extract, wait | Execute silently |
| `medium` | click a link, type a non-sensitive value, select an option | Execute with a 1.5 s visible highlight + undo affordance |
| `high` | submit a payment, send a message, delete, upload a file, OAuth consent, type into a credential field, navigate cross-origin | **Blocking modal**: shows action, target element screenshot crop, and the exact value; requires click-to-confirm |

Risk is assigned **client-side** from the element's own properties (form action, button text, field type, origin change) — never taken on trust from the server's suggestion. The server's `risk` field can only *escalate*, never de-escalate.

---

## 7. Non-functional requirements

| Category | Requirement | Target |
|---|---|---|
| **Latency** | Tier 0 / 1 / 2 p50 end-to-end | 120 ms / 1.0 s / 1.8 s |
| | Tier 2 p95 | ≤ 3.0 s |
| | Local redaction stage alone (Tier 2) | p95 ≤ 450 ms |
| **Footprint** | Default model bundle download | < 120 MB |
| | With optional local VLM | < 450 MB |
| | Extension idle RAM | < 250 MB (offscreen doc with models warm) |
| | Extension CPU when idle | < 1 % |
| **Privacy** | Leak Rate on canary suite | **0 / 60** |
| | Leak Rate on synthetic suite | < 0.5 % of payloads |
| | Recall — Tier A (structured) PII | ≥ 0.99 |
| | Recall — Tier B (contextual) PII | ≥ 0.92 |
| | Recall — faces | ≥ 0.97 @ IoU 0.5 |
| | Precision (over-redaction control) | ≥ 0.90 overall |
| **Utility** | Task Success Rate, 40-task suite | ≥ 75 % (stretch 85 %) |
| | TSR drop caused by redaction (vs redaction-off) | ≤ 5 pp |
| | Action schema validity | 100 % (guaranteed by guided decoding) |
| **Compatibility** | Chrome 120+, Firefox 141+ | Both P0 |
| | WASM-only device (no WebGPU) | Full function, Tier 2 p50 ≤ 4 s |
| **Reliability** | Server unavailable | Falls back to Tier 0; user informed; no crash |
| | Any detector throws/times out | Region defaults to **redacted**; step continues |
| | Egress guard fails | **No request is sent.** Ever. |
| **Security** | Extension hosts with network permission | Exactly one (the configured server) |
| | Prompt-injection suite | 0 successful high-risk executions |
| **Observability** | Every egress recorded in the ledger | 100 %, with SHA-256 of the exact bytes |

---

## 8. Success metrics

### 8.1 Headline (goes on the pitch slide)

| Metric | Baseline (naive cloud agent) | PRAHARI target |
|---|---|---|
| Sensitive items transmitted per task | ~18 | **0** |
| Bytes sent per step | ~180 KB (raw screenshot) | **6 KB (Tier 1) / 55 KB (Tier 2)** |
| Task success rate | 78 % | **≥ 75 %** (parity, at zero leakage) |
| p50 step latency | 2.2 s | **1.0 s** (Tier 1 majority) |
| Canary leak rate | 100 % | **0 %** |

The story: *we cut transmitted personal data to zero and payload size by ~30×, while holding task success within noise of an unprotected agent.*

### 8.2 Instrumented metrics (dashboard)
`leak_rate`, `redaction_recall@class`, `redaction_precision@class`, `over_redaction_utility_delta`, `tsr`, `steps_per_task`, `action_validity`, `tier_distribution`, `p50/p95_latency@tier`, `bytes_per_step`, `local_infer_ms@model`, `server_tokens_per_step`, `injection_block_rate`, `confirm_prompt_rate`.

### 8.3 Definition of "the demo worked"
All eight steps of the scripted demo (`PHASEWISE.md §Demo Script`) complete on a live machine, in front of judges, twice in a row, with the ledger showing `0 leaks` and the canary test showing `0/60`.

---

## 9. Key product decisions (and the rejected alternatives)

| # | Decision | Alternatives rejected | Why |
|---|---|---|---|
| D1 | **Hybrid DOM + vision observation** | Pure DOM; pure pixels | Pure DOM fails on canvas/video/PDF and doesn't satisfy R2. Pure pixels wastes the free, exact structure the web gives us and burns the 2 fps capture budget. |
| D2 | **Typed coreferent placeholders**, not deletion | Delete elements; blur everything; synthetic Faker values | Deletion breaks reasoning and layout. Faker values are *worse* — the server may act on plausible-but-wrong data and the user can't tell. Typed tokens are honest and reversible. |
| D3 | **Send redacted artefacts, never embeddings** | Split inference: run the ViT locally, send hidden states | Feature/embedding inversion attacks reconstruct the input. "Anonymous vectors" are not anonymous, and worse, *not auditable* — you cannot show a user what a tensor contained. |
| D4 | **Union of detectors, fail-closed** | Single best detector; intersection | Recall dominates precision for privacy. A missed Aadhaar is a breach; an over-redacted order number is an annoyance. |
| D5 | **Tier ladder** rather than one fixed representation | Always send screenshots | Directly answers R8, cuts cost ~30×, and improves privacy monotonically. |
| D6 | **Sink binding on tokens** | Free detokenisation (Casper-style) | Without it, a malicious page + injected instruction can make the agent type the user's Aadhaar into an attacker-controlled search box, exfiltrating via the URL. |
| D7 | **Offscreen document for inference** (Chrome) | Inference in content script; in service worker | Service workers have no WebGPU/DOM. Content scripts are per-tab (model reload per tab) and live in a page the site can observe. Offscreen is single, persistent, isolated. |
| D8 | **Open-weights server model** | Frontier API model | R9 requires offline deployability; it's also the honest answer to "what happens after the hackathon". |
| D9 | **Guided decoding for actions** | Prompt-and-parse with retries | Parse failures are the #1 source of flaky agent demos. XGrammar makes them structurally impossible. |
| D10 | **Client assigns risk, server can only escalate** | Trust the server's risk label | The server is the party we've decided not to trust. It must not be able to mark "submit payment" as safe. |

---

## 10. Risks & mitigations

| # | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| R-1 | Local NER too slow on integrated GPUs | M | H | Cascade: regex/DOM prefilter → NER only on suspicious nodes; cache by text hash; int8 edge model; hard timeout → fail-closed redact | ML-Client |
| R-2 | Chrome's 2 fps capture cap throttles the loop | H | M | DOM-first Tier 1 as default; capture only on tier escalation; `tabCapture` MediaStream when high fps is genuinely needed | Ext |
| R-3 | Model download size scares users / fails at venue | M | H | Ship tiny models in the bundle; lazy-load the rest; **pre-warm the demo machine**; Cache API persistence; offline model pack on USB | ML-Client |
| R-4 | False negative in redaction during the live demo | L | **Critical** | Union of detectors + fail-closed + server-side ingress scanner + demo pages are in the canary suite and pre-verified; run the canary test live as part of the demo | Privacy |
| R-5 | Prompt injection makes the agent do something embarrassing on stage | M | H | Untrusted-content fencing, client-side risk gating, HIGH-risk confirm, injection classifier, curated demo pages | Privacy + Server-ML |
| R-6 | Firefox WebGPU unavailable (Linux) | M | M | WASM path is a P0 requirement and is in CI; demo Firefox on Windows | Ext + ML-Client |
| R-7 | Venue network fails | M | H | Local fallback server on the demo laptop (Qwen2.5-VL-3B) + deterministic replay server for the worst case | Backend |
| R-8 | Scope creep kills integration time | **H** | H | Phase gates with hard exit criteria; P2 items are explicitly droppable; integration freeze 5 days before | Lead |
| R-9 | Over-redaction tanks task success | M | M | Track `over_redaction_utility_delta` from week 3; tune precision per class with the policy matrix; keep "balanced" as default | Privacy + Server-ML |
| R-10 | Two-manifest drift (Chrome vs Firefox) | M | M | Single source manifest generated by a build script; both browsers in CI smoke tests | Ext |

---

## 11. Release criteria (the gate for "we can present this")

- [ ] Installs cleanly on Chrome and Firefox from a fresh profile in < 60 s.
- [ ] Completes the Asha demo task end-to-end, twice consecutively, unattended.
- [ ] Canary suite: **0/60 leaked**, run live in the UI.
- [ ] Privacy Ledger renders a byte-accurate "what the server saw" view for every step.
- [ ] Latency table (p50/p95 × tier × device) generated from a real run, not estimated.
- [ ] Server ingress scanner has fired zero `REDACTOR_FAILURE` in the last 200 requests.
- [ ] `docker compose up` reproduces the server from scratch on a clean machine.
- [ ] WASM-only fallback verified on a machine with WebGPU disabled.
- [ ] Prompt-injection suite: 0 successful high-risk executions.
- [ ] README + 3-minute demo video + pitch deck complete.

---

## 12. Future work (the "what's next" slide)

1. **On-device fine-tuning of the redaction policy** from user corrections (federated, never uploaded).
2. **NPU acceleration via WebNN** once GPU/NPU execution leaves preview — same ONNX graphs, ~3–5× lower power.
3. **Confidential-compute server tier** (TEE attestation surfaced in the client UI) for organisations that want a cryptographic guarantee on the remote half.
4. **Verifiable redaction proofs** — a succinct commitment that the transmitted image is the redaction of a screen containing no unmasked PII, checkable by a third party.
5. **Indic-first PII models** — a fine-tuned GLiNER on Devanagari/Tamil/Bengali/Telugu government-form corpora.
6. **Extension to desktop** via a native-messaging host reusing the whole KAVACH engine.
7. **Enterprise policy distribution** — org-managed policy packs pushed via managed-storage.
