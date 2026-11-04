
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { getReaderBook, saveReaderProgress } from '@/services/reader'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lang } = useI18n()
  const queryClient = useQueryClient()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const savingRef = useRef(false)

  const [pdfReady, setPdfReady] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [error, setError] = useState('')

  const bookQuery = useQuery({
    queryKey: ['reader-book', bookId, user?.id],
    queryFn: () => getReaderBook(bookId!, user!.id),
    enabled: Boolean(bookId && user?.id),
  })

  useEffect(() => {
    let cancelled = false

    async function loadPdf() {
      if (!bookQuery.data) return

      try {
        setPdfReady(false)
        setError('')

        const task = getDocument(bookQuery.data.fileUrl)
        const pdf = await task.promise

        if (cancelled) {
          await pdf.destroy()
          return
        }

        pdfRef.current = pdf
        setTotalPages(pdf.numPages)

        const savedPage = bookQuery.data.progress.current_page ?? 1
        setPage(Math.min(Math.max(savedPage, 1), pdf.numPages))
        setPdfReady(true)
      } catch (e) {
        console.error(e)
        if (!cancelled) setError('تعذر فتح ملف PDF. تحقق من سلامة الملف وحاول مجددًا.')
      }
    }

    void loadPdf()

    return () => {
      cancelled = true
      const pdf = pdfRef.current
      pdfRef.current = null
      if (pdf) void pdf.destroy()
    }
  }, [bookQuery.data])

  useEffect(() => {
    let cancelled = false

    async function renderPage() {
      const pdf = pdfRef.current
      const canvas = canvasRef.current

      if (!pdf || !canvas || !pdfReady) return

      try {
        const pdfPage = await pdf.getPage(page)
        if (cancelled) return

        const viewport = pdfPage.getViewport({ scale })
        const context = canvas.getContext('2d')
        if (!context) return

        canvas.width = viewport.width
        canvas.height = viewport.height

        await pdfPage.render({
          canvasContext: context,
          viewport,
        }).promise
      } catch (e) {
        console.error(e)
        if (!cancelled) setError('تعذر عرض الصفحة.')
      }
    }

    void renderPage()
    return () => {
      cancelled = true
    }
  }, [page, scale, pdfReady])

  useEffect(() => {
    if (!pdfReady || !bookId || !user?.id || totalPages < 1) return

    const timeout = window.setTimeout(async () => {
      if (savingRef.current) return

      savingRef.current = true
      try {
        await saveReaderProgress(bookId, user.id, page, totalPages)
        await queryClient.invalidateQueries({ queryKey: ['books'] })
      } catch (e) {
        console.error('Progress save failed:', e)
      } finally {
        savingRef.current = false
      }
    }, 1000)

    return () => window.clearTimeout(timeout)
  }, [page, totalPages, pdfReady, bookId, user?.id, queryClient])

  const goBack = () => navigate(-1)

  if (bookQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin" />
        <span className="ms-3">جارٍ تحميل الكتاب...</span>
      </div>
    )
  }

  if (bookQuery.isError || !bookQuery.data) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-red-600">تعذر العثور على الكتاب أو الوصول إليه.</p>
        <button onClick={goBack} className="rounded-xl bg-primary px-5 py-2 text-white">
          العودة إلى المكتبة
        </button>
      </div>
    )
  }

  const book = bookQuery.data.book

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={goBack}
          className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
        >
          {lang === 'ar' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          العودة
        </button>

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate font-bold">{book.title}</h1>
          <p className="text-xs text-muted">{book.author}</p>
        </div>

        <BookOpen className="text-primary" />
      </header>

      <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-line bg-surface p-3">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-line p-2 disabled:opacity-40"
          aria-label="الصفحة السابقة"
        >
          <ChevronRight size={20} />
        </button>

        <span className="text-sm" dir="ltr">
          {page} / {totalPages || '...'}
        </span>

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-line p-2 disabled:opacity-40"
          aria-label="الصفحة التالية"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="mx-2 h-6 w-px bg-line" />

        <button
          onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
          className="rounded-lg border border-line p-2"
          aria-label="تصغير"
        >
          <ZoomOut size={19} />
        </button>

        <span className="text-xs" dir="ltr">{Math.round(scale * 100)}%</span>

        <button
          onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
          className="rounded-lg border border-line p-2"
          aria-label="تكبير"
        >
          <ZoomIn size={19} />
        </button>
      </div>

      <div className="flex justify-center overflow-auto rounded-xl bg-gray-200 p-3 dark:bg-gray-800">
        {!pdfReady && !error && (
          <div className="flex items-center gap-2 py-20">
            <Loader2 className="animate-spin" />
            جارٍ تجهيز صفحات الكتاب...
          </div>
        )}

        {error ? (
          <p className="py-20 text-center text-red-600">{error}</p>
        ) : (
          <canvas
            ref={canvasRef}
            className="max-w-full bg-white shadow-xl"
          />
        )}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{
            width: `${totalPages ? (page / totalPages) * 100 : 0}%`,
          }}
        />
      </div>

      <p className="text-center text-xs text-muted">
        يتم حفظ تقدم القراءة تلقائيًا
      </p>
    </div>
  )
}
