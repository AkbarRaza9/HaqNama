// Query normalization pipeline for sensitive-topic detection.
//
// Runs before keyword matching so that the detector is robust to:
//   1. Case differences          → lowercased
//   2. Urdu diacritics           → stripped (fatha, kasra, damma, shadda, etc.)
//   3. Roman Urdu spellings      → mapped to canonical Nastaliq tokens
//
// The pipeline is intentionally simple and dependency-free. It must be
// fast (< 1 ms for typical queries) and safe to call on every request.

import { getAllRomanUrduAliases } from "./db";
import type { RomanUrduAlias } from "./types";

// ─── Diacritic stripping ────────────────────────────────────────────
// Arabic-script diacritics in the Unicode range U+064B–U+065F plus U+0670
// (dagger alif). These are combining marks that appear on top of or below
// base characters. Stripping them lets "تَشَدُّد" match "تشدد".
const URDU_DIACRITICS_RE = /[ً-ٰٟ]/g;

// ─── Alias cache ────────────────────────────────────────────────────
// Aliases are loaded once at module init and cached on globalThis. They
// change only when seed.sql is updated and the server restarts.
const globalForAliases = globalThis as unknown as {
  __haqnamaAliases?: RomanUrduAlias[];
};

// Synchronous load at module init — getAllRomanUrduAliases() uses
// better-sqlite3 which is synchronous. If the DB is unavailable
// (e.g. during build before init-db), degrade gracefully to an empty list.
if (!globalForAliases.__haqnamaAliases) {
  try {
    globalForAliases.__haqnamaAliases = getAllRomanUrduAliases();
  } catch {
    globalForAliases.__haqnamaAliases = [];
  }
}

function getAliases(): RomanUrduAlias[] {
  return globalForAliases.__haqnamaAliases ?? [];
}

// ─── Core pipeline ──────────────────────────────────────────────────

/**
 * Normalize a user query for sensitive-topic matching.
 * Pure function — no side effects, safe to call repeatedly.
 *
 * Pipeline:
 *   1. toLowerCase()
 *   2. Strip Urdu diacritics
 *   3. Replace Roman Urdu aliases with canonical tokens (longest-first)
 *
 * If anything in the alias-replacement step throws, the function falls
 * back to the lowercased + diacritic-stripped string so detection can
 * still proceed in a degraded mode (never silently skipped).
 */
export function normalizeQuery(query: string): string {
  // Step 1 + 2: case + diacritics
  let normalized = query.toLowerCase().replace(URDU_DIACRITICS_RE, "");

  // Step 3: Roman Urdu → canonical
  try {
    const aliases = getAliases();
    if (aliases.length > 0) {
      normalized = applyAliases(normalized, aliases);
    }
  } catch {
    // Degraded mode: proceed without alias substitution.
    // The P0 failure-mode layer (§7.4) will catch if even this fails.
  }

  return normalized;
}

/**
 * Replace Roman Urdu aliases with their canonical forms.
 * Aliases are sorted longest-first so that "jabri shadi" matches before
 * "jabri" alone (prevents partial substitution).
 */
function applyAliases(text: string, aliases: RomanUrduAlias[]): string {
  let result = text;

  for (const entry of aliases) {
    // Escape regex metacharacters in the alias
    const escaped = entry.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word-boundary match on both sides. \b works for ASCII aliases;
    // for multi-word aliases the space acts as the boundary naturally.
    const pattern = new RegExp(`\\b${escaped}\\b`, "g");
    result = result.replace(pattern, entry.canonical);
  }

  return result;
}
