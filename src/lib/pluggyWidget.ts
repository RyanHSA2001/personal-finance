// Carregamento sob demanda do widget oficial Pluggy Connect via CDN (sem conflito com React 19).

const PLUGGY_WIDGET_CDN = 'https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js'

type PluggySuccessPayload = {
  item?: { id?: string }
  id?: string
}

type PluggyConnectConfig = {
  connectToken: string
  includeSandbox?: boolean
  onSuccess?: (payload: PluggySuccessPayload) => void
  onError?: (error: { message?: string }) => void
  onClose?: () => void
}

type PluggyConnectInstance = {
  init: () => void
  destroy?: () => void
}

type PluggyConnectConstructor = new (config: PluggyConnectConfig) => PluggyConnectInstance

declare global {
  interface Window {
    PluggyConnect?: PluggyConnectConstructor
  }
}

let scriptPromise: Promise<PluggyConnectConstructor> | null = null

function loadPluggyWidget(): Promise<PluggyConnectConstructor> {
  if (window.PluggyConnect) {
    return Promise.resolve(window.PluggyConnect)
  }

  if (!scriptPromise) {
    scriptPromise = new Promise<PluggyConnectConstructor>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = PLUGGY_WIDGET_CDN
      script.async = true
      script.onload = () => {
        if (window.PluggyConnect) {
          resolve(window.PluggyConnect)
        } else {
          scriptPromise = null
          reject(new Error('Widget do Pluggy Connect carregou, mas não inicializou corretamente.'))
        }
      }
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('Não foi possível carregar o script do Pluggy Connect. Verifique sua conexão.'))
      }
      document.head.appendChild(script)
    })
  }

  return scriptPromise
}

export async function openPluggyConnectWidget(options: {
  connectToken: string
  onSuccess: (itemId: string) => void
  onError?: (message: string) => void
  onClose?: () => void
}): Promise<void> {
  const PluggyConnect = await loadPluggyWidget()

  const widget = new PluggyConnect({
    connectToken: options.connectToken,
    includeSandbox: false,
    onSuccess: (payload) => {
      const itemId = payload?.item?.id ?? payload?.id
      if (itemId) {
        options.onSuccess(itemId)
      }
    },
    onError: (err) => {
      options.onError?.(err?.message || 'Erro durante a conexão no Pluggy Connect.')
    },
    onClose: () => {
      options.onClose?.()
    },
  })

  widget.init()
}
