import { useEffect, type RefObject } from 'react'

// Luz que acompanha o cursor no aplicativo inteiro.
// - Em cada .card sob o ponteiro, define --mx / --my (posição dentro do cartão).
// - No elemento raiz, define --gx / --gy (posição na tela) para o fundo.
// Só age com mouse (pointer fino), então em telas de toque nada é calculado.
export function useCardLight<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root || !window.matchMedia('(pointer: fine)').matches) return

    const handleMove = (event: PointerEvent) => {
      root.style.setProperty('--gx', `${event.clientX}px`)
      root.style.setProperty('--gy', `${event.clientY}px`)

      const card = (event.target as Element | null)?.closest<HTMLElement>('.card')
      if (!card) return

      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`)
      card.style.setProperty('--my', `${event.clientY - rect.top}px`)
    }

    root.addEventListener('pointermove', handleMove)
    return () => root.removeEventListener('pointermove', handleMove)
  }, [ref])
}
