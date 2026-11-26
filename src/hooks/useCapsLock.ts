import { useEffect, useState } from 'react'

// Indica se o Caps Lock está ativo, para avisar antes de o usuário errar a senha.
export function useCapsLock(): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (typeof event.getModifierState === 'function') {
        setActive(event.getModifierState('CapsLock'))
      }
    }

    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKey)
    }
  }, [])

  return active
}
