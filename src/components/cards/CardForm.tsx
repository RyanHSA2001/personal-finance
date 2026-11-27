import { useState, type FormEvent } from 'react'
import { ShieldIcon } from '../ui/Icons'
import Select, { type SelectOption } from '../ui/Select'
import { ApiError } from '../../services/apiClient'
import { formatMoney, parseMoneyInput } from '../../lib/format'
import {
  CARD_BRAND_LABELS,
  CARD_COLOR_PRESETS,
  CARD_KIND_LABELS,
  cardsApi,
  type Card,
  type CardBrand,
  type CardKind,
} from '../../services/cardsService'
import type { Account } from '../../services/financeService'
import './cards.css'

type CardFormProps = {
  accounts: Account[]
  editingCard?: Card | null
  onSaved: (createdOrEditedId?: string) => void
  onCancel: () => void
}

const KIND_OPTIONS: SelectOption[] = (Object.keys(CARD_KIND_LABELS) as CardKind[]).map((kind) => ({
  value: kind,
  label: CARD_KIND_LABELS[kind],
}))

const BRAND_OPTIONS: SelectOption[] = (Object.keys(CARD_BRAND_LABELS) as CardBrand[]).map((brand) => ({
  value: brand,
  label: CARD_BRAND_LABELS[brand],
}))

function formatCentsForInput(cents: number | null | undefined): string {
  if (!cents) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

function CardForm({ accounts, editingCard, onSaved, onCancel }: CardFormProps) {
  const isEditing = Boolean(editingCard)
  const bankAccounts = accounts.filter((a) => a.kind !== 'credit_card')

  const [name, setName] = useState(editingCard?.name ?? '')
  const [kind, setKind] = useState<CardKind>(editingCard?.kind ?? 'credit')
  const [brand, setBrand] = useState<CardBrand>(editingCard?.brand ?? 'mastercard')
  const [issuer, setIssuer] = useState(editingCard?.issuer ?? '')
  const [last4, setLast4] = useState(editingCard?.last4 ?? '')
  const [color, setColor] = useState(editingCard?.color ?? CARD_COLOR_PRESETS[0])
  const [limit, setLimit] = useState(formatCentsForInput(editingCard?.creditLimitCents))
  const [closingDay, setClosingDay] = useState(String(editingCard?.closingDay ?? 10))
  const [dueDay, setDueDay] = useState(String(editingCard?.dueDay ?? 17))
  const [defaultPaymentAccountId, setDefaultPaymentAccountId] = useState(
    editingCard?.defaultPaymentAccountId ?? '',
  )
  const [linkedAccountId, setLinkedAccountId] = useState(
    editingCard?.linkedAccountId ?? bankAccounts[0]?.id ?? '',
  )

  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const paymentAccountOptions: SelectOption[] = [
    { value: '', label: 'Escolher na hora do pagamento' },
    ...bankAccounts.map((a) => ({ value: a.id, label: `${a.name} (${formatMoney(a.balanceCents)})` })),
  ]

  const linkedAccountOptions: SelectOption[] = bankAccounts.map((a) => ({
    value: a.id,
    label: `${a.name} (${formatMoney(a.balanceCents)})`,
  }))

  function handleLast4Change(raw: string) {
    // Segurança: aceita apenas dígitos e no máximo 4 caracteres.
    setLast4(raw.replace(/\D/g, '').slice(0, 4))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (!name.trim()) return setFormError('Informe o apelido do cartão.')
    if (last4.length > 0 && last4.length !== 4) {
      return setFormError('Informe exatamente os 4 últimos dígitos ou deixe em branco.')
    }

    let creditLimitCents: number | null = null
    let parsedClosing: number | null = null
    let parsedDue: number | null = null

    if (kind === 'credit') {
      creditLimitCents = parseMoneyInput(limit)
      if (creditLimitCents === null) return setFormError('Informe um limite de crédito maior que zero.')

      parsedClosing = Number(closingDay)
      parsedDue = Number(dueDay)
      if (!Number.isInteger(parsedClosing) || parsedClosing < 1 || parsedClosing > 31) {
        return setFormError('Dia de fechamento deve estar entre 1 e 31.')
      }
      if (!Number.isInteger(parsedDue) || parsedDue < 1 || parsedDue > 31) {
        return setFormError('Dia de vencimento deve estar entre 1 e 31.')
      }
    } else if (!linkedAccountId) {
      return setFormError('Cadastre e selecione uma conta vinculada para este cartão.')
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        kind,
        brand,
        issuer: issuer.trim(),
        last4: last4.length === 4 ? last4 : null,
        color,
        creditLimitCents,
        closingDay: parsedClosing,
        dueDay: parsedDue,
        defaultPaymentAccountId: kind === 'credit' && defaultPaymentAccountId ? defaultPaymentAccountId : null,
        linkedAccountId: kind !== 'credit' ? linkedAccountId : null,
        isArchived: editingCard?.isArchived ?? false,
      }

      if (editingCard) {
        await cardsApi.update(editingCard.id, payload)
        onSaved(editingCard.id)
      } else {
        const created = await cardsApi.create(payload)
        onSaved(created.id)
      }
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar o cartão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="security-notice">
        <ShieldIcon />
        <span>
          <strong>Segurança em primeiro lugar:</strong> nunca informe o número completo do cartão, CVV ou senha.
          Armazenamos apenas o apelido, a bandeira e, se desejar, os <strong>4 últimos dígitos</strong> para identificação.
        </span>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Apelido do cartão</span>
          <input
            maxLength={80}
            placeholder="Ex.: Nubank Ultravioleta, Alelo VR"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <Select
          label="Tipo"
          value={kind}
          options={KIND_OPTIONS}
          onChange={(value) => setKind(value as CardKind)}
        />

        <Select
          label="Bandeira"
          value={brand}
          options={BRAND_OPTIONS}
          onChange={(value) => setBrand(value as CardBrand)}
        />
      </div>

      <div className="form-row">
        <label className="field">
          <span>Banco / Emissor (opcional)</span>
          <input
            maxLength={60}
            placeholder="Ex.: Nubank, Itaú, Alelo"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Últimos 4 dígitos (opcional)</span>
          <input
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            placeholder="Ex.: 4821"
            value={last4}
            onChange={(e) => handleLast4Change(e.target.value)}
          />
        </label>

        <div className="field">
          <span>Cor do cartão</span>
          <div className="color-picker-row">
            {CARD_COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="color-swatch"
                style={{ background: preset }}
                aria-label={`Cor ${preset}`}
                aria-pressed={color.toLowerCase() === preset.toLowerCase()}
                onClick={() => setColor(preset)}
              />
            ))}
            <input
              type="color"
              aria-label="Escolher cor personalizada"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>
      </div>

      {kind === 'credit' ? (
        <div className="form-row">
          <label className="field">
            <span>Limite de crédito (R$)</span>
            <input
              inputMode="decimal"
              placeholder="5.000,00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Dia de fechamento</span>
            <input
              type="number"
              min={1}
              max={31}
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Dia de vencimento</span>
            <input
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          </label>

          <Select
            label="Conta vinculada (pagamento)"
            value={defaultPaymentAccountId}
            options={paymentAccountOptions}
            onChange={setDefaultPaymentAccountId}
          />
        </div>
      ) : (
        <div className="form-row">
          <Select
            label="Conta vinculada"
            value={linkedAccountId}
            options={linkedAccountOptions}
            placeholder="Cadastre uma conta em Cadastros primeiro"
            onChange={setLinkedAccountId}
          />
        </div>
      )}

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="form-actions" style={{ gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar cartão'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default CardForm
