# PHASEWISE.md — PRAHARI

> The calendar: eight phases, hard exit criteria, and the 36-hour finale plan.
> v1.0 · Prerequisites: `IMPLEMENTATION-PLAN.md` (ticket IDs), `TEAM-ROLES.md` (role codes)

**Anchor**: Day 0 = **Mon 8 Sep 2026**. Phases are 1 week unless noted. Shift the whole calendar if your internal-hackathon date differs; the *ordering* is the part that matters and should not be reordered.

```
W0 ──┬── P0  Foundation & Spikes          (de-risk before you commit)
W1 ──┼── P1  Walking Skeleton             ★ the loop runs end-to-end
W2 ──┼── P2  Real Perception              (see the screen properly)
W3 ──┼── P3  Real Redaction               ★ the privacy claim becomes true
W4 ──┼── P4  Real Reasoning + Action      ★ first genuine task completion
W5 ──┼── P5  Hardening & Adversarial      (make it not break)
W6 ──┼── P6  Measurement & Ablation       ★ the numbers that win the argument
W7 ──┼── P7  Polish, Demo, Submission     (freeze)
W8+ ─┴── P8  Finale Sprint (36 h)         (execute the plan, change nothing)
```

The ordering encodes one belief: **build the thin end-to-end loop first, then thicken it.** Teams that build components in parallel and integrate in week 6 do not have a demo in week 8.

---

## Phase 0 — Foundation & Spikes (W0, 5 days)

**Goal**: kill the five unknowns that could invalidate the architecture, before anyone writes production code.

### Spikes (timeboxed, 1 day each, written result in `docs/adr/`)

| ID | Question | Owner | Kill criterion | Fallback if it fails |
|---|---|---|---|---|
| **S-01** | Can we run ONNX inference on WebGPU inside a Chrome offscreen document, and inside a Firefox event page, from one codebase? | MLC | > 2 days of work to make Firefox work | Firefox runs WASM only; document it and move on |
| **S-02** | Does `gliner-pii-edge` int8 hit ≤60 ms on device class B for a realistic batch? | MLC + PRV | > 150 ms even after batching | Cascade harder: regex prefilter → NER on ≤10 spans; or drop to a distilled BERT-NER |
| **S-03** | Can `captureVisibleTab` + downscale + OffscreenCanvas redaction + JPEG encode complete in ≤120 ms at 1440p? | EXT + PRV | > 300 ms | Capture at lower DPR; redact at 960 px |
| **S-04** | How much do we lose using a DOM-derived AX shim instead of `Accessibility.getFullAXTree`? | EXT | role/name agreement < 80 % | Make High-Fidelity Mode default-on for Chrome |
| **S-05** | Does vLLM + XGrammar produce 100 % schema-valid action plans for our schema, and at what latency cost? | BE + SML | validity < 99 % or > 300 ms grammar overhead | Switch to SGLang (better grammar/inference overlap) or simplify the schema |

### Also in W0
- Repo scaffolding, monorepo, CI skeleton (LEAD).
- Everyone completes their **week-0 ramp task** (`TEAM-ROLES.md §6`).
- `models/manifest.json` first draft with candidate models + sizes (MLC).
- First 200 unit tests for Verhoeff/Luhn (PRV) — these are pure functions, they can be written before anything else exists.
- Server: `docker compose up` runs a small VLM and answers one request (BE).

### Exit criteria (all must be true to enter P1)
- [ ] All five spikes have a written answer and a decision recorded.
- [ ] CI runs lint + unit on every push.
- [ ] Every team member has loaded an unpacked extension in **both** browsers.
- [ ] `docker compose up` works on someone else's machine, first try.
- [ ] Model shortlist frozen with measured sizes and latencies.

---

## Phase 1 — Walking Skeleton (W1)

**Goal**: the full loop runs end-to-end with stubs everywhere. This is the most important week of the project.

### Build
| Ticket | What | Owner |
|---|---|---|
| A1–A3 | Monorepo build → both manifests load; typed message bus across all 4 contexts | LEAD, EXT |
| A5 | Side panel: goal input, status line, kill switch | EXT |
| B1 (v0) | DOM walker returning 50 real elements with bboxes and names | EXT |
| C1–C3 | Capability probe, model registry, warm pool; **BlazeFace running** | MLC |
| D1, D3 | Text normalisation; global regex pack | PRV |
| D12 (v0) | Egress guard: schema check + regex sweep + ledger write | PRV |
| F1, F3 | FastAPI `/v1/agent/step` + XGrammar returning a real (if simple) plan | BE, SML |
| E1, E5 | HASTA: resolve target, dispatch click/scroll/type | EXT |

### Exit criteria
- [ ] **The loop runs**: type a goal → SSG built → guard passes → server returns a plan → the page actually scrolls/clicks. In Chrome *and* Firefox.
- [ ] Ledger shows one entry per request with a SHA-256.
- [ ] `eslint-plugin-prahari/no-network-outside-net` is live and failing on a deliberate violation.
- [ ] Daily automated integration run is green.

> If the loop is not running end-to-end by the end of W1, **cut scope immediately** — drop the local VLM, drop OCR, drop High-Fidelity mode. Do not enter P2 with a broken loop.

---

## Phase 2 — Real Perception (W2)

**Goal**: the client actually sees the screen, structurally and visually.

### Build
| Ticket | What | Owner |
|---|---|---|
| B1–B7 | Full extraction: implicit roles, accname, geometry, frame stitching, shadow roots, settle detection, dirty tracking | EXT |
| B3 | Stable element IDs surviving React re-render | EXT |
| C4–C5 | Face detection wired to real regions; `<video>` live-track rule; dHash + tile diff | MLC |
| C6 | **UI-element YOLO**: train on unified WebUI+Rico, export opset-12 ONNX, int8, benchmark in browser | MLC (starts W1, lands W2) |
| C7–C8 | DOM↔widget reconciliation, vision-only elements, coverage mask, `unexplained_pixel_ratio` | MLC |
| A6 | Throttle-aware capture with token bucket | EXT |
| D2 | L0 DOM rules + site sensitivity list | PRV |
| H1–H2 | Faker-IN generator + 10 page templates → 500-page corpus | PRV |
| F2 | vLLM deployment for both models; compose finalised | BE |
| G1–G2 | System prompt + redaction contract + 6 few-shot exemplars | SML |

### Exit criteria
- [ ] Extraction returns a correct, complete element list on 10 real sites, verified by overlay.
- [ ] YOLO runs in-browser at p50 ≤ 45 ms (class B), mAP drop from fp32 < 2 pts.
- [ ] Faces detected and boxed on a page with 5 portraits; a live webcam `<video>` is blacked out.
- [ ] `unexplained_pixel_ratio` computes correctly on a canvas-heavy page.
- [ ] 500-page synthetic corpus generated with ground-truth spans.
- [ ] `docs/metrics/inference.md` exists with real numbers for class B and C.

---

## Phase 3 — Real Redaction (W3) ★ the pivotal week

**Goal**: the privacy claim becomes true and demonstrable.

### Build
| Ticket | What | Owner |
|---|---|---|
| D4 | **India pack + validators**: Verhoeff, PAN, GSTIN, IFSC, UPI, ABHA, Voter, DL | PRV |
| D5–D7 | Secrets/entropy; cascade + cache; fusion (noisy-OR, class lattice) | PRV |
| D8 | Policy engine + packs (default/gov/bank/health) | PRV |
| D9–D10 | Text redaction with deterministic tokens; pixel redaction with the CAPED marker convention | PRV |
| D11 | **Vault + sink binding + TTL + reversibility** | PRV |
| D12 | **Egress guard: all 8 checks**, including the JPEG image-verification pass | PRV |
| D14–D15 | LEKHA ledger; glass-box overlay | PRV |
| C10 | GLiNER-PII wrapper: batching, buckets, cache, abort → fail-closed | MLC |
| C12 | APC v1: signals + tier selection + budgets | MLC |
| H3 | **Canary suite**: 60 canaries × 12 surfaces + automated leak check | PRV |
| F4–F5 | Server ingress PII guard (Python mirror) + parity test + image sanity | BE |

### Exit criteria
- [ ] **Canary suite: 0/60 leaked**, and the job is BLOCKING in CI.
- [ ] Redaction recall on the synthetic corpus: Tier A ≥ 0.99, Tier B ≥ 0.92, faces ≥ 0.97.
- [ ] Precision ≥ 0.90 overall (measure it; over-redaction is a real cost).
- [ ] TS↔Python regex parity: zero disagreements on 10,000 fixtures.
- [ ] Guard blocks all 40 crafted bad payloads.
- [ ] Glass-box overlay visibly boxes every redaction on a live page.
- [ ] Sink binding: a hand-crafted malicious plan attempting `type ⟦AADHAAR_1⟧ into e99` is refused and logged.

> **This is the phase you cannot compress.** If W3 slips, take the week from P5, not from here.

---

## Phase 4 — Real Reasoning + Action (W4)

**Goal**: the agent completes a real multi-step task, safely.

### Build
| Ticket | What | Owner |
|---|---|---|
| E2–E4 | Client-side risk derivation; risk gating UI; detokenisation with full enforcement | EXT, PRV |
| E7–E8 | Character-wise typing + autocomplete settling; post-condition read-back | EXT |
| G3–G4 | Planner/Grounder split; text-only fast path | SML |
| G5 | Injection classifier + `<untrusted_page_content>` fencing | SML |
| G6 | Model bake-off on our own eval → pick the server model | SML |
| F7 | Server post-validation (targets exist, no literal PII, escalation-only risk) | BE |
| D16 | **"What the server saw" diff viewer** (image + JSON, side by side) | PRV |
| H4 | Task suite: 40 tasks + automated success predicates | SML + PRV |
| I1 | Mock government-scheme portal (the Asha demo target) | LEAD/UX |
| C9 | PP-OCR det+rec on non-DOM pixels | MLC |

### Exit criteria
- [ ] The **Asha task completes end-to-end**, unattended, in both browsers.
- [ ] TSR ≥ 60 % on the 40-task suite (this week's bar; 75 % is the P6 bar).
- [ ] Action schema validity = 100 % over 500 generations.
- [ ] A HIGH-risk action reliably stops for confirmation and shows the masked value.
- [ ] The diff viewer renders a byte-accurate "what left the machine" for any ledger entry.
- [ ] Server model chosen, with the bake-off table written down.

---

## Phase 5 — Hardening & Adversarial (W5)

**Goal**: make it survive hostile pages, bad networks, and weak hardware.

### Build
| Ticket | What | Owner |
|---|---|---|
| H8 | Adversarial suite: injection (white-on-white, comments, ARIA, off-screen, CSS-hidden), split-node PII, homoglyphs, zero-width, image-only PII, fake-form EIA | PRV |
| C11 | Florence-2 local VLM (screen class + grounding) — first P1 item, drop if late | MLC |
| C13 | WASM fallback tuning for device class C | MLC |
| A7 | AX provider: CDP path + shim parity | EXT |
| E6 | CDP trusted-event path (High-Fidelity Mode) | EXT |
| G8 | Failure-recovery prompting; `ask_user` policy | SML |
| F9 | **Air-gapped compose** + nightly CI job on an isolated runner | BE |
| F10 | Local fallback server on the demo laptop | BE |
| D17 | Canary mode in the UI (run the leak test live) | PRV |
| — | Failure drill #1: kill network / disable WebGPU / corrupt a model / exceed capture quota | LEAD |

### Exit criteria
- [ ] Adversarial suite: **0 successful high-risk executions**; recall on evasive PII within 3 pts of clean corpus.
- [ ] The failure drill passes: every failure degrades visibly and the loop continues.
- [ ] Air-gapped nightly job green — R9 ("offline deployable") is now proven, not claimed.
- [ ] Device class C (WASM only) completes the Asha task, p50 Tier-2 ≤ 4 s.
- [ ] Firefox parity: the full task suite runs on Firefox with TSR within 5 pts of Chrome.

---

## Phase 6 — Measurement & Ablation (W6) ★ the week that wins the argument

**Goal**: produce the numbers. Judges reward measured trade-offs over asserted ones — and R8 explicitly asks for this.

### Build
| Ticket | What | Owner |
|---|---|---|
| H5–H7 | Playwright runner (both browsers); latency harness; accuracy harness | PRV + SML |
| H9 | **Ablations** for the trade-off tables | MLC + SML |
| C12 | APC weight fitting on the corpus (grid search on `TSR − λ·latency`) | MLC |
| — | `docs/metrics/` fully auto-generated | all |

### The five tables that must exist by end of W6

1. **Tier trade-off** — TSR / p50 / bytes / leak rate for: always-T0, always-T1, always-T2, adaptive.
2. **Privacy cost of redaction** — TSR with redaction ON vs OFF (the control), per task category.
3. **Detector ablation** — recall/precision with L0 only, +L1, +L2, +vision; and the latency each layer adds.
4. **Device class scaling** — every stage's p50/p95 on class A / B / C, WebGPU vs WASM.
5. **Model comparison** — server model bake-off; client YOLO int8 vs fp32; GLiNER edge vs small.

### Exit criteria
- [ ] All five tables generated from real runs and committed under `docs/metrics/`.
- [ ] TSR ≥ 75 % on the 40-task suite (stretch 85 %).
- [ ] p50 latencies within the `PRD.md §7` budget.
- [ ] Leak rate: 0/60 canaries, < 0.5 % on the synthetic corpus.
- [ ] Every number in the draft deck traces to a file in `docs/metrics/`.

---

## Phase 7 — Polish, Demo, Submission (W7) — **FEATURE FREEZE**

**Goal**: nothing new. Make what exists reliable and legible.

### Build
| Ticket | What | Owner |
|---|---|---|
| A8 | Packaging: CWS zip + signed `.xpi` | EXT |
| I2 | Demo script: 8 beats, each with a failure-recovery plan | LEAD |
| I3 | Pitch deck | LEAD + all |
| I4 | 3-minute video | LEAD/UX |
| I5 | README with 5-minute setup | LEAD |
| I6 | `docs/judge-qa.md` — 30 anticipated questions, 5 per role | all |
| D18 | Policy editor UI — **only if** everything above is done | PRV |

### Rules for W7
- **Feature freeze from Monday.** Bug fixes and copy changes only.
- Three full rehearsals: Wed, Fri, Sun. Timed. On the actual demo machine.
- Failure drill #2 on the demo machine, with the demo script running.
- Freeze the demo machine: pin browser versions, pre-download models, disable auto-update, take a disk snapshot.

### Exit criteria (= `PRD.md §11` release criteria)
- [ ] Fresh-profile install in < 60 s on both browsers.
- [ ] Demo completes twice consecutively, unattended, on the demo machine.
- [ ] Canary test runs live in the UI: 0/60.
- [ ] All metrics regenerated on final code.
- [ ] Deck, video, README, judge-QA sheet done.
- [ ] Repo tagged `v1.0-sih`.

---

## Phase 8 — Finale Sprint (the 36 hours)

You are not building in the finale. You are executing a plan and responding to feedback.

```
H+00  Arrive · set up · run the demo once end-to-end · confirm network
H+01  Mentor round 1  → write down every question asked, verbatim
H+03  Triage: what did mentors misunderstand? (usually a framing problem, not a code problem)
H+04  Fix framing: deck wording, demo ordering, the one-line pitch
H+08  Small, safe code improvements ONLY from the mentor list. No refactors.
H+12  Rehearsal #1 (full, timed)
H+14  Mentor round 2 → repeat triage
H+18  SLEEP IN SHIFTS. Two people awake maximum. This is a rule, not advice.
H+24  Rehearsal #2 · failure drill on the venue network
H+28  Freeze. Zero commits after this point except a demo-breaking hotfix.
H+30  Rehearsal #3 · every speaker says their part aloud
H+32  Buffer (something will go wrong; this hour is for that)
H+34  Final presentation
```

**Finale rules**
- One person owns the laptop. Nobody else touches it.
- A `git tag` is taken at H+00 and at H+28. You can always return to a working state.
- If a mentor suggests a feature, it goes on a slide as "next", not into the code.
- Every code change after H+08 requires a second person's review and a demo re-run.

---

## Demo script — the 8 beats (`docs/demo-script.md`)

Total: **3 minutes**. Rehearse until it is muscle memory.

| # | Beat | What the audience sees | Why it lands | Recovery if it fails |
|---|---|---|---|---|
| **1** | Setup (15 s) | A realistic state-scheme application portal, pre-filled with a photo, an Aadhaar number, address, phone. Side panel open. | Establishes stakes: this is exactly the data you'd never paste into a cloud agent. | Static screenshot slide of the page |
| **2** | The goal (10 s) | Type: *"Apply for the scheme using my saved profile."* Hit go. | Ordinary language, ordinary task. | — |
| **3** | Local perception (20 s) | Overlay lights up: green boxes on widgets, **red** on the Aadhaar field, **blue blur** on the face, black on the password. Badge shows `Tier 1 · local model: YOLO+GLiNER · 38 ms`. | This is R2 and R4, visible. The latency number on screen makes it real. | Pre-recorded 10 s clip as a fallback slide |
| **4** | **"Show what the server saw"** (35 s) | Split view. Left: the real screen. Right: the redacted JPEG + the exact JSON. Aadhaar reads `⟦AADHAAR_1⟧`. Face is blurred. Byte count: **6.1 KB**. | **The money shot.** Everything else is a claim; this is evidence. | Screenshot in the deck (but say it's a screenshot) |
| **5** | The agent works (40 s) | Fields fill. The Aadhaar field receives the **real 12 digits** — typed locally from the vault. Narrate: *"The server told us to put `⟦AADHAAR_1⟧` here. Only this laptop knows what that is."* | This is the idea nobody else will have. It reframes privacy from "hide things" to "the server never needed it". | Manual step-through with the confirm dialog |
| **6** | The stop (20 s) | Final **Submit** → blocking confirmation modal showing the action, the site, and a masked value. Human clicks. | Answers "is this thing safe?" before it's asked. | — |
| **7** | Privacy Ledger (25 s) | Open LEKHA: 9 requests, tier distribution, 0 leaks, 27 redactions, 54 KB total. Click one row → the exact bytes and their hash. | Auditability. This is what a compliance officer asks for. | — |
| **8** | **Live canary test** (15 s) | Click "Run canary test". Progress bar. **`0 / 60 leaked`**. | The claim becomes falsifiable in front of the audience, live. Nobody else will do this. | Pre-run result with the timestamp visible |

**Closing line (say it exactly):**
> *"The server did the reasoning. The laptop kept the secrets. Neither one could have done this alone — and at no point did they need to trust each other."*

**Two optional beats if you have time (or for Q&A):**
- Toggle **Local-Only Mode** → the agent still scrolls and dismisses dialogs with zero network.
- Disable WebGPU → banner appears, the same task completes on WASM, slower, and the UI says so honestly.

---

## Fast path: 72-hour MVP (if you are starting late)

If you have three days, not eight weeks, build exactly this and nothing else:

**Day 1** — Walking skeleton (P1) + DOM extraction (B1–B3) + L0/L1 detectors (D2–D4) + stub server returning a fixed plan.
**Day 2** — Pixel redaction (D10) + egress guard checks 1–3, 7–8 (D12) + real server with guided decoding (F1, F3) + click/type executor (E1, E5) + ledger (D14).
**Day 3** — Face detection (C4) + glass-box overlay (D15) + diff viewer (D16) + 10 canaries (H3) + the demo portal (I1) + the script.

Deliberately dropped: YOLO, OCR, GLiNER, local VLM, Firefox, planner split, adversarial suite, metrics.
Deliberately kept: **the egress guard, the vault, the canary test, the diff viewer.** Those four are the submission; everything else is depth.

---

## Phase-gate checklist (run this at the end of every phase, 60 minutes)

1. Read the exit criteria aloud. Tick each one **only** with evidence — a green CI job, a metrics file, a live run. "It works on my machine" is not evidence.
2. Any criterion unmet → decide now: extend by ≤2 days, or cut scope. Never "we'll catch up later"; you will not.
3. Update the risk register (`PRD.md §10`). Which risks got more likely this week?
4. Re-run the demo. Every phase gate ends with the demo running.
5. Retro: two things to change, written into the next phase's plan.
6. Record the decision in `docs/adr/` with the date. At the finale, being able to say *"we considered X in week 3 and rejected it because Y"* is worth more than most features.
