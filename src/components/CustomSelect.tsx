'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: boolean
  required?: boolean
}

export function CustomSelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = '-- Pilih --',
  error,
  required
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Hidden input for native form submission */}
      <input type="hidden" id={id} name={name} value={value} required={required} />
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`form-input w-full flex items-center justify-between text-left ${error ? 'border-danger' : ''}`}
        style={{ 
          background: 'rgba(0, 0, 0, 0.2)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)'
        }}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} style={{ opacity: 0.5 }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px var(--accent-primary-glow)',
            maxHeight: 300,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div className="overflow-y-auto w-full custom-scrollbar">
            {/* Empty Option */}
            <div
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className="px-4 py-3 cursor-pointer transition-colors flex items-center justify-between"
              style={{
                background: value === '' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                color: value === '' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <span>{placeholder}</span>
              {value === '' && <Check size={16} className="text-primary" style={{ color: 'var(--accent-primary)' }} />}
            </div>

            {/* Real Options */}
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className="px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 flex items-center justify-between"
                style={{
                  background: value === opt.value ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                  color: value === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <span className="truncate pr-4">{opt.label}</span>
                {value === opt.value && <Check size={16} className="text-primary" style={{ color: 'var(--accent-primary)' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
