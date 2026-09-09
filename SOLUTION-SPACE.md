# SOLUTION-SPACE.md — PRAHARI

> The tree-of-thought exploration: every architecture branch we considered, why each survived or died,
> and the complete catalogue of features ranked by value-per-day.
> v1.0 · Read after `CONTEXT.md`, before you argue with `ARCHITECTURE.md`.

This document exists so that nobody re-opens a settled question, and so that in Q&A you can say
*"we considered that in week 0 — here's why we didn't"*, which is worth more than most features.

---

## Part I — Tree of thought: the seven decision branches

```
                          PRIVACY-PRESERVING BROWSER VISION AGENT
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        │               │               │               │               │
    ① WHAT does     ② WHAT crosses  ③ HOW is        ④ WHERE does    ⑤ HOW do we
      the client        the wire?      sensitivity     inference       prove it?
      observe?                         found?          happen?
        │               │               │               │               │
        └───────────────┴───────────────┼───────────────┴───────────────┘
                                        │
                          ⑥ HOW do we trade latency vs accuracy?
                                        │
                          ⑦ HOW does the agent act safely?
```

---

### Branch ① — What does the client observe?

| Option | Mechanism | Pros | Cons | Verdict |
|---|---|---|---|---|
| **1A. Pure DOM/AX** | Serialise the accessibility tree + interactive elements | Cheap (~15 ms), exact text, precise geometry, trivially redactable per node | Blind to `<canvas>`, `<video>`, `<img>`, PDF viewers, closed shadow DOM, cross-origin frames. **Does not satisfy R2** ("a vision model reads the screen") | ❌ alone |
| **1B. Pure pixels** | Screenshot → vision model does everything | Universal; works on any renderer; a true "vision agent" | Chrome caps capture at ~2 fps; needs OCR for all text; coordinates must be mapped back to acting; expensive; loses free semantic ground truth | ❌ alone |
| **1C. Pixels + OCR only** | Screenshot → full-page OCR → reason over text | Renderer-agnostic | Full-page OCR is 200–600 ms in-browser; OCR errors compound into wrong actions; still no element identity | ❌ |
| **1D. Hybrid: DOM-anchored vision** | DOM/AX for structure and identity; vision for verification, non-DOM content, and grounding | Union covers everything; cross-checks catch each other's blind spots; satisfies R2 and R3 ("DOM tags **or any other method**"); the two paths make redaction defence-in-depth | Two systems to build and reconcile | ✅ **CHOSEN** |
| **1E. Video stream** | `tabCapture`/`getDisplayMedia` MediaStream at 30 fps | Escapes the 2 fps cap; smooth | Heavy CPU/GPU; needs a user gesture; unnecessary for step-wise agents | 🔶 Kept as an escape hatch for high-fps needs only |

**Why 1D wins, stated as an insight**: on the *web specifically*, the DOM is a free, exact, machine-readable description of most of the screen — mobile GUI agents have no such thing, which is why CAPED and the mobile literature must be vision-only. Ignoring it to be "a pure vision agent" would be performative. But relying on it alone leaves the exact holes where PII most often hides (scanned documents, chart labels, avatars). **Use the free signal; cover its holes with vision.**

---

### Branch ② — What crosses the wire?

| Option | Payload | Privacy | Utility | Size | Verdict |
|---|---|---|---|---|---|
| **2A. Raw screenshot** | full PNG/JPEG | ✗ catastrophic | highest | 180–400 KB | ❌ this is the problem we're solving |
| **2B. Redacted screenshot only** | masked JPEG | good | good but the model must re-OCR everything | 45–95 KB | 🔶 as one tier |
| **2C. Structured SSG only** | typed JSON with placeholders | best (auditable, human-readable) | high on DOM-rich pages, poor on canvas | 4–20 KB | 🔶 as one tier |
| **2D. Latent embeddings** | vision-encoder hidden states | **✗ false sense of safety** | good | 50–200 KB | ❌ **REJECTED — see below** |
| **2E. Both, adaptively (tier ladder)** | Tier 0: nothing · Tier 1: SSG · Tier 2: SSG + redacted JPEG | best | best available | 0 / 6 KB / 55 KB | ✅ **CHOSEN** |
| **2F. Homomorphic / MPC** | encrypted inference | perfect in theory | — | — | ❌ 10³–10⁶× latency; not a 2026 browser technology |

**Why 2D is rejected, and why we say it out loud.** The intuitive "privacy-preserving" architecture is split inference: run the ViT locally, send only the intermediate features. It is wrong. Feature-inversion attacks on split DNNs reconstruct the original input from those intermediates (FIA-Flow demonstrates this across ResNet, Swin, DINO, YOLO), and text-embedding inversion has moved to *training-free, black-box* attacks (Zero2Text, 2026). Worse than being insecure, it is **unauditable**: you cannot show a user what a tensor contained, and you cannot write a regex test that proves a tensor is clean. Our entire verification story — the guard's eight checks, the diff viewer, the canary suite — depends on the payload being *human-readable*.

> Design principle extracted: **prefer a representation you can audit over one that merely feels opaque.**

Expect at least one competing team to propose 2D. Being able to explain in 30 seconds why it fails is a differentiator by itself.

---

### Branch ③ — How is sensitivity found?

| Option | Approach | Recall | Latency | Verdict |
|---|---|---|---|---|
| **3A. DOM rules only** | `input[type=password]`, `autocomplete` tokens | perfect on its classes, ~0 elsewhere | ~1 ms | ✅ as **L0** |
| **3B. Regex only** | pattern matching | high on structured, 0 on contextual; **high false positives without checksums** | ~3 ms | ✅ as **L1**, *with validators* |
| **3C. Local NER** | GLiNER-PII zero-shot | good on contextual (names, addresses, health) | 25–60 ms | ✅ as **L2** |
| **3D. Local VLM classification** | Florence-2 / SmolVLM judging the screen | broad, semantic | 250–450 ms | ✅ as **L4**, on demand only |
| **3E. Remote LLM classification** | ask the server what's sensitive | best accuracy | **must send the data to find out it's sensitive** | ❌ logically incoherent |
| **3F. User-declared only** | user marks sensitive fields | zero false positives | zero recall on anything unseen | ❌ alone; ✅ as an override layer |
| **3G. Ensemble, union, fail-closed** | all of the above, recall-first fusion | highest | budgeted | ✅ **CHOSEN** |

**The checksum insight.** 3B is usually dismissed as "too many false positives". That's true of naive regex and false of validated regex. A 12-digit number is not an Aadhaar; a 12-digit number *that passes Verhoeff* almost certainly is. Adding Verhoeff/Luhn/GSTIN checks converts L1 from a noisy heuristic into a near-deterministic detector at 3 ms. **This is why the India pack is a technical contribution and not just localisation.**

**Fusion rule and why**: union with noisy-OR, and the most-sensitive class wins conflicts. In privacy, the cost matrix is wildly asymmetric — a missed Aadhaar is a breach; an over-redacted order number is a mild utility loss that shows up in our `over_redaction_utility_delta` metric and can be tuned. Optimise recall, *measure* the precision cost.

---

### Branch ④ — Where does inference happen (client-side placement)?

| Option | Context | Verdict |
|---|---|---|
| **4A. Content script** | Runs in the page's tab | ❌ Model reloads per tab; the page can observe timing; memory multiplied by open tabs |
| **4B. Service worker** | MV3 background | ❌ **No DOM, no WebGPU**, killed after ~30 s idle — would evict models constantly |
| **4C. Offscreen document** | Hidden extension document with full DOM + WebGPU | ✅ **CHOSEN (Chrome)** — single instance, persistent, isolated, invisible |
| **4D. Event page** | Firefox MV3 keeps document-based background scripts | ✅ **CHOSEN (Firefox)** — it *is* a document, so WebGPU works directly |
| **4E. Sandboxed iframe in a pinned tab** | A visible helper tab | ❌ ugly, user-killable, fragile |
| **4F. Native messaging host** | A local binary | ❌ Breaks "runs in the browser"; installation friction; platform-specific builds |

The Chrome/Firefox split here is the single largest cross-browser divergence in the project, and it resolves neatly: one `InferenceHost` interface, two implementations, everything else identical.

**Where does L0/L1 run?** Deliberately in the **content script**, not the offscreen doc — so the raw value of a password field is never serialised into a `postMessage` at all. Redaction should happen as close to the data as possible.

---

### Branch ⑤ — How do we prove the privacy claim?

This branch is where most competing solutions will be weakest, and where cheap features have outsized returns.

| Option | Mechanism | Cost | Convincing? | Verdict |
|---|---|---|---|---|
| **5A. Say so** | "we redact PII" | 0 | ✗ | ❌ |
| **5B. Show the code** | open source | 0 | weak in a 12-minute slot | 🔶 necessary, not sufficient |
| **5C. Glass-box overlay** | draw the redactions on the live page | 1.5 d | strong | ✅ |
| **5D. "What the server saw" diff** | side-by-side original vs transmitted bytes | 2 d | **strongest single feature** | ✅ |
| **5E. Signed Privacy Ledger** | hash-chained log of every egress | 1 d | strong for compliance framing | ✅ |
| **5F. Live canary test** | plant 60 unique strings, prove none leaked, **run it on stage** | 1.5 d | makes the claim falsifiable in public | ✅ |
| **5G. Independent server-side check** | ingress guard rejects any PII that arrives | 2 d | proves the client works, judged by the *receiver* | ✅ |
| **5H. Formal verification** | prove the redactor correct | weeks | very strong, unattainable now | ❌ (future work) |
| **5I. TEE attestation** | server proves its enclave | weeks + hardware | strong but solves a different problem | ❌ (future work) |

**Insight**: 5D + 5F together convert the project from "trust us" to "check us". They cost ~3.5 days combined and are the two beats of the demo people will remember. Budget them like features, not like polish.

---

### Branch ⑥ — How do we trade latency against accuracy? (R8)

| Option | Strategy | Verdict |
|---|---|---|
| **6A. Fixed pipeline** | always run everything | ❌ slowest, and answers R8 with "we didn't" |
| **6B. Fixed cheap pipeline** | DOM only, always | ❌ fails on canvas; TSR 71 % measured |
| **6C. User-selected mode** | fast / balanced / thorough | 🔶 ✅ ship it as an override, not as the mechanism |
| **6D. Adaptive controller (APC)** | pick the tier per step from measured signals | ✅ **CHOSEN** |
| **6E. Learned policy** | RL/bandit over tiers | 🔶 future work; needs data we won't have by December |
| **6F. Speculative execution** | run Tier 1 and Tier 2 in parallel, take the first useful answer | 🔶 halves p95, doubles cost and bytes — **rejected for a privacy product**: it sends pixels you might not have needed |

6F deserves a note because it's tempting and wrong here. In a normal system, speculating is free latency. In this system, speculating means *transmitting data you didn't need to transmit*. Privacy budgets and compute budgets point the same way; that alignment is a happy property of the design and we should not break it.

**Signals the APC actually uses** (all locally computed, all cheap): DOM stability, perceptual-hash delta, local model confidence, `unexplained_pixel_ratio`, consecutive failures, page class, device profile.

---

### Branch ⑦ — How does the agent act safely?

| Option | Verdict |
|---|---|
| **7A. Free-form code execution** (model emits JS) | ❌ unbounded blast radius; unauditable; the single worst idea in agent design |
| **7B. Coordinate clicks** (`click(x,y)`) | 🔶 fallback only for canvas surfaces; brittle under reflow |
| **7C. Element-ID actions from a closed schema** | ✅ **CHOSEN** — targets are SSG IDs; the schema is enforced by guided decoding |
| **7D. Natural-language actions parsed client-side** | ❌ re-introduces the parse failures 7C eliminates |
| **7E. Full autonomy** | ❌ |
| **7F. Confirm everything** | ❌ unusable; the agent stops being useful |
| **7G. Risk-tiered gating, client-derived** | ✅ **CHOSEN** — `safe` runs, `medium` runs with undo, `high` blocks for a human; the server may escalate risk but never lower it |

**The sink-binding idea belongs here.** Once you have a reverse channel (`value_ref` → real value), you have created a new attack: an injected instruction can ask the agent to type the user's Aadhaar into an attacker-controlled field, exfiltrating it via a URL. Casper-style vaults don't defend against this. Binding each token to the element it came from closes it. This is our sharpest security contribution and takes about a day to build.

---

## Part II — The complete feature catalogue

Ranked by **value per engineering day**, with an honest cost. `★` = in the demo script.

### Tier S — the four features that *are* the submission

| Feature | Days | Why it's non-negotiable |
|---|---|---|
| ★ **Egress guard with 8 checks** | 2.5 | It's the entire privacy claim, mechanised. Without it we have an aspiration. |
| ★ **Vault + sink binding** | 1.5 | Makes the reverse channel safe; the idea competitors won't have. |
| ★ **"What the server saw" diff viewer** | 2.0 | Converts a claim into evidence in 5 seconds of demo time. |
| ★ **Live canary suite** | 1.5 | Makes the claim falsifiable, in public, on demand. |

### Tier A — core capability (P0)

| Feature | Days | Note |
|---|---|---|
| DOM + AX extraction with stable IDs | 5.5 | The foundation everything else stands on |
| ★ Local face detection + blur | 1.0 | The most legible redaction; 230 KB model |
| ★ India PII pack with real checksums | 2.0 | Verhoeff/Luhn/GSTIN — the localisation *and* the precision fix |
| Local NER (GLiNER-PII, zero-shot) | 2.0 | Contextual PII; new classes without retraining |
| ★ UI-element YOLO on WebUI+Rico | 4.0 | The "equivalent CV model"; enables canvas surfaces |
| ★ Adaptive Perception Controller | 2.0 | The literal answer to R8 |
| ★ Glass-box overlay | 1.5 | Shows the local model working, live |
| ★ Risk gating + confirm modal | 1.5 | The "is this safe?" answer |
| ★ Privacy Ledger | 1.0 | Compliance framing; audit story |
| Guided decoding (XGrammar) | 1.5 | Eliminates the #1 cause of flaky agent demos |
| Server ingress PII guard | 2.0 | Independent verification; found real bugs |
| Firefox parity | 3.0 | Explicitly required by the PS; most teams will skip it |

### Tier B — strong differentiators (P1, build if on schedule)

| Feature | Days | Why it's worth it |
|---|---|---|
| **OCR on non-DOM pixels** | 2.0 | Closes the biggest hole: PII inside scanned documents and images. WebPII's central finding. |
| **Local VLM (Florence-2)** | 2.5 | Makes "a ViT reads the screen" literally true; handles the hard grounding cases |
| **Air-gapped deployment proof** | 1.5 | Turns R9 from a claim into a nightly CI job |
| **Adversarial suite** | 2.0 | Injection, homoglyphs, split-node PII, image-only PII — the tests nobody else runs |
| **Local-Only Mode** | 0.5 | A toggle that proves the local half is real |
| **Planner/Grounder split** | 2.0 | ~60 % fewer server tokens; the main server latency lever |
| **High-Fidelity Mode (CDP)** | 2.0 | Real AX tree + trusted input events for stubborn sites |
| **Ablation tables** | 1.0 | The measured trade-off curves R8 asks for; cheap, high-credibility |

### Tier C — wow-factor, cheap (build in slack time)

| Feature | Days | Effect |
|---|---|---|
| **Privacy Score / byte counter** in the side panel — "0 sensitive items sent · 54 KB total" | 0.5 | A number that updates live is disproportionately convincing |
| **Redaction heat-map** — where on this site does PII live? | 1.0 | Beautiful, screenshots well, genuinely useful |
| **Tier-timeline strip** — a per-step bar showing T0/T1/T2 and latency | 0.5 | Makes the APC visible instead of abstract |
| **"Explain this redaction"** — click a box, see which detectors fired and their confidences | 1.0 | Answers "how do you know?" without you speaking |
| **Session replay from the ledger** — step through what happened, with the redacted views | 1.5 | An incident-review feature enterprises actually ask for |
| **Panic button + full wipe** | 0.3 | Costs nothing, reads as maturity |
| **Model card in the UI** — which models are loaded, their sizes, their EP, their latency | 0.5 | Radical honesty; judges notice |
| **Keyboard-only operation** | 0.5 | Accessibility, and it makes the demo faster to drive |

### Tier D — big ideas, out of scope now (put on the "next" slide)

| Feature | Why not now | Why it's compelling |
|---|---|---|
| **Verifiable redaction proof** (succinct commitment that an image is a compliant redaction) | Research-grade | Third-party checkable privacy — the natural end state of this architecture |
| **TEE-attested server tier** | Needs hardware + weeks | Closes the "trust the server operator" gap for enterprises |
| **Federated policy learning** from user corrections, never uploading the corrections | Needs a user base | The redactor improves without anyone's data leaving |
| **Distilled single model** (~80 M) replacing YOLO + OCR + NER + VLM | 3–4 weeks of training | One model, one download, ~4× faster |
| **WebNN / NPU path** | Still preview, DirectML deprecated | Same ONNX graphs, much lower power |
| **Desktop via native messaging** | Breaks "in the browser" for v1 | Same KAVACH engine protecting the whole OS |
| **Indic-first PII models** | Needs a labelled corpus | The most India-specific technical contribution available |
| **Kavach-as-a-library** (`npm i @prahari/kavach`) | Post-hackathon | Any web app could redact before calling any LLM. Arguably the biggest product inside this project. |

### Tier E — deliberately rejected (say why if asked)

| Idea | Why not |
|---|---|
| Send latent embeddings | Feature/embedding inversion; unauditable (Branch ②) |
| Faker-substituted realistic values instead of typed tokens | The server may act on plausible-but-false data and nobody can tell; tokens are honest |
| Blur the entire screenshot | Destroys utility; the server can't ground anything |
| Homomorphic encryption | 10³–10⁶× latency |
| Local-only LLM as the primary reasoner | Fails multi-step tasks at browser-feasible sizes; also not what the PS asks for |
| Trusting the server's risk label | The server is the party we chose not to trust |
| Speculative parallel Tier 1 + Tier 2 | Transmits data that might not have been needed (Branch ⑥) |
| Auto-approve for HIGH risk after N confirmations | A remembered consent is a consent you can't revoke when it matters |

---

## Part III — What competing teams will build, and where we differ

A useful exercise, because the PS will produce a lot of similar-looking submissions.

| The likely median submission | PRAHARI |
|---|---|
| Screenshot → blur faces with a JS library → send to GPT-4o | Hybrid DOM+vision, typed placeholders, open-weights server model |
| Regex for email/phone | Checksum-validated Indian identifier pack + zero-shot NER + vision OCR |
| "We redact PII" on a slide | Live canary test, byte-accurate diff view, signed ledger, independent server-side check |
| Chrome only | Chrome **and** Firefox, one codebase, tested in CI |
| One fixed pipeline | Measured tier ladder with published ablations answering R8 explicitly |
| Deletes sensitive fields | Reversible sink-bound tokens — the server plans with them, the client resolves them |
| Cloud API model | Open weights, `docker compose`, air-gapped CI proof (R9) |
| No threat model | Injection fencing, EIA defence, risk gating the server can't override |

**The three sentences that separate us**, memorised by all six members:

1. *"The server never needs the secret — it plans with a reference, and only this laptop can resolve it."*
2. *"We don't ask you to trust us. Here is the exact byte stream that left the machine, and here is a live test that plants sixty secrets and proves none of them got out."*
3. *"Every millisecond we spend locally is a byte we don't send — privacy and latency point the same direction in this design, which is why the adaptive tier is 2.4× faster **and** more private than always sending the screen."*

---

## Part IV — Open research questions (good Q&A material)

1. **What is the right precision/recall operating point per PII class?** We optimise F₂ (recall-weighted), but the correct λ differs between `AADHAAR` (never miss) and `PERSON_NAME` (over-redaction visibly hurts task success). Currently hand-set per class; should be learned from the utility delta.
2. **Can the server detect that it has been under-informed?** A calibrated "I need a visual re-look" signal (`need_visual`) exists, but the model is not trained to produce it well. A small classifier on top of the SSG could do better.
3. **How much does the marker convention actually help?** We assert that a labelled mask beats a black box for VLM reasoning (following CAPED). We should ablate it — it's a 2-hour experiment with a real answer.
4. **Does coreference across steps leak anything?** `⟦PERSON_1⟧` appearing on three pages tells the server those pages concern the same person. That is *intended* (it's what makes reasoning work) but it is a real, quantifiable disclosure. Session-scoped tokens bound the linkage; per-page tokens would eliminate it at a large utility cost. **We should state this limitation, not hide it.**
5. **What is the minimum viable local model?** Our stack is four models. A distilled single head trained on WebUI+Rico+our corpus might match it at 80 M params. That's the strongest follow-up paper in this project.
