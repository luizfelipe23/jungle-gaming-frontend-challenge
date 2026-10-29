import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function AuthField({ label, error, id, ...inputProps }: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = inputProps.type === 'password'
  const inputId = id ?? inputProps.name
  const errorId = `${inputId}-error`

  return <div className="space-y-0 lg:space-y-2">
    <label htmlFor={inputId} className="hidden text-xs font-semibold text-[#F5F1EB] lg:block">{label}</label>
    <div className="relative">
      <input {...inputProps} id={inputId} type={isPassword && showPassword ? 'text' : inputProps.type} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={`h-[50px] w-full rounded-[12px] border bg-[#140D0A] px-3 text-center text-sm text-[#F5F1EB] outline-none transition placeholder:text-[#B39463] focus-visible:ring-2 focus-visible:ring-[#E89B55] lg:h-11 lg:rounded-md lg:text-left lg:placeholder:text-[#8F7162] ${isPassword ? 'pr-10' : ''} ${error ? 'border-red-400' : 'border-[#3F2319] focus:border-[#D28A4C]'}`} />
      {isPassword && <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B39463]"><span className="hidden lg:inline">{showPassword ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4"/>}</span><span className="lg:hidden">{showPassword ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4"/>}</span></button>}
    </div>
    {error && <p id={errorId} className="text-[11px] text-red-300">{error}</p>}
  </div>
}
