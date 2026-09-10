import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Map of language codes to native language names
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  hi: "हिन्दी",
  tr: "Türkçe",
  nl: "Nederlands",
  pl: "Polski",
  sv: "Svenska",
  no: "Norsk",
  da: "Dansk",
  fi: "Suomi",
  he: "עברית",
  fa: "فارسی",
  ur: "اردو",
  bn: "বাংলা",
  ta: "தமிழ்",
  te: "తెలుగు",
  th: "ภาษาไทย",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
  ms: "Bahasa Melayu",
  tl: "Tagalog",
  cs: "Čeština",
  hu: "Magyar",
  ro: "Română",
  el: "Ελληνικά",
  uk: "Українська",
  bg: "Български",
  sr: "Српски",
  hr: "Hrvatski",
  sk: "Slovenčina",
  sl: "Slovenščina",
};

// RTL languages
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

interface LanguageSelectorProps {
  enabledLanguages: string[];
  restaurantId?: string;
}

export function LanguageSelector({ enabledLanguages, restaurantId }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  
  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem(`storefront_language_${restaurantId}`);
    if (savedLanguage && enabledLanguages.includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
      applyDirection(savedLanguage);
    } else if (enabledLanguages.length > 0) {
      // Default to first enabled language
      i18n.changeLanguage(enabledLanguages[0]);
      applyDirection(enabledLanguages[0]);
    }
  }, [restaurantId, enabledLanguages, i18n]);

  const applyDirection = (lang: string) => {
    const isRTL = RTL_LANGUAGES.includes(lang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    applyDirection(lang);
    if (restaurantId) {
      localStorage.setItem(`storefront_language_${restaurantId}`, lang);
    }
  };

  // Don't show selector if only one language is enabled
  if (enabledLanguages.length <= 1) {
    return null;
  }

  const currentLanguage = i18n.language || enabledLanguages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="button-language-selector">
          <Globe className="h-4 w-4 mr-2" />
          {LANGUAGE_NAMES[currentLanguage] || currentLanguage.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="menu-language-options">
        {enabledLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            data-testid={`language-option-${lang}`}
            className={currentLanguage === lang ? "bg-accent" : ""}
          >
            {LANGUAGE_NAMES[lang] || lang.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
