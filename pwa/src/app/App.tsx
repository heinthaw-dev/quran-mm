import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import '../theme/global.css'
import { usePrefs } from '../hooks/usePrefs.ts'
import { SplashScreen } from '../features/splash/SplashScreen.tsx'
import { ReaderScreen } from '../features/reader/ReaderScreen.tsx'
import { InfoViewerScreen } from '../features/info-viewer/InfoViewerScreen.tsx'

export default function App() {
  const { prefs } = usePrefs()
  const [splashDone, setSplashDone] = useState(false)
  const handleSplashDone = useCallback(() => setSplashDone(true), [])

  return (
    <div data-theme={prefs.theme}>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ReaderScreen prefs={prefs} />} />
          <Route path="/s/:surah/:ayat" element={<ReaderScreen prefs={prefs} />} />
          <Route path="/info/:page" element={<InfoViewerScreen />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}
