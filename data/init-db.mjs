// Initializes the SQLite database from schema.sql + seed.sql.
// Run with: npm run init-db
// Safe to run repeatedly — uses CREATE TABLE IF NOT EXISTS and INSERT OR IGNORE.

import Database from "better-sqlite3";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "haqnama.db");

// Remove any existing DB so the seed runs cleanly (plain INSERT, not INSERT OR IGNORE).
// This makes init-db truly idempotent — safe to run repeatedly.
if (existsSync(dbPath)) {
  rmSync(dbPath);
}

const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
const seed = readFileSync(join(__dirname, "seed.sql"), "utf8");

const db = new Database(dbPath);

db.exec(schema);

// Wrap seed in a transaction for speed and atomicity
db.exec("BEGIN;");
db.exec(seed);
db.exec("COMMIT;");

const faqCount = db.prepare("SELECT COUNT(*) AS n FROM faqs").get().n;
const keywordCount = db.prepare("SELECT COUNT(*) AS n FROM sensitive_keywords").get().n;
const helplineCount = db.prepare("SELECT COUNT(*) AS n FROM helplines").get().n;
const distressCount = db.prepare("SELECT COUNT(*) AS n FROM distress_lexicon").get().n;
const aliasCount = db.prepare("SELECT COUNT(*) AS n FROM roman_urdu_aliases").get().n;

console.log(`✓ Database initialized at ${dbPath}`);
console.log(`  FAQs: ${faqCount} | Sensitive keywords: ${keywordCount} | Helplines: ${helplineCount} | Distress terms: ${distressCount} | Roman Urdu aliases: ${aliasCount}`);

db.close();
