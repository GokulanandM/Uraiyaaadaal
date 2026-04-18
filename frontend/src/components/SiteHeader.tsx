import { useTranslation } from "../i18n/useTranslation"

export function SiteHeader() {
  const { locale, toggleLocale, t } = useTranslation()
  return (
    <header className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none tracking-wide text-accent-amber sm:text-3xl" lang="ta">
          {t("brand.tamil")}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.35em] text-text-muted sm:text-xs">
          {t("brand.latin")}
        </p>
      </div>
      <button
        type="button"
        onClick={toggleLocale}
        className="shrink-0 rounded-full border border-[color:var(--border)] bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent-amber/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
        aria-label={locale === "en" ? "Switch to Tamil UI" : "Switch to English UI"}
      >
        {locale === "en" ? t("lang.tamil") : t("lang.english")}
      </button>
    </header>
  )
}
