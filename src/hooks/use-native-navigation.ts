import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export function useNativeNavigation(onBack: () => boolean) {
  const latest = useRef(onBack)
  latest.current = onBack

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    const back = App.addListener('backButton', () => {
      if (!latest.current()) void App.minimizeApp()
    })
    const resume = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) window.dispatchEvent(new Event('focus'))
    })
    return () => {
      void back.then(listener => listener.remove())
      void resume.then(listener => listener.remove())
    }
  }, [])
}
