import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

/** Class component on purpose: error boundaries cannot be hooks. Uses no i18n context so it can never fail itself. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold">Une erreur s'est produite · حدث خطأ</h1>
        <button
          className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white"
          onClick={() => window.location.reload()}
        >
          Recharger · إعادة التحميل
        </button>
      </div>
    )
  }
}
