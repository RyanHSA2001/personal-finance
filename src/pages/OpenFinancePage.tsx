import { useCallback, useState, type FormEvent } from 'react'
import type { AppView } from '../components/app/AppShell'
import { ShieldIcon } from '../components/ui/Icons'
import Select, { type SelectOption } from '../components/ui/Select'
import { useRequest } from '../hooks/useRequest'
import { formatMoney } from '../lib/format'
import { openPluggyConnectWidget } from '../lib/pluggyWidget'
import { ApiError } from '../services/apiClient'
import {
  openFinanceApi,
  type PluggyInvestment,
  type PluggyItem,
  type SyncItemResult,
} from '../services/openFinanceService'
import '../components/cards/cards.css'
import '../components/openfinance/openfinance.css'

type OpenFinancePageProps = {
  onNavigate: (view: AppView) => void
}

const SYNC_DAYS_OPTIONS: SelectOption[] = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 180 dias' },
  { value: '365', label: 'Últimos 365 dias' },
]

function formatSyncDate(iso: string | null): string {
  if (!iso) return 'Ainda não sincronizado'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function statusBadge(status: string): { label: string; cls: string } {
  const upper = status.toUpperCase()
  if (upper === 'UPDATED') return { label: 'Conectado', cls: 'is-paid' }
  if (upper === 'UPDATING') return { label: 'Atualizando', cls: 'is-open' }
  if (upper === 'WAITING_USER_INPUT' || upper === 'OUTDATED') return { label: 'Ação necessária', cls: 'is-closed' }
  if (upper === 'LOGIN_ERROR' || upper === 'ERROR') return { label: 'Erro na conexão', cls: 'is-overdue' }
  return { label: status, cls: 'is-open' }
}

function OpenFinancePage({ onNavigate }: OpenFinancePageProps) {
  const loadStatus = useCallback((signal: AbortSignal) => openFinanceApi.status(signal), [])
  const loadItems = useCallback((signal: AbortSignal) => openFinanceApi.listItems(signal), [])

  const status = useRequest('of-status', loadStatus)
  const items = useRequest('of-items', loadItems)

  const [days, setDays] = useState('90')
  const [manualItemId, setManualItemId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [showCredForm, setShowCredForm] = useState(false)
  const [credSaving, setCredSaving] = useState(false)
  const [credSuccess, setCredSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [pageError, setPageError] = useState('')
  const [lastResult, setLastResult] = useState<SyncItemResult | null>(null)

  const [investmentsByItem, setInvestmentsByItem] = useState<Record<string, PluggyInvestment[]>>({})
  const [loadingInvId, setLoadingInvId] = useState<string | null>(null)

  function reloadAll() {
    status.reload()
    items.reload()
  }

  async function handleSaveCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPageError('')
    setCredSuccess('')

    if (!clientId.trim()) return setPageError('Informe o Client ID da sua aplicação no Pluggy.')
    if (!clientSecret.trim()) return setPageError('Informe o Client Secret da sua aplicação no Pluggy.')

    setCredSaving(true)
    try {
      await openFinanceApi.saveCredentials(clientId.trim(), clientSecret.trim())
      setClientId('')
      setClientSecret('')
      setShowCredForm(false)
      setCredSuccess('Credenciais validadas no Pluggy e salvas criptografadas com sucesso.')
      reloadAll()
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível validar suas credenciais do Pluggy.')
    } finally {
      setCredSaving(false)
    }
  }

  async function handleRemoveCredentials() {
    if (!window.confirm('Remover suas credenciais salvas do Pluggy? Você poderá cadastrá-las novamente depois.')) {
      return
    }
    setPageError('')
    setCredSuccess('')
    try {
      await openFinanceApi.removeCredentials()
      setShowCredForm(true)
      reloadAll()
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível remover as credenciais.')
    }
  }

  async function handleConnectWidget(reconnectItemId?: string) {
    setPageError('')
    setBusy(true)
    try {
      const { accessToken } = await openFinanceApi.createConnectToken(reconnectItemId)
      await openPluggyConnectWidget({
        connectToken: accessToken,
        onSuccess: async (itemId) => {
          try {
            setBusy(true)
            const result = await openFinanceApi.linkItem(itemId, Number(days))
            setLastResult(result)
            reloadAll()
          } catch (caught) {
            setPageError(caught instanceof ApiError ? caught.message : 'Conexão concluída, mas houve erro ao sincronizar.')
          } finally {
            setBusy(false)
          }
        },
        onError: (msg) => {
          setPageError(msg)
          setBusy(false)
        },
        onClose: () => setBusy(false),
      })
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível abrir o Pluggy Connect.')
      setBusy(false)
    }
  }

  async function handleLinkManualItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPageError('')
    setLastResult(null)

    const trimmed = manualItemId.trim()
    if (!trimmed) return setPageError('Informe o Item ID copiado do Meu Pluggy.')

    setBusy(true)
    try {
      const result = await openFinanceApi.linkItem(trimmed, Number(days))
      setManualItemId('')
      setLastResult(result)
      reloadAll()
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível vincular este Item ID.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSync(item: PluggyItem, triggerRemoteRefresh: boolean) {
    setPageError('')
    setLastResult(null)
    setSyncingId(item.id)
    try {
      const result = await openFinanceApi.syncItem(item.id, Number(days), triggerRemoteRefresh)
      setLastResult(result)
      reloadAll()
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível sincronizar esta conexão.')
    } finally {
      setSyncingId(null)
    }
  }

  async function handleLoadInvestments(item: PluggyItem) {
    setPageError('')
    setLoadingInvId(item.id)
    try {
      const list = await openFinanceApi.listInvestments(item.id)
      setInvestmentsByItem((prev) => ({ ...prev, [item.id]: list }))
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível consultar investimentos.')
    } finally {
      setLoadingInvId(null)
    }
  }

  async function handleDisconnect(item: PluggyItem) {
    const confirmed = window.confirm(
      `Desconectar "${item.connectorName}"? As contas, cartões e lançamentos já importados continuarão salvos no sistema.`,
    )
    if (!confirmed) return

    setPageError('')
    try {
      await openFinanceApi.removeItem(item.id)
      reloadAll()
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível desconectar.')
    }
  }

  const configured = status.data?.configured ?? false
  const itemList = items.data ?? []

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Open Finance</h1>
          <p className="page-subtitle">
            Conecte seus bancos via Pluggy para sincronizar contas, saldos, lançamentos, cartões, faturas e investimentos.
          </p>
        </div>

        <div className="workspace-actions">
          <div style={{ minWidth: 185 }}>
            <Select
              label=""
              value={days}
              options={SYNC_DAYS_OPTIONS}
              onChange={setDays}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!configured || busy}
            onClick={() => handleConnectWidget()}
          >
            {busy ? 'Aguarde...' : 'Conectar banco'}
          </button>
        </div>
      </div>

      <div className="security-notice">
        <ShieldIcon />
        <span>
          <strong>Criptografia ponta a ponta no banco (AES-256-GCM):</strong> suas chaves da própria API Pluggy (
          <code>Client ID</code> e <code>Client Secret</code>) são validadas, criptografadas com chave autenticada vinculada
          ao seu usuário e <strong>nunca mais são exibidas ou retornadas ao navegador</strong>. O consentimento Open Finance
          acontece direto no seu banco.
        </span>
      </div>

      {status.data && (
        <section className="card">
          <div className="card-head" style={{ flexWrap: 'wrap' }}>
            <div>
              <h2 className="card-title">Credenciais da sua API Pluggy (gratuito)</h2>
              <p className="page-subtitle" style={{ marginTop: 4 }}>
                {status.data.credentialsSource === 'user' ? (
                  <>
                    Chave pessoal ativa: <strong>{status.data.clientIdPreview}</strong>
                    {status.data.credentialsUpdatedAt
                      ? ` · atualizada em ${formatSyncDate(status.data.credentialsUpdatedAt)}`
                      : ''}
                  </>
                ) : status.data.credentialsSource === 'server' ? (
                  'Usando credenciais configuradas no servidor. Você também pode cadastrar suas próprias chaves abaixo.'
                ) : (
                  'Cadastre o Client ID e Client Secret da sua conta gratuita no painel da Pluggy (dashboard.pluggy.ai).'
                )}
              </p>
            </div>

            <div className="workspace-actions">
              {configured && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowCredForm((v) => !v)}
                >
                  {showCredForm ? 'Fechar' : 'Alterar chaves'}
                </button>
              )}
              {status.data.credentialsSource === 'user' && (
                <button type="button" className="btn btn-danger" onClick={handleRemoveCredentials}>
                  Remover chaves
                </button>
              )}
            </div>
          </div>

          {credSuccess && (
            <p className="form-success" role="status" style={{ marginBottom: 14 }}>
              {credSuccess}
            </p>
          )}

          {(!configured || showCredForm) && (
            <form className="form" onSubmit={handleSaveCredentials} noValidate>
              <div className="form-row">
                <label className="field">
                  <span>Client ID (Pluggy)</span>
                  <input
                    maxLength={200}
                    autoComplete="off"
                    placeholder="Ex.: 3f9c2a10-..."
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Client Secret (Pluggy)</span>
                  <input
                    type="password"
                    maxLength={300}
                    autoComplete="new-password"
                    placeholder="Cole seu Client Secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                  />
                </label>
              </div>

              <span className="field-hint">
                Ao salvar, o servidor testa a autenticação na API Pluggy antes de gravar as chaves criptografadas.
              </span>

              <div className="form-actions" style={{ gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={credSaving}>
                  {credSaving ? 'Validando e salvando...' : 'Testar e salvar credenciais'}
                </button>
                {configured && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={credSaving}
                    onClick={() => setShowCredForm(false)}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      )}

      {configured && (
        <section className="card">
          <h2 className="card-title">Vincular banco já conectado no Meu Pluggy</h2>
          <p className="page-subtitle" style={{ marginBottom: 16 }}>
            Já conectou seu banco pelo portal <strong>Meu Pluggy</strong>? Cole o <strong>Item ID</strong> abaixo para
            puxar contas, cartões, faturas e lançamentos imediatamente (sem duplicar nada).
          </p>
          <form className="form" onSubmit={handleLinkManualItem} noValidate>
            <div className="form-row">
              <label className="field">
                <span>Item ID do Pluggy</span>
                <input
                  maxLength={100}
                  placeholder="Ex.: 8a4f2c90-1234-4abc-9def-0123456789ab"
                  value={manualItemId}
                  onChange={(e) => setManualItemId(e.target.value)}
                />
              </label>
            </div>
            <div className="form-actions" style={{ gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Sincronizando...' : 'Vincular e sincronizar'}
              </button>
            </div>
          </form>
        </section>
      )}

      {pageError && (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      )}

      {lastResult && (
        <div className="of-sync-banner" role="status">
          <strong>{lastResult.connectorName} sincronizado!</strong>{' '}
          {lastResult.accountsSynced} conta(s), {lastResult.cardsSynced} cartão(ões),{' '}
          {lastResult.transactionsImported} novo(s) lançamento(s) bancário(s) e{' '}
          {lastResult.cardTransactionsImported} nova(s) compra(s) no cartão importada(s)
          {lastResult.investmentsCount > 0
            ? ` · ${lastResult.investmentsCount} investimento(s) somando ${formatMoney(lastResult.investmentsTotalCents)}`
            : ''}
          .
        </div>
      )}

      {items.loading && !items.data && <p className="state-message">Carregando conexões Open Finance...</p>}

      {items.data && itemList.length === 0 && configured && (
        <section className="card">
          <h2 className="card-title">Nenhum banco conectado ainda</h2>
          <p className="page-subtitle">
            Clique em <strong>Conectar banco</strong> acima para abrir o Pluggy Connect ou vincule um{' '}
            <strong>Item ID</strong> que você já conectou no Meu Pluggy.
          </p>
        </section>
      )}

      {itemList.map((item) => {
        const badge = statusBadge(item.status)
        const isSyncing = syncingId === item.id
        const invList = investmentsByItem[item.id]

        return (
          <section key={item.id} className="card of-item-card">
            <div className="of-item-head">
              <div className="of-institution">
                <div
                  className="of-logo"
                  style={item.connectorColor ? { borderColor: item.connectorColor } : undefined}
                >
                  {item.connectorImageUrl ? (
                    <img src={item.connectorImageUrl} alt={item.connectorName} />
                  ) : (
                    item.connectorName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 className="of-item-title">{item.connectorName}</h2>
                  <div className="of-item-meta">
                    <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                    <span>Última sincronização: {formatSyncDate(item.lastSyncedAt)}</span>
                    <span>ID: {item.pluggyItemId.slice(0, 8)}…</span>
                  </div>
                </div>
              </div>

              <div className="workspace-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isSyncing || busy}
                  onClick={() => handleSync(item, false)}
                >
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar dados'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={isSyncing || busy}
                  onClick={() => handleSync(item, true)}
                  title="Pede ao Pluggy para atualizar os dados direto no banco antes de importar"
                >
                  Atualizar no banco
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => handleConnectWidget(item.pluggyItemId)}
                >
                  Reconectar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={loadingInvId === item.id}
                  onClick={() => handleLoadInvestments(item)}
                >
                  {loadingInvId === item.id ? 'Carregando...' : 'Investimentos'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isSyncing || busy}
                  onClick={() => handleDisconnect(item)}
                >
                  Desconectar
                </button>
              </div>
            </div>

            {item.lastError && <p className="form-error">Aviso do Pluggy: {item.lastError}</p>}

            <div>
              <span className="list-group-title">Contas e cartões sincronizados ({item.links.length})</span>
              {item.links.length === 0 ? (
                <p className="empty">Nenhuma conta encontrada ainda. Clique em "Sincronizar dados".</p>
              ) : (
                item.links.map((link) => {
                  const isCard = Boolean(link.localCardId) || link.pluggyType.toUpperCase() === 'CREDIT'
                  return (
                    <div key={link.id} className="of-link-row">
                      <div className="list-item-main">
                        <span className="list-item-title">
                          {link.name} {link.maskedNumber ? `· ${link.maskedNumber}` : ''}
                        </span>
                        <span className="list-item-meta">
                          {isCard ? 'Cartão de crédito' : 'Conta bancária'} · Vinculado a:{' '}
                          <strong>{isCard ? (link.localCardName ?? 'Cartão') : (link.localAccountName ?? 'Conta')}</strong>
                        </span>
                      </div>

                      <div className="workspace-actions">
                        <span className="list-item-amount">{formatMoney(link.remoteBalanceCents)}</span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ minHeight: 34, padding: '0 12px', fontSize: 13 }}
                          onClick={() => onNavigate(isCard ? 'cards' : 'transactions')}
                        >
                          {isCard ? 'Ver fatura' : 'Ver extrato'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {invList && (
              <div className="of-investments-box">
                <span className="list-group-title">
                  Investimentos reportados ({invList.length}) · Total{' '}
                  {formatMoney(invList.reduce((acc, i) => acc + i.balanceCents, 0))}
                </span>
                {invList.length === 0 ? (
                  <p className="page-subtitle">Nenhum investimento retornado para esta conexão.</p>
                ) : (
                  invList.map((inv) => (
                    <div key={inv.id} className="of-link-row">
                      <div className="list-item-main">
                        <span className="list-item-title">{inv.name}</span>
                        <span className="list-item-meta">
                          {inv.type}
                          {inv.subtype ? ` · ${inv.subtype}` : ''}
                          {inv.institutionName ? ` · ${inv.institutionName}` : ''}
                        </span>
                      </div>
                      <span className="list-item-amount">{formatMoney(inv.balanceCents)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default OpenFinancePage
