'use client'

import { ReactNode } from 'react'

interface ClientButtonProps {
  children: ReactNode
  className?: string
  message?: string
}

export function ClientButton({ children, className = "btn btn-primary btn-sm", message = "Fitur ini akan diimplementasikan pada fase pengembangan berikutnya." }: ClientButtonProps) {
  return (
    <button 
      className={className}
      onClick={() => alert(message)}
    >
      {children}
    </button>
  )
}
