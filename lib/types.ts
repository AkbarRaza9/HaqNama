// Shared types for the HaqNama app

export type Lang = "en" | "ur";

export interface Disclaimer {
  id: number;
  lang: Lang;
  body: string;
}

export interface Helpline {
  id: number;
  name_en: string;
  name_ur: string;
  number: string;
  hours_en: string | null;
  hours_ur: string | null;
  notes_en: string | null;
  notes_ur: string | null;
}

export interface DistressTerm {
  id: number;
  term: string;
  lang: "en" | "ur" | "any";
}

export interface RomanUrduAlias {
  id: number;
  alias: string;
  canonical: string;
  lang: "en" | "ur";
}

export interface SensitiveKeyword {
  id: number;
  keyword: string;
  lang: "en" | "ur" | "any";
  helpline_id: number;
}

export interface FAQ {
  id: number;
  slug: string;
  category_en: string;
  category_ur: string;
  question_en: string;
  question_ur: string;
  answer_en: string;
  answer_ur: string;
  tags_en: string | null;
  tags_ur: string | null;
  sort_order: number;
  created_at: string;
}

/** A matched FAQ plus a relevance score (higher = better match) */
export interface SearchResult extends FAQ {
  score: number;
}

/** A sensitive-topic detection result */
export interface SensitiveMatch {
  keyword: string;
  helpline: Helpline;
}

/** Response shape for the /api/search endpoint */
export interface SearchResponse {
  lang: Lang;
  query: string;
  disclaimer: string;
  sensitive: SensitiveMatch[];
  results: Array<{
    slug: string;
    category: string;
    question: string;
    answer: string;
    score: number;
  }>;
}

/** Response shape for the /api/faqs list endpoint */
export interface FAQListResponse {
  lang: Lang;
  disclaimer: string;
  faqs: Array<{
    slug: string;
    category: string;
    question: string;
    answer: string;
  }>;
}

