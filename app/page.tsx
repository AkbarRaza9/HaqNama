"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { HelplineBanner } from "@/components/HelplineBanner";
import { Disclaimer } from "@/components/Disclaimer";
import { FAQCard } from "@/components/FAQCard";
import type { SearchResponse, SensitiveMatch } from "@/lib/types";

export default function HomePage() {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(
    async (q: string, l: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&lang=${l}`);
        if (res.ok) {
          const json: SearchResponse = await res.json();
          setData(json);
        }
      } catch {
        // Network error or API failure — silently degrade.
        // The error boundary will catch any render-time crash;
        // this catch prevents an unhandled promise rejection.
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search as the user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, lang);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, lang, fetchResults]);

  // Initial load (empty query = show all FAQs)
  useEffect(() => {
    fetchResults("", lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const sensitive: SensitiveMatch[] = data?.sensitive ?? [];
  const results = data?.results ?? [];

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">
          {lang === "en" ? "HaqNama" : "حق نامہ"}
        </h1>
        <LanguageToggle />
      </header>

      <p className="text-stone-600 mb-6 text-base">
        {t(
          "Ask a question about civic procedures in Pakistan. We'll match it to our curated answers.",
          "پاکستان میں شہری طریقوں کے بارے میں سوال پوچھیں۔ ہم اسے اپنے منتخب جوابات سے ملائیں گے۔"
        )}
      </p>

      {/* Search input */}
      <div className="mb-6">
        <label htmlFor="search" className="sr-only">
          {t("Search", "تلاش")}
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(
            "e.g. How do I apply for a CNIC?",
            "مثلاً CNIC کے لیے درخواست کیسے دوں؟"
          )}
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          autoComplete="off"
        />
      </div>

      {/* Sensitive-topic helpline banner — always rendered above answers */}
      <HelplineBanner matches={sensitive} />

      {/* Loading state */}
      {loading && (
        <p className="text-stone-500 text-sm mb-4">
          {t("Searching...", "تلاش جاری ہے...")}
        </p>
      )}

      {/* Results */}
      {results.length > 0 ? (
        <div className="space-y-4 mb-8">
          {results.map((r, idx) => (
            <FAQCard
              key={r.slug}
              category={r.category}
              question={r.question}
              answer={r.answer}
              isTopResult={idx === 0 && query.trim().length > 0 && r.score > 0}
            />
          ))}
        </div>
      ) : (
        !loading && (
          <p className="text-stone-500 mb-8">
            {t(
              "No matching answers found. Try different keywords or browse all questions below.",
              "کوئی مماثل جواب نہیں ملا۔ مختلف الفاظ آزمائیں یا نیچے تمام سوالات دیکھیں۔"
            )}
          </p>
        )
      )}

      {/* Footer disclaimer — always visible */}
      {data?.disclaimer && (
        <footer className="mt-8 pt-6 border-t border-stone-200">
          <Disclaimer text={data.disclaimer} />
          <p className="text-xs text-stone-500 mt-3">
            {t(
              "HaqNama provides curated civic information only — it is not a substitute for professional legal advice.",
              "حق نامہ صرف منتخب شہری معلومات فراہم کرتا ہے — یہ پیشہ ورانہ قانونی مشورے کا متبادل نہیں ہے۔"
            )}
          </p>
        </footer>
      )}
    </main>
  );
}
