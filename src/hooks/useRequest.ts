import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../services/apiClient'

type RequestState<T> = {
  key: string
  data?: T
  error?: string
}

// Carrega dados da API ao montar e sempre que a chave (ex.: mês) muda.
// Ao recarregar com a mesma chave, mantém os dados atuais até chegar a resposta nova.
// `load` deve ser estável (useCallback), e a chave identifica a consulta.
export function useRequest<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [state, setState] = useState<RequestState<T> | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ key, data })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof ApiError ? error.message : 'Não foi possível carregar os dados.'
        setState({ key, error: message })
      },
    )

    return () => controller.abort()
  }, [key, load, tick])

  const reload = useCallback(() => setTick((value) => value + 1), [])
  const current = state?.key === key ? state : null

  return {
    data: current?.data,
    error: current?.error,
    loading: current === null,
    reload,
  }
}
