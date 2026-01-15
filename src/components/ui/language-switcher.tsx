"use client";

import { useLocale, locales, localeNames, type Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations("profile");

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        <Globe className="h-4 w-4" />
        {t("language")}
      </label>
      <div className="flex gap-2">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              locale === loc
                ? "bg-[#A8BBA3] text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {localeNames[loc as Locale]}
          </button>
        ))}
      </div>
    </div>
  );
}
