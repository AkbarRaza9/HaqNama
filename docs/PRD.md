# HaqNama — Product Requirements Document

**حق نامہ** — "Book of Rights"

| Field | Value |
|---|--- |
| Status | Draft v1.0 |
| Author | Product |
| Last updated | 2026-10-25 |
| Tech stack | Next.js 15 (App Router), TypeScript, Tailwind CSS, SQLite (better-sqlite3), Vercel |

---

## 1. Product Vision

**HaqNama** is a bilingual (Urdu/English) civic legal information assistant for Pakistani citizens. It answers basic, frequently-asked questions about government procedures — things like "How do I apply for a CNIC?" or "How do I file an FIR?" — using a **curated, human-approved knowledge base**.

The vision is to close the information gap between citizens and the state. Millions of Pakistanis do not know their basic civic rights or the steps to complete routine government procedures. Lawyers are expensive, government offices are hard to navigate, and online information is scattered, outdated, or in English only. HaqNama puts clear, vetted, bilingual answers in one place — free and instantly.

---

## 2. Problem Statement

Pakistani citizens face three barriers when they need to interact with civic procedures:

1. **Information scarcity.** Government portals are fragmented, often only in English, and rarely explain *how* to complete a procedure — only *what* the law says.
2. **Legal access cost.** Consulting a lawyer for a simple procedural question is unaffordable for most citizens (Rs. 2,000–10,000+ per consultation).
3. **Language divide.** A large share of the population is comfortable only in Urdu but most official information is in English.

The result: citizens rely on word-of-mouth, agent middlemen (aridars), or simply give up — which means missed pensions, unregistered births, unresolved disputes, and violated rights.

---

## 3. Target Users & Personas

### Primary persona — "Sadia"
- Age 28, lives in Lahore, works as a school teacher
- Comfortable in Urdu, reads basic English
- Needs to register her newborn and doesn't know which office to go to
- Has a smartphone and WhatsApp, uses Google occasionally
- Cannot afford a lawyer for procedural questions

### Secondary persona — "Rashid"
- Age 55, lives in a village near Multan
- Urdu-dominant, limited English
- Wants to know how to file an FIR after a property dispute
- Uses a basic Android phone, slow internet
- Has never visited a government office in a city

### Tertiary persona — "Ayesha"
- Age 22, university student in Karachi
- Bilingual (Urdu + English)
- Wants to apply for a passport for the first time
- Comfortable with web apps

---

## 4. Core Principles

These are non-negotiable design constraints. Every feature, every answer, every UI decision must respect them.

### 4.1 Never legal advice
HaqNama provides **civic information only**. It does not interpret law for a specific situation, does not draft legal documents, and does not replace a lawyer. Every page and every answer carries a visible legal disclaimer. This is the single most important rule in the product.

### 4.2 Safety-first for sensitive topics
For topics involving domestic violence, arrest/detention, or inheritance disputes, HaqNama must **immediately surface a human helpline number** — before or alongside any answer. The helpline banner is rendered prominently and cannot be suppressed. False positives (showing a helpline when not strictly needed) are acceptable; false negatives (missing a person in crisis) are not.

### 4.3 Curated, not generated
Every answer in the knowledge base is written and approved by a human. The system does **not** use AI generation, LLM summarization, or web scraping to produce answers. This protects accuracy and keeps the product within its "information, not advice" boundary.

### 4.4 Bilingual by default
Every piece of content exists in both Urdu and English. The user can switch languages at any time with one tap. The UI itself (labels, buttons, disclaimers) is also bilingual.

### 4.5 Simplicity over feature-richness
The MVP does one thing well: answer 10 approved questions. No accounts, no chat, no personalization. Speed and clarity come first.

---

## 5. Functional Requirements

### FR-1: Browse all FAQs
- The home page displays all 10 approved FAQ entries.
- Each entry shows its category, question, and full answer.
- Entries are grouped/sorted by category and `sort_order`.
- Works in both English and Urdu.

### FR-2: Search / query matching
- A search bar lets the user type a question in either language.
- Results are returned in ~300ms debounced as the user types.
- Matching uses tag + keyword overlap scoring (tag match = 3 pts, question match = 2 pts, category match = 1 pt).
- The best match is visually highlighted with a "Best match" badge.
- An empty query returns all FAQs in default order.

### FR-3: Sensitive-topic helpline routing
- When a user's query contains a registered sensitive keyword (e.g., "violence", "arrest", "میراث"), a helpline banner renders **above** the search results.
- The banner lists the matched helpline name, phone number (clickable `tel:` link), operating hours, and a brief note.
- Detection is case-insensitive substring matching against the `sensitive_keywords` table.
- Multiple keywords mapping to the same helpline are deduplicated.
- Keywords and helplines are configurable in `data/seed.sql` — no code change needed to add new ones.

### FR-3a: Query normalization before sensitive-topic matching

Before the normalized query is scanned for sensitive keywords (FR-3), it **must** pass through a normalization pipeline. This ensures matching is robust to common input variations:

1. **Lowercasing** — the entire query is lowercased before any matching.
2. **Urdu diacritics stripped** — combining marks in the range U+064B–U+065F and U+0670 (fatha, kasra, damma, shadda, tanween, dagger alif, etc.) are removed so that "تَشَدُّد" matches "تشدد".
3. **Roman Urdu alias substitution** — common Roman Urdu spellings are replaced with their canonical Nastaliq keyword tokens using the `roman_urdu_aliases` table. Substitution is longest-match-first with word boundaries (e.g. "jabri shadi" matches before "jabri"). See the data requirement below.

**Failure behavior (P0, §7.4):** If normalization throws or exceeds its time budget, the query proceeds to keyword matching in its lowercased + diacritic-stripped form (degraded mode). If even that fails, the API route returns the 1099 helpline banner as fallback. At no point does the system return results without either a successful detection or the fallback banner.

#### Data requirement — `roman_urdu_aliases` table

A dedicated table stores the alias → canonical mappings:

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `alias` | TEXT UNIQUE | Lowercase Roman Urdu spelling, e.g. `"tashaddud"` |
| `canonical` | TEXT | Nastaliq token to substitute, must exist in `sensitive_keywords.keyword`, e.g. `"تشدد"` |
| `lang` | TEXT | `'ur'` or `'en'` — controls which normalization pass applies |

This table is seeded in `data/seed.sql` and read into a module-level cache at startup. Adding a new alias requires only a seed update + `npm run init-db` — no code change. The canonical value **must** correspond to an existing `sensitive_keywords.keyword` row; otherwise the substitution would produce a token that never matches.

### FR-3b: Distress lexicon — second safety net (P0)

When the category-specific keyword scan (FR-3 / FR-3a) finds **no matches**, a second safety net activates: the **distress lexicon**. This is a table of general distress and crisis phrases that trigger the **1099 Ministry of Human Rights helpline** even when no category-specific keyword was matched.

**Purpose:** Catch people in crisis who do not use the specific vocabulary that category keywords look for. A user typing "help me, I'm scared" or "koi nahi hai" may not match any violence/arrest/inheritance keyword, but they clearly need help. The distress lexicon is the safety net that catches them.

**Layered safety model:**
1. **Net 1** — Category-specific keywords (`sensitive_keywords`) → targeted helpline (1098, 1099, 0800-7080, 1043)
2. **Net 2** — Distress lexicon (`distress_lexicon`) → 1099 general helpline (fires **only if Net 1 found nothing**)
3. **Net 3** — P0 route-level fallback → 1099 on detection error or timeout

Net 2 is a **fallback, not additive** — it never duplicates a Net 1 match. If Net 1 finds a targeted helpline, Net 2 is not consulted. This avoids flooding the user with multiple banners.

**Matching behavior:**
- Terms are matched against the **normalized query** (lowercased, diacritic-stripped, alias-substituted) — same normalization as FR-3a.
- Longest-match-first (terms are sorted by length descending) so that "i am not safe" matches before "not safe".
- All matches route to helpline 1099 (hardcoded). This is documented in the schema, CLAUDE.md, and this PRD.
- The first matching term is returned (no need to list multiple distress phrases — one banner is enough).

**Example terms (seeded in `data/seed.sql`):**

| Language | Example terms |
|---|---|
| English | "i am not safe", "help me", "i am scared", "i want to die", "suicide", "save me", "emergency" |
| Nastaliq Urdu | مدد, میں محفوظ نہیں, کوئی نہیں, بچاؤ, خودکشی, ایمرجنسی |
| Roman Urdu | "koi nahi hai", "dar lag raha hai", "mujhe madad chahiye", "main akela hoon", "bachao" |

**Failure behavior (P0, §7.4):** If the distress lexicon table read fails or the scan throws, detection returns an empty result for Net 2. The P0 route-level fallback (Net 3) is the last resort — if the entire detection path fails, the API route returns the 1099 banner. At no point does the system return results without either a successful detection (Net 1 or 2) or the Net 3 fallback.

**Data requirement — `distress_lexicon` table:**

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `term` | TEXT UNIQUE | Lowercase distress phrase, e.g. `"help me"` |
| `lang` | TEXT | `'en'`, `'ur'`, or `'any'` — for analytics and future filtering |

Adding a new term requires only a seed update + `npm run init-db` — no code change. The term is matched against the normalized query, so it should be lowercase and use the script the user is expected to type in (Roman Urdu for Roman Urdu terms, Nastaliq for Nastaliq terms).

### FR-4: Language toggle
- A toggle button switches between English and Urdu.
- Switching updates all content, UI labels, and the page direction (LTR ↔ RTL).
- The choice persists for the session (via React context).

### FR-5: Legal disclaimer
- A disclaimer is visible at the bottom of every page.
- The same disclaimer text is included in every API response.
- The disclaimer is stored in the `disclaimers` table, separate per language.

### FR-6: Responsive, accessible UI
- Works on mobile (320px+), tablet, and desktop.
- Urdu text uses Nastaliq script (Noto Nastaliq Urdu font).
- Interactive elements have `aria` labels.
- Sensitive-topic banner uses `role="alert"` and `aria-live="assertive"`.

---

## 6. Non-Functional Requirements

| Requirement | Target |
|---|--- |
| Page load (first contentful paint) | < 1.5 s on 3G |
| Search response time | < 200 ms |
| Uptime | 99.5% (Vercel free tier) |
| Bundle size | < 200 KB gzipped (initial JS) |
| Languages | English + Urdu (RTL) |
| Browser support | Chrome, Firefox, Safari, Edge (last 2 versions); mobile Chrome & Safari |
| Accessibility | WCAG 2.1 AA minimum |
| Hosting | Vercel (free tier acceptable for MVP) |
| Database | SQLite file, read-only at runtime |
| Data sovereignty | No user data collected, no analytics PII |

---

## 7. Safety & Compliance

### 7.1 The "Never Legal Advice" Rule

HaqNama is **not** a legal advisory service. It is a civic information reference. This distinction must be maintained in:

- **Every rendered answer** — the disclaimer is shown in the footer on every page.
- **Every API response** — the `disclaimer` field is included in `/api/search` and `/api/faqs` JSON.
- **The helpline banner** — for sensitive topics, the user is actively directed to call a human.
- **No free-text legal interpretation** — the app does not accept open-ended legal questions and attempt to answer them procedurally. It only matches against the curated FAQ set.

### 7.2 Sensitive-Topic Routing

Three categories trigger helpline routing:

| Category | Keywords (examples) | Helpline |
|---|---|---|
| Domestic / gender-based violence | violence, abuse, beaten, assault, rape, harassment, تشدد, زیادتی, جبری شادی | Madadgaar 1098 |
| Arrest / detention | arrest, custody, detained, jail, حراست, گرفتار | Ministry of Human Rights 1099 |
| Inheritance / property disputes | inheritance, property dispute, land dispute, میراث, جائیداد | Legal Aid Society 0800-7080 |

### 7.3 No user data collection
- No accounts, no login, no cookies, no analytics PII.
- The app is stateless — no server-side session, no database writes at runtime.
- Search queries are not logged or stored.

---

### 7.4 Safety Failure Mode — P0 Requirement

**Priority: P0 (non-negotiable, blocks launch if not implemented)**

The sensitive-topic detection system is a safety-critical component. Its failure mode must be **conservative by default** — the same philosophy that tolerates false positives over false negatives applies when the detector itself breaks.

**The rule:** If sensitive-topic detection throws an exception, times out (> 500 ms), or encounters a database read failure, the system **must render the 1099 Ministry of Human Rights helpline banner** as a fallback. It must **never** proceed silently — i.e., no code path may return FAQ results without either (a) a successful detection pass or (b) the fallback banner being rendered.

**Specific failure triggers:**

| Trigger | Behavior |
|---|---|
| `detectSensitiveTopics()` throws an exception | Catch → render 1099 banner → log error server-side |
| Detection exceeds 500 ms (timeout guard inside the detector) | Abort → render 1099 banner → log timeout |
| `sensitive_keywords` table read fails (DB error) | Catch → render 1099 banner → log error |
| `helplines` table read fails for matched keyword | Catch → render 1099 banner → log error |
| `roman_urdu_aliases` table read fails | Degraded mode — proceed without alias substitution (lowercase + diacritic strip only); if even that fails, fall back to 1099 banner |
| Normalization regex throws (e.g. unexpected input) | Degraded mode — proceed with un-normalized query; if even that fails, fall back to 1099 banner |
| `distress_lexicon` table read fails | Degraded mode — Net 2 skipped, return Net 1 results only (or empty if Net 1 also empty); if even that fails, fall back to 1099 banner |
| Distress lexicon scan throws | Degraded mode — Net 2 skipped; if even that fails, fall back to 1099 banner |
| Any unexpected error in the detection code path | Catch-all at API route → render 1099 banner → log error |

**"Never proceeds silently" — what this means in practice:**

- The helpline banner is a **mandatory** part of the response, not optional. If detection fails, the banner still renders — it just shows the 1099 helpline instead of a topic-specific one.
- FAQ results may still render alongside the fallback banner (the user still gets their answer), but the banner is always present.
- There is no code path — not in the API route, not in the search library, not in the UI — that returns results to the user without either a successful detection or the fallback banner.
- The fallback is implemented at the **API route level** (`/api/search`) so it cannot be bypassed by a UI change.

**Why 1099:** The Ministry of Human Rights Helpline (1099) covers human rights violations broadly — it is the widest-coverage helpline in the approved set and the safest single default when the system cannot determine the specific nature of the user's crisis.

**Rationale:** A person in crisis who types a sensitive query and gets back *only* a procedural FAQ answer — with no helpline — is the worst possible outcome. When the detector fails, we must assume the worst and show a helpline. This is the same conservative logic that governs false-positive tolerance: err on the side of showing help.

---

## 8. MVP Scope

### In scope (v1.0)
- 10 approved FAQ entries (identity docs, birth/death registration, marriage, FIR, domicile, passport, driving license, electricity bill, income tax).
- Keyword search with relevance scoring.
- English ↔ Urdu toggle with RTL support.
- Sensitive-topic helpline banner.
- Legal disclaimer on every page.
- Vercel deployment.

### Out of scope (v1.0)
- User accounts or login.
- Free-text AI / LLM answers.
- Chat interface.
- Admin panel for editing content.
- Analytics / usage tracking.
- Push notifications.
- Offline / PWA support.
- More than 10 FAQs.
- More than 7 helplines.
- Pashto, Sindhi, Balochi, Punjabi languages.
- Voice input.
- Document templates or form downloads.

---

## 9. Future Roadmap

### v1.1 (next)
- Expand knowledge base to 30–50 FAQs (add: court procedures, RTI, consumer complaints, vehicle registration, arms license).
- Add a "Browse by category" view.
- Add province-specific content (procedures differ across Punjab, Sindh, KPK, Balochistan).
- Add an admin-only content management interface (authenticated).

### v2.0
- Free-text questions answered via RAG over the curated knowledge base (still with disclaimer + helpline routing).
- Document checklist generator ("Here's what you need to bring to the NADRA office").
- Multi-language support (Pashto, Sindh, Punjabi).
- WhatsApp bot integration for users without smartphones capable of running a full web app.
- Analytics dashboard (aggregate, anonymized) to see which questions are searched most.

### v2.1+
- Integration with government portals (e.g., direct link to NADRA booking, FBR iris portal).
- Audio answers for low-literacy users.
- Offline-first PWA.

---

## 10. Success Criteria / KPIs

| Metric | Target (6 months post-launch) |
|---|--- |
| Monthly active users | 5,000+ |
| Search success rate (user finds answer without refinements) | > 70% |
| Sensitive-topic helpline banner impression rate | Tracked (baseline) |
| Page load time (p75) | < 2 s on 3G |
| User-reported "was this helpful" rating | > 80% positive |
| Legal complaints / liability incidents | 0 |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **User treats answer as legal advice and acts on it** | High | Severe | Persistent disclaimer; helpline banner for sensitive topics; out-of-scope for free-text legal Q&A; legal review of all seed content |
| **Outdated or incorrect procedural information** | Medium | High | All content curated and date-stamped; periodic review cycle; clear "check official source" language in answers |
| **Sensitive-topic keyword false negative (missed crisis)** | Low | Critical | Conservative keyword list; broad matching; human review of keyword coverage; helpline for any unmatched sensitive query |
| **Sensitive-topic keyword false positive (unnecessary helpline)** | Medium | Low | Acceptable trade-off; helpline banner is additive, not blocking |
| **Vercel free-tier limits exceeded** | Low | Medium | Static-friendly architecture; can migrate to any Node host; SQLite keeps infra simple |
| **better-sqlite3 native module build issues on deploy** | Low | Medium | Vercel Node runtime supports it; prebuilt binaries available; documented in CLAUDE.md |
| **Urdu rendering issues (Nastaliq font loading, RTL layout bugs)** | Medium | Medium | Test on low-end Android devices; fallback to system Urdu font if Noto Nastaliq fails to load |

---

## 12. Approved FAQ Topics (v1.0)

| # | Slug | Category | Question (EN) |
|---|---|---|---|
| 1 | `apply-for-cnic` | Identity Documents | How do I apply for a CNIC or NICOP? |
| 2 | `register-birth` | Birth & Death | How do I register a birth and get a birth certificate? |
| 3 | `register-marriage` | Marriage & Family | How do I register a marriage and get a Nikah Nama? |
| 4 | `file-fir` | Police & FIR | How do I file an FIR (First Information Report)? |
| 5 | `get-domicile` | Domicile & Residence | How do I get a domicile certificate? |
| 6 | `apply-passport` | Passport & Travel | How do I apply for a Pakistani passport? |
| 7 | `register-death` | Birth & Death | How do I register a death and get a death certificate? |
| 8 | `get-driving-license` | Driving License | How do I get a driving license in Pakistan? |
| 9 | `pay-electricity-bill` | Utilities & Bills | How do I check and pay my electricity bill? |
| 10 | `file-income-tax` | Tax & Finance | How do I file an income tax return in Pakistan? |

---

## 13. Approved Helplines (v1.0)

| # | Name | Number | Hours | Covers |
|---|---|---|---|---|
| 1 | Madadgaar National Helpline | 1098 | 24/7 | Domestic violence, child abuse, women in distress |
| 2 | Police Emergency | 15 | 24/7 | Immediate police assistance |
| 3 | Ministry of Human Rights Helpline | 1099 | 24/7 | Human rights violations, unlawful detention |
| 4 | Legal Aid Society | 0800-7080 | Mon–Fri, 9–5 | Free legal advice for those who cannot afford a lawyer |
| 5 | Punjab Women Helpline | 1043 | 24/7 | Punjab-specific women's helpline |
| 6 | Islamabad Women's Safety Helpline | 1815 | 24/7 | Islamabad-specific women's safety helpline |
| 7 | Rescue / Ambulance | 1122 | 24/7 | Medical emergencies, ambulance, rescue services (nationwide) |

> **Note:** Helpline availability and coverage **varies by province and region**. Numbers that are nationwide (15, 1098, 1099, 1122) may have different response capacities in rural vs. urban areas. Province-specific helplines (1043 Punjab, 1815 Islamabad) only operate in their respective jurisdictions. **This list must be re-verified for accuracy before every production deployment** — helpline numbers, hours, and coverage areas change over time. Do not deploy without confirming each number is still active.

---

## 14. Terms of Use (Required for Launch)

**Status: Required before any production deployment.** This section defines the legal boundaries of the service. The text below is a specification — the final wording **must be reviewed and approved by qualified legal counsel** licensed in the relevant jurisdiction(s) before launch. Do not deploy with unvetted legal text.

### 14.1 Nature of Information

HaqNama provides **general civic information only**. The content available through this tool:

- Is **not legal advice** and must not be treated as such.
- Does **not** constitute an attorney-client relationship, now or at any time.
- Does **not** interpret law for any specific individual, case, or situation.
- Does **not** replace consultation with a qualified lawyer.
- Is drawn from publicly available government sources and curated by the operator, but **accuracy is not guaranteed** — laws, procedures, fees, and requirements change over time and vary by province.

Users are solely responsible for verifying any information obtained through HaqNama against official government sources before acting on it.

### 14.2 Limitation of Liability

To the maximum extent permitted by applicable law:

- The operator of HaqNama **disclaims all liability** for any loss, damage, cost, expense, claim, or consequence arising from or in connection with any person's use of or reliance on the information provided by this tool.
- This includes, without limitation, liability for **direct, indirect, incidental, consequential, special, or punitive damages** — whether arising in contract, tort (including negligence), strict liability, or any other legal theory.
- The operator makes **no warranties or representations**, express or implied, regarding the accuracy, completeness, timeliness, reliability, or fitness for a particular purpose of any information provided.
- The operator is **not responsible** for the content, availability, or accuracy of any third-party website, government portal, or helpline linked to or referenced by this tool.

### 14.3 Not a Substitute for Legal Review

- **This PRD section is a product requirement, not legal text.** The actual Terms of Use page presented to users must be drafted or reviewed by a qualified lawyer before launch.
- The Terms of Use must be displayed in **both English and Urdu**.
- The Terms of Use page must be **accessible from every page** of the app (e.g., via a persistent footer link).
- For the MVP, explicit user acceptance (click-wrap) is **not required** — but the page must exist and be linked. Explicit acceptance should be considered for v1.1+.
- The Terms of Use must reference the **legal disclaimer** already shown on each page (§5 FR-5) and work in concert with it — they are complementary, not redundant.

### 14.4 Helpline Disclaimer

The helplines provided are curated from publicly available sources. The operator:

- Does **not guarantee** that any helpline will be answered, will provide assistance, or will operate at the hours listed.
- Is **not responsible** for the quality of advice or assistance given by any helpline operator.
- Provides helpline numbers as a **courtesy and safety measure only** — calling a helpline is the user's own decision and responsibility.
