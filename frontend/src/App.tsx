import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { Suspense, lazy } from "react"
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { ErrorBanner } from "./components/ErrorBanner"
import { SiteHeader } from "./components/SiteHeader"
import { useAppStore } from "./store/useAppStore"

const LandingPage = lazy(() => import("./pages/LandingPage"))
const RecorderPage = lazy(() => import("./pages/RecorderPage"))
const TranscribingPage = lazy(() => import("./pages/TranscribingPage"))
const SlangPage = lazy(() => import("./pages/SlangPage"))
const TTSPage = lazy(() => import("./pages/TTSPage"))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-muted" role="status">
      Loading…
    </div>
  )
}

function AnimatedOutlet() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22 }}
      >
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

function ShellLayout() {
  const error = useAppStore((s) => s.error)
  const setError = useAppStore((s) => s.setError)

  return (
    <div className="min-h-screen">
      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            setError(null)
          }}
        />
      ) : null}
      <div className={error ? "pt-14" : ""}>
        <SiteHeader />
        <AnimatedOutlet />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="recorder" element={<RecorderPage />} />
          <Route path="transcribing" element={<TranscribingPage />} />
          <Route path="slang" element={<SlangPage />} />
          <Route path="tts" element={<TTSPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  )
}
