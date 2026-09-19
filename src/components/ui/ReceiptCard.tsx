import React from 'react'

interface ReceiptCardProps {
  label: string
  meta?: string
  children: React.ReactNode
  className?: string
}

/**
 * Wraps a primary writing surface (journal entry, idea, note) in a
 * receipt/slip-styled card: torn top & bottom edges, a stamped label,
 * and a dashed tear-line under the header. Purely a visual wrapper —
 * carries no state of its own.
 */
export default function ReceiptCard({ label, meta, children, className = '' }: ReceiptCardProps) {
  return (
    <div className={`jw-receipt ${className}`}>
      <div className="jw-receipt-head">
        <span className="jw-receipt-label">{label}</span>
        {meta && <span className="jw-receipt-meta">{meta}</span>}
      </div>
      {children}
    </div>
  )
}
