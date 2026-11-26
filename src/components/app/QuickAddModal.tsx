import { useEffect, useRef, useState, type FormEvent } from 'react'
import Select, { type SelectOption } from '../ui/Select'
import { parseMoneyInput, todayIso } from '../../lib/format'
import { ApiError } from '../../services/apiClient'
import { cardsApi, type Card } from '../../services/cardsService'
import { ACCOUNT_KIND_LABELS, financeApi, type Account, type Category } from '../../services/financeService'
import './quickadd.css'

type QuickMode = 'expense' | 'income' | 'card'

type QuickAddModalProps = {
  onSaved: () => void
}

const LAST_ACCOUNT_KEY = 'personalcontrol.lastAccountId'
const LAST_CARD_KEY = 'personalcontrol.lastCardId'

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignora se localStorage estiver indisponível.
  }
}

// Botão flutuante (+) e gaveta de lançamento rápido (5 segundos para registrar um gasto).
function QuickAddModal({ onSaved }: QuickAddModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [creditCards, setCreditCards] = useState<Card[]>([])

  const [mode, setMode] = useState<QuickMode>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayIso)
  const [accountId, setAccountId] = useState(() => readStorage(LAST_ACCOUNT_KEY))
  const [cardId, setCardId] = useState(() => readStorage(LAST_CARD_KEY))
  const [categoryId, setCategoryId] = useState('')
  const [installments, setInstallments] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    const controller = new AbortController()

    Promise.all([
      financeApi.accounts.list(controller.signal),
      financeApi.categories.list(controller.signal),
      cardsApi.list(false, controller.signal),
    ])
      .then(([accList, catList, cardList]) => {
        if (controller.signal.aborted) return
        setAccounts(accList)
        setCategories(catList)
        setCreditCards(cardList.filter((c) => c.kind === 'credit' && !c.isArchived))
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Não foi possível carregar contas e categorias.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
          window.setTimeout(() => amountRef.current?.focus(), 40)
        }
      })

    return () => controller.abort()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const selectedAccount = accounts.some((a) => a.id === accountId) ? accountId : (accounts[0]?.id ?? '')
  const selectedCard = creditCards.some((c) => c.id === cardId) ? cardId : (creditCards[0]?.id ?? '')

  const categoryKind = mode === 'income' ? 'income' : 'expense'
  const visibleCategories = categories.filter((c) => c.kind === categoryKind)
  const selectedCategory = visibleCategories.some((c) => c.id === categoryId) ? categoryId : ''

  const accountOptions: SelectOption[] = accounts.map((a) => ({
    value: a.id,
    label: a.name,
    meta: ACCOUNT_KIND_LABELS[a.kind],
  }))

  const cardOptions: SelectOption[] = creditCards.map((c) => ({
    value: c.id,
    label: c.name,
    meta: c.last4 ? `•••• ${c.last4}` : undefined,
  }))

  function handleOpen() {
    setOccurredOn(todayIso())
    setAmount('')
    setDescription('')
    setCategoryId('')
    setInstallments('1')
    setError('')
    setLoading(true)
    setOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const cents = parseMoneyInput(amount)
    if (cents === null) return setError('Informe um valor maior que zero.')

    setSaving(true)
    try {
      if (mode === 'card') {
        if (!selectedCard) {
          setError('Cadastre um cartão de crédito primeiro.')
          setSaving(false)
          return
        }
        const parcelCount = Math.max(1, Math.min(48, Number.parseInt(installments, 10) || 1))
        await cardsApi.addTransaction(selectedCard, {
          type: 'purchase',
          totalAmountCents: cents,
          description: description.trim() || 'Compra no cartão',
          occurredOn,
          categoryId: selectedCategory || null,
          installments: parcelCount,
        })
        writeStorage(LAST_CARD_KEY, selectedCard)
      } else {
        if (!selectedAccount) {
          setError('Cadastre uma conta primeiro.')
          setSaving(false)
          return
        }
        await financeApi.transactions.create({
          type: mode,
          amountCents: cents,
          description: description.trim(),
          occurredOn,
          accountId: selectedAccount,
          categoryId: selectedCategory || null,
          transferAccountId: null,
        })
        writeStorage(LAST_ACCOUNT_KEY, selectedAccount)
      }

      setOpen(false)
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar o lançamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="fab-quick-add"
        aria-label="Lançamento rápido"
        onClick={handleOpen}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Lançar</span>
      </button>

      {open && (
        <div
          className="qa-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Lançamento rápido"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="qa-sheet">
            <div className="qa-head">
              <h2 className="qa-title">Lançamento rápido</h2>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            {loading ? (
              <p className="empty">Carregando…</p>
            ) : (
              <form className="form" onSubmit={handleSubmit} noValidate>
                <div className="segmented" role="group" aria-label="Tipo">
                  <button type="button" aria-pressed={mode === 'expense'} onClick={() => setMode('expense')}>
                    Despesa
                  </button>
                  <button type="button" aria-pressed={mode === 'income'} onClick={() => setMode('income')}>
                    Receita
                  </button>
                  {creditCards.length > 0 && (
                    <button type="button" aria-pressed={mode === 'card'} onClick={() => setMode('card')}>
                      Cartão
                    </button>
                  )}
                </div>

                <label className="field">
                  <span>Valor (R$)</span>
                  <input
                    ref={amountRef}
                    className="qa-amount-input"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Descrição</span>
                  <input
                    maxLength={200}
                    placeholder={mode === 'income' ? 'Ex.: Salário, Pix recebido' : 'Ex.: Café, Uber, Mercado'}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>

                <div className="field">
                  <span>Categoria (1 toque)</span>
                  <div className="qa-chips">
                    {visibleCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className="qa-chip"
                        aria-pressed={selectedCategory === cat.id}
                        onClick={() => setCategoryId((prev) => (prev === cat.id ? '' : cat.id))}
                      >
                        <span className="dot" style={{ background: cat.color }} aria-hidden="true" />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  {mode === 'card' ? (
                    <>
                      <Select
                        label="Cartão"
                        value={selectedCard}
                        options={cardOptions}
                        onChange={(v) => {
                          setCardId(v)
                          writeStorage(LAST_CARD_KEY, v)
                        }}
                      />
                      <label className="field">
                        <span>Parcelas</span>
                        <input
                          type="number"
                          min={1}
                          max={48}
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <Select
                      label="Conta"
                      value={selectedAccount}
                      options={accountOptions}
                      onChange={(v) => {
                        setAccountId(v)
                        writeStorage(LAST_ACCOUNT_KEY, v)
                      }}
                    />
                  )}

                  <label className="field">
                    <span>Data</span>
                    <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
                  </label>
                </div>

                {error && <p className="form-error" role="alert">{error}</p>}

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', minHeight: 46 }} disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar lançamento'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default QuickAddModal
