import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined, currency = "IDR"): string {
  const value = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0)
  if (currency === "IDR") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(d)
}

export function generateSKU(categoryCode: string, index: number): string {
  const prefix = categoryCode.toUpperCase().substring(0, 3)
  const year = new Date().getFullYear().toString().substring(2)
  const seq = String(index).padStart(5, "0")
  return `${prefix}${year}${seq}`
}

export function generatePONumber(): string {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, "0")
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `PO-${year}${month}-${random}`
}

export function generateEmployeeNumber(year: number, seq: number): string {
  return `EMP${year}${String(seq).padStart(4, "0")}`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    draft: "bg-gray-100 text-gray-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    packaging: "bg-orange-100 text-orange-800",
    received: "bg-green-100 text-green-800",
    present: "bg-green-100 text-green-800",
    late: "bg-yellow-100 text-yellow-800",
    absent: "bg-red-100 text-red-800",
    leave: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    unpaid: "bg-red-100 text-red-800",
    low_stock: "bg-red-100 text-red-800",
    out_of_stock: "bg-gray-100 text-gray-800",
    in_stock: "bg-green-100 text-green-800",
    over_stock: "bg-yellow-100 text-yellow-800",
  }
  return colors[status.toLowerCase()] ?? "bg-gray-100 text-gray-800"
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}


