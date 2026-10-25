// Database connection singleton.
// Uses better-sqlite3 which is synchronous — ideal for server components
// and API routes that run per-request.

import Database from "better-sqlite3";
import { join } from "node:path";
import type {
  Disclaimer,
  DistressTerm,
  FAQ,
  Helpline,
  Lang,
  RomanUrduAlias,
  SensitiveKeyword,
} from "./types";

// Next.js can re-instantiate modules in dev (hot reload). Use a global
// cache so we don't open multiple connections to the same file.
const globalForDb = globalThis as unknown as {
  __haqnamaDb?: Database.Database;
};

function createDb(): Database.Database {
  const dbPath = join(process.cwd(), "data", "haqnama.db");
  const db = new Database(dbPath, { readonly: true });
  db.pragma("foreign_keys = ON");
  return db;
}

export const db: Database.Database =
  globalForDb.__haqnamaDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__haqnamaDb = db;
}

// ─── Query helpers ────────────────────────────────────────────────

export function getDisclaimer(lang: Lang): string {
  const row = db
    .prepare("SELECT body FROM disclaimers WHERE lang = ?")
    .get(lang) as Disclaimer | undefined;
  return row?.body ?? "";
}

export function getAllHelplines(): Helpline[] {
  return db
    .prepare("SELECT * FROM helplines ORDER BY id")
    .all() as Helpline[];
}

export function getAllKeywords(): SensitiveKeyword[] {
  return db
    .prepare("SELECT * FROM sensitive_keywords ORDER BY id")
    .all() as SensitiveKeyword[];
}

export function getAllRomanUrduAliases(): RomanUrduAlias[] {
  return db
    .prepare("SELECT * FROM roman_urdu_aliases ORDER BY LENGTH(alias) DESC")
    .all() as RomanUrduAlias[];
}

export function getAllDistressTerms(): DistressTerm[] {
  return db
    .prepare("SELECT * FROM distress_lexicon ORDER BY LENGTH(term) DESC")
    .all() as DistressTerm[];
}

export function getHelplineById(id: number): Helpline | undefined {
  return db
    .prepare("SELECT * FROM helplines WHERE id = ?")
    .get(id) as Helpline | undefined;
}

export function getAllFAQs(): FAQ[] {
  return db
    .prepare("SELECT * FROM faqs ORDER BY sort_order, id")
    .all() as FAQ[];
}

export function getFAQBySlug(slug: string): FAQ | undefined {
  return db
    .prepare("SELECT * FROM faqs WHERE slug = ?")
    .get(slug) as FAQ | undefined;
}
