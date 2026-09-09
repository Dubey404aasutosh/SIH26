# IMPLEMENTATION-PLAN.md — PRAHARI

> Concrete build plan: stack, repo layout, schemas, APIs, module contracts, tickets.
> v1.0 · Prerequisites: `CONTEXT.md`, `ARCHITECTURE.md`, `PIPELINE.md`

---

## 1. Technology stack (decided — do not re-litigate without an ADR)

### Client
| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript 5.6**, `strict: true` | Contracts matter more than speed here |
| Build | **Vite 6** + `@crxjs/vite-plugin` (Chrome) + custom FF target | HMR for extensions actually works |
| UI | **React 19** + **Tailwind 4** + `@radix-ui/react-*` | Side panel is real UI; Radix gives accessible primitives free |
| State | **Zustand** + `chrome.storage` sync middleware | Small, works across extension contexts |
| Cross-browser | `webextension-polyfill` | `browser.*` everywhere until Chrome 148 lands natively |
| Inference | **onnxruntime-web 1.20+** (`webgpu`/`wasm`) + **@huggingface/transformers v3/v4** | ORT for our own ONNX models; TJS for Florence-2/GLiNER convenience |
| Face detection | `@mediapipe/tasks-vision` (BlazeFace) | 230 KB, battle-tested, WASM+GPU |
| Validation | **ajv** (SSG schema, strict) + **zod** (internal) | ajv for the wire, zod for ergonomics |
| Crypto | WebCrypto (`HMAC-SHA256`, `AES-GCM`) | No crypto library. Ever. |
| Test | **Vitest** (unit) + **Playwright** (E2E with the extension loaded) | Playwright can load unpacked extensions in both engines |
| Lint | ESLint + `eslint-plugin-security` + Prettier | |

### Server
| Concern | Choice | Why |
|---|---|---|
| Language | **Python 3.12** | Ecosystem for serving |
| API | **FastAPI** + uvicorn, async, SSE | Pydantic v2 models generated from our JSON Schema |
| Serving | **vLLM 0.6+** | PagedAttention throughput; OpenAI-compatible surface |
| Models | **Qwen3-VL-8B-Instruct** (vision) · **Qwen3-8B** (text-fast) · fallback **Qwen2.5-VL-7B-Instruct** | Open weights ⇒ offline deployable (R9); SOTA GUI grounding |
| Structured output | **XGrammar** via vLLM guided decoding | 100 % schema-valid actions, lowest per-token grammar overhead |
| Session store | **Redis 7** (TTL) | PII-free by construction |
| Observability | OpenTelemetry + Prometheus + Grafana | `trace_id` shared with the client ledger |
| Test | pytest + pytest-asyncio + `respx` | |
| Package mgmt | **uv** | Fast, lockfile-first |

### Repo tooling
`pnpm` workspaces · `turbo` for task graph · GitHub Actions CI · `commitlint` + Conventional Commits · `changesets` for the SSG contract version.

---

## 2. Repository layout

```
prahari/
├── README.md  PRD.md  ARCHITECTURE.md  PIPELINE.md  CONTEXT.md
├── TEAM-ROLES.md  RULES.md  IMPLEMENTATION-PLAN.md  PHASEWISE.md
├── docs/
│   ├── adr/                       # architecture decision records, 001-…
│   ├── demo-script.md
│   ├── threat-model.md
│   └── metrics/                   # generated latency + accuracy reports
│
├── packages/
│   ├── ssg/                       # ★ THE CONTRACT — owned jointly, changed by ADR only
│   │   ├── schema/
│   │   │   ├── ssg-v1.json        # source of truth (JSON Schema draft 2020-12)
│   │   │   ├── action-plan-v1.json
│   │   │   └── redaction-manifest-v1.json
│   │   ├── src/types.ts           # generated from schema
│   │   ├── src/tokens.ts          # placeholder grammar, parse/format
│   │   └── scripts/gen-pydantic.ts
│   │
│   ├── kavach/                    # privacy engine (isomorphic TS, no DOM deps in core)
│   │   ├── src/normalize/         # text normalisation, homoglyphs, offset maps
│   │   ├── src/detectors/
│   │   │   ├── l0-dom-rules.ts
│   │   │   ├── l1-regex/
│   │   │   │   ├── india.ts       # aadhaar/pan/gstin/ifsc/upi/abha/voter/dl
│   │   │   │   ├── global.ts      # email/phone/card/ip/imei
│   │   │   │   ├── secrets.ts     # api keys, jwt, private keys, entropy
│   │   │   │   └── validators/    # verhoeff.ts luhn.ts gstin.ts ifsc.ts
│   │   │   └── l2-ner.ts          # GLiNER wrapper + cascade + cache
│   │   ├── src/fuse.ts
│   │   ├── src/policy/
│   │   │   ├── packs/             # default.json gov.json bank.json health.json
│   │   │   └── resolve.ts
│   │   ├── src/redact/
│   │   │   ├── text.ts            # token substitution with offset map
│   │   │   └── pixels.ts          # OffscreenCanvas masks/blur/pixelate
│   │   ├── src/vault.ts           # sink binding, TTL, reversibility
│   │   ├── src/egress-guard.ts    # ★ THE CHOKE POINT ★
│   │   └── src/ledger.ts          # LEKHA
│   │
│   ├── netra/                     # on-device perception
│   │   ├── src/registry.ts        # model manifest + SHA-256 verification
│   │   ├── src/ep.ts              # capability probe, webgpu→wasm selection
│   │   ├── src/pool.ts            # warm session pool
│   │   ├── src/detectors/
│   │   │   ├── face.ts            # BlazeFace / yolov8n-face
│   │   │   ├── widgets.ts         # UI-element YOLO + DOM reconciliation
│   │   │   ├── ocr.ts             # PP-OCR det+rec, crop batching
│   │   │   └── vlm.ts             # Florence-2 (optional)
│   │   ├── src/diff.ts            # dHash + tile diff
│   │   └── src/apc.ts             # Adaptive Perception Controller
│   │
│   ├── extension/
│   │   ├── manifest.base.ts       # single source; emits both manifests
│   │   ├── src/background/
│   │   │   ├── index.ts           # entry (SW on Chrome, event page on FF)
│   │   │   ├── agent-loop.ts      # the state machine
│   │   │   ├── router.ts
│   │   │   └── net.ts             # the ONLY module that calls fetch()
│   │   ├── src/offscreen/
│   │   │   ├── offscreen.html
│   │   │   └── host.ts            # InferenceHost impl (Chrome)
│   │   ├── src/content/
│   │   │   ├── extract/           # dom walker, accname, geometry, frames
│   │   │   ├── executor.ts        # HASTA
│   │   │   ├── overlay.ts         # glass-box redaction overlay
│   │   │   └── observer.ts        # mutation/settle detection
│   │   ├── src/sidepanel/         # React app
│   │   │   ├── App.tsx
│   │   │   ├── views/{Task,Ledger,Policy,Canary,Settings}.tsx
│   │   │   └── components/DiffViewer.tsx   # "what the server saw"
│   │   ├── src/platform/          # ★ the ONLY place with browser branches ★
│   │   │   ├── inference-host.ts  # interface + chrome/firefox impls
│   │   │   ├── ax-provider.ts     # CDP vs DOM shim
│   │   │   ├── capture.ts         # throttle-aware screenshot
│   │   │   └── ui-surface.ts      # sidePanel vs sidebar_action
│   │   └── src/shared/
│   │
│   └── eval/
│       ├── corpus/                # generator + 500 synthetic pages
│       ├── canary/                # 60 canaries × 12 surfaces
│       ├── adversarial/
│       ├── tasks/                 # 40 task definitions + success predicates
│       └── runners/               # playwright harness, latency + accuracy reports
│
├── server/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/{agent,health,metrics}.py
│   │   ├── schemas/               # generated Pydantic from packages/ssg/schema
│   │   ├── guards/
│   │   │   ├── ingress_pii.py     # mirror of the L1 pack, in Python
│   │   │   ├── image_sanity.py
│   │   │   └── injection.py
│   │   ├── agents/
│   │   │   ├── planner.py         # sub-goal plan, cached
│   │   │   ├── grounder.py        # per-step actions
│   │   │   └── prompts/           # system.md, contract.md, few-shot/
│   │   ├── llm/{vllm_client.py,routing.py,grammar.py}
│   │   └── session.py
│   ├── serving/{docker-compose.yml,vllm-vl.yaml,vllm-text.yaml,download_models.py}
│   ├── tests/
│   └── pyproject.toml
│
├── models/
│   ├── manifest.json              # name → url, sha256, size, dtype, opset
│   ├── convert/                   # export + quantise scripts
│   └── train/                     # UI-element YOLO training
│
└── infra/{ci.yml,Dockerfile.*,k8s/}
```

---

## 3. The SSG JSON Schema (authoritative excerpt)

`packages/ssg/schema/ssg-v1.json` — draft 2020-12, `additionalProperties: false` everywhere.

```jsonc
{
  "$id": "https://prahari.dev/schema/ssg-v1.json",
  "type": "object",
  "required": ["ssg_version","session_id","trace_id","step","tier","purpose",
               "goal","viewport","page","elements","redaction_manifest"],
  "properties": {
    "ssg_version": { "const": "1.0" },
    "session_id":  { "type":"string", "pattern":"^eph_[0-9a-f]{8,32}$" },
    "trace_id":    { "type":"string", "pattern":"^t_[0-9]{1,6}$" },
    "step":        { "type":"integer", "minimum":0, "maximum":200 },
    "tier":        { "enum":[0,1,2] },
    "purpose":     { "type":"string", "maxLength":64 },
    "goal":        { "$ref":"#/$defs/SafeText", "maxLength":512 },

    "viewport": { "type":"object", "required":["w","h","dpr","scroll_y"],
      "properties": { "w":{"type":"integer"}, "h":{"type":"integer"},
                      "dpr":{"type":"number"}, "scroll_y":{"type":"integer"},
                      "doc_h":{"type":"integer"} },
      "additionalProperties": false },

    "page": { "type":"object", "required":["origin_class","page_type","sensitivity"],
      "properties": {
        "origin_class":{"type":"string","maxLength":64},
        "path_shape":  {"type":"string","maxLength":128},
        "title":       {"$ref":"#/$defs/SafeText"},
        "lang":        {"type":"string","maxLength":12},
        "page_type":   {"enum":["form","article","list","canvas_app","media","pdf","chat","dashboard","unknown"]},
        "sensitivity": {"enum":["public","semi_private","private","credential"]}
      }, "additionalProperties": false },

    "elements": { "type":"array","maxItems":400,"items":{"$ref":"#/$defs/Element"} },
    "text_blocks": { "type":"array","maxItems":200,"items":{"$ref":"#/$defs/TextBlock"} },
    "visual_regions": { "type":"array","maxItems":100,"items":{"$ref":"#/$defs/VisualRegion"} },
    "history": { "type":"array","maxItems":20,"items":{"$ref":"#/$defs/HistoryItem"} },
    "redaction_manifest": { "$ref":"redaction-manifest-v1.json" },
    "attachment": { "$ref":"#/$defs/Attachment" }
  },

  "$defs": {
    "SafeText": {
      "type": "string",
      "description": "Text that has passed redaction. May contain ⟦CLASS_N⟧ tokens.",
      "maxLength": 2048
    },
    "Element": {
      "type":"object","required":["id","role","bbox","actionable"],
      "properties":{
        "id":{"type":"string","pattern":"^e[0-9]{1,4}$"},
        "role":{"type":"string","maxLength":32},
        "tag":{"type":"string","maxLength":16},
        "input_type":{"type":"string","maxLength":24},
        "bbox":{"type":"array","items":{"type":"number"},"minItems":4,"maxItems":4},
        "z":{"type":"integer"}, "visible":{"type":"boolean"},
        "name":{"$ref":"#/$defs/SafeText"},
        "value":{"$ref":"#/$defs/SafeText"},
        "placeholder":{"$ref":"#/$defs/SafeText"},
        "state":{"type":"object","additionalProperties":{"type":"boolean"}},
        "redaction":{"type":"object","properties":{
            "applied":{"type":"boolean"},
            "class":{"type":"string"},
            "method":{"enum":["placeholder","blackout","blur","pixelate","drop"]}},
          "additionalProperties":false},
        "actionable":{"type":"array","items":
            {"enum":["click","type","select","clear","hover","focus","scroll"]}},
        "client_risk":{"enum":["safe","medium","high"]},
        "risk_reason":{"type":"string","maxLength":128}
      },"additionalProperties":false
    }
    /* TextBlock, VisualRegion, HistoryItem, Attachment … */
  }
}
```

**Why `additionalProperties: false` matters here**: it's a privacy control, not a style choice. An unknown field is a field nobody redacted. The schema is an allowlist for what may cross the boundary.

Generation: `pnpm gen:contract` runs `json-schema-to-typescript` → `packages/ssg/src/types.ts` and `datamodel-codegen` → `server/app/schemas/`. CI fails if either output is dirty.

---

## 4. Action Plan schema (server → client)

```jsonc
{
  "$id": "https://prahari.dev/schema/action-plan-v1.json",
  "type":"object",
  "required":["plan_id","trace_id","actions","done"],
  "properties":{
    "plan_id":{"type":"string"}, "trace_id":{"type":"string"},
    "reasoning":{"type":"string","maxLength":800},
    "actions":{"type":"array","maxItems":3,"items":{"$ref":"#/$defs/Action"}},
    "expect":{"type":"object","properties":{
      "page_change":{"type":"boolean"},
      "assert_role":{"type":"string"},
      "assert_text_absent":{"type":"string"}},"additionalProperties":false},
    "next_tier_hint":{"enum":[0,1,2]},
    "need_visual":{"type":"boolean"},
    "done":{"type":"boolean"},
    "confidence":{"type":"number","minimum":0,"maximum":1}
  },
  "$defs":{
    "Action":{"type":"object","required":["op"],"oneOf":[
      {"properties":{"op":{"const":"click"},"target":{"$ref":"#/$defs/Target"},
                     "risk":{"$ref":"#/$defs/Risk"},"reason":{"type":"string"}},
       "required":["op","target"],"additionalProperties":false},
      {"properties":{"op":{"const":"type"},"target":{"$ref":"#/$defs/Target"},
                     "value":{"type":"string","maxLength":256},
                     "value_ref":{"type":"string","pattern":"^⟦[A-Z_]+_[0-9]+⟧$"},
                     "clear_first":{"type":"boolean"},"risk":{"$ref":"#/$defs/Risk"}},
       "required":["op","target"],"additionalProperties":false},
      {"properties":{"op":{"const":"select"},"target":{"$ref":"#/$defs/Target"},
                     "option":{"type":"string","maxLength":128}},
       "required":["op","target","option"],"additionalProperties":false},
      {"properties":{"op":{"const":"scroll"},
                     "direction":{"enum":["up","down","left","right","to_element"]},
                     "amount":{"type":"integer"},"target":{"$ref":"#/$defs/Target"}},
       "required":["op","direction"],"additionalProperties":false},
      {"properties":{"op":{"const":"key"},"combo":{"type":"string","maxLength":32}},
       "required":["op","combo"],"additionalProperties":false},
      {"properties":{"op":{"const":"navigate"},"url":{"type":"string"},
                     "risk":{"const":"high"}},
       "required":["op","url"],"additionalProperties":false},
      {"properties":{"op":{"const":"wait"},"ms":{"type":"integer","maximum":5000}},
       "required":["op"],"additionalProperties":false},
      {"properties":{"op":{"const":"extract"},
                     "targets":{"type":"array","items":{"$ref":"#/$defs/Target"}},
                     "fields":{"type":"array","items":{"type":"string"}}},
       "required":["op","targets"],"additionalProperties":false},
      {"properties":{"op":{"const":"ask_user"},"question":{"type":"string","maxLength":300},
                     "options":{"type":"array","items":{"type":"string"}}},
       "required":["op","question"],"additionalProperties":false},
      {"properties":{"op":{"const":"done"},"summary":{"type":"string","maxLength":800}},
       "required":["op"],"additionalProperties":false},
      {"properties":{"op":{"const":"fail"},"reason":{"type":"string","maxLength":300}},
       "required":["op"],"additionalProperties":false}
    ]},
    "Target":{"oneOf":[
      {"type":"string","pattern":"^e[0-9]{1,4}$"},
      {"type":"object","required":["point"],
       "properties":{"point":{"type":"array","items":{"type":"number"},
                              "minItems":2,"maxItems":2}},
       "additionalProperties":false}]},
    "Risk":{"enum":["safe","medium","high"]}
  }
}
```

This exact schema is compiled to a grammar by XGrammar, so the model **cannot** emit anything else. `oneOf` on `op` gives us per-operation required fields for free.

---

## 5. Module contracts (the interfaces to agree on in week 1)

```ts
// packages/kavach/src/index.ts
export interface KavachInput {
  elements: RawElement[];          // from content script, pre-redaction
  textNodes: RawTextNode[];
  pixels?: { bitmap: ImageBitmap; scale: number };
  visionHints?: { faces: Box[]; widgets: Widget[]; ocr: OcrLine[] };
  page: PageMeta;
  policy: ResolvedPolicy;
  budgetMs: number;
}
export interface KavachOutput {
  ssg: SSG;                        // fully redacted, schema-valid
  redactedBitmap?: ImageBitmap;
  manifest: RedactionManifest;
  vaultDelta: VaultEntry[];        // stays in the background, never serialised
  diagnostics: { stageMs: Record<string, number>; timedOut: string[] };
}
export function sanitize(i: KavachInput): Promise<KavachOutput>;

// packages/kavach/src/egress-guard.ts
export type GuardVerdict =
  | { ok: true; bytes: Uint8Array; sha256: string }
  | { ok: false; reason: GuardFailure; detail: string };
export function guard(ssg: SSG, image?: Blob): Promise<GuardVerdict>;
// net.ts MUST call guard() and MUST NOT send on ok:false. Enforced by lint rule
// `prahari/no-fetch-outside-net` + a unit test that greps the bundle for `fetch(`.

// packages/netra/src/index.ts
export interface InferenceHost {
  init(profile: DeviceProfile): Promise<void>;
  detectFaces(img: ImageData, roi: Box[]): Promise<Box[]>;
  detectWidgets(img: ImageData): Promise<Widget[]>;
  ocr(img: ImageData, regions: Box[]): Promise<OcrLine[]>;
  ner(spans: string[], labels: string[]): Promise<NerSpan[]>;
  vlm?(img: ImageData, task: VlmTask): Promise<VlmResult>;
  stats(): { modelMs: Record<string, number>; ep: 'webgpu'|'wasm' };
}

// packages/netra/src/apc.ts
export function chooseTier(s: ApcSignals): { tier: 0|1|2; budgets: StageBudgets; why: string[] };

// packages/extension/src/content/executor.ts  (HASTA)
export function execute(a: Action, ctx: ExecCtx): Promise<ActionOutcome>;
```

**The lint rule is a real deliverable.** `eslint-plugin-prahari` with one rule: `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, `EventSource`, and dynamic `import()` of remote URLs are forbidden everywhere except `background/net.ts`. Violations fail CI. This is how "one choke point" stops being a promise.

---

## 6. Server API

### `POST /v1/agent/step`

```
Content-Type: application/json               (Tier 1)
Content-Type: multipart/form-data            (Tier 2: part "ssg" + part "image")
Headers: X-Prahari-Session, X-Prahari-Trace, X-SSG-Version: 1.0
Accept: text/event-stream
```

**200** — SSE stream:
```
event: reasoning   data: {"delta":"The Aadhaar field is empty…"}
event: plan        data: <ActionPlan JSON>
event: done        data: {"server_ms":842,"model":"qwen3-vl-8b","tokens_in":1180,"tokens_out":96}
```

**Errors**
| Code | Meaning | Client behaviour |
|---|---|---|
| `400 SSG_INVALID` | schema violation | bug; log, abort step |
| `422 REDACTOR_FAILURE` | ingress guard found PII | **enter strict mode**, alert user, do not retry |
| `409 VERSION_MISMATCH` | unknown `ssg_version` | show upgrade prompt |
| `429` | rate limited | backoff + Tier 0 |
| `503 MODEL_UNAVAILABLE` | vLLM down | fall back to Tier 0, banner |

### Other endpoints
`GET /v1/health` · `GET /v1/models` (what's loaded, for the UI to display honestly) · `GET /metrics` (Prometheus) · `POST /v1/session/end` (drop session state).

### Server-side prompt files
`server/app/agents/prompts/system.md` — role, action grammar, safety.
`.../contract.md` — the redaction contract text (see `ARCHITECTURE.md §7.2`). **Version-locked to `ssg_version`.**
`.../fewshot/*.json` — 6 exemplars: form fill with tokens, masked-region reasoning, ambiguous target → `ask_user`, injection attempt → ignore + continue, task complete → `done`, blocked → `fail`.

---

## 7. Bootstrap: getting from zero to a running loop

### Day 1 commands
```bash
# repo
pnpm create vite@latest prahari --template react-ts   # then restructure to the layout above
pnpm add -D turbo @crxjs/vite-plugin web-ext vitest @playwright/test
pnpm add webextension-polyfill onnxruntime-web @huggingface/transformers \
         @mediapipe/tasks-vision ajv zod zustand

# server
uv init server && cd server
uv add fastapi uvicorn[standard] pydantic redis httpx openai \
       prometheus-client opentelemetry-sdk
uv add --dev pytest pytest-asyncio ruff mypy
```

### The "walking skeleton" (must exist by end of week 1)
A vertical slice that does nothing intelligent but touches every boundary:

1. Side panel with a text box → sends `{goal}` to background.
2. Background asks content script for a **stub** SSG (5 hard-coded elements).
3. `guard()` runs (schema only), writes a ledger entry, `fetch`es the server.
4. Server returns a **hard-coded** `{"op":"scroll","direction":"down"}`.
5. HASTA scrolls the page.
6. Ledger view shows the request with its hash.

Everything after week 1 is replacing stubs with real implementations, one at a time, with the loop never breaking. **This ordering is the single most important scheduling decision in the project** — teams that build components first and integrate last do not finish.

---

## 8. Ticket backlog (epics → issues)

Legend: `[P0]` must ship · `[P1]` should · `[P2]` nice. Owner codes from `TEAM-ROLES.md`.

### EPIC A — Extension shell & cross-browser (owner: **EXT**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| A1 | Monorepo + turbo + dual-target Vite build | P0 | 1d |
| A2 | `manifest.base.ts` → chrome/firefox manifests; both load unpacked | P0 | 1d |
| A3 | Background ↔ content ↔ sidepanel ↔ offscreen message bus (typed, ports) | P0 | 1.5d |
| A4 | `InferenceHost` platform abstraction (offscreen vs event page) | P0 | 1d |
| A5 | Side panel shell: task input, status, tier badge, kill switch | P0 | 1.5d |
| A6 | `capture.ts` with token-bucket throttle + quota-exceeded downgrade | P0 | 0.5d |
| A7 | `ax-provider.ts`: CDP path + DOM shim; parity test | P1 | 2d |
| A8 | Packaging: CWS zip + signed `.xpi` via web-ext | P1 | 0.5d |

### EPIC B — Screen extraction (owner: **EXT**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| B1 | DOM walker + implicit-role table + accname algorithm | P0 | 2d |
| B2 | Geometry: bbox, frame-offset chain, z-order, occlusion sampling | P0 | 1.5d |
| B3 | Stable element IDs (WeakRef + fingerprint re-resolution) | P0 | 1d |
| B4 | `all_frames` stitching for same-origin iframes; opaque regions for cross-origin | P0 | 1d |
| B5 | Open shadow-root traversal | P1 | 0.5d |
| B6 | Settle detection (mutation quiet period + pending-fetch tracking) | P0 | 1d |
| B7 | Dirty-element tracking via MutationObserver | P0 | 1d |

### EPIC C — On-device perception, NETRA (owner: **MLC**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| C1 | Capability probe + device profile + EP selection + micro-benchmark | P0 | 1d |
| C2 | Model registry with SHA-256 verification + Cache API + progress UI | P0 | 1.5d |
| C3 | Warm session pool; pre-warm on install | P0 | 1d |
| C4 | Face detection integration + `<video>` live-track rule | P0 | 1d |
| C5 | dHash + tile diff | P0 | 0.5d |
| C6 | UI-element YOLO: train, export ONNX opset 12, int8, in-browser bench | P0 | 4d |
| C7 | DOM↔widget reconciliation + vision-only elements | P0 | 1.5d |
| C8 | Coverage mask + `unexplained_pixel_ratio` | P0 | 1d |
| C9 | PP-OCR det+rec, crop batching, cap | P1 | 2d |
| C10 | GLiNER-PII wrapper: batching, buckets, cache, abort | P0 | 2d |
| C11 | Florence-2 integration (screen class + grounding) | P1 | 2.5d |
| C12 | APC: signals, scoring, budgets, weight fitting | P0 | 2d |
| C13 | WASM fallback tuning for device class C | P0 | 1d |

### EPIC D — KAVACH privacy engine (owner: **PRV**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| D1 | Text normalisation + offset map + homoglyph/zero-width handling | P0 | 1.5d |
| D2 | L0 DOM rules + site sensitivity list | P0 | 1d |
| D3 | L1 regex pack — global | P0 | 1d |
| D4 | L1 regex pack — **India + validators** (Verhoeff, Luhn, GSTIN, IFSC) | P0 | 2d |
| D5 | Secrets/entropy detector | P1 | 0.5d |
| D6 | Cascade + verdict cache | P0 | 1d |
| D7 | Fusion (noisy-OR, class lattice, coverage confidence) | P0 | 1d |
| D8 | Policy engine + packs (default/gov/bank/health) + resolution order | P0 | 1.5d |
| D9 | Text redaction with deterministic tokens + width preservation | P0 | 1d |
| D10 | Pixel redaction: blackout/blur/pixelate + CAPED marker convention | P0 | 1.5d |
| D11 | **Vault + sink binding + TTL + reversibility rules** | P0 | 1.5d |
| D12 | **Egress guard: all 8 checks** incl. image-verify | P0 | 2.5d |
| D13 | `eslint-plugin-prahari` no-fetch rule + bundle grep test | P0 | 0.5d |
| D14 | LEKHA ledger store + signing | P0 | 1d |
| D15 | Glass-box overlay renderer | P0 | 1.5d |
| D16 | "What the server saw" diff viewer (image + JSON side-by-side) | P0 | 2d |
| D17 | Canary mode: injector, runner, in-UI result | P1 | 1.5d |
| D18 | Per-site/per-class policy editor UI | P2 | 2d |
| D19 | Indic-script normalisation + label lists | P2 | 2d |

### EPIC E — HASTA executor (owner: **EXT**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| E1 | Target resolution + staleness handling | P0 | 1d |
| E2 | Client-side risk derivation (never trust server risk downward) | P0 | 1d |
| E3 | Risk gating UI: highlight+undo, blocking confirm modal | P0 | 1.5d |
| E4 | Detokenisation with full sink-binding enforcement | P0 | 1d |
| E5 | Synthetic event dispatch incl. React native-setter path | P0 | 1.5d |
| E6 | CDP trusted-event path (High-Fidelity Mode) | P1 | 1d |
| E7 | Character-wise typing + autocomplete widget settling | P1 | 1d |
| E8 | Post-condition verification + read-back | P0 | 1d |

### EPIC F — Server (owner: **BE**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| F1 | FastAPI skeleton + generated Pydantic + SSE | P0 | 1d |
| F2 | vLLM deployment (VL + text) + docker compose | P0 | 2d |
| F3 | XGrammar guided decoding wired to action-plan-v1 | P0 | 1.5d |
| F4 | **Ingress PII guard** (Python mirror of the L1 pack) + parity test vs TS | P0 | 2d |
| F5 | Image sanity check (declared masks are opaque) | P0 | 1d |
| F6 | Session store (Redis, TTL, PII-free) | P0 | 0.5d |
| F7 | Post-validation (targets exist, no literal PII, risk escalation only) | P0 | 1d |
| F8 | Metrics + OTel with shared `trace_id` | P1 | 1d |
| F9 | Air-gapped compose + CI job on an isolated runner | P1 | 1.5d |
| F10 | Local fallback server for demo (3B model on laptop) | P1 | 1d |

### EPIC G — MANTRI reasoning (owner: **SML**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| G1 | System prompt + redaction contract + instruction hierarchy | P0 | 1.5d |
| G2 | Few-shot exemplars (6) | P0 | 1d |
| G3 | Planner/Grounder split + sub-goal caching | P1 | 2d |
| G4 | Text-fast path routing | P1 | 1d |
| G5 | Injection classifier + `<untrusted_page_content>` fencing | P0 | 1.5d |
| G6 | Model bake-off (Qwen3-VL-8B vs Qwen2.5-VL-7B) on our eval | P0 | 2d |
| G7 | Prompt eval harness (40 tasks × variants) | P0 | 1.5d |
| G8 | Failure-recovery prompting (retry hints, `ask_user` policy) | P1 | 1d |

### EPIC H — Evaluation (owner: **PRV** + **SML**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| H1 | Faker-IN generator with valid checksums | P0 | 1.5d |
| H2 | 10 page templates × 5 render variations → 500-page corpus | P0 | 2d |
| H3 | Canary suite (60 × 12 surfaces) + automated leak check | P0 | 1.5d |
| H4 | Task suite (40 tasks + success predicates) | P0 | 2.5d |
| H5 | Playwright runner: extension loaded, both browsers | P0 | 2d |
| H6 | Latency harness → `docs/metrics/latency.md` (auto-generated) | P0 | 1d |
| H7 | Accuracy harness → recall/precision per class | P0 | 1d |
| H8 | Adversarial suite (injection, split-node, homoglyph, image-only PII) | P1 | 2d |
| H9 | Ablation runs for the trade-off table (`PIPELINE.md §11.4`) | P0 | 1d |

### EPIC I — Demo & submission (owner: **LEAD** + **UX**)
| ID | Ticket | Pri | Est |
|---|---|---|---|
| I1 | Mock government-scheme portal (the Asha demo target) | P0 | 2d |
| I2 | Demo script + 8 beats + failure recovery for each | P0 | 1d |
| I3 | Pitch deck (problem → insight → architecture → numbers → live demo) | P0 | 2d |
| I4 | 3-minute video | P0 | 1d |
| I5 | README with 5-minute setup | P0 | 0.5d |
| I6 | Judge Q&A prep sheet (30 anticipated questions) | P1 | 1d |

**Total P0 estimate ≈ 92 person-days.** With 6 people over 8 weeks (≈ 120 available person-days at 50 % effective utilisation for students) this is tight but feasible **only if** P1/P2 stay droppable. See `PHASEWISE.md` for the sequencing that makes it fit.

---

## 9. Test strategy

| Level | What | Tool | Gate |
|---|---|---|---|
| Unit | Validators (Verhoeff/Luhn/GSTIN), normalisation, token grammar, policy resolution, fusion math | Vitest | 100 % branch coverage on `kavach/detectors` and `kavach/vault` — **non-negotiable** |
| Unit | Egress guard: 40 crafted payloads that must be blocked | Vitest | all blocked |
| Contract | SSG/Action schema round-trip TS ↔ Python | Vitest + pytest | byte-identical after codegen |
| Parity | TS regex pack vs Python regex pack on 10 k strings | CI job | zero disagreements |
| Integration | Content script → KAVACH → guard → mock server | Playwright | loop completes |
| E2E | 40 tasks on the synthetic corpus, both browsers | Playwright | TSR ≥ 75 % |
| Privacy E2E | Canary suite | Playwright | **0/60 leaked** |
| Adversarial | Injection + evasion suite | Playwright | 0 high-risk executions; recall ≥ target |
| Perf | Latency harness on 3 device profiles | Playwright + trace | p50/p95 within budget |
| Server | Ingress guard, guided decoding validity, post-validation | pytest | 100 % schema-valid over 1 k generations |

**The canary test is a CI blocker.** A PR that leaks a canary cannot merge. That single rule is what turns the privacy claim from marketing into engineering.

---

## 10. CI pipeline

```yaml
on: [push, pull_request]
jobs:
  lint:        eslint (incl. prahari/no-fetch) · ruff · mypy · prettier check
  contract:    pnpm gen:contract && git diff --exit-code     # schema drift = fail
  unit:        vitest --coverage (thresholds enforced) · pytest
  parity:      regex pack TS vs PY on the shared fixture corpus
  build:       chrome zip + firefox xpi + docker image
  e2e:         playwright, chromium + firefox, mock server
  privacy:     canary suite  ← BLOCKING
  perf:        latency harness on the CI runner profile; regression > 15% = fail
  airgap:      (nightly) docker compose on a network-isolated runner + task suite
```

---

## 11. Configuration surface

```ts
// packages/extension/src/shared/config.ts
export const CONFIG = {
  serverOrigin: process.env.PRAHARI_SERVER_ORIGIN!,   // baked at build; the ONLY allowed host
  privacyMode: 'balanced' as 'strict'|'balanced'|'fast',
  tierCeiling: 2 as 0|1|2,                            // 'strict' pins this to 1
  localOnly: false,
  highFidelity: false,                                // chrome.debugger opt-in
  budgets: { tier0: 120, tier1: 220, tier2: 450 },    // ms, local stages only
  models: { vlm: 'off' as 'off'|'florence2-base', ocr: true, widgets: true },
  ledgerRetentionDays: 30,
  canaryMode: false,
} as const;
```

`strict` mode = Tier ceiling 1 (no pixels ever leave), all Tier-B classes redacted regardless of confidence, HIGH-risk confirm on every `type` into a form. It's the mode we show judges first.

---

## 12. Definition of Done for a feature

A ticket is done when **all** of these are true:
1. Code merged behind no feature flag (or the flag is default-on and the off path is deleted within one sprint).
2. Unit tests exist and cover the failure path, not just the happy path.
3. If it touches egress: a test proves it fails closed.
4. If it touches the SSG: the schema was updated, codegen re-run, and an ADR written.
5. It runs on Chrome **and** Firefox, or `platform/` has an explicit, tested fallback.
6. Latency measured and recorded in `docs/metrics/`.
7. A one-line entry added to the demo script if it is user-visible.
