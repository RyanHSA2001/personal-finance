import { useCallback, useState } from 'react'
import type { AppView } from '../components/app/AppShell'
import CardForm from '../components/cards/CardForm'
import CardTile from '../components/cards/CardTile'
import CreditCardWorkspace from '../components/cards/CreditCardWorkspace'
import LinkedCardWorkspace from '../components/cards/LinkedCardWorkspace'
import { useRequest } from '../hooks/useRequest'
import { ApiError } from '../services/apiClient'
import { cardsApi, type Card } from '../services/cardsService'
import { financeApi } from '../services/financeService'

type CardsPageProps = {
  onNavigate: (view: AppView) => void
}

function CardsPage({ onNavigate }: CardsPageProps) {
  const [includeArchived, setIncludeArchived] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [pageError, setPageError] = useState('')

  const loadCards = useCallback(
    (signal: AbortSignal) => cardsApi.list(includeArchived, signal),
    [includeArchived],
  )
  const loadAccounts = useCallback((signal: AbortSignal) => financeApi.accounts.list(signal), [])
  const loadCategories = useCallback((signal: AbortSignal) => financeApi.categories.list(signal), [])

  const cards = useRequest(`cards:${includeArchived}`, loadCards)
  const accounts = useRequest('accounts', loadAccounts)
  const categories = useRequest('categories', loadCategories)

  const cardList = cards.data ?? []
  const selectedCard = cardList.find((c) => c.id === selectedCardId) ?? cardList[0] ?? null

  function reloadAll() {
    cards.reload()
    accounts.reload()
  }

  function handleFormSaved(savedId?: string) {
    setShowCreateForm(false)
    setEditingCard(null)
    if (savedId) setSelectedCardId(savedId)
    reloadAll()
  }

  async function handleToggleArchive(card: Card) {
    setPageError('')
    try {
      await cardsApi.update(card.id, {
        name: card.name,
        kind: card.kind,
        brand: card.brand,
        issuer: card.issuer,
        last4: card.last4,
        color: card.color,
        creditLimitCents: card.creditLimitCents,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        defaultPaymentAccountId: card.defaultPaymentAccountId,
        linkedAccountId: card.linkedAccountId,
        isArchived: !card.isArchived,
      })
      reloadAll()
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível atualizar o cartão.')
    }
  }

  async function handleDeleteCard(card: Card) {
    const confirmed = window.confirm(
      `Excluir o cartão "${card.name}"? Todas as compras e faturas deste cartão também serão removidas.`,
    )
    if (!confirmed) return

    setPageError('')
    try {
      await cardsApi.remove(card.id)
      if (selectedCardId === card.id) setSelectedCardId(null)
      reloadAll()
    } catch (caught) {
      setPageError(caught instanceof ApiError ? caught.message : 'Não foi possível excluir o cartão.')
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cartões</h1>
          <p className="page-subtitle">
            Gerencie cartões de crédito, faturas, parcelas e cartões de débito ou benefícios.
          </p>
        </div>

        <div className="workspace-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIncludeArchived((v) => !v)}
          >
            {includeArchived ? 'Ocultar arquivados' : 'Mostrar arquivados'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingCard(null)
              setShowCreateForm((v) => !v)
            }}
          >
            {showCreateForm ? 'Fechar formulário' : 'Novo cartão'}
          </button>
        </div>
      </div>

      {pageError && (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      )}

      {(showCreateForm || editingCard) && (
        <section className="card">
          <h2 className="card-title">{editingCard ? `Editar ${editingCard.name}` : 'Novo cartão'}</h2>
          <CardForm
            key={editingCard?.id ?? 'new'}
            accounts={accounts.data ?? []}
            editingCard={editingCard}
            onSaved={handleFormSaved}
            onCancel={() => {
              setShowCreateForm(false)
              setEditingCard(null)
            }}
          />
        </section>
      )}

      {cards.loading && !cards.data && <p className="state-message">Carregando seus cartões...</p>}

      {cards.error && !cards.data && (
        <div className="state-message">
          <p>{cards.error}</p>
          <button type="button" className="btn" onClick={cards.reload}>
            Tentar novamente
          </button>
        </div>
      )}

      {cards.data && cardList.length === 0 && !showCreateForm && (
        <section className="card">
          <h2 className="card-title">Nenhum cartão cadastrado ainda</h2>
          <p className="page-subtitle">
            Cadastre seus cartões de crédito para acompanhar limites, faturas e parcelas, ou vincule cartões de débito e
            vale-refeição às suas contas.
          </p>
          <div className="form-actions" style={{ gap: 10 }}>
            <button type="button" className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
              Cadastrar primeiro cartão
            </button>
            {(accounts.data?.length ?? 0) === 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => onNavigate('registry')}>
                Ir para Cadastros
              </button>
            )}
          </div>
        </section>
      )}

      {cardList.length > 0 && (
        <>
          <div className="cards-grid">
            {cardList.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                selected={selectedCard?.id === card.id}
                onSelect={() => {
                  setEditingCard(null)
                  setSelectedCardId(card.id)
                }}
              />
            ))}
          </div>

          {selectedCard && selectedCard.kind === 'credit' && (
            <CreditCardWorkspace
              key={selectedCard.id}
              card={selectedCard}
              accounts={accounts.data ?? []}
              categories={categories.data ?? []}
              onEdit={() => {
                setShowCreateForm(false)
                setEditingCard(selectedCard)
              }}
              onToggleArchive={() => handleToggleArchive(selectedCard)}
              onDeleteCard={() => handleDeleteCard(selectedCard)}
              onDataChanged={reloadAll}
            />
          )}

          {selectedCard && selectedCard.kind !== 'credit' && (
            <LinkedCardWorkspace
              key={selectedCard.id}
              card={selectedCard}
              categories={categories.data ?? []}
              onEdit={() => {
                setShowCreateForm(false)
                setEditingCard(selectedCard)
              }}
              onToggleArchive={() => handleToggleArchive(selectedCard)}
              onDeleteCard={() => handleDeleteCard(selectedCard)}
              onDataChanged={reloadAll}
            />
          )}
        </>
      )}
    </div>
  )
}

export default CardsPage
