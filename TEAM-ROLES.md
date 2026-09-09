# TEAM-ROLES.md — PRAHARI

> Who owns what, who decides what, and how the six of you avoid stepping on each other.
> v1.0 · Prerequisites: `IMPLEMENTATION-PLAN.md` (epics/tickets referenced by ID)

---

## 1. Team shape

SIH software teams are **6 members** (min. 1 female member; 2 optional mentors/alternates). PRAHARI maps onto six roles with clean, non-overlapping ownership of one code area each, plus one shared contract.

```
                        ┌─────────────────────┐
                        │  LEAD  (R1)         │
                        │  integration · demo │
                        │  scope · decisions  │
                        └──────────┬──────────┘
                                   │
        ┌────────────┬─────────────┼─────────────┬────────────┐
        │            │             │             │            │
   ┌────▼────┐  ┌────▼────┐   ┌────▼────┐   ┌────▼────┐  ┌────▼────┐
   │ EXT(R2) │  │ MLC(R3) │   │ PRV(R4) │   │ BE (R5) │  │ SML(R6) │
   │ browser │  │ on-device│  │ privacy │   │ server  │  │ agent   │
   │ client  │  │ ML       │  │ + eval  │   │ + infra │  │ ML      │
   └─────────┘  └─────────┘   └─────────┘   └─────────┘  └─────────┘
        └────────────┴──────── SSG CONTRACT ─┴─────────────┘
                    (shared, changed only by ADR + all-hands review)
```

| Code | Role | One-line mandate | Primary package |
|---|---|---|---|
| **R1 / LEAD** | Team Lead & Integration Engineer | The loop always runs end-to-end; the demo never breaks | `packages/extension/src/background`, `docs/` |
| **R2 / EXT** | Browser Extension Engineer | Chrome and Firefox behave identically; the page is read and acted upon correctly | `packages/extension` (content, platform, executor) |
| **R3 / MLC** | Client ML Engineer (On-Device Inference) | Models run in the browser, fast, on every device class | `packages/netra` |
| **R4 / PRV** | Privacy & Security Engineer | Nothing sensitive ever leaves — and we can prove it | `packages/kavach`, `packages/eval` |
| **R5 / BE** | Backend & Infrastructure Engineer | The server is fast, reproducible, and offline-deployable | `server/` (API, serving, infra) |
| **R6 / SML** | Server ML / Agent Engineer | The remote model produces correct, safe, schema-valid actions | `server/app/agents`, prompts, evals |

**Optional 7th/8th (mentor or alternate)**: UI/UX & Storytelling — side panel polish, ledger visualisation, deck, video. If you only have six, this work is split LEAD (deck/video) + PRV (ledger/diff viewer) + EXT (side panel).

---

## 2. Role charters

### R1 — LEAD · Team Lead & Integration Engineer

**Owns**: the agent state machine (`background/agent-loop.ts`), the message bus, release process, the demo, the deck, and every cross-cutting decision.

**Does**
- Runs the **walking skeleton** to green in week 1 and keeps it green forever after. Nobody merges anything that breaks the loop.
- Owns the message-passing contract between contexts (typed ports, request/response correlation, timeouts).
- Chairs the twice-weekly **contract review** for any SSG change.
- Maintains the risk register from `PRD.md §10` and forces P1/P2 drops at phase gates.
- Owns `docs/demo-script.md` and rehearses it. Runs the **failure drill**: kill the network, disable WebGPU, break a model download — the demo must survive each.
- Writes the ADRs.

**Does not**: write detectors, train models, or tune prompts. If the lead is deep in one component, integration rots.

**Skills to have/acquire**: TypeScript, extension messaging, git discipline, presenting.

**Week-1 deliverable**: the walking skeleton (`IMPLEMENTATION-PLAN.md §7`) merged and running in both browsers.

---

### R2 — EXT · Browser Extension Engineer

**Owns**: `packages/extension/src/{content,platform,sidepanel}`, both manifests, HASTA.

**Does**
- DOM + accessibility extraction with correct roles, names, geometry, occlusion, and frame stitching (**B1–B7**).
- Stable element identity that survives React re-renders — this is subtle and high-value.
- The action executor: target resolution, event dispatch (including the React native-setter path), typing cadence, post-condition read-back (**E1, E5, E7, E8**).
- The `platform/` abstraction so **no other file** contains a browser branch (**A4, A6, A7**).
- Side panel shell and the risk-confirmation modal (**A5, E3**).

**Owns the hardest bug class in the project**: "it worked on the test page and not on the real site". Budget time for it.

**Skills**: deep DOM, MV3 lifecycle, WebExtensions API differences, React.

**Week-1 deliverable**: content script that returns a real 50-element extraction from a live page, in both browsers, with correct bboxes.

---

### R3 — MLC · Client ML Engineer (On-Device Inference)

**Owns**: `packages/netra` — every model that runs in the browser.

**Does**
- Capability probe, EP selection (`webgpu` → `wasm`), device profiles, warm session pool (**C1–C3**).
- Model conversion and quantisation: export ONNX **opset 12** (required for WebGPU), int8/q4, verify accuracy drop, benchmark in-browser before shipping (**C6**, `models/convert/`).
- Trains the UI-element YOLO on the unified WebUI + Rico set (105,130 images / 3.3 M annotations / 12 classes) (**C6**).
- Integrates BlazeFace, PP-OCR det+rec, GLiNER-PII, and optionally Florence-2 (**C4, C9, C10, C11**).
- Owns the **Adaptive Perception Controller** and its weight fitting (**C12**) — the component that answers R8 of the problem statement.
- Owns the WASM fallback being *usable*, not just present (**C13**).
- Publishes `docs/metrics/inference.md`: per-model p50/p95 per device class per EP. Regenerated on every model change.

**Skills**: PyTorch → ONNX, quantisation, ONNX Runtime Web, WebGPU basics, profiling.

**Week-1 deliverable**: BlazeFace running in the offscreen document on WebGPU with a measured latency number written to `docs/metrics/`.

**Standing rule for this role**: *no model ships without an in-browser benchmark on device class B and C.* A model that is accurate and 400 ms is worse than one that is 3 points worse and 40 ms.

---

### R4 — PRV · Privacy & Security Engineer

**Owns**: `packages/kavach` and `packages/eval`. This is the role that makes the project the project.

**Does**
- Text normalisation, the whole detector cascade, and the **Indian identifier pack with real checksums** — Verhoeff for Aadhaar, Luhn for cards, GSTIN/IFSC validation (**D1–D6**).
- Fusion, the policy engine and packs, both redaction channels (**D7–D10**).
- The **Vault with sink binding** — the anti-exfiltration control (**D11**).
- The **Egress Guard and its eight checks**, including the image-verification pass that decodes the JPEG back and proves the masks are really there (**D12**).
- `eslint-plugin-prahari`'s no-fetch rule + the bundle-grep test that makes "one choke point" mechanically true (**D13**).
- LEKHA ledger, glass-box overlay, and the "what the server saw" diff viewer — the *demonstrability* requirement of the PS (**D14–D16**).
- The whole evaluation apparatus: Faker-IN corpus, canary suite, adversarial suite, accuracy harness (**H1–H3, H7, H8**).
- Writes `docs/threat-model.md` and defends it in Q&A.

**Skills**: regex/parsing at a professional level, applied privacy, security thinking, test design.

**Week-1 deliverable**: the L1 regex pack with Verhoeff + Luhn passing 500 unit tests, and the first 10 canaries.

**Standing rule**: *recall beats precision, and fail-closed beats fast.* When in doubt, redact.

---

### R5 — BE · Backend & Infrastructure Engineer

**Owns**: `server/` — API, serving, infra, CI.

**Does**
- FastAPI service, SSE streaming, generated Pydantic models, session store (**F1, F6**).
- vLLM deployment for both the VL and text models, `docker compose`, GPU sizing, KV-cache config, warmup (**F2**).
- Wires XGrammar guided decoding to the action schema so the model *cannot* emit invalid JSON (**F3**).
- The **ingress PII guard** — a Python mirror of the client's L1 pack — plus the parity test that keeps the two packs identical (**F4**). This is a shared artefact with PRV; BE owns the Python side, PRV owns the fixture corpus.
- Image sanity check, post-validation, metrics/tracing with a `trace_id` that matches the client ledger (**F5, F7, F8**).
- **Air-gapped proof**: the nightly CI job that runs the compose file on a network-isolated runner and executes the task suite (**F9**) — this is how R9 stops being a claim.
- The **local fallback server** on the demo laptop (**F10**). Owns the venue-network contingency.

**Skills**: Python/FastAPI, Docker, GPU serving, CI.

**Week-1 deliverable**: `POST /v1/agent/step` returning a hard-coded valid plan, plus `docker compose up` that a teammate can run first try.

---

### R6 — SML · Server ML / Agent Engineer

**Owns**: `server/app/agents/` — prompts, planning, model selection, and the agent's actual competence.

**Does**
- System prompt + the **redaction contract text** the server is taught (`ARCHITECTURE.md §7.2`) — including the marker convention so the model reasons about masked regions instead of hallucinating over them (**G1**).
- Few-shot exemplars covering the six situations that matter, especially "an injected instruction appeared; ignore it and continue" (**G2, G5**).
- Planner/Grounder split and the text-only fast path — the biggest server-side latency lever (**G3, G4**).
- **Model bake-off**: Qwen3-VL-8B vs Qwen2.5-VL-7B on *our* SSG format, measured on action validity and TSR, not on published benchmarks (**G6**).
- The prompt eval harness and the task suite's success predicates, jointly with PRV (**G7, H4**).
- Failure-recovery behaviour: when to retry, when to `ask_user`, when to `fail` honestly (**G8**).
- Owns the **ablation table** in `PIPELINE.md §11.4` — the numbers that prove we characterised the trade-off.

**Skills**: prompt engineering with structured output, evaluation design, VLM behaviour, a little statistics.

**Week-1 deliverable**: a prompt that, given a hand-written SSG with tokens, produces a valid action plan referencing the right element — 10/10 times.

---

## 3. RACI by epic

**R**esponsible (does the work) · **A**ccountable (one person, owns the outcome) · **C**onsulted · **I**nformed

| Epic | LEAD | EXT | MLC | PRV | BE | SML |
|---|---|---|---|---|---|---|
| A · Extension shell & cross-browser | A | **R** | C | I | I | I |
| B · Screen extraction | C | **R/A** | C | C | I | C |
| C · NETRA on-device perception | I | C | **R/A** | C | I | I |
| D · KAVACH privacy engine | C | C | C | **R/A** | C | I |
| E · HASTA executor | A | **R** | I | C | I | C |
| F · Server & infra | I | I | I | C | **R/A** | C |
| G · MANTRI reasoning | C | I | I | C | C | **R/A** |
| H · Evaluation | A | C | C | **R** | C | **R** |
| I · Demo & submission | **R/A** | C | C | C | C | C |
| **SSG contract** | **A** | C | C | C | C | C |
| Threat model | C | C | I | **R/A** | C | C |
| Metrics dashboard | A | I | R | R | R | R |

Two things to notice:
1. **The SSG contract is Accountable to LEAD, Consulted by everyone.** Nobody changes it alone.
2. **Evaluation has two Responsibles** (PRV for privacy metrics, SML for utility metrics) and one Accountable (LEAD). Split evaluation ownership is how you avoid the person who wrote the feature also writing its only test.

---

## 4. Interface ownership — who defines what

| Interface | Defined by | Consumed by | Change process |
|---|---|---|---|
| `SSG` / `ActionPlan` JSON Schema | LEAD (with all) | everyone | ADR + all-hands + version bump |
| `KavachInput` / `KavachOutput` | PRV | EXT, LEAD | PR review by consumer |
| `InferenceHost` | MLC | PRV, EXT | PR review by consumer |
| Extension message bus types | LEAD | all client roles | PR review |
| `POST /v1/agent/step` | BE (shape) + SML (semantics) | LEAD | ADR if breaking |
| L1 regex pack (TS ↔ PY) | PRV (canonical) | BE (mirror) | parity test in CI must stay green |
| Policy pack JSON | PRV | MLC (APC reads sensitivity) | PR review |
| Model manifest (`models/manifest.json`) | MLC | PRV, LEAD | PR review; SHA-256 mandatory |

**The parity test between the TS and Python regex packs is a joint artefact.** It runs 10,000 fixture strings through both and fails CI on any disagreement. Without it, the ingress guard slowly diverges from the egress guard and stops being a real check.

---

## 5. Working agreements

### Cadence
| Ritual | When | Duration | Output |
|---|---|---|---|
| Standup (async, written) | Daily, by 10:00 | 5 min | 3 lines: did / doing / blocked |
| Integration run | Daily, 18:00, automated | — | Loop green/red in the team channel |
| Contract review | Tue + Fri | 20 min | SSG changes approved or deferred |
| Demo rehearsal | Every Friday from week 3 | 30 min | Demo runs; failures logged as tickets |
| Phase gate | End of each phase | 60 min | Go / cut-scope decision, recorded |
| Retro | End of each phase | 30 min | 2 things to change, written down |

### Branching & review
- `main` is always demo-able. Feature branches `feat/<epic><id>-slug`, e.g. `feat/D12-egress-guard`.
- PRs require **one review from the interface consumer**, not from a random teammate. If PRV changes `KavachOutput`, EXT reviews it.
- Anything touching `egress-guard.ts`, `vault.ts`, or the SSG schema requires **two** reviews, one of which is PRV.
- Conventional Commits. `feat|fix|perf|docs|test|chore|refactor(scope): message`.

### Pairing (mandatory sessions)
These four boundaries cause every integration failure. Pair on them deliberately:
1. **EXT + PRV** — raw extraction → `KavachInput` (week 2)
2. **MLC + PRV** — detector outputs → fusion (week 3)
3. **PRV + LEAD** — `KavachOutput` → guard → net (week 3)
4. **BE + SML** — prompt → guided decoding → post-validation (week 4)
5. **LEAD + EXT** — plan → risk gate → execute (week 4)

### Decision rights
| Decision | Who decides |
|---|---|
| Scope cut at a phase gate | LEAD (after hearing the owner) |
| Privacy policy default for a class | PRV (LEAD can escalate, not override) |
| Model choice (client) | MLC, with a benchmark |
| Model choice (server) | SML, with an eval |
| SSG schema change | LEAD, after contract review |
| Anything that weakens a guard check | **Nobody.** Requires the full team plus a written ADR. |

That last row is deliberate. The single most likely way this project fails is somebody disabling a check at 2 a.m. to make the demo work.

---

## 6. Skill ramp-up plan (week 0)

Everyone does the **shared** items; each role does its own track. Timebox: 3 days.

**Shared (all 6)**
- Build and load an unpacked extension in Chrome *and* Firefox. Ship a "hello world" that reads the page title.
- Read `CONTEXT.md` and be able to explain the tier ladder and sink binding from memory.
- Run `docker compose up` on the server skeleton.

| Role | Ramp task |
|---|---|
| LEAD | Wire a typed request/response message bus across all four extension contexts |
| EXT | Extract every visible element with bbox + accessible name from `wikipedia.org` and render boxes over them |
| MLC | Run any ONNX model in an offscreen document on WebGPU; print latency; force WASM and print again |
| PRV | Implement Verhoeff + Luhn from the spec, with 200 unit tests including known-bad vectors |
| BE | vLLM serving any small model locally with an OpenAI-compatible endpoint + one guided-decoding call |
| SML | Get any VLM to output a JSON action for a hand-written screen description, 10/10 valid |

---

## 7. Escalation & unblocking

```
blocked > 2h   → post in channel with what you tried
blocked > 4h   → pair with the interface owner
blocked > 1d   → LEAD reassigns or cuts scope; the ticket gets a written decision
```

**Anti-pattern to name out loud**: silently working around a broken interface by duplicating logic. If `KavachOutput` doesn't give you what you need, change `KavachOutput` — do not re-detect PII in the content script "temporarily". Temporary duplicated detection is how a leak gets shipped.

---

## 8. Load balance across phases

Rough person-day allocation (P0 only, from the ticket estimates):

| Role | P0 days | Peak phase | Slack phase |
|---|---|---|---|
| LEAD | 12 + integration overhead | P4 (integration), P6 (demo) | P2 |
| EXT | 18 | P2 (extraction), P4 (executor) | P5 |
| MLC | 20 | P3 (models) | P6 |
| PRV | 24 | P3–P4 (engine + guard) | P1 |
| BE | 12 | P2 (serving), P5 (air-gap) | P4 |
| SML | 12 | P4 (prompts), P5 (eval) | P2 |

**PRV is the critical path.** Two consequences, planned deliberately:
1. EXT hands PRV the L0 DOM-rules work in phase 2 (it lives in the content script anyway).
2. SML takes half of the evaluation harness (H4, H7) since PRV cannot own both the engine and all of its tests during phase 4.

Anyone with slack in a phase goes to `packages/eval` or to demo assets. There is no phase where "nothing to do" is a valid state.

---

## 9. Judge-facing role assignment (the 12-minute SIH slot)

| Segment | Who speaks | Time |
|---|---|---|
| Problem + insight ("the server never needs the secret") | LEAD | 1.5 min |
| Architecture walkthrough (one diagram) | LEAD | 1.5 min |
| **Live demo** (drives the laptop) | EXT | 3.0 min |
| Privacy proof: ledger + diff view + live canary run | PRV | 2.0 min |
| Numbers: latency/accuracy trade-off table, ablations | MLC + SML | 1.5 min |
| Offline deployability + scale + DPDP mapping | BE | 1.0 min |
| Q&A | all; LEAD routes | 1.5 min |

Every member speaks. Judges notice when one person carries the whole presentation, and they notice when the person who wrote a component can't answer a question about it. Each role prepares **five** anticipated questions on their own area for `docs/judge-qa.md`.

---

## 10. Contingency: fewer than six people

If you are 4:
- LEAD absorbs SML (prompts + agent evals).
- EXT absorbs the side panel and the demo portal.
- MLC absorbs BE's serving work (drop the air-gapped CI job to a manual demo).
- PRV stays whole and untouched. **Never split or dilute the privacy role** — it is the project's entire differentiator, and a half-owned egress guard is worse than none because it invites false confidence.

Scope cuts in this order: C11 (local VLM) → D18/D19 (policy editor, Indic) → G3 (planner split) → E6 (CDP trusted input) → H8 (adversarial suite) → C9 (OCR). Stop cutting before you reach D12 (egress guard), D11 (vault), H3 (canary suite), or the Firefox target — those four *are* the submission.
