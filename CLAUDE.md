# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is HaqNama

HaqNama (حق نامہ — "Book of Rights") is a bilingual (Urdu/English) legal information assistant for Pakistani citizens. It answers basic civic-procedure questions from a curated knowledge base. It runs on **Next.js 15 (App Router)** with **TypeScript**, styled with **Tailwind CSS**, and stores data in **SQLite** via `better-sqlite3`. Deploy target is **Vercel**.

## Critical safety rules

1. **Never legal advice.** Every answer and every page must carry the legal disclaimer. The app provides curated civic information only — it must never be presented as a substitute for a lawyer. The disclaimer text lives in the `disclaimers` table (seed.sql) and is rendered by the `Disclaimer` component on every page and in every API response.

2. **Sensitive-topic helpline routing.** Queries containing sensitive keywords (domestic violence, arrest/detention, inheritance disputes) must immediately surface a human helpline number via the `HelplineBanner` component. This banner renders **above** any FAQ answer — never suppress or bury it. Detection uses a **layered safety model** (`lib/sensitive.ts`): Net 1 scans category-specific keywords (`sensitive_keywords` table); if Net 1 finds nothing, Net 2 scans a general distress lexicon (`distress_lexicon` table) that catches phrases like "help me", "koi nahi hai", "dar lag raha hai" → 1099 helpline. Net 2 is a fallback, never additive. Before any matching, the query is normalized (`lib/normalize.ts`): lowercasing, Urdu diacritic stripping, and Roman Urdu alias substitution from the `roman_urdu_aliases` table.

3. **Knowledge base is curated, not generated.** Answers come only from the approved FAQ entries in `data/seed.sql`. Do not add AI-generated or LLM-summarized legal content — only vetted, human-approved text.

4. **P0 Safety Failure Mode.** If sensitive-topic detection throws or exceeds its 500 ms timeout, the API route (`app/api/search/route.ts`) catches the error and returns the **1099 Ministry of Human Rights helpline** as a fallback in the `sensitive` array. FAQ results may still render alongside it, but the banner is **always** present. There is no code path that returns results without either a successful detection or the fallback banner. Normalization errors degrade gracefully (lowercase + diacritic strip only) but never silently skip detection.

5. **Never log raw query text.** In `app/api/search/route.ts` and `lib/search.ts`, `console.log`, `console.error`, and any other logging of the raw `q` parameter are **forbidden**. Query text may contain sensitive, personal, or legally consequential information about the user's situation (e.g. details of domestic violence, an arrest, an inheritance dispute). Logging it creates a privacy risk and a potential evidence trail on the server. If error logging is needed, log **only** the error code and a generated request ID — never the query text. Extend this prohibition to any new file that handles the `q` parameter.

## Security (mandatory — not optional)

All three requirements below are **mandatory**. They are not aspirational or future — they must be in place before any production deployment.

### Input validation — Zod

Every API route **must** validate its query parameters through the Zod schemas in `lib/validation.ts`:

| Param | Rule | Schema |
|---|---|---|
| `q` | Optional string, max 500 chars, trimmed | `z.string().max(500).trim()` |
| `lang` | Optional enum, must be `"en"` or `"ur"` | `z.enum(["en", "ur"])` |

- Use `schema.safeParse()` — never assume input is well-formed.
- On validation failure, return **HTTP 400** with `error: "Invalid input"` and the Zod `flatten()` details.
- The `q` max-length prevents abuse via arbitrarily long query strings (the detector does substring scans — a 1 MB query would be a trivial DoS).
- Schemas are shared in `lib/validation.ts` — import them; do not redefine per route.

Both `/api/search` and `/api/faqs` already use these schemas. Any new API route must do the same.

### Rate limiting — middleware

`middleware.ts` enforces an in-memory per-IP rate limit on all `/api/*` paths:

| Setting | Value |
|---|---|
| Limit | 30 requests per 60 seconds per IP |
| Exceeded response | HTTP 429 with `Retry-After` header |
| IP source | `x-forwarded-for` → `request.ip` → `"unknown"` |
| Scope | `/api/:path*` only (configured via `matcher`) |

**Limitation (documented, acceptable for MVP):** The rate limiter uses an in-memory `Map`. State resets on each cold start and is **not shared** across serverless function instances. This means a determined attacker could get 30 requests per instance. For production scale, swap the store to Redis / Upstash Rate Limit — the `checkLimit()` / window-reset interface is designed to be swappable without changing the middleware signature.

Do not disable or bypass this middleware. If you need higher limits for a specific use case, make the limit configurable via environment variable — but never remove the limiter entirely.

### Security headers — next.config.mjs

The `async headers()` config in `next.config.mjs` applies the following headers to **every route**:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframes |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage to third parties |
| `X-XSS-Protection` | `0` | Disables legacy XSS filter (modern browsers use CSP) |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Enforces HTTPS for 2 years including subdomains |
| `Content-Security-Policy` | `default-src 'self'; ...` | Restricts resource loading to same origin |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unnecessary browser APIs |

**Note on CSP:**
- `style-src` includes `'unsafe-inline'` because the Next.js + Tailwind setup may inject inline styles. It also includes `https://fonts.googleapis.com` for the Noto Nastaliq font CSS import.
- `script-src` includes `'unsafe-inline'` because **Next.js 15 uses inline scripts for React Server Component streaming** (`self.__next_f.push`). Without this, the browser blocks RSC hydration and the page renders blank. This is a known requirement for all Next.js 15 apps. Do not remove `'unsafe-inline'` from `script-src`.

Do not remove or relax these headers without a documented security review.

## Common commands

```bash
npm install         # Install dependencies
npm run init-db     # (Re)build data/haqnama.db from schema.sql + seed.sql
npm run dev         # Start dev server at http://localhost:3000
npm run build       # Production build (runs init-db first)
npm run start       # Run the production build locally
```

**Always run `npm run init-db` after editing `data/schema.sql` or `data/seed.sql`** — the committed DB file is gitignored and regenerated from these sources.

## Architecture

```
app/
  layout.tsx          # Root layout, wraps everything in LanguageProvider
  page.tsx            # Main search page — debounced search, voice input, renders results
  loading.tsx         # Loading skeleton shown while data fetches
  error.tsx           # Error boundary — catches render crashes, shows message
  globals.css         # Tailwind + Noto Nastaliq Urdu font import
  api/
    chat/route.ts     # POST /api/chat — AI-enhanced matching (Claude) + sensitive detection
    search/route.ts   # GET /api/search?q=&lang= → keyword search + sensitive matches (fallback)
    faqs/route.ts     # GET /api/faqs?lang= → all FAQs (browse mode)
components/
  LanguageContext.tsx # Context provider: lang state, <html dir/lang> sync, t() helper
  LanguageToggle.tsx  # English / اردو toggle button
  HelplineBanner.tsx  # ⚠️ Sensitive-topic helpline alert (renders ABOVE answers)
  Disclaimer.tsx      # ⚖️ Legal disclaimer box
  FAQCard.tsx         # Single FAQ result card with category + "best match" + "AI matched" badges
lib/
  types.ts            # Shared TypeScript types (Lang, FAQ, Helpline, ChatResponse, etc.)
  db.ts               # better-sqlite3 singleton + query helpers (readonly connection)
  normalize.ts        # Query normalization: lowercase, diacritic strip, Roman Urdu alias substitution
  sensitive.ts        # Layered safety: Net 1 category keywords → Net 2 distress lexicon → Net 3 P0 fallback
  search.ts           # Tag + keyword overlap scorer for FAQ matching (keyword fallback)
data/
  schema.sql          # CREATE TABLE statements (incl. roman_urdu_aliases, distress_lexicon)
  seed.sql            # INSERT OR IGNORE statements: 10 FAQs, 7 helplines, 35+ keywords, 2 disclaimers, ~32 Roman Urdu aliases, ~61 distress terms
  init-db.mjs         # Node script that builds haqnama.db from schema + seed
```

## Key design decisions

- **Database:** SQLite via `better-sqlite3` (synchronous, ideal for per-request server code). The connection is opened readonly and cached on `globalThis` to survive Next.js hot-reload. `serverExternalPackages: ["better-sqlite3"]` in `next.config.mjs` prevents bundling the native module.
- **Search:** Simple tag/keyword overlap scoring (no embeddings). Tag matches = 3 pts, question matches = 2 pts, category matches = 1 pt. Empty query returns all FAQs in sort order.
- **Sensitivity detection:** Three-layer model. (1) Normalize query (lowercase → strip Urdu diacritics → substitute Roman Urdu aliases from `roman_urdu_aliases`). (2) Net 1: scan against `sensitive_keywords` for category-specific matches → targeted helpline. (3) Net 2 (only if Net 1 empty): scan against `distress_lexicon` for general distress phrases → 1099 helpline. (4) Net 3: API route catches any detection error/timeout → 1099 banner (P0). Conservative by design — false positives are safer than false negatives. A 500 ms timeout guard throws on exceed (caught by Net 3).
- **Bilingual:** Every content table has `_en` and `_ur` columns. The `LanguageContext` flips `<html dir>` to `rtl` for Urdu and applies the Noto Nastaliq font. The `t(en, ur)` helper renders the right string inline.
- **API routes:** Both `force-dynamic` so they always read fresh from the DB (needed since the DB file can be regenerated).
- **AI-enhanced matching (RAG):** `POST /api/chat` uses Claude (Anthropic API) to semantically match natural language queries to curated FAQs. The LLM only returns the matching FAQ slug — it never generates answers. Answers always come from the curated DB. Falls back to keyword search if `ANTHROPIC_API_KEY` is missing or the API call fails. **Cost:** ~$0.003/query with Claude Sonnet 4.5.
- **Voice input:** Web Speech API (`SpeechRecognition`) lets users speak their question. Supports `ur-PK` and `en-US`. Gracefully degrades if the browser doesn't support it.
- **Follow-up suggestions:** The LLM returns 2-3 follow-up questions shown as clickable chips below results.

## Adding a new FAQ

1. Add an `INSERT INTO faqs (...)` statement in `data/seed.sql` with a unique `slug`, both languages' text, comma-separated tags in both languages, and the next `sort_order` number.
2. Add relevant tags to `tags_en` and `tags_ur` so search can match.
3. Run `npm run init-db`.
4. No code changes needed — the API and UI auto-discover new rows.

## Adding a sensitive keyword / helpline

1. Add the helpline to `data/seed.sql` `helplines` table (if new).
2. Add keyword rows to `sensitive_keywords` linking keyword → `helpline_id`.
3. Run `npm run init-db`.
4. Keywords are cached at module load in `lib/sensitive.ts` via `globalThis`.

> **⚠️ Redeploy required.** Because keywords are cached on `globalThis` at module load and the app runs on **serverless (Vercel)**, each function instance loads the module once per cold start. A local `npm run restart` is **not sufficient in production** — you must trigger a **full redeploy** (git push / Vercel deploy) to rebuild the function bundle with the updated `init-db` output and fresh module state. This applies to **all cached tables**: `sensitive_keywords`, `distress_lexicon`, `roman_urdu_aliases`, `helplines`, `disclaimers`, and `faqs`. None of them pick up seed.sql changes without a redeploy.

## Adding a distress lexicon term

1. Add an `INSERT INTO distress_lexicon (term, lang)` to `data/seed.sql`.
2. `term` should be lowercase and in the script the user is expected to type (Roman Urdu or Nastaliq Urdu). It is matched against the normalized query.
3. Multi-word phrases are supported (e.g. `"i am not safe"`) and are matched longest-first.
4. All distress terms route to helpline **1099** — this is hardcoded. Do not add a helpline_id column; if you need a different routing, open a discussion.
5. Run `npm run init-db`.
6. Terms are cached at module load in `lib/sensitive.ts` via `globalThis` — a server restart picks up changes.

## Adding a Roman Urdu alias

1. Add an `INSERT INTO roman_urdu_aliases (alias, canonical, lang)` to `data/seed.sql`.
2. The `canonical` value **must** match an existing `sensitive_keywords.keyword` exactly — otherwise the substitution produces a token that never matches.
3. `alias` should be lowercase Roman Urdu. Multi-word aliases are supported (e.g. `"jabri shadi"`) and are matched longest-first.
4. Run `npm run init-db`.
5. Aliases are cached at module load in `lib/normalize.ts` via `globalThis` — a server restart picks up changes.

## Vercel deployment notes

### Database file tracing (REQUIRED — do not skip)

`data/haqnama.db` is **not** automatically included in the Vercel serverless function bundle. You **must** configure `outputFileTracingIncludes` in `next.config.mjs`:

```js
outputFileTracingIncludes: {
  "/*": ["./data/haqnama.db"],
},
```

This tells Next.js to copy the DB file into each serverless function's `.next/standalone` output so `better-sqlite3` can find it at `data/haqnama.db` relative to `process.cwd()`.

**⚠️ Warning:** Without this config, `npm run build` will succeed but **every API route will crash at runtime** with `SQLITE_CANTOPEN: unable to open database file`. The error occurs because the serverless function's working directory does not contain the DB file — the build traced only the JS bundle, not the database. This is silent at build time and only surfaces when a user hits `/api/search`. Verify by calling the API route in production after deploy, not just by checking that the build passed.

### Native module note

- `better-sqlite3` is a native module — Vercel's Node runtime supports it. The `serverExternalPackages: ["better-sqlite3"]` config keeps it external to the server bundle so Next.js doesn't try to bundle the native `.node` binary.
- The DB file is read-only at runtime. If you need to write to the DB at runtime (future feature), switch to a writable path outside `.next/`, since the build output is read-only.
- The `build` script runs `init-db` before `next build`, so the DB is fresh on each deploy.

### Fallback: JSON import instead of SQLite

If `better-sqlite3` native module bundling proves unreliable on Vercel (or if you want to eliminate native dependency complexity), the fallback is to ship the data as a JSON import:

1. Export the FAQ, helpline, keyword, alias, and distress data as a typed JSON object from a `lib/data.ts` file (generated from `data/seed.sql` or maintained in parallel).
2. Replace `lib/db.ts` query helpers with in-memory lookups against the imported JSON.
3. Remove `better-sqlite3` from `package.json` and `serverExternalPackages` from `next.config.mjs`.
4. Remove `outputFileTracingIncludes` (no longer needed).

This is a viable fallback because the dataset is small and read-only: ~10 FAQs, ~7 helplines, ~25 keywords, ~30 Roman Urdu aliases, ~45 distress terms. A JSON import eliminates native module issues entirely and works identically on all platforms.

## Production Verification Checklist

Run this checklist after every production deployment. Do not consider a deploy "done" until all steps pass.

### Step 1 — Local pre-flight

```bash
npm run init-db    # must print row counts for all 5 tables
npm test           # must pass all cases in lib/sensitive.test.ts
npm run build      # must succeed
```

### Step 2 — Local bundle trace check

After `npm run build`, confirm the DB and native module are traced into the server bundle:

```bash
grep -r "haqnama.db" .next/server/ 2>/dev/null
grep -r "better_sqlite3.node" .next/server/ 2>/dev/null
```

Both commands must return results (appear in `.nft.json` trace files for both `/api/faqs` and `/api/search`). If either is empty, `outputFileTracingIncludes` is misconfigured and Vercel will 500 at runtime.

### Step 3 — Deploy

```bash
vercel --prod
```

**Environment variables to set in Vercel** (if using AI matching):
- `ANTHROPIC_API_KEY` — get from https://console.anthropic.com/settings/keys
- Without this key, the app falls back to keyword search (still fully functional)

### Step 4 — Production curl matrix

Run against the live URL. Each query tests a specific safety or data path:

```bash
URL="https://<your-deployment-url>"

# Category keyword → expect helpline 1098
curl -s "$URL/api/search?q=violence&lang=en" | jq '{number: .sensitive[].helpline.number}'

# Roman Urdu alias → expect helpline 1098 (proves normalization)
curl -s "$URL/api/search?q=tashaddud&lang=en" | jq '.sensitive[].helpline.number'

# Distress lexicon → expect helpline 1099 (proves Net 2)
curl -s "$URL/api/search?q=help%20me&lang=en" | jq '.sensitive[].helpline.number'

# Benign query → expect empty sensitive, non-empty results
curl -s "$URL/api/search?q=passport&lang=en" | jq '{sensitive_len: (.sensitive|length), results_len: (.results|length)}'

# Urdu script → expect helpline 1098 with Urdu name
curl -s "$URL/api/search?q=%D8%AA%D8%B4%D8%AF%D8%AF&lang=ur" | jq '.sensitive[].helpline.name_ur'

# FAQ route → expect 10 FAQs + non-empty disclaimer
curl -s "$URL/api/faqs?lang=en" | jq '{faqs: (.faqs|length), disclaimer_len: (.disclaimer|length)}'
```

**Interpretation table:**

| Query | Expected | If 1099 for violence | If empty for violence |
|---|---|---|---|
| `q=violence` | `number == "1098"` | DB failed, fallback fired → bundle issue | Keywords not seeded or detection broken |
| `q=tashaddud` | `number == "1098"` | n/a | Roman Urdu normalization broken |
| `q=help me` | `number == "1099"` | n/a | Distress lexicon not seeded or Net 2 unreached |
| `q=passport` | `sensitive == 0, results > 0` | n/a | Non-empty sensitive = false positive; empty results = FAQ search broken |
| Urdu query | `name_ur` is Urdu script | n/a | Bilingual path broken |
| `/api/faqs` | `faqs == 10, disclaimer > 0` | n/a | Fewer than 10 = incomplete seed; empty disclaimer = row missing |

Every query must also return HTTP 200 and a non-empty `disclaimer` field.

### Step 5 — Runtime log check

```bash
vercel logs --environment production --since 5m | grep -E "SQLITE_CANTOPEN|NODE_MODULE_VERSION|ENOENT|better_sqlite3"
```

Any hit means the native module or DB file was not bundled correctly. Investigate `outputFileTracingIncludes` and `serverExternalPackages`.

### Step 6 — P0 fallback code review

Verified by reading `app/api/search/route.ts` — no deployment needed. Confirm:
1. `buildFallbackSensitive()` returns a hardcoded `Helpline` object literal (not `getHelplineById()`)
2. The literal has `number: "1099"`
3. The catch block (lines ~70-75) unconditionally sets `sensitive = buildFallbackSensitive()` on any error
4. `getHelplineById` is NOT imported (only `getDisclaimer`)

### Step 7 — UI checklist

- Multi-paragraph FAQ answers render with visible paragraph breaks (CNIC, FIR entries)
- Urdu toggle flips layout to RTL and loads Nastaliq font
- Helpline banner appears above results for sensitive queries, with clickable `tel:` link
- Disclaimer box visible at page bottom

### Last verified

- **Date:** 2026-10-25
- **Production URL:** https://haqnama.vercel.app
- **Deployment ID:** dpl_2U7LVqetH52W6fXNrd7ArCKkzEh5
- **Status:** All 6 production curl queries pass. No runtime errors. P0 fallback verified by code review.
