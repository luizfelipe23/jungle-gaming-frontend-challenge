import type { InputHTMLAttributes } from 'react'

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function AuthField({ label, error, id, ...inputProps }: AuthFieldProps) {
  const inputId = id ?? inputProps.name
  const errorId = `${inputId}-error`

  return <div className="space-y-2">
    <label htmlFor={inputId} className="text-xs font-semibold text-[#F5F1EB]">{label}</label>
    <input
      {...inputProps}
      id={inputId}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className={`h-11 w-full rounded-md border bg-[#140D0A] px-3 text-sm text-[#F5F1EB] outline-none transition placeholder:text-[#8F7162] focus-visible:ring-2 focus-visible:ring-[#E89B55] ${error ? 'border-red-400' : 'border-[#55321F] focus:border-[#D28A4C]'}`}
    />
    {error && <p id={errorId} className="text-[11px] text-red-300">{error}</p>}
  </div>
}
