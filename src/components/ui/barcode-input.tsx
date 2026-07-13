"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Barcode, ScanLine } from "lucide-react"
import { Input } from "./input"

interface BarcodeInputProps {
  value: string
  onChange: (value: string) => void
  onBarcodeDetected?: (barcode: string) => void
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

const SCAN_THRESHOLD_MS = 50 // Barcode scanners send keys faster than 50ms apart

/**
 * BarcodeInput component that handles both:
 * 1. Manual text entry (typing a barcode)
 * 2. USB barcode scanner input (scanners send keystrokes rapidly ending with Enter)
 *
 * Detection logic: Uses a ref-based buffer to track inter-key timing.
 * If keys arrive faster than SCAN_THRESHOLD_MS, it's treated as scanner input.
 * The Enter key from the scanner triggers the final callback.
 */
export function BarcodeInput({
  value,
  onChange,
  onBarcodeDetected,
  placeholder = "Scan or type barcode...",
  autoFocus = false,
  disabled = false,
  className = "",
}: BarcodeInputProps) {
  const [isScanning, setIsScanning] = useState(false)
  const lastKeyTimeRef = useRef(0)
  const scanBufferRef = useRef("")
  const inputRef = useRef<HTMLInputElement>(null)

  const processScanBuffer = useCallback(
    (buffer: string) => {
      if (buffer.length >= 3) {
        setIsScanning(false)
        const scanned = buffer
        scanBufferRef.current = ""
        onChange(scanned)
        onBarcodeDetected?.(scanned)
      }
    },
    [onChange, onBarcodeDetected]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now()
      const timeSinceLastKey = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      if (e.key === "Enter") {
        // If Enter comes within threshold, it's from a barcode scanner
        if (timeSinceLastKey < SCAN_THRESHOLD_MS || scanBufferRef.current.length > 0) {
          e.preventDefault()
          processScanBuffer(scanBufferRef.current)
          return
        }
        // Manual Enter press — ignore (form submission handled elsewhere)
        return
      }

      // Single-character keys from scanner arrive faster than threshold
      if (e.key.length === 1 && timeSinceLastKey < SCAN_THRESHOLD_MS && timeSinceLastKey > 0) {
        if (!isScanning) setIsScanning(true)
        scanBufferRef.current += e.key
      } else if (e.key.length === 1) {
        // Slow keystroke — manual typing, reset
        scanBufferRef.current = ""
        setIsScanning(false)
      }
    },
    [processScanBuffer, isScanning]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If scanner buffer is actively accumulating (last key was fast), block onChange
    // to prevent the raw characters from appearing in the controlled input.
    // After a brief pause (>50ms since last key), the buffer is considered stale
    // and manual edits are allowed.
    const timeSinceLastKey = Date.now() - lastKeyTimeRef.current
    if (scanBufferRef.current.length > 0 && timeSinceLastKey < SCAN_THRESHOLD_MS) {
      return
    }
    // If there's a stale buffer but the user is editing manually, clear it
    if (scanBufferRef.current.length > 0) {
      scanBufferRef.current = ""
      setIsScanning(false)
    }
    onChange(e.target.value)
  }

  // Clear buffer when value changes externally (e.g., form reset)
  useEffect(() => {
    if (value === "") {
      scanBufferRef.current = ""
      setIsScanning(false)
    }
  }, [value])

  return (
    <div className={`relative ${className}`}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`pr-10 ${isScanning ? "border-blue-400 ring-2 ring-blue-100" : ""}`}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {isScanning ? (
          <ScanLine className="h-4 w-4 text-blue-500 animate-pulse" />
        ) : (
          <Barcode className="h-4 w-4 text-gray-400" />
        )}
      </div>
      {isScanning && (
        <div className="absolute -bottom-5 left-0 right-0">
          <p className="text-[10px] text-blue-500 font-medium">Scanner reading...</p>
        </div>
      )}
    </div>
  )
}
