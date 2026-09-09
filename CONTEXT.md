# CONTEXT.md — PRAHARI

> **Project**: PRAHARI — *Privacy-Respecting Agentic Hybrid Assistant for Redacted Interaction*
> **Tagline**: *"The server sees the shape of your screen, never its secrets."*
> **Track**: Smart India Hackathon 2026 — Software Edition
> **Doc owner**: Team Lead · **Status**: Baseline (v1.0) · **Last updated**: 2026-09-04

This is the **single source of truth for shared understanding**. Read it before any other doc.
Every other file (PRD, ARCHITECTURE, PIPELINE, …) assumes the vocabulary defined here.

---

## 1. The problem statement, decoded

### 1.1 Verbatim requirements → engineering obligations

| # | What the PS says | What it actually obligates us to build | Where it is satisfied |
|---|---|---|---|
| R1 | "local agent deployed on user machine particularly browser" | A **browser extension** (not a desktop app, not a headless driver) that works in **Chrome and Firefox** | `packages/extension` |
| R2 | "local ViT or equivalent CV model 'reads' the user's screen and takes decision based on that" | A genuine **on-device vision model** — not just DOM scraping — that (a) perceives the rendered screen and (b) *makes decisions* (tier routing, sensitivity classification, grounding) | `packages/netra` |
| R3 | "sanitize the sensitive/PII data using DOM tags **or any other method**, before any network request is made" | Redaction happens **strictly pre-egress**, with a single enforced choke point; DOM-based **and** vision-based methods | `packages/kavach` |
| R4 | "dynamically detect and redact… blurring faces, blacking out passwords, masking PII" | A **multi-detector ensemble** covering faces (pixels), credentials (DOM), and PII (text + pixels), running on live, dynamic pages | `PIPELINE.md §4` |
| R5 | "Only this anonymized, unidentifiable data should be transmitted" | Provable, auditable egress; **zero-leak** as a *measured metric*, not a claim | Privacy Ledger + Canary Suite |
| R6 | "central server which should be **aware of this redaction scheme** and can process data accordingly" | A **shared, versioned redaction contract** (placeholder grammar + redaction manifest) the server is prompted with and validates against | `packages/ssg` + `server/app/guards` |
| R7 | "returns actionable commands for the browser agent to execute" | Strict **JSON action schema** with guided decoding; client-side executor with risk gating | `IMPLEMENTATION-PLAN.md §6` |
| R8 | "balance the trade-offs between inference latency and the accuracy" | An explicit, measurable **Adaptive Perception Controller** with tiers, budgets and published p50/p95 numbers | `PIPELINE.md §7` |
| R9 | "any offline deployable (open-source/open-weights) model on server side" | **Qwen3-VL / Qwen2.5-VL** class open weights served by vLLM; cloud-hosted during SIH, container-portable offline | `server/serving` |
| R10 | "An end-to-end task assisting the user should be demonstrated" | Scripted, reproducible demo of a full multi-step task | `PHASEWISE.md §Demo` |

### 1.2 The three hard constraints, stated plainly

1. **Asymmetry of resources.** The client has ~1–4 GB of usable (shared) GPU memory, no guaranteed NPU, a cold-start budget of a few hundred MB of model download, and a hard cap of ~2 screenshot captures/second in Chrome. The server has effectively unlimited compute. So: *perception is local and cheap; reasoning is remote and expensive.*
2. **Asymmetry of trust.** The client is trusted with everything. The server is trusted with **nothing** that identifies the user. Every byte crossing that line is a liability.
3. **Asymmetry of knowledge.** The server must act usefully on data it is not allowed to fully understand. This is only solvable if redaction is **structured and declared**, not destructive. Deleting PII makes the server stupid; *typed, coreferent placeholders* keep it smart.

> **Central design insight of PRAHARI**: redaction is not deletion, it is **lossy-but-typed encoding with a locally-held decoder**. The server reasons over `⟦AADHAAR_1⟧`; the client is the only party that can turn that back into digits — and it will only do so into the exact field it came from.

---

## 2. Prior art — what exists and what we take from it

### 2.1 Privacy for GUI / web agents (closest research)

| Work | Core idea | What we adopt | What we improve |
|---|---|---|---|
| **PrivWeb** (arXiv 2509.11939) | Privacy intermediary between page and agent; deletes DOM elements or re-renders redacted screenshots; 5-category taxonomy (identity, contact, financial, health/biometric, credentials); LLM-based classification | The intermediary position; the taxonomy as our base | Their classifier is **remote and slow**; ours is a **local ensemble** on a <60 ms budget. They delete; we placeholder. |
| **CAPED** (arXiv 2606.12666) | Context-aware masking for mobile GUI agents — sensitivity depends on **task relevance**; masks with solid blue-grey overlay + border + eye icon; textual entities become `[PERSON_1]` so agents can follow coreference | **Typed coreferent placeholders**; the *visible marker* pattern (a redaction that announces itself so the VLM knows something is there) | Extend mobile → web; add DOM ground truth (mobile has none); add the reverse channel (detokenisation) |
| **Casper** (arXiv 2408.07004) | Prompt sanitisation for web LLMs; Faker-generated pseudo-names; keeps a mapping to revert placeholders on response | The **reversible mapping / vault** | Casper's mapping is unbound — any response can pull any value. We add **sink binding** (a token may only be written back into its origin field). |
| **BodhiPromptShield** (arXiv 2604.05793) | Pre-inference mediation: detector → suppression → context preservation, with configurable policy | The three-stage split and **policy-as-config** | We add a hard **egress choke point** and cryptographic audit, not just a filter |
| **"Available but Invisible"** (arXiv 2602.10139) | Deterministic, **type-preserving** placeholders that keep semantic category while removing identity | Type-preserving format (length/shape preserved so layout metrics survive) | Applied to the *pixel* channel too, not just text |
| **WebPII** (arXiv 2603.17357) | 44,865 annotated e-commerce UI images; extended visual-PII taxonomy incl. transaction identifiers; shows models fail on partially-visible and contextually-embedded PII | Taxonomy extensions; the finding that **structured PII is easy, contextual PII is hard** — this drives our two-track recall targets | Add Indian identifier classes entirely absent from it |
| **GUIGuard-Bench** (arXiv 2601.18842) | Benchmark for privacy-preserving GUI agents; leakage 15–45 % undefended; layered defence → <5 % leakage at 90 %+ task completion | Their **metric set**: Privacy Leakage Rate, Task Utility, Privacy Preservation Index | We target **0 %** on the canary suite by making leakage *structurally impossible* (choke point), not statistically unlikely |
| **RedactionBench** (arXiv 2606.18782) | 40+ redaction methods; taxonomy = mask / remove / replace / encrypt; rule-based sacrifices utility, LLM-based is context-aware but inconsistent; *no single method dominates* | The four-operation taxonomy; the conclusion that we must be **policy-configurable per class** | Combine rules (guaranteed) + neural (contextual) instead of choosing |

### 2.2 Browser-agent engineering

- **WebVoyager** (arXiv 2401.13919) — established **Set-of-Mark**: overlay numbered boxes on interactive elements so the VLM names a target instead of guessing pixels. *We use SoM, but our marks come from the DOM ∪ local-detector union, and the marks survive redaction.*
- **SeeAct / OSCAR** — combine screenshot with accessibility-tree semantics rather than pixels alone. *Validates our hybrid observation.*
- **OmniParser V2** (Microsoft) — YOLOv8 icon detector + Florence-2 captioner; 39.6 avg on ScreenSpot-Pro; ~0.6 s/frame on A100, 0.8 s on a 4090. *Too heavy for the client as-is; we distil the idea into a small YOLO trained on WebUI+Rico and skip the captioner (on the web, the DOM gives us names for free).*
- **Nanobrowser** — open-source MV3 multi-agent web automation extension; proves the extension-hosted agent pattern is viable and popular. *It sends raw page content to the LLM — exactly the gap we close.*
- **"Building Browser Agents"** (arXiv 2511.19477) — extension vs CDP vs headless trade-offs; least-privilege execution contexts; batching observations to cut latency. *Direct input to `ARCHITECTURE.md §3`.*
- **Mind2Web / WebCanvas / dark-pattern studies** — reminders that real pages are hostile and success must be measured on *live* pages, not static replays.

### 2.3 Attacks we must design against

- **Indirect prompt injection via the accessibility tree** (arXiv 2507.14799) and the Brave/Comet disclosures: white-on-white text, HTML comments, ARIA labels, off-screen nodes instructing the agent to fetch OTPs or visit banking portals. Defence: untrusted-content fencing, instruction hierarchy, action risk gating, **capability-level** limits (the model can never issue a raw `fetch`).
- **Environmental Injection Attack / EIA** (arXiv 2409.11295) — a page injects a fake form to harvest PII the agent is carrying. Defence: **sink binding** on every placeholder.
- **Context manipulation / corrupted memory** (arXiv 2506.17318) — poisoning the agent's step history. Defence: server state derives only from client-signed SSG, never from page text.
- **Embedding inversion** (Zero2Text 2026; ALGEN 2502.11308) and **feature inversion on split DNNs** (2511.15316, FIA-Flow) — original inputs can be reconstructed from "anonymous" intermediate features. **This kills the naive "just send embeddings" architecture.** It is why PRAHARI sends *redacted human-readable artefacts* (auditable) instead of latent vectors (not auditable). Say this out loud to judges — most teams will propose embeddings and not know this.

---

## 3. Technology landscape as of Sept 2026 (verified)

### 3.1 Client-side inference

| Capability | State | Consequence for us |
|---|---|---|
| **WebGPU** | Ships by default in Chrome 113+, Edge, Safari 17.4+, **Firefox 141+ (Windows)**, **Firefox 145+ (macOS/Apple Silicon)**. Linux & Android Firefox still in progress. | WebGPU is the primary path; **WASM fallback is mandatory**, not optional — a real slice of Firefox users will hit it. |
| **ONNX Runtime Web** | EPs: `webgpu`, `wasm`, `webnn` (experimental), `webgl` (legacy). WebGPU measured 5–20× faster than WASM for NN inference. | Target `webgpu` → `wasm` with a capability probe at install time. |
| **Transformers.js v3/v4** | 120+ architectures, 1200+ pre-converted models; per-module dtype (`fp32/fp16/q8/int8/uint8/q4/bnb4/q4f16`); vision additions include **Florence-2, Moondream, LLaVA, RT-DETR, MobileNetV1–V4, Depth-Pro, MaskFormer**. v4 (Feb 2026) demoed a 20 B model at ~60 tok/s on M4 Pro Max with `q4f16`. | Florence-2 + detection models in the browser for free. Rule of thumb for interactive UI: **≤2 B params** on mainstream hardware. |
| **WebNN** | W3C Candidate Recommendation; behind a flag in Chrome/Edge; CPU broadly, GPU/NPU in preview; DirectML deprecated in favour of Windows ML routing. | **Not production-ready.** Ship a WebNN EP behind a feature flag as the "future NPU path" slide; never depend on it. |
| **Chrome built-in AI (Gemini Nano, Prompt API)** | Multimodal (text/image/audio) input; model downloaded per-origin; extension-accessible. | Excellent **opportunistic** Tier-0 reasoner on Chrome. Never a hard dependency (absent on Firefox, gated on Chrome). |
| **`chrome.tabs.captureVisibleTab`** | Throttled by `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` ≈ **2 fps** since Chrome 92. | Screenshots are a **scarce resource**. DOM-first observation is not merely cheaper — it is architecturally forced. Use `chrome.tabCapture` / `getDisplayMedia` MediaStream for the rare high-fps need. |
| **MV3 service worker** | No DOM, **no WebGPU**, terminates after ~30 s idle. | All inference lives in an **offscreen document** (Chrome). Firefox MV3 keeps **event pages** (`background.scripts`) which *are* documents → WebGPU works directly there. One codebase, two manifests. |
| **`chrome.debugger`** | Gives CDP incl. `Accessibility.getFullAXTree` and `Input.dispatch*` (trusted events). Shows a warning bar. | Opt-in "High-Fidelity Mode". Firefox does not implement `getFullAXTree` (bugzilla 1549419) → DOM-derived AX shim there. |
| **Cross-browser namespace** | `browser.*` is native in Firefox/Safari and lands in Chrome 148 / Edge 136 (mid-2026). | Use `webextension-polyfill` now; drop it later without code changes. |

### 3.2 Candidate on-device models

| Job | Model | Size (quantised) | Notes |
|---|---|---|---|
| Face detection | MediaPipe **BlazeFace** short/full-range or **YOLOv8n-face** ONNX | 230 KB – 6 MB | 8–20 ms @640 px. |
| Text **detection** (find text in pixels) | **PP-OCRv5 det** (DB) ONNX int8 | ~5 MB | Only for non-DOM pixels (canvas / img / video / PDF). |
| Text **recognition** | **PP-OCRv5 rec** ONNX int8 | ~10–16 MB | Crop-and-recognise on candidate boxes only, never the whole page. PP-OCRv6 (1.5 M–34.5 M params) is the upgrade path. |
| UI element / icon detection | **YOLOv8n/YOLO11n** fine-tuned on unified **WebUI (~400 k pages) + Rico** set (105,130 images / 3.3 M annotations / 12 classes) | 6–12 MB | Our "equivalent CV model". Gives actionability on canvas apps where DOM is blind. |
| PII NER (contextual) | **GLiNER-PII edge/small** ONNX int8 (Knowledgator, 60+ entity types, zero-shot) | 40–90 MB | JS `Gliner` class supports the `webgpu` EP. Zero-shot ⇒ new PII classes without retraining. |
| Screen-state VLM (decision + grounding) | **Florence-2-base (230 M)** via `onnx-community/Florence-2-base`, or **SmolVLM-256M/500M** | 250–350 MB (q4) | The literal "local ViT that reads the screen". Lazy-downloaded, opt-in. One checkpoint gives OD / caption / grounding / OCR. |
| Change detection | dHash + tile diff (hand-written, no model) | 0 | The cheapest and most valuable component in the whole stack. |

**Default bundle < 120 MB. With optional local VLM < 450 MB.** Cached via the Cache API, downloaded progressively with a visible progress bar.

### 3.3 Server-side

- **Model**: `Qwen3-VL-8B-Instruct` (primary) — SOTA open-weights GUI grounding; the 235B-A22B variant leads ScreenSpot / ScreenSpot-Pro / OSWorld-G, and the 32B scores 41 on OSWorld and 63.7 on AndroidWorld. `Qwen2.5-VL-7B-Instruct` as the low-VRAM fallback. Text-only fast path: `Qwen3-8B`.
- **Serving**: **vLLM** (PagedAttention throughput) with **XGrammar** guided decoding for the action JSON schema. SGLang is the alternative if we need per-step mask/inference overlap — it hides grammar latency better.
- **Why open weights matter here**: R9 demands offline deployability. Everything ships as a `docker compose` that runs air-gapped on one A100/L40S; during SIH we point at a cloud-hosted endpoint of the *same weights* and prove parity with a config flag.

---

## 4. Vocabulary (use these exact terms everywhere)

| Term | Meaning |
|---|---|
| **PRAHARI** | The whole system (extension + server). |
| **NETRA** | On-device perception stack: capture, detect, classify, ground. *"eye"* |
| **KAVACH** | On-device privacy engine: detectors → policy → redaction → vault → egress guard. *"armour"* |
| **SETU** | The wire contract: SSG + Action Plan + Redaction Manifest. *"bridge"* |
| **MANTRI** | Server-side planner/reasoner (the remote VLM/LLM). *"counsellor"* |
| **HASTA** | Client-side action executor. *"hand"* |
| **LEKHA** | Privacy Ledger — signed, user-inspectable log of every egress. *"record"* |
| **SSG** | **Sanitized Screen Graph** — the JSON representation of the screen *after* redaction. The only structured thing that leaves the machine. |
| **Tier 0 / 1 / 2** | Escalation ladder: local-only / SSG-to-server / SSG + redacted-pixels-to-server. |
| **Placeholder / Token** | `⟦CLASS_n⟧`, e.g. `⟦AADHAAR_1⟧`. Deterministic within a session, unlinkable across sessions. |
| **Vault** | Client-only, in-memory map placeholder → `{value, class, origin, allowed_sinks, ttl}`. Never persisted, never serialised. |
| **Sink binding** | A placeholder may only be detokenised into its origin element (or an explicitly compatible field). Anti-exfiltration. |
| **Egress choke point** | The single module (`egress-guard`) through which 100 % of network traffic must pass. Everything else is network-denied by manifest. |
| **Canary** | A unique planted string used to *prove* non-leakage by automated test. |
| **APC** | Adaptive Perception Controller — decides tier and detector budget per step. |
| **Leak Rate (LR)** | Fraction of egress payloads containing ≥1 unredacted PII instance. Headline metric. |

---

## 5. PII taxonomy (v1) — classes, detectors, default policy

Classes are grouped by *how they are found*, because that determines cost and achievable recall.

### 5.1 Tier A — Structured & checksum-verifiable (target recall ≥ 0.99, precision ≥ 0.98)

| Class | Signal | Validator |
|---|---|---|
| `PASSWORD` | `input[type=password]`, `autocomplete=current-password/new-password` | deterministic |
| `OTP` | `autocomplete=one-time-code`, `inputmode=numeric` + label regex | deterministic |
| `AADHAAR` | 12 digits, spaced `#### #### ####` | **Verhoeff checksum** |
| `PAN` | `[A-Z]{5}[0-9]{4}[A-Z]` | 4th-char entity-code table |
| `CARD_NUMBER` | 13–19 digits | **Luhn** + IIN range |
| `CVV` | `autocomplete=cc-csc` | deterministic |
| `IFSC` | `[A-Z]{4}0[A-Z0-9]{6}` | bank-code prefix table |
| `UPI_VPA` | `name@bank` | handle allowlist |
| `GSTIN` | 15 chars | state code + checksum |
| `BANK_ACCOUNT` | 9–18 digits near account labels | context |
| `ABHA_ID` | 14 digits / `name@abdm` | checksum |
| `VOTER_ID` | `[A-Z]{3}[0-9]{7}` | format |
| `DRIVING_LICENCE` | `[A-Z]{2}[0-9]{2}…` | state-code table |
| `PASSPORT_IN` | `[A-Z][0-9]{7}` | format |
| `EMAIL`, `PHONE_IN`, `IP`, `IMEI`, `MAC` | regex | RFC / Luhn (IMEI) |
| `API_KEY`, `JWT`, `PRIVATE_KEY` | entropy + prefix (`sk-`, `ghp_`, `-----BEGIN`) | Shannon entropy > 3.5 |

> **The Indian identifier pack with real checksums is a first-class differentiator.** Verhoeff on Aadhaar alone removes ~90 % of the false positives a naive 12-digit regex produces on any page containing invoice or order numbers.

### 5.2 Tier B — Contextual (target recall ≥ 0.92, precision ≥ 0.88)

`PERSON_NAME`, `ADDRESS`, `DOB`, `AGE`, `GENDER`, `RELIGION`, `CASTE`, `HEALTH_CONDITION`, `MEDICATION`, `DIAGNOSIS`, `EMPLOYER`, `SALARY`, `JOB_TITLE`, `EDUCATION`, `GEO_COORDS`, `VEHICLE_REG`, `BIOMETRIC_REF`, `SEXUAL_ORIENTATION`, `POLITICAL_AFFILIATION`, `CRIMINAL_RECORD`, `MESSAGE_BODY` (private chat content).

Found by **GLiNER-PII** (zero-shot — so this list is *configuration*, not code) with DOM-label priors boosting scores.

### 5.3 Tier C — Visual-only (no DOM evidence)

`FACE`, `SIGNATURE`, `ID_DOCUMENT` (Aadhaar/PAN card photo), `HANDWRITING`, `QR_CODE`/`BARCODE` (can encode UPI/identity), `SCREENSHOT_IN_PAGE`, `MAP_PIN_HOME`, `CAMERA_FEED` (`<video>` with a live track).

Found by BlazeFace / YOLO / text-detection-in-image. **Default policy for `<video>` with an active camera track is full blackout, no exceptions.**

### 5.4 Default policy matrix

| Class group | Text channel | Pixel channel | Reversible? |
|---|---|---|---|
| Credentials (`PASSWORD`, `CVV`, `OTP`, `API_KEY`, `PRIVATE_KEY`) | `⟦REDACTED⟧`, **not vaulted** | Solid black box | **No — never leaves the vault, never detokenised on server request** |
| Government IDs (`AADHAAR`, `PAN`, …) | `⟦AADHAAR_1⟧` | Solid box + type glyph | Yes — **sink-bound to origin field only**, HIGH-risk confirm |
| Financial (`CARD_NUMBER`, `BANK_ACCOUNT`, `AMOUNT`) | `⟦CARD_1⟧` (last-4 optionally preserved per policy) | Solid box | Yes — sink-bound, HIGH-risk confirm |
| Contact (`EMAIL`, `PHONE`, `ADDRESS`) | `⟦EMAIL_1⟧` | Solid box | Yes — sink-bound |
| Identity (`PERSON_NAME`, `DOB`) | `⟦PERSON_1⟧` | Solid box | Yes |
| Health / special category | `⟦HEALTH_1⟧` | Solid box | Yes — MEDIUM-risk confirm |
| `FACE` | n/a | **Gaussian blur σ = 0.12 · min(w,h)** + border | n/a |
| `SIGNATURE`, `ID_DOCUMENT` | n/a | Solid box | n/a |
| `QR`/`BARCODE` | n/a | Pixelate 12×12 | n/a |

**Marker convention (adapted from CAPED):** every pixel redaction is drawn as a filled rectangle in `#2B3A4A` at 92 % opacity, a 2 px `#6EA8FE` border, and a 12 px class glyph top-left. The remote VLM is told this convention in its system prompt, so it *knows a masked region exists and what type it is* — it does not hallucinate over a black hole.

---

## 6. Compliance framing (DPDP Act 2023) — say this to judges

| DPDP principle | How PRAHARI satisfies it *structurally* (not by policy promise) |
|---|---|
| **Data minimisation** (§8(4)) | The tier ladder sends the *minimum sufficient* representation; Tier 0 sends nothing at all. |
| **Purpose limitation** (§4, §6) | Each egress carries a `purpose` field bound to the user's stated task; the ledger records it. |
| **Consent & notice** (§5–6) | Per-site, per-class consent in the side panel; HIGH-risk actions require fresh, specific consent. |
| **Storage limitation** (§8(7)) | Vault is memory-only with TTL; server retains SSG only for session lifetime; ledger is local. |
| **Right to erasure / access** (§12) | "Export ledger" and "Wipe session" are one click. Nothing to erase server-side because nothing identifying was ever stored. |
| **Security safeguards** (§8(5)) | Single choke point, fail-closed defaults, HMAC-signed audit trail, no PII in logs on either side. |
| **Breach notification** (§8(6)) | The server ingress scanner raises `REDACTOR_FAILURE`; the ledger flags the affected step to the user immediately. |

Also maps cleanly to **GDPR Art. 25 (privacy by design)** and **ISO/IEC 27701**. One slide, high impact.

---

## 7. Non-goals (protect the scope)

- ❌ Not a general RPA / macro recorder.
- ❌ Not a password manager (we *detect* credentials to protect them; we never store or autofill from our own store).
- ❌ No fully-local LLM as the primary reasoner (the PS explicitly wants a hybrid; the local VLM is a Tier-0 accelerator and a fallback).
- ❌ No FHE / MPC / TEE inference in v1 (documented as future work; FHE latency is 3–6 orders of magnitude off).
- ❌ **No sending latent embeddings as a "privacy" measure** — refuted by embedding/feature-inversion literature; called out explicitly as a rejected design.
- ❌ No mobile app in v1 (architecture is portable; out of finale scope).
- ❌ No credential entry on the user's behalf without explicit per-instance confirmation.

---

## 8. Assumptions & open questions

**Assumptions**

1. Judges will run the demo on a Windows/macOS laptop with a Chromium browser and a working GPU → WebGPU available. The WASM fallback is demoed deliberately once, to prove it.
2. Internet is available at the venue for the cloud-hosted server; we carry a **laptop-local fallback server** (Qwen2.5-VL-3B on the demo machine, or a recorded-response replay server) for the network-failure case.
3. Team of 6 (SIH standard), ~8 weeks of preparation before the finale.

**Open questions to resolve in Phase 0** (owner in brackets)

- **Q1** [ML-Client] Does `gliner-pii-edge` int8 hit our 60 ms budget on a mid-range iGPU, or do we need a cascade (regex → NER only on suspicious nodes)? → Spike `S-02`.
- **Q2** [Ext] Does Firefox's lack of `Accessibility.getFullAXTree` degrade grounding measurably, or is the DOM-derived AX shim sufficient? → Spike `S-04`.
- **Q3** [Privacy] Ship last-4 preservation for cards (better utility, slightly worse privacy) default-on or default-off? → Decide with the policy matrix in Phase 1.
- **Q4** [Backend] Qwen3-VL-8B vs Qwen2.5-VL-7B on our own SSG-format eval — which wins on action validity? → Bake-off `S-07`.
- **Q5** [All] Include the optional local VLM (Florence-2) in the default install, or make it a one-click upgrade? Download size vs "look, a real ViT" demo value.

---

## 9. Reading order for a new team member

1. **CONTEXT.md** (this file) — vocabulary + why.
2. **PRD.md** — what we build and how we know it works.
3. **ARCHITECTURE.md** — components, boundaries, trust model.
4. **PIPELINE.md** — the per-step data flow in microscopic detail.
5. **IMPLEMENTATION-PLAN.md** — file tree, schemas, APIs, tickets.
6. **TEAM-ROLES.md** — who owns what.
7. **RULES.md** — how we work (non-negotiable engineering rules).
8. **PHASEWISE.md** — the calendar.

---

## 10. Sources

Research base for this document (accessed Sept 2026):

- [PrivWeb: Unobtrusive and Content-aware Privacy Protection For Web Agents](https://arxiv.org/pdf/2509.11939)
- [CAPED: Context-Aware Privacy Exposure Defense for Mobile GUI Agents](https://arxiv.org/pdf/2606.12666)
- [Casper: Prompt Sanitization for Protecting User Privacy in Web-Based LLMs](https://arxiv.org/pdf/2408.07004)
- [WebPII: Benchmarking Visual PII Detection for Computer-Use Agents](https://arxiv.org/pdf/2603.17357)
- [GUIGuard-Bench: Toward a General Evaluation for Privacy-Preserving GUI Agents](https://arxiv.org/pdf/2601.18842)
- [RedactionBench](https://arxiv.org/pdf/2606.18782)
- [BodhiPromptShield: Pre-Inference Prompt Mediation](https://arxiv.org/pdf/2604.05793)
- [Anonymization-Enhanced Privacy Protection for Mobile GUI Agents: Available but Invisible](https://arxiv.org/html/2602.10139)
- [WebVoyager: Building an End-to-End Web Agent with Large Multimodal Models](https://arxiv.org/pdf/2401.13919)
- [Building Browser Agents: Architecture, Security, and Practical Solutions](https://arxiv.org/pdf/2511.19477)
- [Manipulating LLM Web Agents with Indirect Prompt Injection via HTML Accessibility Tree](https://arxiv.org/pdf/2507.14799)
- [EIA: Environmental Injection Attack on Generalist Web Agents for Privacy Leakage](https://arxiv.org/pdf/2409.11295)
- [Context Manipulation Attacks: Web Agents Are Susceptible to Corrupted Memory](https://arxiv.org/pdf/2506.17318)
- [What Your Features Reveal: Black-Box Feature Inversion for Split DNNs](https://arxiv.org/abs/2511.15316)
- [ALGEN: Few-shot Inversion Attacks on Textual Embeddings](https://arxiv.org/pdf/2502.11308)
- [Characterizing WebGPU Dispatch Overhead for LLM Inference](https://arxiv.org/pdf/2604.02344)
- [OmniParser for Pure Vision Based GUI Agent](https://arxiv.org/pdf/2408.00203)
- [OmniParser V2 — Microsoft Research](https://www.microsoft.com/en-us/research/articles/omniparser-v2-turning-any-llm-into-a-computer-use-agent/)
- [WebUI: A Dataset for Enhancing Visual UI Understanding with Web Semantics](https://arxiv.org/pdf/2301.13280)
- [Unified GUI Element Detection Dataset (Rico + WebUI, YOLO format)](https://zenodo.org/records/19195885)
- [ScreenSpot-Pro: GUI Grounding for Professional High-Resolution Computer Use](https://arxiv.org/pdf/2504.07981)
- [Qwen3-VL Technical Report](https://arxiv.org/pdf/2511.21631)
- [Transformers.js v3: WebGPU Support, New Models & Tasks](https://huggingface.co/blog/transformersjs-v3)
- [Transformers.js — Using quantized models (dtypes)](https://huggingface.co/docs/transformers.js/en/guides/dtypes)
- [ONNX Runtime — WebGPU Execution Provider](https://onnxruntime.ai/docs/execution-providers/WebGPU-ExecutionProvider.html)
- [ONNX Runtime — Using WebNN](https://onnxruntime.ai/docs/tutorials/web/ep-webnn.html)
- [WebGPU is now supported in major browsers — web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- [Offscreen Documents in Manifest V3 — Chrome for Developers](https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3)
- [chrome.debugger API](https://developer.chrome.com/docs/extensions/reference/api/debugger)
- [chrome.tabs API (captureVisibleTab)](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [The Prompt API — Chrome built-in AI](https://developer.chrome.com/docs/ai/prompt-api)
- [Firefox Manifest V3 migration guide](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)
- [MDN: Build a cross-browser extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension)
- [knowledgator/gliner-pii-edge-v1.0](https://huggingface.co/knowledgator/gliner-pii-edge-v1.0)
- [onnx-community/Florence-2-base](https://huggingface.co/onnx-community/Florence-2-base)
- [SmolVLM — small yet mighty Vision Language Model](https://huggingface.co/blog/smolvlm)
- [MediaPipe Face Detection (BlazeFace)](https://developers.google.com/mediapipe/solutions/vision/face_detector)
- [PP-OCRv6: From 1.5M to 34.5M Parameters](https://arxiv.org/pdf/2606.13108)
- [XGrammar: Flexible and Efficient Structured Generation Engine](https://arxiv.org/pdf/2411.15100)
- [Guided Decoding Performance on vLLM and SGLang — SqueezeBits](https://blog.squeezebits.com/guided-decoding-performance-vllm-sglang)
- [CanaryBench: Stress Testing Privacy Leakage](https://arxiv.org/html/2601.18834v1)
- [Nanobrowser — open-source AI web agent extension](https://github.com/nanobrowser/nanobrowser)
