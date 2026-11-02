import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

type Phase = 'idle' | 'leaving' | 'arriving' | 'entering'

export function useDeckTransition() {
  const root = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)
  const active = useRef(false)
  const cancelWait = useRef<(() => void) | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      cancelWait.current?.()
    }
  }, [])

  function waitForMotion(duration: number) {
    return new Promise<void>(resolve => {
      const element = root.current!
      const finish = () => {
        window.clearTimeout(timer)
        element.removeEventListener('transitionend', end)
        cancelWait.current = null
        resolve()
      }
      const end = (event: TransitionEvent) => {
        if (
          event.target === element.querySelector('.app-deck-main') &&
          event.propertyName === 'opacity'
        ) finish()
      }
      const timer = window.setTimeout(finish, duration + 80)
      element.addEventListener('transitionend', end)
      cancelWait.current = finish
    })
  }

  function waitForPaint() {
    return new Promise<void>(resolve => {
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(finish)
      })
      function finish() {
        cancelAnimationFrame(frame)
        cancelWait.current = null
        resolve()
      }
      cancelWait.current = finish
    })
  }

  async function run(direction: 'forward' | 'backward', update: () => void) {
    if (active.current || !mounted.current) return
    if (
      !root.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      flushSync(update)
      return
    }
    active.current = true
    root.current.style.setProperty(
      '--deck-flow',
      direction === 'forward' ? '1' : '-1',
    )
    try {
      flushSync(() => setPhase('leaving'))
      await waitForMotion(140)
      if (!mounted.current) return
      flushSync(() => {
        setPhase('arriving')
        update()
      })
      await waitForPaint()
      if (!mounted.current) return
      flushSync(() => setPhase('entering'))
      await waitForMotion(200)
    } finally {
      active.current = false
      if (mounted.current) setPhase('idle')
    }
  }

  return { root, phase, busy: phase !== 'idle', run }
}
