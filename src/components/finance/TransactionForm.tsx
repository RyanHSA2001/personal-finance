import { useState, type FormEvent } from 'react'
import Select, { type SelectOption } from '../ui/Select'
import { ApiError } from '../../services/apiClient'
import { parseMoneyInput, todayIso } from '../../lib/format'
import {
  ACCOUNT_KIND_LABELS,
  financeApi,
  TRANSACTION_TYPE_LABELS,
  type Account,
  type Category,
  type TransactionType,
} from '../../services/financeService'

type TransactionFormProps = {
  accounts: Account[]
  categories: Category[]
  onSaved: () => void
}

const TYPES: TransactionType[] = ['expense', 'income', 'transfer']

// Formulário de novo lançamento: receita, despesa ou transferência entre contas.
function TransactionForm({ accounts, categories, onSaved }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayIso)
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [transferAccountId, setTransferAccountId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  // Valores padrão derivados das listas, sem efeitos: a primeira conta é a escolhida até o usuário trocar.
  const selectedAccount = accounts.some((account) => account.id === accountId)
    ? accountId
    : (accounts[0]?.id ?? '')
  const destinationOptions = accounts.filter((account) => account.id !== selectedAccount)
  const selectedDestination = destinationOptions.some((account) => account.id === transferAccountId)
    ? transferAccountId
    : (destinationOptions[0]?.id ?? '')
  const categoryKind = type === 'income' ? 'income' : 'expense'

  const accountOptions: SelectOption[] = accounts.map((account) => ({
    value: account.id,
    label: account.name,
    meta: ACCOUNT_KIND_LABELS[account.kind],
  }))

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Sem categoria' },
    ...categories
      .filter((category) => category.kind === categoryKind)
      .map((category) => ({ value: category.id, label: category.name, color: category.color })),
  ]

  const destinationSelectOptions: SelectOption[] = destinationOptions.map((account) => ({
    value: account.id,
    label: account.name,
  }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const amountCents = parseMoneyInput(amount)
    if (amountCents === null) {
      setError('Informe um valor maior que zero. Use vírgula para os centavos.')
      return
    }

    if (!selectedAccount) {
      setError('Cadastre uma conta antes de lançar.')
      return
    }

    if (type === 'transfer' && !selectedDestination) {
      setError('Cadastre uma segunda conta para fazer transferências.')
      return
    }

    setSaving(true)
    try {
      await financeApi.transactions.create({
        type,
        amountCents,
        description: description.trim(),
        occurredOn,
        accountId: selectedAccount,
        categoryId: type === 'transfer' ? null : categoryId || null,
        transferAccountId: type === 'transfer' ? selectedDestination : null,
      })

      setAmount('')
      setDescription('')
      setSuccess('Lançamento salvo.')
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar o lançamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="segmented" role="group" aria-label="Tipo de lançamento">
        {TYPES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={type === option}
            onClick={() => {
              setType(option)
              setCategoryId('')
            }}
          >
            {TRANSACTION_TYPE_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="form-row">
        <label className="field">
          <span>Valor</span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Data</span>
          <input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
        </label>

        <Select
          label={type === 'transfer' ? 'Conta de origem' : 'Conta'}
          value={selectedAccount}
          options={accountOptions}
          placeholder="Escolha uma conta"
          onChange={(nextAccountId) => {
            setAccountId(nextAccountId)
            if (nextAccountId === transferAccountId) setTransferAccountId('')
          }}
        />

        {type === 'transfer' ? (
          <Select
            label="Conta de destino"
            value={selectedDestination}
            options={destinationSelectOptions}
            placeholder="Cadastre outra conta"
            onChange={setTransferAccountId}
          />
        ) : (
          <Select label="Categoria" value={categoryId} options={categoryOptions} onChange={setCategoryId} />
        )}
      </div>

      <label className="field">
        <span>Descrição (opcional)</span>
        <input
          maxLength={200}
          placeholder="Ex.: Supermercado, aluguel, salário de novembro"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="form-success" role="status">{success}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar lançamento'}
        </button>
      </div>
    </form>
  )
}

export default TransactionForm
