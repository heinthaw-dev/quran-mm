import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import '../theme/global.css'
import { usePrefs } from '../hooks/usePrefs.ts'
import { SplashScreen } from '../features/splash/SplashScreen.tsx'
import { ReaderScreen } from '../features/reader/ReaderScreen.tsx'
import { InfoViewerScreen } from '../features/info-viewer/InfoViewerScreen.tsx'

function readUrlParams(): { nosplash: boolean; theme: string | null } {
  const p = new URLSearchParams(window.location.search)
  return { nosplash: p.has('nosplash'), theme: p.get('theme') }
}

export default function App() {
  const { prefs, update } = usePrefs()
  const urlParams = readUrlParams()
  const effectiveTheme = (urlParams.theme as typeof prefs.theme | null) ?? prefs.theme
  const [splashDone, setSplashDone] = useState(urlParams.nosplash)
  const handleSplashDone = useCallback(() => setSplashDone(true), [])

  return (
    <div data-theme={effectiveTheme}>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ReaderScreen prefs={prefs} onPrefsUpdate={update} />} />
          <Route path="/s/:surah/:ayat" element={<ReaderScreen prefs={prefs} onPrefsUpdate={update} />} />
          <Route path="/info/:page" element={<InfoViewerScreen />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}
