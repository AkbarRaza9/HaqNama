
const fs = require("fs");
const target = "C:/Users/haido/.claude/plans/wondrous-wondering-cray-agent-a641c9c3b900d3c52.md";
function read(p) { return fs.readFileSync(p, "utf8"); }
const seed = read("D:/Akbar/HaqNama/data/seed.sql");
const sLines = seed.split("\n");
const SL = (n) => (sLines[n-1] || "").trim();
let o = "";
const wl = (s) => { o += s + "\n"; };

wl("# HaqNama Bug-Fix Exploration Report");
wl("Exploration date: 2026-10-25");
wl("Source: d:\Akbar\HaqNama");
wl("---");
wl("");

wl("## FILE 1: data\seed.sql (300 lines)");
wl("### A. Distress lexicon duplicate terms (CRITICAL)");
wl("distress_lexicon.term is UNIQUE (schema L52). Three terms inserted TWICE (once en, once ur), violating UNIQUE and failing the whole seed transaction.");
wl("| Term            | English (line) | Roman Urdu (line) |");
wl("|-----------------|----------------|-------------------|");
wl("| emergency       | L106           | L147              |");
wl("| help me         | L93            | L148              |");
wl("| i am not safe   | L91            | L149              |");
wl("Exact lines:");
[91,93,106,147,148,149].forEach(n => wl("L" + n + ": `" + SL(n) + "`"));
wl("Fix: delete L147-L149 OR change schema to UNIQUE(term, lang) + INSERT OR IGNORE.");
wl("---");
wl("### B. Roman Urdu aliases (CLEAN)  L165-206");
wl("### C. Sensitive keywords (CLEAN)  L41-81");
wl("### D. Urdu typos / corrupt characters (BUGS)");
[134,217,222,224,226,235,244,289].forEach(n => wl("- L" + n + ": `" + SL(n) + "`"));
wl("Fixes: L134 not real word; L217,L222,L224,L226 ->پیدائش (4 locs); L235 garbled; L244 corrupted; L289 alif->Latin a");
wl("---");
wl("### E. FAQ answer paragraph separators (DESIGN ISSUE)");
wl("Answers use literal \n\n between paragraphs. FAQCard renders answer as plain text in a div without splitting. Paragraphs collapse. Coupled fix needed in FAQCard.tsx (File 4).");
wl("---");
wl("### F. Helplines (CLEAN) L14-35  ### G. Disclaimers (CLEAN) L7-9");
wl("---");

wl("## FILE 2: lib\normalize.ts (115 lines)");
wl("normalizeQuerySync L78-91: L79 lowercase+diacritics, L82 getAliasesSync, L84 applyAliases");
wl("normalizeQuery async L57-71: await getAliases(); getAliases L27-34 populates cache; getAliasesSync L38-40 cache or []");
wl("applyAliases L98-114: \b...\b regex per alias. NO longest-first sort - relies on DB ordering.");
wl("Caching gap: detectSensitiveTopics never pre-warms alias cache. Cold-start sync path skips aliases.");
wl("Diacritic regex L18: correct. ---");

wl("## FILE 3: lib\sensitive.ts (193 lines)");
wl("DETECTION_TIMEOUT_MS=500 L26, DISTRESS_HELPLINE_ID=3 L29");
wl("detectSensitiveTopics L87-119: Net1 scanCategoryKeywords, Net2 scanDistressLexicon");
wl("scanCategoryKeywords L125-157 Net1 L141 .includes(); scanDistressLexicon L165-192 Net2 L186 .includes()");
wl("checkTimeout L71-73 BUG: signature checkTimeout(startedAt: void): void - never callable, never invoked. Dead code.");
wl("Caching L32-35,L50-68 ---");

wl("## FILE 4: components\FAQCard.tsx (39 lines) BUG");
wl("L34-36 renders answer as single text node in div. \n\n not split into <p> tags.");
wl("Fix: split on \n\n render each in <p> or white-space:pre-line. ---");

wl("## FILE 5: middleware.ts (84 lines) CLEAN");
wl("getClientIp L24-32 x-forwarded-for first IP. Rate limiter 30/60s 429+Retry-After. ---");

wl("## FILE 6: data\init-db.mjs (32 lines)");
wl("L25-27 counts 3 tables, L29-30 summary. Omits distress_lexicon+roman_urdu_aliases. Plain INSERT INTO in tx. ---");

wl("## FILE 7: lib\db.ts (87 lines)");
wl("getAllRomanUrduAliases L58-62 LENGTH DESC; getAllDistressTerms L64-68 LENGTH DESC; getHelplineById L70-74; getDisclaimer L39-44. DB readonly L25. ---");

wl("## FILE 8: lib\types.ts (94 lines)");
wl("Helpline L11-20 id,name_en,name_ur,number,hours_en(null),hours_ur(null),notes_en(null),notes_ur(null). ---");

wl("## FILE 9: package.json (30 lines)");
wl("Scripts L6-12: build runs init-db first. ---");

wl("## FILE 10: data\schema.sql (87 lines)");
wl("distress_lexicon L50-54 term UNIQUE; roman_urdu_aliases L62-67; faqs L72-86 \n\n separator. ---");

wl("## Bug-fix priority table");
wl("| #  | File                                    | Issue                          | Severity  |");
wl("|-----|-----------------------------------------|--------------------------------|-----------|");
wl("| 1   | seed.sql L91/L93/L106 vs L147/L148/L149 | 3 dup distress terms -> fail   | Critical  |");
wl("| 2   | seed.sql L134                           | not a real word                | Data      |");
wl("| 3   | seed.sql L217,L222,L224,L226            | typo 4 locations               | Data      |");
wl("| 4   | seed.sql L235                           | garbled character              | Data      |");
wl("| 5   | seed.sql L244                           | corrupted text                 | Data      |");
wl("| 6   | seed.sql L289                           | alif->Latin a                  | Data      |");
wl("| 7   | FAQCard.tsx L34-36                      | answer not split to paragraphs | UI bug    |");
wl("| 8   | sensitive.ts L71-73                     | checkTimeout(void) dead code   | Code bug  |");
wl("| 9   | normalize.ts                            | alias cache not pre-warmed     | Logic bug |");
wl("| 10  | init-db.mjs L29-30                      | summary omits 2 table counts   | Minor     |");
wl("Bugs 1-6 data-layer, 7 UI, 8-10 logic/code-quality.");

fs.writeFileSync(target, o, "utf8");
console.log("Plan written:", o.length, "bytes");
