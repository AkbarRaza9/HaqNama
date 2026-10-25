-- HaqNama database schema
-- All text is stored as UTF-8. Urdu columns use Nastaliq script.

PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────
-- Legal disclaimer shown on every page / answer
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disclaimers (
  id        INTEGER PRIMARY KEY,
  lang      TEXT NOT NULL UNIQUE CHECK (lang IN ('en', 'ur')),
  body      TEXT NOT NULL
);

-- ─────────────────────────────────────────────
-- Human helplines surfaced for sensitive topics
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS helplines (
  id          INTEGER PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_ur     TEXT NOT NULL,
  number      TEXT NOT NULL,
  hours_en    TEXT,
  hours_ur    TEXT,
  notes_en    TEXT,
  notes_ur    TEXT
);

-- ─────────────────────────────────────────────
-- Sensitive-topic keywords (for keyword detection)
-- When a user query matches one of these, the
-- linked helpline is surfaced immediately.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensitive_keywords (
  id          INTEGER PRIMARY KEY,
  keyword     TEXT NOT NULL,          -- lowercase, language-agnostic stem
  lang        TEXT NOT NULL DEFAULT 'any' CHECK (lang IN ('en', 'ur', 'any')),
  helpline_id INTEGER NOT NULL,
  FOREIGN KEY (helpline_id) REFERENCES helplines(id)
);

-- ─────────────────────────────────────────────
-- Distress lexicon — general crisis/distress phrases
-- that trigger the 1099 helpline when NO category-specific
-- keyword matches. This is Net 2 in the layered safety model
-- (Net 1 = category keywords, Net 2 = distress lexicon,
--  Net 3 = P0 route-level fallback). Fires only when Net 1
-- finds nothing, so it never duplicates a targeted helpline.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS distress_lexicon (
  id        INTEGER PRIMARY KEY,
  term      TEXT NOT NULL UNIQUE,    -- lowercase distress phrase
  lang      TEXT NOT NULL CHECK (lang IN ('en', 'ur', 'any'))
);

-- ─────────────────────────────────────────────
-- Roman Urdu aliases for query normalization
-- Maps common Roman Urdu spellings to canonical keyword
-- tokens (which exist in sensitive_keywords). Used by the
-- normalization pipeline before sensitive-topic matching.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roman_urdu_aliases (
  id        INTEGER PRIMARY KEY,
  alias     TEXT NOT NULL UNIQUE,    -- lowercase Roman Urdu, e.g. "tashaddud"
  canonical TEXT NOT NULL,           -- token to substitute, e.g. "تشدد"
  lang      TEXT NOT NULL DEFAULT 'ur' CHECK (lang IN ('en', 'ur'))
);

-- ─────────────────────────────────────────────
-- FAQ entries — the curated knowledge base
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faqs (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,    -- stable URL key, e.g. "apply-for-cnic"
  category_en TEXT NOT NULL,
  category_ur TEXT NOT NULL,
  question_en TEXT NOT NULL,
  question_ur TEXT NOT NULL,
  answer_en   TEXT NOT NULL,          -- plain text, paragraphs separated by \n\n
  answer_ur   TEXT NOT NULL,
  -- comma-separated keywords for simple matching
  tags_en     TEXT,
  tags_ur     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
