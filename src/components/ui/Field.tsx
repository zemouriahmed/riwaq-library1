import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const auto = useId()
    const inputId = id ?? auto
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-err` : undefined}
          className={cn(
            'h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted',
            'transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            error && 'border-red-500',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-err`} className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    )
  },
)
Field.displayName = 'Field'
