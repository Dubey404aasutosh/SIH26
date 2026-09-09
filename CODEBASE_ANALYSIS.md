# PRAHARI Codebase Analysis & Architecture Breakdown

> **Project:** PRAHARI (*Privacy-Respecting Agentic Hybrid Assistant for Redacted Interaction*)  
> **Hackathon:** Smart India Hackathon 2026 · Software Edition  
> **Core Value Proposition:** *"The server sees the shape of your screen, never its secrets."*

---

## 1. Executive Summary & Problem Formulation

Modern autonomous web agents traditionally rely on sending complete DOM snapshots or raw pixel screenshots to remote multimodal Vision-Language Models (VLMs / LLMs) in the cloud. This poses severe data privacy, regulatory, and security risks:
- **Sensitive PII Exposure:** Passwords, Aadhaar numbers, PAN cards, OTPs, financial records, medical records, and auth tokens are transmitted to 3rd-party servers.
- **Indirect Prompt Injection:** Adversarial web pages can inject malicious text that manipulates the cloud planner into exfiltrating user data.
- **Bandwidth & Latency Inefficiencies:** Uploading multi-megabyte screenshots per step incurs high latency (2-5s) and network load.

**PRAHARI** addresses this with a **hybrid client-server architecture**:
1. **Client-Side Edge Perception (NETRA):** Extracts DOM structure, accessibility trees, and runs on-device local vision models (WebGPU/WASM) for face detection, OCR, and element segmentation.
2. **Deterministic Privacy Shield & Token Vault (KAVACH):** Detects PII locally using multi-tier pattern matching & NER models. Replaces real PII with typed, coreferent tokens (e.g., `⟦AADHAAR_1⟧`). Stores the mapping exclusively in an in-memory, tab-isolated client Vault with **Sink Binding**.
3. **Formal Wire Contract (SETU):** Serializes a compact (~6 KB) **Sanitized Screen Graph (SSG)** sent over JSON/HTTPS.
4. **Cloud / Remote Reasoning Planner (MANTRI):** An open-weights VLM/LLM (e.g. Qwen3-VL) plans actions using the token references (e.g., `"type ⟦AADHAAR_1⟧ into element e17"`). The cloud *never* knows the underlying secrets.
5. **Local Secure Action Executor (HASTA):** Validates action targets, verifies that token resolution occurs strictly into authorized origins and target sinks, detokenizes the value locally, and dispatches trusted DOM events.

---

## 2. Architecture & Component Blueprint

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              CLIENT (BROWSER)                          │
 │                                                                        │
 │  ┌─────────────────┐       ┌─────────────────┐       ┌──────────────┐  │
 │  │      NETRA      │ ────► │     KAVACH      │ ────► │ EGRESS GUARD │  │
 │  │ (DOM/A11y/Vision│       │ (Regex/NER/Fuse/│       │ (8 Invariant │  │
 │  │  Extraction)    │       │  Vault Binding) │       │   Fail-Safe) │  │
 │  └─────────────────┘       └─────────────────┘       └──────┬───────┘  │
 │           ▲                                                 │          │
 │           │                                 ~6 KB SSG JSON  │ (HTTPS)  │
 │  ┌────────┴────────┐                                        ▼          │
 │  │      HASTA      │ ◄─────────────────────────────────────────────┐   │
 │  │ (Local Executor │               Action Plan JSON                │   │
 │  │  & Sink Verify) │                                               │   │
 │  └─────────────────┘                                               │   │
 └────────────────────────────────────────────────────────────────────┼───┘
                                                                      │
 ┌────────────────────────────────────────────────────────────────────┼───┐
 │                              SERVER                                │   │
 │                                                                    │   │
 │  ┌────────────────┐       ┌─────────────────┐       ┌──────────────┴┐  │
 │  │  INGRESS GUARD │ ────► │  MANTRI PLANNER │ ────► │ ACTION SCHEMA │  │
 │  │ (PII Re-scan & │       │ (Qwen3-VL/LLM   │       │  VALIDATOR &  │  │
 │  │  Schema Check) │       │  Reasoning)     │       │  POST-GUARD   │  │
 │  └────────────────┘       └─────────────────┘       └───────────────┘  │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Package & Directory Breakdown

### 📦 `packages/ssg` — The SETU Wire Contract
The single source of truth for communication schemas between browser and server.
- `schema/ssg-v1.json`: JSON Schema for Sanitized Screen Graph (viewport, page metadata, sanitized interactive element tree).
- `schema/action-plan-v1.json`: JSON Schema defining permitted planner operations (`click`, `type`, `select`, `scroll`, `wait`, `ask_user`, `finish`).
- `schema/redaction-manifest-v1.json`: Structural manifest of redactions applied to the screen state.
- `src/tokens.ts`: Parsing and formatting helpers for token references (`⟦CLASS_INDEX⟧`).
- `src/types.ts`: Strongly typed TypeScript interfaces with compile-time branding (`RedactedText`).

### 📦 `packages/kavach` — The On-Device Privacy Engine
Guarantees privacy before any byte leaves the machine.
- `src/vault.ts`: Cryptographic token vault. Generates typed placeholders, enforces strict **Sink Binding** (prevents token injection exfiltration), applies TTLs, and handles user-confirmation gates for high-risk data.
- `src/detectors/l1-regex/`: Zero-dependency, microsecond regex suite for Indian & Global PII (Aadhaar, PAN, Passport, Phone, Email, Credit Cards, API Keys, Passwords).
- `src/classes.ts`: Complete PII classification taxonomy (reversible vs non-reversible credentials, sensitivity rankings, DPDP alignment).
- `src/fuse.ts`: Multi-stage detector arbitration resolving overlaps and precedence between rule-based and ML detectors.
- `src/egress-guard.ts`: The absolute network chokepoint executing 8 mandatory safety checks (Schema validation, PII re-scan, Canary leak audit, Entropy sweep, Image verification, Manifest check, Host allowlist, Token integrity).
- `src/ledger.ts`: Cryptographic, SHA-256 hash-chained two-phase audit ledger recording all redactions, offers, and transmissions.
- `src/canary.ts`: Synthetic canary injection framework for automated stage/CI privacy verification.

### 📦 `packages/netra` — On-Device Perception
Interfaces and perception pipeline for local browser perception.
- `src/index.ts`: Perception engine interfaces, WebGPU/WASM device capability probes (Class A/B/C profiling), adaptive tier selection, and bounding box grounding.

### 📦 `packages/extension` — Browser Extension (Chrome MV3 + Firefox)
- `src/background/agent-loop.ts`: Core deterministic state machine managing the `Observe -> Sanitize -> Guard -> Transmit -> Plan -> Execute -> Verify` cycle.
- `src/background/net.ts`: Secure network dispatch layer exclusively bound to the Egress Guard.
- `src/background/transmissions.ts`: Ring buffer tracking recent network payloads for transparency.
- `src/content/session.ts`: Tab-isolated session controller holding the in-memory Vault.
- `src/content/extract.ts`: Real-time DOM and visual tree extractor.
- `src/content/executor.ts`: HASTA execution engine with sink validation, trusted user input synthesis, and visual feedback.
- `src/content/overlay.ts`: Interactive bounding box and redaction visualization rendered on the active web page.
- `src/sidepanel/`: React 19 UI providing live step progress, telemetry, token count, Canary test triggers, and side-by-side diffs (*"What the server saw vs What was on screen"*).

### 🖥️ `server/app` — MANTRI Planning Server
- `main.py`: FastAPI server handling `/v1/plan`, `/v1/metrics`, and health endpoints.
- `guards/ingress_pii.py`: Receiver-side PII detector verifying that incoming payloads contain zero unredacted personal identifiers.
- `agents/grounder.py`: Prompt builder with strict untrusted-content tagging and post-validation guards preventing fabricated references or risk de-escalation.
- `llm/client.py`: Resilient LLM/VLM integration client supporting OpenAI, vLLM, and local open-weight endpoints with fallback retry loops.

### 🧪 `packages/eval` & `tools/` — Verification & Developer Tooling
- `packages/eval/e2e/`: Playwright end-to-end testing suite for agent task completion and privacy invariants.
- `tools/eslint-plugin-prahari/`: AST lint rules enforcing that raw strings cannot bypass the redaction pipeline.
- `tools/mock-server/`: High-speed local mock server for offline unit and integration tests.

---

## 4. Key Privacy & Security Invariants

| Rule ID | Invariant | Enforcement Mechanism |
|---|---|---|
| **P1** | Network Choke Point | Only `background/net.ts` can invoke `fetch()`, strictly gated behind `EgressGuard.evaluate()`. |
| **P2** | Fail Closed | Any detector crash, schema mismatch, or unverified payload instantly halts transmission with `ok: false`. |
| **P3** | Sink Binding | A token `⟦AADHAAR_1⟧` can only be resolved into the exact element ID and origin from which it originated. |
| **P4** | Never Send Credentials | Passwords and auth credentials receive non-reversible `⟦REDACTED_0⟧` placeholders whose values are deleted on creation. |
| **P5** | Two-Phase Audit Ledger | Every decision is recorded into a SHA-256 hash chain with a tamper-evident audit log. |
| **P6** | Ingress Verification | The server re-evaluates all payloads through `ingress_pii.py` to catch client-side bugs or regressions. |

---

## 5. Summary of Enhancements

1. **Complete Codebase Audit:** Every module verified against the Smart India Hackathon problem statement and privacy constraints.
2. **High-Fidelity Documentation:** Full documentation of state machines, security invariants, data structures, and trust boundaries.
3. **Ready for Multi-Branch Development:** Tracked and clean repository ready for deployment and remote collaboration.
