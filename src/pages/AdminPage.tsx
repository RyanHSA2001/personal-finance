import { useCallback, useState, type FormEvent } from 'react'
import { useRequest } from '../hooks/useRequest'
import { adminApi, ApiError } from '../services/apiClient'

function formatDateTime(isoUtc: string): string {
  const date = new Date(isoUtc)
  if (Number.isNaN(date.getTime())) return isoUtc
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

// Painel de administrador: controla quais e-mails podem criar conta e lista contas cadastradas.
function AdminPage() {
  const loadAllowed = useCallback((signal: AbortSignal) => adminApi.allowedEmails.list(signal), [])
  const loadUsers = useCallback((signal: AbortSignal) => adminApi.users.list(signal), [])

  const allowed = useRequest('admin:allowed-emails', loadAllowed)
  const users = useRequest('admin:users', loadUsers)

  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    const trimmed = email.trim()
    if (!trimmed) {
      setFormError('Informe o e-mail que deseja autorizar.')
      return
    }

    setSaving(true)
    try {
      await adminApi.allowedEmails.add(trimmed, note.trim())
      setEmail('')
      setNote('')
      setFormSuccess(`E-mail ${trimmed.toLowerCase()} autorizado para cadastro.`)
      allowed.reload()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível autorizar o e-mail.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string, entryEmail: string) {
    const confirmed = window.confirm(
      `Remover "${entryEmail}" da lista de autorizados? (Se a conta já foi criada, ela continua existindo; apenas novos cadastros serão bloqueados.)`,
    )
    if (!confirmed) return

    setFormError('')
    setFormSuccess('')
    try {
      await adminApi.allowedEmails.remove(id)
      allowed.reload()
    } catch (caught) {
      setFormError(errorMessage(caught, 'Não foi possível remover o e-mail.'))
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administração</h1>
          <p className="page-subtitle">
            Somente e-mails listados abaixo conseguem criar novas contas no PersonalControl.
          </p>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">E-mails autorizados para cadastro</h2>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label className="field">
              <span>E-mail</span>
              <input
                type="email"
                maxLength={254}
                placeholder="pessoa@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Observação (opcional)</span>
              <input
                maxLength={120}
                placeholder="Ex.: Esposa, conta secundária"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>

          {formError && <p className="form-error" role="alert">{formError}</p>}
          {formSuccess && <p className="form-success" role="status">{formSuccess}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Autorizar e-mail
            </button>
          </div>
        </form>

        {allowed.error && !allowed.data && <p className="form-error" style={{ marginTop: 16 }}>{allowed.error}</p>}

        <ul className="list" style={{ marginTop: 20 }}>
          {allowed.data?.length === 0 && (
            <p className="empty">Nenhum e-mail autorizado ainda. Novos cadastros estão bloqueados.</p>
          )}
          {allowed.data?.map((entry) => (
            <li key={entry.id} className="list-item">
              <div className="list-item-main">
                <span className="list-item-title">{entry.email}</span>
                <span className="list-item-meta">
                  {entry.note ? `${entry.note} · ` : ''}
                  Autorizado em {formatDateTime(entry.createdAtUtc)}
                </span>
              </div>
              <span className={`chip ${entry.isRegistered ? 'tone-positive' : 'tone-accent'}`}>
                {entry.isRegistered ? 'Já cadastrado' : 'Aguardando cadastro'}
              </span>
              <button
                type="button"
                className="btn btn-icon btn-danger"
                aria-label={`Remover autorização de ${entry.email}`}
                onClick={() => handleRemove(entry.id, entry.email)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="card-title">Contas cadastradas</h2>
        {users.error && !users.data && <p className="form-error">{users.error}</p>}

        <ul className="list">
          {users.data?.length === 0 && <p className="empty">Nenhuma conta cadastrada.</p>}
          {users.data?.map((user) => (
            <li key={user.id} className="list-item">
              <div className="list-item-main">
                <span className="list-item-title">
                  {user.name}
                  {user.isAdmin ? ' (Admin)' : ''}
                </span>
                <span className="list-item-meta">
                  {user.email} · Criada em {formatDateTime(user.createdAtUtc)}
                </span>
              </div>
              {user.isAdmin && <span className="chip tone-accent">Admin</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default AdminPage
