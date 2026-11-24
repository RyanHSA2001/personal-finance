import { useEffect, useRef, useState } from 'react'

// Anima um número inteiro do valor anterior até `target` (ease-out cúbico).
// Na primeira renderização, conta a partir de zero. Respeita prefers-reduced-motion.
export function useCountUp(target: number, duration = 950): number {
  const [display, setDisplay] = useState(0)
  const lastValue = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const from = lastValue.current
    const start = performance.now()
    let frame = 0

    const step = (now: number) => {
      const progress = reduce ? 1 : Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const value = Math.round(from + (target - from) * eased)

      lastValue.current = value
      setDisplay(value)

      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return display
}
