// GET /api/search?q=<query>&lang=en|ur
// Returns matching FAQs in the requested language, plus any sensitive-topic
// helpline matches detected from the query.
//
// Safety (§7.4 P0): if sensitive-topic detection throws or times out,
// the response includes the 1099 helpline as a fallback. FAQ results may
// still be returned, but the banner is always present on error.

import { NextRequest, NextResponse } from "next/server";
import { getDisclaimer } from "@/lib/db";
import { detectSensitiveTopics } from "@/lib/sensitive";
import { searchFAQs } from "@/lib/search";
import { searchQuerySchema } from "@/lib/validation";
import type { Helpline, Lang, SearchResponse, SensitiveMatch } from "@/lib/types";

export const dynamic = "force-dynamic";

// ─── P0 fallback data — hardcoded, never touches the DB ───────────
// §7.4: if detection fails AND the DB is the thing that broke, the
// fallback must still render the 1099 banner. So these values are
// inlined here and returned unconditionally.

const FALLBACK_HELPLINE: Helpline = {
  id: 3,
  name_en: "Ministry of Human Rights Helpline",
  name_ur: "انسانی حقوق وزارت ہیلپ لین",
  number: "1099",
  hours_en: "24 hours, 7 days",
  hours_ur: "24 گھنٹے، 7 دن",
  notes_en: "For human rights violations including unlawful detention.",
  notes_ur: "انسانی حقوق کی خلاف ورزیوں بشمول غیر قانونی حراست کے لیے۔",
};

const FALLBACK_DISCLAIMER: Record<Lang, string> = {
  en: "This information is provided for general educational purposes only and does not constitute legal advice. For advice specific to your situation, please consult a qualified lawyer or contact the helpline shown above.",
  ur: "یہ معلومات صرف عام تعلیمی مقاصد کے لیے فراہم کی گئی ہیں اور قانونی مشورے کی جگہ نہیں لیتیں۔ اپنی صورت حال کے لیے مخصوص رہنمائی کے لیے براہ کرم کسی مستند وکیل سے رابطہ کریں یا اوپر دکھائے گئے ہیلپ لین پر کال کریں۔",
};

/**
 * Build the P0 fallback: surface the 1099 helpline so the banner renders
 * even when the detector itself fails. No DB call — returns unconditionally.
 */
function buildFallbackSensitive(): SensitiveMatch[] {
  return [{ keyword: "__fallback__", helpline: FALLBACK_HELPLINE }];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Validate input via Zod — mandatory security requirement
  const parsed = searchQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    lang: searchParams.get("lang") ?? "en",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { q: query, lang } = parsed.data;

  // Run FAQ search (never fails — pure in-memory scoring)
  const results = searchFAQs(query, lang);

  // Run sensitive detection with P0 fallback on error/timeout
  let sensitive: SensitiveMatch[];
  try {
    sensitive = await detectSensitiveTopics(query);
  } catch {
    // §7.4 P0: detection failed → fall back to 1099 banner, never silent
    sensitive = buildFallbackSensitive();
  }

  // §7.4 P0: if the DB read for the disclaimer fails, use the
  // hardcoded fallback so the response is always complete.
  let disclaimer: string;
  try {
    disclaimer = getDisclaimer(lang);
  } catch {
    disclaimer = FALLBACK_DISCLAIMER[lang];
  }
  if (!disclaimer) disclaimer = FALLBACK_DISCLAIMER[lang];

  const response: SearchResponse = {
    lang,
    query,
    disclaimer,
    sensitive: sensitive.map((s) => ({
      keyword: s.keyword,
      helpline: s.helpline,
    })),
    results: results.map((r) => ({
      slug: r.slug,
      category: lang === "en" ? r.category_en : r.category_ur,
      question: lang === "en" ? r.question_en : r.question_ur,
      answer: lang === "en" ? r.answer_en : r.answer_ur,
      score: r.score,
    })),
  };

  return NextResponse.json(response);
}
