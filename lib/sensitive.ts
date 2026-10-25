// Sensitive-topic keyword detection — layered safety model.
//
// Three nets, in order:
//   Net 1: category-specific keywords (sensitive_keywords table) → targeted helpline
//   Net 2: distress lexicon (distress_lexicon table) → 1099 general helpline
//          Only fires when Net 1 finds nothing. Catches people in crisis
//          who don't use category-specific vocabulary.
//   Net 3: P0 route-level fallback → 1099 on detection error/timeout
//
// Strategy: normalize the query first (lowercase, strip diacritics,
// replace Roman Urdu aliases), then scan Net 1. If Net 1 finds nothing,
// scan Net 2. Results from either net are surfaced immediately — before
// or alongside any FAQ answer. This is intentionally conservative:
// false positives (showing a helpline when not strictly needed) are
// far safer than false negatives (missing a person in crisis).
//
// The detector also enforces a 500 ms timeout (P0 requirement, §7.4).
// If exceeded, it throws so the API route can fall back to the 1099
// helpline banner (Net 3).

import { getAllKeywords, getAllDistressTerms, getHelplineById } from "./db";
import { normalizeQuery } from "./normalize";
import type { DistressTerm, Helpline, SensitiveMatch } from "./types";

// Timeout budget for the entire detection pass (ms). Defined by §7.4 P0.
const DETECTION_TIMEOUT_MS = 500;

// All distress lexicon matches route to this helpline (1099).
const DISTRESS_HELPLINE_ID = 3;

// ─── Caches ────────────────────────────────────────────────────────
const globalForCache = globalThis as unknown as {
  __haqnamaKeywords?: Awaited<ReturnType<typeof loadKeywordMap>>;
  __haqnamaDistress?: DistressTerm[];
};

interface KeywordEntry {
  keyword: string;
  helplineId: number;
}

async function loadKeywordMap(): Promise<KeywordEntry[]> {
  const keywords = getAllKeywords();
  return keywords.map((k) => ({
    keyword: k.keyword.toLowerCase(),
    helplineId: k.helpline_id,
  }));
}

async function getKeywordMap(): Promise<KeywordEntry[]> {
  if (!globalForCache.__haqnamaKeywords) {
    globalForCache.__haqnamaKeywords = await loadKeywordMap();
  }
  return globalForCache.__haqnamaKeywords;
}

function getDistressTerms(): DistressTerm[] {
  if (!globalForCache.__haqnamaDistress) {
    try {
      globalForCache.__haqnamaDistress = getAllDistressTerms();
    } catch {
      // If the distress table read fails, degrade gracefully —
      // return empty and let Net 3 (P0 route fallback) handle it.
      globalForCache.__haqnamaDistress = [];
    }
  }
  return globalForCache.__haqnamaDistress;
}

/**
 * Detect sensitive topics in a user query using the layered safety model.
 *
 * Pipeline:
 *   1. Normalize the query (lowercase + diacritic strip + Roman Urdu map)
 *   2. Net 1: Scan for category-specific sensitive keywords
 *   3. Net 2 (only if Net 1 empty): Scan for distress lexicon terms
 *   4. Return deduplicated { keyword, helpline } matches
 *
 * Throws if detection exceeds DETECTION_TIMEOUT_MS — the caller (API route)
 * must catch this and fall back to the 1099 helpline banner (Net 3).
 */
export async function detectSensitiveTopics(
  query: string
): Promise<SensitiveMatch[]> {
  const startedAt = Date.now();

  const keywords = await getKeywordMap();

  // ── Step 1: normalize ──────────────────────────────────────────
  const normalizedQuery = normalizeQuery(query);

  if (Date.now() - startedAt > DETECTION_TIMEOUT_MS) {
    throw new Error(`Sensitive-topic detection timed out after ${DETECTION_TIMEOUT_MS}ms`);
  }

  // ── Step 2: Net 1 — category-specific keywords ─────────────────
  const categoryMatches = scanCategoryKeywords(
    normalizedQuery,
    keywords,
    startedAt
  );

  // If Net 1 found matches, return them — Net 2 is not consulted.
  // A targeted helpline is more useful than the general 1099.
  if (categoryMatches.length > 0) {
    return categoryMatches;
  }

  // ── Step 3: Net 2 — distress lexicon ───────────────────────────
  // Only reached when Net 1 found nothing. This is the broader
  // safety net that catches general distress phrases.
  const distressMatches = scanDistressLexicon(normalizedQuery, startedAt);
  return distressMatches;
}

/**
 * Net 1: scan normalized query for category-specific sensitive keywords.
 * Returns deduplicated matches with helpline details.
 */
function scanCategoryKeywords(
  normalizedQuery: string,
  keywords: KeywordEntry[],
  startedAt: number
): SensitiveMatch[] {
  const matchedHelplineIds = new Set<number>();
  const matches: SensitiveMatch[] = [];
  const helplineCache = new Map<number, Helpline>();

  for (const entry of keywords) {
    if (Date.now() - startedAt > DETECTION_TIMEOUT_MS) {
      throw new Error(`Sensitive-topic detection timed out after ${DETECTION_TIMEOUT_MS}ms`);
    }

    if (matchedHelplineIds.has(entry.helplineId)) continue;

    if (normalizedQuery.includes(entry.keyword)) {
      matchedHelplineIds.add(entry.helplineId);

      let helpline = helplineCache.get(entry.helplineId);
      if (!helpline) {
        helpline = getHelplineById(entry.helplineId);
        if (helpline) helplineCache.set(entry.helplineId, helpline);
      }

      if (helpline) {
        matches.push({ keyword: entry.keyword, helpline });
      }
    }
  }

  return matches;
}

/**
 * Net 2: scan normalized query for distress lexicon terms.
 * All matches route to helpline 1099. Returns the first matching term
 * (longest-match-first due to SQL ORDER BY LENGTH(term) DESC).
 * Only fires when Net 1 found nothing.
 */
function scanDistressLexicon(
  normalizedQuery: string,
  startedAt: number
): SensitiveMatch[] {
  let terms: DistressTerm[];
  try {
    terms = getDistressTerms();
  } catch {
    // If distress scan fails, return empty — Net 3 (P0 route fallback)
    // will catch any total detection failure.
    return [];
  }

  const helpline1099 = getHelplineById(DISTRESS_HELPLINE_ID);
  if (!helpline1099) return [];

  for (const entry of terms) {
    if (Date.now() - startedAt > DETECTION_TIMEOUT_MS) {
      throw new Error(`Sensitive-topic detection timed out after ${DETECTION_TIMEOUT_MS}ms`);
    }

    if (normalizedQuery.includes(entry.term.toLowerCase())) {
      return [{ keyword: entry.term, helpline: helpline1099 }];
    }
  }

  return [];
}
