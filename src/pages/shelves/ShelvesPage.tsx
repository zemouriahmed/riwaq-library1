import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Layers, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { useToast } from '@/contexts/ToastContext'
import { createShelf, deleteShelf, listShelves, renameShelf } from '@/services/shelves'
import { errorKey } from '@/services/errors'
import type { Shelf } from '@/types'

const COLORS = ['#172B4D', '#315D91', '#D6A85F', '#2F7D6B', '#8C4A6B', '#B5523B']

export default function ShelvesPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[1])
  const [formError, setFormError] = useState<string | undefined>()
  const [toDelete, setToDelete] = useState<Shelf | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)

  const shelves = useQuery({ queryKey: ['shelves'], queryFn: listShelves })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['shelves'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
  }

  const create = useMutation({
    mutationFn: () => createShelf(user!.id, { name, description, cover_color: color }),
    onSuccess: () => {
      setName('')
      setDescription('')
      setShowForm(false)
      refresh()
    },
    onError: (e) => toast.error(t(errorKey(e))),
  })

  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) => renameShelf(v.id, v.name),
    onSuccess: () => {
      setEditing(null)
      refresh()
    },
    onError: (e) => toast.error(t(errorKey(e))),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteShelf(id),
    onSuccess: () => {
      setToDelete(null)
      refresh()
    },
    onError: (e) => toast.error(t(errorKey(e))),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError(t('errors.required'))
      return
    }
    setFormError(undefined)
    create.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold md:text-3xl">{t('shelves.title')}</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus size={18} aria-hidden /> {t('shelves.new')}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate>
          <Field label={t('shelves.name')} value={name} onChange={(e) => setName(e.target.value)} error={formError} maxLength={80} />
          <Field label={t('shelves.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{t('shelves.color')}</legend>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  aria-pressed={color === c}
                  className="h-8 w-8 rounded-full ring-offset-2 ring-offset-surface transition-all aria-pressed:ring-2 aria-pressed:ring-gold"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={create.isPending}>
              {t('shelves.create')}
            </Button>
          </div>
        </form>
      )}

      {shelves.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : shelves.isError ? (
        <ErrorState onRetry={() => shelves.refetch()} />
      ) : shelves.data && shelves.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shelves.data.map((s) => (
            <article key={s.id} className="card overflow-hidden">
              <div className="h-2" style={{ backgroundColor: s.cover_color ?? '#315D91' }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  {editing?.id === s.id ? (
                    <form
                      className="flex flex-1 items-center gap-1"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (editing.name.trim()) rename.mutate(editing)
                      }}
                    >
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ id: s.id, name: e.target.value })}
                        aria-label={t('shelves.rename')}
                        maxLength={80}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-sm"
                      />
                      <button type="submit" aria-label={t('common.save')} className="rounded-lg p-1.5 text-primary hover:bg-line/60">
                        <Check size={17} />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} aria-label={t('common.cancel')} className="rounded-lg p-1.5 text-muted hover:bg-line/60">
                        <X size={17} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <h2 className="flex items-center gap-2 font-semibold">
                        <Layers size={17} className="text-gold" aria-hidden /> {s.name}
                      </h2>
                      <div className="flex">
                        <button onClick={() => setEditing({ id: s.id, name: s.name })} aria-label={t('shelves.rename')} className="rounded-lg p-1.5 text-muted hover:bg-line/60">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setToDelete(s)} aria-label={t('common.delete')} className="rounded-lg p-1.5 text-muted hover:bg-line/60 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {s.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>}
                <p className="mt-3 text-xs font-medium text-muted">{t('shelves.bookCount', { count: s.book_count })}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={t('shelves.emptyTitle')} description={t('shelves.emptyDesc')} icon={<Layers size={26} />} />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={t('shelves.deleteTitle')}
        description={t('shelves.deleteDesc')}
        confirmLabel={t('common.delete')}
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
      />
    </div>
  )
}
