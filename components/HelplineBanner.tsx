"use client";

// Prominent banner shown when a sensitive topic is detected.
// Lists the matched helpline(s) with phone numbers.
// This MUST render above or alongside any answer — never suppress it.

import { useLanguage } from "./LanguageContext";
import type { SensitiveMatch } from "@/lib/types";

interface HelplineBannerProps {
  matches: SensitiveMatch[];
}

export function HelplineBanner({ matches }: HelplineBannerProps) {
  const { lang, t } = useLanguage();

  if (matches.length === 0) return null;

  return (
    <div
      className="rounded-xl border-2 border-danger bg-danger-light p-4 mb-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden="true">
          ⚠️
        </span>
        <div className="flex-1">
          <h3 className="text-danger font-bold text-base mb-1">
            {t(
              "You may need immediate help. Please call:",
              "آپ کو فوری مدد کی ضرورت ہو سکتی ہے۔ براہ کرم کال کریں:"
            )}
          </h3>
          <ul className="space-y-2 mt-2">
            {matches.map((m) => (
              <li key={m.helpline.id} className="flex flex-col">
                <span className="font-semibold text-stone-900">
                  {lang === "en" ? m.helpline.name_en : m.helpline.name_ur}
                </span>
                <a
                  href={`tel:${m.helpline.number}`}
                  className="text-brand-dark text-lg font-bold hover:underline"
                >
                  {m.helpline.number}
                </a>
                {(lang === "en" ? m.helpline.hours_en : m.helpline.hours_ur) && (
                  <span className="text-sm text-stone-600">
                    {lang === "en"
                      ? m.helpline.hours_en
                      : m.helpline.hours_ur}
                  </span>
                )}
                {(lang === "en" ? m.helpline.notes_en : m.helpline.notes_ur) && (
                  <span className="text-sm text-stone-600 mt-0.5">
                    {lang === "en"
                      ? m.helpline.notes_en
                      : m.helpline.notes_ur}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
