"use client";

import { useLanguage } from "./LanguageContext";

interface FAQCardProps {
  category: string;
  question: string;
  answer: string;
  isTopResult?: boolean;
}

export function FAQCard({ category, question, answer, isTopResult }: FAQCardProps) {
  const { t } = useLanguage();

  return (
    <article
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        isTopResult ? "border-brand ring-1 ring-brand/20" : "border-stone-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block rounded-full bg-brand/10 text-brand text-xs font-medium px-2 py-0.5">
          {category}
        </span>
        {isTopResult && (
          <span className="inline-block rounded-full bg-gold/30 text-stone-700 text-xs font-medium px-2 py-0.5">
            {t("Best match", "بہترین نتیجہ")}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-stone-900 mb-3 leading-snug">
        {question}
      </h3>
      <div className="answer-text text-stone-700 text-base leading-relaxed">
        {answer.split("\n\n").map((paragraph, i) => (
          <p key={i} className="mb-3 last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
