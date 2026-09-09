# QUICKSTART — run the walking skeleton

Five minutes from clone to a running loop. If any step takes longer, that is a bug —
file it.

## 0. Prerequisites

- **Node 20+** (built and tested on 24.13)
- **pnpm** — `npm i -g pnpm` if you do not have it
- Chrome 120+ and/or Firefox 128+

Python is **not** needed yet. The server in this slice is a zero-dependency Node
process; the real FastAPI + vLLM server arrives in Phase 2 and needs Python 3.12
(on Windows: WSL2).

## 1. Install and verify

```bash
pnpm install
pnpm verify
```

`verify` runs typecheck → lint → the choke-point-rule proof → 61 tests. All four must
pass before you write code.

## 2. Start the server

```bash
pnpm server:mock
```

Listens on `http://localhost:8080`. It returns a **hard-coded** plan — there is no
model behind it. It is labelled as a mock in its own `/v1/models` response, and
`RULES.md D5` forbids it from appearing in any demo.

## 3. Build the extension

```bash
pnpm build          # both targets
# or: pnpm build:chrome / pnpm build:firefox
```

Output: `packages/extension/dist-chrome/` and `dist-firefox/`.

Use `pnpm dev` for a rebuild-on-save loop (you still have to hit reload in the browser).

## 4. Load it

**Chrome** — `chrome://extensions` → enable *Developer mode* → *Load unpacked* →
select `packages/extension/dist-chrome`.

**Firefox** — `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on…* →
select `packages/extension/dist-firefox/manifest.json`.
(Temporary add-ons are cleared when Firefox restarts. That is expected.)

## 5. Run the loop

1. Open the demo page: `packages/eval/fixtures/demo-portal.html` (drag it into a tab).
   It is a fictional government-scheme form carrying a checksum-valid synthetic
   Aadhaar, PAN, IFSC, UPI handle, phone, email, a password and an OTP.
2. Open the side panel — click the PRAHARI toolbar icon (Chrome), or open the sidebar
   (Firefox).
3. Type a goal, e.g. *"Apply for the scheme using my saved profile"*, and press **Run**.

### What you should see

- The status card moves through **Reading screen → Redacting → Guard check → Server
  planning → Acting**.
- **Redacted** counts the identifiers KAVACH found and tokenised.
- **Sent this step** is a few KB — the SSG only, no pixels.
- The page scrolls. After three steps the server says `done`.
- The **Ledger** tab shows one row per step with the SHA-256 of the exact bytes sent.

### Prove it refuses to leak

Press **Run self-test** on the Task tab. It hands the guard a payload containing a
valid Aadhaar number and passes only if the guard *refuses to send it*. The refusal is
written to the ledger as a `blocked` row — open the Ledger tab and look.

You can also watch the server: it runs its own independent PII sweep and answers `422
REDACTOR_FAILURE` if anything unredacted ever reaches it. In normal operation you
should never see that line.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Side panel says *"Could not read the page"* | The content script is not on that tab. Reload the tab after loading the extension; it cannot inject into `chrome://` pages or the extension gallery. |
| Status stops at **Blocked** | Working as designed — the guard refused its own payload. The message names the check. Read it; do not work around it. |
| *"server unreachable"* | `pnpm server:mock` is not running, or something else holds port 8080. |
| Firefox: no sidebar | Use *View → Sidebar → PRAHARI*, or reload the temporary add-on. |

## What this build does and does not do

**Does**: real DOM extraction, L0 DOM-rule + L1 checksum-validated redaction
(Aadhaar/PAN/GSTIN/IFSC/UPI/phone/email/card/JWT), a 7-of-8-check egress guard, a
hash-chained privacy ledger, click/type/scroll/select execution with client-side risk
gating, Chrome and Firefox from one codebase.

**Does not, yet**: contextual PII (names, addresses — needs L2 NER, ticket C10), any
vision model, screenshots or Tier 2, the vault and sink binding (so `value_ref` is
refused rather than resolved), and the adaptive tier controller (it returns a fixed
tier 1 and says so in the UI).

Full list with ticket numbers: `docs/adr/0001-walking-skeleton.md`.
