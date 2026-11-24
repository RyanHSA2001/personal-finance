import { useEffect, type RefObject } from 'react'

type PointerLightOptions = {
  // Inclina o elemento levemente na direção do cursor (efeito 3D).
  tilt?: boolean
}

// Atualiza as variáveis CSS --mx / --my (posição do cursor dentro do elemento)
// e, se tilt estiver ativo, --tilt-x / --tilt-y (de -1 a 1). Só age com ponteiro fino
// (mouse), então em telas de toque nada é calculado.
export function usePointerLight<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { tilt = false }: PointerLightOptions = {},
) {
  useEffect(() => {
    const element = ref.current
    if (!element || !window.matchMedia('(pointer: fine)').matches) return

    // Arrow functions mantêm o estreitamento de tipo de `element` (não nulo).
    const handleMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      element.style.setProperty('--mx', `${x}px`)
      element.style.setProperty('--my', `${y}px`)

      if (tilt) {
        element.style.setProperty('--tilt-x', ((x / rect.width) * 2 - 1).toFixed(3))
        element.style.setProperty('--tilt-y', ((y / rect.height) * 2 - 1).toFixed(3))
      }
    }

    const handleLeave = () => {
      element.style.setProperty('--tilt-x', '0')
      element.style.setProperty('--tilt-y', '0')
    }

    element.addEventListener('pointermove', handleMove)
    element.addEventListener('pointerleave', handleLeave)
    return () => {
      element.removeEventListener('pointermove', handleMove)
      element.removeEventListener('pointerleave', handleLeave)
    }
  }, [ref, tilt])
}
