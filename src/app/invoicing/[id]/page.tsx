"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileText, Loader2, CheckCircle2, AlertCircle, Plus, Banknote, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"

interface InvoiceDetail {
  id: string
  invoiceNumber: string
  customer: { companyName: string; contactPerson: string; email: string; phone: string | null } | null
  order: {
    orderNumber: string
    items: { product: { name: string; sku: string; unit: string }; quantity: number; unitPrice: number; totalPrice: number }[]
  } | null
  payments: {
    id: string
    paymentNumber: string
    amount: number
    paymentDate: string
    paymentMethod: string
    referenceNumber: string | null
    bankName: string | null
    notes: string | null
    postedToJournal: boolean
  }[]
  journal: {
    journalNumber: string
    postedAt: string
    entries: { account: { accountCode: string; accountName: string }; debit: number; credit: number; description: string | null }[]
  } | null
  invoiceDate: string
  dueDate: string
  status: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  shippingCost: number
  totalAmount: number
  amountPaid: number
  balanceDue: number
  notes: string | null
  terms: string | null
  postedToJournal: boolean
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Payment recording
  const [showPayment, setShowPayment] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0])
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER")
  const [payRef, setPayRef] = useState("")
  const [payBank, setPayBank] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [payError, setPayError] = useState("")
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [paySuccess, setPaySuccess] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/invoicing/invoices/${params.id}`)
        const json = await res.json()
        if (json.data) setInvoice(json.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const handlePostJournal = async () => {
    try {
      const res = await fetch(`/api/invoicing/invoices/${params.id}/journal`, { method: "POST" })
      const json = await res.json()
      if (json.success || json.message) {
        // Reload
        const reload = await fetch(`/api/invoicing/invoices/${params.id}`)
        const reloadJson = await reload.json()
        if (reloadJson.data) setInvoice(reloadJson.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleRecordPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) { setPayError("Valid amount required"); return }
    setPaySubmitting(true)
    setPayError("")
    try {
      const res = await fetch(`/api/invoicing/invoices/${params.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: payAmount,
          paymentDate: payDate,
          paymentMethod: payMethod,
          referenceNumber: payRef || undefined,
          bankName: payBank || undefined,
          notes: payNotes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setPaySuccess(true)
      // Reload
      const reload = await fetch(`/api/invoicing/invoices/${params.id}`)
      const reloadJson = await reload.json()
      if (reloadJson.data) setInvoice(reloadJson.data)
    } catch (err: any) {
      setPayError(err.message)
    } finally {
      setPaySubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
  if (!invoice) return <div className="text-center py-20 text-gray-500">Invoice not found</div>

  const isOverdue = invoice.status === "OVERDUE" || (invoice.status === "PENDING" && new Date(invoice.dueDate) < new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/invoicing")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900">Invoice {invoice.invoiceNumber}</h3>
              <Badge variant="status" status={isOverdue ? "overdue" : invoice.status === "PAID" ? "paid" : invoice.status === "PARTIAL" ? "default" : "pending"}>
                {invoice.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">{invoice.customer?.companyName || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!invoice.postedToJournal && invoice.status !== "CANCELLED" && (
            <Button variant="outline" size="sm" onClick={handlePostJournal} className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Post Journal
            </Button>
          )}
          {invoice.balanceDue > 0 && (invoice.status === "PENDING" || invoice.status === "PARTIAL") && !showPayment && (
            <Button size="sm" onClick={() => setShowPayment(true)} className="flex items-center gap-2">
              <Banknote className="h-4 w-4" /> Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-gray-500">Invoice Date</p>
                  <p className="text-sm font-medium">{formatDate(invoice.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : ""}`}>{formatDate(invoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-medium">{invoice.customer?.companyName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contact</p>
                  <p className="text-sm">{invoice.customer?.contactPerson || "—"}</p>
                  <p className="text-xs text-gray-400">{invoice.customer?.email}</p>
                </div>
              </div>
              {invoice.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          {invoice.order && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Items — {invoice.order.orderNumber}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.order.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell className="text-xs font-mono">{item.product.sku}</TableCell>
                        <TableCell className="text-right">{item.quantity} {item.product.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payments ({invoice.payments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-gray-400">No payments recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium">{p.paymentNumber}</p>
                        <p className="text-xs text-gray-500">{formatDate(p.paymentDate)} · {p.paymentMethod}{p.referenceNumber ? ` · Ref: ${p.referenceNumber}` : ""}</p>
                        {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-gray-400">{p.postedToJournal ? "Journaled" : "Pending journal"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Record Payment Form */}
              {showPayment && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Record Payment</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Amount *</label>
                      <Input type="number" min={0} step={1000} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Payment Date</label>
                      <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Method</label>
                      <Select
                        options={[
                          { label: "Bank Transfer", value: "BANK_TRANSFER" },
                          { label: "Cash", value: "CASH" },
                          { label: "Card", value: "CARD" },
                          { label: "Giro", value: "GIRO" },
                          { label: "Other", value: "OTHER" },
                        ]}
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Bank Name</label>
                      <Input value={payBank} onChange={(e) => setPayBank(e.target.value)} placeholder="BCA / Mandiri" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Reference Number</label>
                      <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Transaction ID" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">Notes</label>
                      <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                  {payError && <div className="text-sm text-red-600">{payError}</div>}
                  {paySuccess && <div className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Payment recorded!</div>}
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowPayment(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleRecordPayment} disabled={paySubmitting}>
                      {paySubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Banknote className="h-4 w-4 mr-1" />}
                      Record Payment
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right - Summary */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Invoice Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-red-600">-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax (PPN)</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
                {invoice.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span>{formatCurrency(invoice.shippingCost)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span>
                  <span>{formatCurrency(invoice.amountPaid)}</span>
                </div>
                <div className="border-t-2 border-gray-800 pt-3 flex justify-between font-bold text-lg">
                  <span>Balance Due</span>
                  <span className={invoice.balanceDue > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(invoice.balanceDue)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Journal Info */}
          {invoice.journal && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Journal Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-2">
                  {invoice.journal.journalNumber} · {formatDate(invoice.journal.postedAt)}
                </p>
                <div className="space-y-1">
                  {invoice.journal.entries.map((e, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600 text-xs">{e.account.accountCode} {e.account.accountName}</span>
                      <span className="font-mono text-xs">
                        {e.debit > 0 ? `Dr ${formatCurrency(e.debit)}` : `Cr ${formatCurrency(e.credit)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
