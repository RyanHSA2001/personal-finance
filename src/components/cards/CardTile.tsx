import type { CSSProperties } from 'react'
import { formatMoney, formatPercent } from '../../lib/format'
import {
  CARD_BRAND_LABELS,
  CARD_KIND_LABELS,
  INVOICE_STATUS_LABELS,
  type Card,
} from '../../services/cardsService'
import './cards.css'

type CardTileProps = {
  card: Card
  selected: boolean
  onSelect: () => void
}

function CardTile({ card, selected, onSelect }: CardTileProps) {
  const isCredit = card.kind === 'credit'
  const limit = card.creditLimitCents ?? 0
  const usageRatio = isCredit && limit > 0 ? Math.max(0, card.usedLimitCents / limit) : 0
  const usageBarTone = usageRatio >= 1 ? 'is-over' : usageRatio >= 0.8 ? 'is-warning' : ''

  return (
    <button
      type="button"
      className={`card-tile ${card.isArchived ? 'is-archived' : ''}`}
      style={{ '--card-accent': card.color } as CSSProperties}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="card-tile-top">
        <div className="card-tile-identity">
          <span className="card-tile-name">{card.name}</span>
          <span className="card-tile-issuer">
            {card.issuer ? `${card.issuer} · ` : ''}
            {CARD_BRAND_LABELS[card.brand]}
          </span>
        </div>

        <div className="card-tile-badges">
          <span className="chip">{CARD_KIND_LABELS[card.kind]}</span>
          {card.isArchived && <span className="chip">Arquivado</span>}
        </div>
      </div>

      <div className="card-tile-middle">
        <span className="card-chip-svg" aria-hidden="true" />
        <span className="card-digits">
          {card.last4 ? `•••• •••• •••• ${card.last4}` : '•••• •••• •••• ••••'}
        </span>
      </div>

      {isCredit ? (
        <div className="card-tile-footer">
          <div className="card-tile-metrics">
            <span className="card-tile-metric-label">
              Fatura atual
              {card.currentInvoiceStatus ? ` (${INVOICE_STATUS_LABELS[card.currentInvoiceStatus]})` : ''}
            </span>
            <span className="card-tile-metric-value">{formatMoney(card.currentInvoiceCents)}</span>
          </div>

          <div className="progress" aria-hidden="true">
            <div
              className={`progress-bar ${usageBarTone}`}
              style={{ width: `${Math.min(usageRatio * 100, 100)}%` }}
            />
          </div>

          <div className="card-tile-sub">
            <span>Disponível {formatMoney(card.availableLimitCents)}</span>
            <span>
              {formatPercent(usageRatio)} de {formatMoney(limit)}
            </span>
          </div>
        </div>
      ) : (
        <div className="card-tile-footer">
          <div className="card-tile-metrics">
            <span className="card-tile-metric-label">Saldo da conta vinculada</span>
            <span className="card-tile-metric-value">
              {formatMoney(card.linkedAccountBalanceCents ?? 0)}
            </span>
          </div>
          <div className="card-tile-sub">
            <span>Conta: {card.linkedAccountName ?? 'Não vinculada'}</span>
          </div>
        </div>
      )}
    </button>
  )
}

export default CardTile
