'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const [barcode, setBarcode] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeyTimeRef = useRef<number>(Date.now())

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTimeRef.current
      lastKeyTimeRef.current = currentTime

      // A human typing is usually slower than 30ms per character
      // Scanners input characters very rapidly (< 30ms apart)
      if (timeDiff > 30) {
        setBarcode(e.key)
      } else {
        if (e.key === 'Enter') {
          if (barcode) {
            onScan(barcode)
            setBarcode('')
          }
        } else if (e.key !== 'Shift') {
          setBarcode((prev) => prev + e.key)
        }
      }

      // Reset the buffer if there's a long pause (e.g. 500ms)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setBarcode('')
      }, 500)
    },
    [barcode, onScan]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [handleKeyDown])

  return null
}
