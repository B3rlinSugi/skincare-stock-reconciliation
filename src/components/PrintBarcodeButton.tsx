'use client'

import { useState } from 'react'
import Barcode from 'react-barcode'

interface PrintBarcodeButtonProps {
  value: string
  label?: string
}

export default function PrintBarcodeButton({ value, label = 'Print Barcode' }: PrintBarcodeButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handlePrint = () => {
    const printContent = document.getElementById('barcode-print-area')
    if (!printContent) return

    const windowPrint = window.open('', '', 'width=800,height=600')
    if (windowPrint) {
      windowPrint.document.write(`
        <html>
          <head>
            <title>Print Barcode</title>
            <style>
              body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              @media print {
                @page { margin: 0; }
                body { margin: 1cm; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `)
      windowPrint.document.close()
      windowPrint.focus()
      windowPrint.print()
      windowPrint.close()
    }
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-secondary btn-sm">
        🖨️ {label}
      </button>

      {isOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' }}>
            <h2 className="text-xl font-semibold mb-4">Cetak Barcode</h2>
            
            <div id="barcode-print-area" className="flex justify-center mb-6 p-4 bg-white rounded-md">
              <Barcode value={value} width={2} height={80} displayValue={true} />
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => setIsOpen(false)} className="btn btn-secondary">
                Tutup
              </button>
              <button onClick={handlePrint} className="btn btn-primary">
                🖨️ Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
