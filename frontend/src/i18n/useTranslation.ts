import { useCallback, useMemo, useSyncExternalStore } from "react"
import en from "./en.json"
import ta from "./ta.json"

type Locale = "en" | "ta"
type Messages = Record<string, string>

const catalogs: Record<Locale, Messages> = { en: en as Messages, ta: ta as Messages }

function readInitialLocale(): Locale {
  if (typeof localStorage === "undefined") return "en"
  const stored = localStorage.getItem("ui_locale")
  return stored === "ta" ? "ta" : "en"
}

let locale: Locale = readInitialLocale()

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot() {
  return locale
}

function setLocale(next: Locale) {
  locale = next
  try {
    localStorage.setItem("ui_locale", next)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function useTranslation() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const t = useCallback(
    (key: keyof typeof en | string) => {
      const table = catalogs[current]
      return table[key as string] ?? key
    },
    [current],
  )

  const toggleLocale = useCallback(() => {
    setLocale(current === "en" ? "ta" : "en")
  }, [current])

  return useMemo(
    () => ({
      locale: current,
      t,
      setLocale,
      toggleLocale,
    }),
    [current, t, toggleLocale],
  )
}
