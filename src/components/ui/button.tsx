import * as React from 'react'

import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E89B55] disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-[#D28A4C] text-[#140D0A] hover:bg-[#E89B55]',
        variant === 'outline' && 'border border-[#D28A4C]/70 bg-transparent text-[#F5F1EB] hover:bg-[#241612]',
        variant === 'ghost' && 'bg-transparent text-[#F5F1EB] hover:bg-white/5',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'lg' && 'h-11 px-5 text-base',
        size === 'default' && 'h-10 px-4',
        className,
      )}
      {...props}
    />
  )
}
