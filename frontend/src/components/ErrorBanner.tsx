import { useTranslation } from "../i18n/useTranslation"

type Props = {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: Props) {
  const { t } = useTranslation()
  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-between gap-3 border-b border-red-900/60 bg-accent-red/95 px-4 py-3 text-sm text-white shadow-lg"
      role="alert"
    >
      <p className="font-medium">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {t("common.retry")}
        </button>
      ) : null}
    </div>
  )
}
