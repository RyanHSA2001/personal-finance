import { useEffect, useRef, type ReactNode } from 'react'
import { usePointerLight } from '../../hooks/usePointerLight'
import type { LoginStatus } from '../../hooks/useLogin'
import './LoginCard.css'

type LoginCardProps = {
  // Cada mudança de valor dispara a animação de "tremer" (erro de envio).
  shakeKey: number
  status: LoginStatus
  children: ReactNode
}

// Cartão com borda iluminada que acompanha o cursor e inclinação 3D.
function LoginCard({ shakeKey, status, children }: LoginCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  usePointerLight(cardRef, { tilt: true })

  // Reinicia a animação sem remontar o conteúdo (o formulário mantém o que foi digitado).
  useEffect(() => {
    const body = bodyRef.current
    if (!body || shakeKey === 0) return

    body.classList.remove('is-shaking')
    body.getBoundingClientRect()
    body.classList.add('is-shaking')
  }, [shakeKey])

  return (
    <section ref={cardRef} className="login-card" data-status={status} aria-labelledby="login-title">
      <div ref={bodyRef} className="card-body">
        {children}
      </div>
    </section>
  )
}

export default LoginCard
