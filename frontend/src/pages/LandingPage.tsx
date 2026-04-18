import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { useTranslation } from "../i18n/useTranslation"
import { useAppStore } from "../store/useAppStore"

export default function LandingPage() {
  const { t } = useTranslation()
  const setCurrentStep = useAppStore((s) => s.setCurrentStep)

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-6 pb-16 pt-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="max-w-xl space-y-8"
      >
        <div>
          <p className="font-display text-5xl text-accent-amber sm:text-7xl" lang="ta">
            {t("brand.tamil")}
          </p>
          <p className="mt-2 font-display text-3xl tracking-[0.2em] text-text-primary sm:text-4xl">
            {t("brand.latin")}
          </p>
        </div>
        <p className="text-sm text-text-muted sm:text-base">{t("landing.subtitle")}</p>
        <div className="flex justify-center">
          <Link
            to="/recorder"
            onClick={() => setCurrentStep(1)}
            className="group inline-flex items-center gap-3 rounded-full border border-accent-amber/50 bg-accent-amber/10 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-accent-amber shadow-glow-amber transition hover:bg-accent-amber/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
          >
            <span className="text-xl animate-mic-breathe" aria-hidden>
              🎙️
            </span>
            {t("landing.cta")}
          </Link>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">{t("landing.pipeline")}</p>
          <div className="mx-auto flex max-w-md items-center justify-center gap-2 text-[10px] text-text-muted">
            <span className="h-2 w-2 rounded-full bg-accent-amber shadow-glow-amber" />
            <span className="h-px flex-1 bg-gradient-to-r from-accent-amber/50 to-transparent" />
            <span className="h-2 w-2 rounded-full bg-white/10" />
            <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            <span className="h-2 w-2 rounded-full bg-white/10" />
            <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            <span className="h-2 w-2 rounded-full bg-white/10" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
