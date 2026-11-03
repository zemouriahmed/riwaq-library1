
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Loader2, Plus, UploadCloud, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { useI18n } from '@/contexts/I18nContext'
import { useToast } from '@/contexts/ToastContext'
import { createCategory, listCategories, uploadBook } from '@/services/books'
import type { Category } from '@/types'

interface Props {
  open: boolean
  userId: string
  onClose: () => void
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as {
      message?: string
      details?: string
      hint?: string
      code?: string
    }

    return [
      e.message,
      e.details,
      e.hint,
      e.code ? `Code: ${e.code}` : '',
    ].filter(Boolean).join(' | ')
  }

  return String(error)
}

export default function AddBookDialog({ open, userId, onClose }: Props) {
  const { t } = useI18n()
  const toast = useToast()
  const qc = useQueryClient()

  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stage, setStage] = useState<'uploading' | 'saving'>('uploading')

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('ar')
  const [publicationDate, setPublicationDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [createNewCategory, setCreateNewCategory] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)

  useEffect(() => {
    if (!open) return

    setLoadingCategories(true)

    listCategories()
      .then(setCategories)
      .catch((error) => {
        console.error('RIWAQ CATEGORY LOAD ERROR:', error)
        toast.error(t('upload.categoryLoadError'))
      })
      .finally(() => setLoadingCategories(false))
  }, [open, t, toast])

  if (!open) return null

  function resetForm() {
    setTitle('')
    setAuthor('')
    setDescription('')
    setLanguage('ar')
    setPublicationDate('')
    setCategoryId('')
    setNewCategory('')
    setCreateNewCategory(false)
    setFile(null)
    setCover(null)

    if (fileRef.current) fileRef.current.value = ''
    if (coverRef.current) coverRef.current.value = ''
  }

  function close() {
    if (saving) return
    resetForm()
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!userId) {
      toast.error('لم يتم التعرف على حساب المستخدم. يرجى تسجيل الدخول مجدداً.')
      return
    }

    if (!file) {
      toast.error(t('upload.fileRequired'))
      return
    }

    if (!title.trim()) {
      toast.error(t('upload.titleRequired'))
      return
    }

    setSaving(true)
    setStage('uploading')

    try {
      let selectedCategory = categoryId || null

      if (createNewCategory && newCategory.trim()) {
        const category = await createCategory(userId, newCategory.trim())
        selectedCategory = category.id
      }

      await uploadBook(
        {
          userId,
          title: title.trim(),
          author: author.trim(),
          description: description.trim(),
          language,
          publicationDate,
          categoryId: selectedCategory,
          file,
          cover,
        },
        setStage,
      )

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['stats'] }),
        qc.invalidateQueries({ queryKey: ['books'] }),
      ])

      toast.success(t('upload.success'))
      resetForm()
      onClose()
    } catch (error) {
      console.error('RIWAQ BOOK UPLOAD ERROR:', error)

      const message = getErrorMessage(error)

      console.error('RIWAQ ERROR DETAILS:', message)

      toast.error(message || t('upload.failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-book-title"
        className="my-auto w-full max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 id="add-book-title" className="text-xl font-bold">
              {t('upload.title')}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t('upload.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            disabled={saving}
            aria-label={t('common.cancel')}
            className="rounded-lg p-2 text-muted hover:bg-line disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label={t('upload.bookTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={500}
            placeholder={t('upload.bookTitlePlaceholder')}
          />

          <Field
            label={t('upload.author')}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={300}
            placeholder={t('upload.authorPlaceholder')}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              {t('upload.description')}
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={t('upload.descriptionPlaceholder')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                {t('upload.language')}
              </label>

              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
              >
                <option value="ar">{t('common.arabic')}</option>
                <option value="fr">{t('common.french')}</option>
                <option value="en">English</option>
                <option value="other">{t('upload.other')}</option>
              </select>
            </div>

            <Field
              label={t('upload.publicationDate')}
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              {t('upload.category')}
            </label>

            {!createNewCategory ? (
              <div className="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={loadingCategories}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
                >
                  <option value="">{t('upload.noCategory')}</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setCreateNewCategory(true)}
                >
                  <Plus size={16} />
                  {t('upload.newCategory')}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  maxLength={80}
                  placeholder={t('upload.categoryName')}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateNewCategory(false)
                    setNewCategory('')
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                {t('upload.bookFile')}
              </label>

              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.epub,application/pdf,application/epub+zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary"
              />

              <p className="text-xs text-muted">
                {t('upload.fileHint')}
              </p>

              {file && (
                <p className="break-all text-xs text-primary">
                  {file.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                {t('upload.cover')}
              </label>

              <input
                ref={coverRef}
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-muted file:me-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary"
              />

              <p className="text-xs text-muted">
                {t('upload.coverHint')}
              </p>

              {cover && (
                <p className="break-all text-xs text-primary">
                  {cover.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={saving}
            >
              {t('common.cancel')}
            </Button>

            <Button type="submit" variant="gold" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t(stage === 'uploading' ? 'upload.uploading' : 'upload.saving')}
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  {t('upload.submit')}
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
