// GET /api/faqs?lang=en|ur
// Returns all FAQs in the requested language (no search query).
// Used for the initial page load / browse-all view.

import { NextRequest, NextResponse } from "next/server";
import { getDisclaimer, getAllFAQs } from "@/lib/db";
import { faqsQuerySchema } from "@/lib/validation";
import type { FAQListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Validate input via Zod — mandatory security requirement
  const parsed = faqsQuerySchema.safeParse({
    lang: searchParams.get("lang") ?? "en",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { lang } = parsed.data;

  const faqs = getAllFAQs();
  const disclaimer = getDisclaimer(lang);

  const response: FAQListResponse = {
    lang,
    disclaimer,
    faqs: faqs.map((f) => ({
      slug: f.slug,
      category: lang === "en" ? f.category_en : f.category_ur,
      question: lang === "en" ? f.question_en : f.question_ur,
      answer: lang === "en" ? f.answer_en : f.answer_ur,
    })),
  };

  return NextResponse.json(response);
}
