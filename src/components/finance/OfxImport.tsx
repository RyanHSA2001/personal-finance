import { useRef, useState, type ChangeEvent } from 'react'
import Select, { type SelectOption } from '../ui/Select'
import { ApiError } from '../../services/apiClient'
import { formatDate, formatMoney } from '../../lib/format'
import {
  ACCOUNT_KIND_LABELS,
  financeApi,
  type Account,
  type Category,
  type OfxPreview,
  type OfxPreviewTransaction,
} from '../../services/financeService'
import './finance.css'

type OfxImportProps = {
  accounts: Account[]
  categories: Category[]
  onImported: () => void
}

type RowState = { selected: boolean; categoryId: string }

// Importação de extrato OFX: escolhe a conta e o arquivo, revisa os lançamentos e confirma.
function OfxImport({ accounts, categories, onImported }: OfxImportProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)
  const [accountId, setAccountId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<OfxPreview | null>(null)
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedAccount = accounts.some((account) => account.id === accountId) ? accountId : (accounts[0]?.id ?? '')

  const accountOptions: SelectOption[] = accounts.map((account) => ({
    value: account.id,
    label: account.name,
    meta: ACCOUNT_KIND_LABELS[account.kind],
  }))

  function categoryOptions(kind: 'income' | 'expense'): SelectOption[] {
    return [
      { value: '', label: 'Sem categoria' },
      ...categories
        .filter((category) => category.kind === kind)
        .map((category) => ({ value: category.id, label: category.name, color: category.color })),
    ]
  }

  async function loadPreview(nextFile: File, nextAccountId: string) {
    const requestId = ++requestRef.current
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await financeApi.transactions.previewOfx(nextFile, nextAccountId || undefined)
      if (requestId !== requestRef.current) return

      setPreview(result)
      setRows((previous) =>
        Object.fromEntries(
          result.transactions.map((transaction) => [
            transaction.externalId,
            {
              selected: !transaction.alreadyImported,
              categoryId: previous[transaction.externalId]?.categoryId ?? '',
            },
          ]),
        ),
      )
    } catch (caught) {
      if (requestId !== requestRef.current) return
      setPreview(null)
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível ler o arquivo OFX.')
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null
    event.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!nextFile) return

    setFile(nextFile)
    setRows({})
    void loadPreview(nextFile, selectedAccount)
  }

  // Trocar de conta reavalia quais lançamentos já foram importados nela.
  function handleAccountChange(nextAccountId: string) {
    setAccountId(nextAccountId)
    if (file) void loadPreview(file, nextAccountId)
  }

  function updateRow(externalId: string, patch: Partial<RowState>) {
    setRows((previous) => ({ ...previous, [externalId]: { ...previous[externalId], ...patch } }))
  }

  function reset() {
    requestRef.current++
    setFile(null)
    setPreview(null)
    setRows({})
    setLoading(false)
  }

  const importable = preview?.transactions.filter((transaction) => !transaction.alreadyImported) ?? []
  const chosen = importable.filter((transaction) => rows[transaction.externalId]?.selected)
  const allChosen = importable.length > 0 && chosen.length === importable.length
  const alreadyImportedCount = (preview?.transactions.length ?? 0) - importable.length

  const totals = (preview?.transactions ?? []).reduce(
    (sum, transaction) => {
      if (transaction.type === 'income') sum.income += transaction.amountCents
      else sum.expense += transaction.amountCents
      return sum
    },
    { income: 0, expense: 0 },
  )

  function toggleAll() {
    setRows((previous) => {
      const next = { ...previous }
      for (const transaction of importable) {
        next[transaction.externalId] = { ...next[transaction.externalId], selected: !allChosen }
      }
      return next
    })
  }

  async function handleImport() {
    if (!selectedAccount || chosen.length === 0) return

    setImporting(true)
    setError('')
    setSuccess('')
    try {
      const result = await financeApi.transactions.importOfx({
        accountId: selectedAccount,
        transactions: chosen.map((transaction) => ({
          externalId: transaction.externalId,
          type: transaction.type,
          amountCents: transaction.amountCents,
          description: transaction.description,
          occurredOn: transaction.occurredOn,
          categoryId: rows[transaction.externalId]?.categoryId || null,
        })),
      })

      const plural = result.imported === 1 ? 'lançamento importado' : 'lançamentos importados'
      const skipped = result.skipped > 0 ? ` (${result.skipped} já existia${result.skipped === 1 ? '' : 'm'})` : ''
      setSuccess(`${result.imported} ${plural}${skipped}.`)
      reset()
      onImported()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível importar os lançamentos.')
    } finally {
      setImporting(false)
    }
  }

  if (accounts.length === 0) {
    return <p className="empty">Cadastre uma conta para importar extratos.</p>
  }

  return (
    <div className="form">
      <div className="form-row">
        <Select
          label="Importar para a conta"
          value={selectedAccount}
          options={accountOptions}
          onChange={handleAccountChange}
          disabled={loading || importing}
        />

        <div className="field">
          <span>Arquivo OFX</span>
          <div className="ofx-file">
            <button
              type="button"
              className="btn"
              disabled={loading || importing}
              onClick={() => inputRef.current?.click()}
            >
              {file ? 'Trocar arquivo' : 'Escolher arquivo'}
            </button>
            <span className="ofx-file-name">{file?.name ?? 'Nenhum arquivo selecionado'}</span>
            <input ref={inputRef} type="file" accept=".ofx,application/x-ofx" hidden onChange={handleFileChange} />
          </div>
        </div>
      </div>

      {loading && <p className="state-message">Lendo o extrato...</p>}

      {preview && !loading && (
        <>
          <div className="ofx-summary">
            {preview.startDate && preview.endDate && (
              <span className="chip">
                {formatDate(preview.startDate)} a {formatDate(preview.endDate)}
              </span>
            )}
            <span className="chip">{preview.transactions.length} lançamentos</span>
            <span className="chip ofx-income">Entradas {formatMoney(totals.income)}</span>
            <span className="chip">Saídas {formatMoney(totals.expense)}</span>
            {preview.ledgerBalanceCents !== null && (
              <span className="chip">Saldo no banco {formatMoney(preview.ledgerBalanceCents)}</span>
            )}
            {alreadyImportedCount > 0 && (
              <span className="chip">{alreadyImportedCount} já importado{alreadyImportedCount === 1 ? '' : 's'}</span>
            )}
          </div>

          {preview.transactions.length === 0 ? (
            <p className="empty">O extrato não tem lançamentos no período.</p>
          ) : (
            <div className="ofx-list">
              <label className="ofx-select-all">
                <input
                  type="checkbox"
                  checked={allChosen}
                  disabled={importable.length === 0}
                  onChange={toggleAll}
                />
                <span>Selecionar todos</span>
              </label>

              {preview.transactions.map((transaction) => (
                <OfxRow
                  key={transaction.externalId}
                  transaction={transaction}
                  state={rows[transaction.externalId] ?? { selected: false, categoryId: '' }}
                  categoryOptions={categoryOptions(transaction.type)}
                  onChange={(patch) => updateRow(transaction.externalId, patch)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}

      {preview && !loading && (
        <div className="form-actions ofx-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={importing || chosen.length === 0}
            onClick={handleImport}
          >
            {importing
              ? 'Importando...'
              : `Importar ${chosen.length} lançamento${chosen.length === 1 ? '' : 's'}`}
          </button>
          <button type="button" className="btn btn-ghost" disabled={importing} onClick={reset}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

type OfxRowProps = {
  transaction: OfxPreviewTransaction
  state: RowState
  categoryOptions: SelectOption[]
  onChange: (patch: Partial<RowState>) => void
}

function OfxRow({ transaction, state, categoryOptions, onChange }: OfxRowProps) {
  const disabled = transaction.alreadyImported
  const sign = transaction.type === 'income' ? '+' : '−'

  return (
    <div className="ofx-row" data-disabled={disabled || undefined}>
      <input
        type="checkbox"
        aria-label={`Importar ${transaction.description}`}
        checked={state.selected && !disabled}
        disabled={disabled}
        onChange={(event) => onChange({ selected: event.target.checked })}
      />

      <div className="transaction-main">
        <span className="transaction-title">{transaction.description || 'Sem descrição'}</span>
        <span className="transaction-meta">
          <span>{formatDate(transaction.occurredOn)}</span>
          {disabled && <span className="chip">Já importado</span>}
        </span>
      </div>

      <div className="ofx-category">
        <Select
          label="Categoria"
          value={state.categoryId}
          options={categoryOptions}
          onChange={(categoryId) => onChange({ categoryId })}
          disabled={disabled}
        />
      </div>

      <span className={`transaction-amount is-${transaction.type}`}>
        {sign}
        {formatMoney(transaction.amountCents)}
      </span>
    </div>
  )
}

export default OfxImport
