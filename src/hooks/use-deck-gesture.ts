import { useLayoutEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

type Direction = -1 | 1
type Options = {
  identity: string
  enabled: boolean
  browsing: boolean
  canMove: (direction: Direction) => boolean
  onMove: (direction: Direction) => void
  onProgress?: (progress: number, settling: boolean) => void
}

export function useDeckGesture(options: Options) {
  const surface = useRef<HTMLElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const latest = useRef(options)
  latest.current = options
  const turn = useRef<(direction: Direction) => void>(() => {})

  useLayoutEffect(() => {
    const element = surface.current
    const deck = stack.current
    if (!element || !deck || !options.enabled) return
    let gesture: {
      id: number
      x: number
      y: number
      lastX: number
      lastTime: number
      velocity: number
      dx: number
      axis: 'pending' | 'horizontal' | 'vertical'
    } | null = null
    let timer = 0
    let completing = false
    let suppressClick = false
    let commit: (() => void) | undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    function paint(dx: number, dy = 0) {
      const width = deck!.clientWidth + 24
      const browsing = latest.current.browsing
      const lift = browsing
        ? dy * 0.08 - Math.min(Math.abs(dx) * 0.04, 10)
        : 0
      const rotation = browsing && !reducedMotion.matches ? (dx / width) * 12 : 0
      deck!.style.setProperty('--deck-scroll', `${window.scrollY}px`)
      deck!.style.setProperty('--deck-width', `${width}px`)
      deck!.style.setProperty('--deck-x', `${dx}px`)
      deck!.style.setProperty('--deck-y', `${lift}px`)
      deck!.style.setProperty('--deck-turn', `${rotation}deg`)
      deck!.style.setProperty(
        '--deck-progress',
        `${Math.min(Math.abs(dx) / (width * 0.6), 1)}`,
      )
      if (dx !== 0) deck!.dataset.direction = dx < 0 ? 'next' : 'previous'
      latest.current.onProgress?.(-dx / width, deck!.dataset.gesture === 'settling')
    }

    function finish() {
      window.clearTimeout(timer)
      const action = commit
      commit = undefined
      completing = false
      deck!.dataset.gesture = 'idle'
      if (action) window.scrollTo({ top: 0, behavior: 'instant' })
      paint(0)
      if (action) flushSync(action)
    }

    function settle(direction?: Direction) {
      gesture = null
      completing = direction !== undefined
      deck!.dataset.gesture = 'settling'
      if (direction) {
        commit = () => latest.current.onMove(direction)
        const distance = latest.current.browsing
          ? window.innerWidth + 80
          : deck!.clientWidth + 24
        paint(-direction * distance)
      } else {
        paint(0)
      }
      timer = window.setTimeout(finish, reducedMotion.matches ? 0 : 300)
    }

    const transitionEnd = (event: TransitionEvent) => {
      if (
        event.target === deck!.querySelector('.app-card-current') &&
        event.propertyName === 'transform'
      ) finish()
    }

    const start = (event: TouchEvent) => {
      if (completing) return
      if (event.touches.length !== 1) {
        if (gesture) settle()
        return
      }
      if (
        !latest.current.enabled ||
        document.querySelector('[role="dialog"]') ||
        (event.target as Element).closest(
          '[contenteditable], [data-no-deck-swipe]',
        )
      ) return
      window.clearTimeout(timer)
      suppressClick = false
      const point = event.touches[0]
      const card = deck!.querySelector('.app-card-current')!
      const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform)
      deck!.dataset.gesture = Math.abs(matrix.m41) > 0.5 ? 'dragging' : 'holding'
      paint(matrix.m41)
      gesture = {
        id: point.identifier,
        x: point.clientX - matrix.m41,
        y: point.clientY,
        lastX: point.clientX,
        lastTime: event.timeStamp,
        velocity: 0,
        dx: matrix.m41,
        axis: 'pending',
      }
    }

    const move = (event: TouchEvent) => {
      if (!gesture) return
      const point = Array.from(event.touches).find(
        point => point.identifier === gesture!.id,
      )
      if (event.touches.length !== 1 || !point) {
        settle()
        return
      }
      const dx = point.clientX - gesture.x
      const dy = point.clientY - gesture.y
      if (gesture.axis === 'pending') {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return
        if (Math.abs(dy) > Math.abs(dx)) {
          gesture.axis = 'vertical'
          return
        }
        if (Math.abs(dx) < Math.abs(dy) * 1.2) return
        const field = document.activeElement
        const selectedFieldText =
          (field instanceof HTMLTextAreaElement ||
            field instanceof HTMLInputElement) &&
          field.selectionStart !== field.selectionEnd
        if (window.getSelection()?.isCollapsed === false || selectedFieldText) {
          settle()
          return
        }
        gesture.axis = 'horizontal'
        deck!.dataset.gesture = 'dragging'
      }
      if (gesture.axis !== 'horizontal') return
      event.preventDefault()
      suppressClick = true
      const elapsed = event.timeStamp - gesture.lastTime
      if (elapsed > 0) gesture.velocity = (point.clientX - gesture.lastX) / elapsed
      gesture.lastX = point.clientX
      gesture.lastTime = event.timeStamp
      gesture.dx = dx
      const direction = dx < 0 ? 1 : -1
      const displacement = latest.current.canMove(direction)
        ? dx
        : Math.sign(dx) * Math.min(Math.abs(dx) * 0.22, 44)
      paint(displacement, dy)
    }

    const end = (event: TouchEvent) => {
      if (!gesture) return
      if (gesture.axis !== 'horizontal') {
        gesture = null
        deck!.dataset.gesture = 'idle'
        paint(0)
        return
      }
      event.preventDefault()
      const { dx, velocity, lastTime } = gesture
      const direction = dx < 0 ? 1 : -1
      const threshold = Math.min(deck!.clientWidth * 0.26, 104)
      const flick =
        Math.abs(dx) > 28 &&
        event.timeStamp - lastTime < 100 &&
        velocity * Math.sign(dx) > 0.55
      const complete =
        event.touches.length === 0 &&
        latest.current.canMove(direction) &&
        (Math.abs(dx) >= threshold || flick)
      settle(complete ? direction : undefined)
    }

    const cancel = () => {
      if (gesture) settle()
    }
    const click = (event: MouseEvent) => {
      if (!suppressClick && !completing) return
      event.preventDefault()
      event.stopPropagation()
      suppressClick = false
    }
    const resetClick = () => {
      if (!gesture) suppressClick = false
    }
    turn.current = direction => {
      if (
        !latest.current.enabled ||
        completing ||
        !latest.current.canMove(direction)
      ) return
      suppressClick = false
      window.clearTimeout(timer)
      settle(direction)
    }
    deck.dataset.gesture = 'idle'
    paint(0)
    element.addEventListener('touchstart', start, { passive: true })
    element.addEventListener('touchmove', move, { passive: false })
    element.addEventListener('touchend', end, { passive: false })
    element.addEventListener('touchcancel', cancel)
    element.addEventListener('click', click, true)
    element.addEventListener('pointerdown', resetClick, true)
    deck.addEventListener('transitionend', transitionEnd)
    return () => {
      window.clearTimeout(timer)
      deck.dataset.gesture = 'idle'
      paint(0)
      element.removeEventListener('touchstart', start)
      element.removeEventListener('touchmove', move)
      element.removeEventListener('touchend', end)
      element.removeEventListener('touchcancel', cancel)
      element.removeEventListener('click', click, true)
      element.removeEventListener('pointerdown', resetClick, true)
      deck.removeEventListener('transitionend', transitionEnd)
      turn.current = () => {}
    }
  }, [options.identity, options.enabled])

  return { surface, stack, turn: (direction: Direction) => turn.current(direction) }
}
