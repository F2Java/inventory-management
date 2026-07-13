"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Wallet, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Account { id: string; accountCode: string; accountName: string }

const expenseCategories = [
  { label: "Operational", value: "OPERATIONAL" },
  { label: "Utilities", value: "UTILITIES" },
  { label: "Rent", value: "RENT" },
  { label: "Transportation", value: "TRANSPORTATION" },
  { label: "Marketing", value: "MARKETING" },
  { label: "Office Supplies", value: "OFFICE_SUPPLIES" },
  { label: "Petty Cash", value: "PETTY_CASH" },
  { label: "Maintenance", value: "MAINTENANCE" },
  { label: "Salary", value: "SALARY" },
  { label: "Tax", value: "TAX" },
  { label: "Other", value: "OTHER" },
]

export default function NewExpensePage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("OPERATIONAL")
  const [amount, setAmount] = useState("")
  const [taxAmount, setTaxAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [accountId, setAccountId] = useState("")
  const [isPettyCash, setIsPettyCash] = useState(false)
  const [autoPost, setAutoPost] = useState(true)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetch("/api/accounting/chart-of-accounts")
      .then((r) => r.json())
      .then((j) => { if (j.data) setAccounts(j.data) })
      .catch(console.error)
  }, [])

  const netAmount = (parseFloat(amount) || 0) - (parseFloat(taxAmount) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!description || !amount) { setError("Description and amount are required"); return }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, amount, taxAmount: taxAmount || "0", date, accountId: accountId || null, isPettyCash, notes, autoPost }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      router.push("/accounting/expenses")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/accounting/expenses" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></Link>
        <div><h3 className="text-lg font-medium text-gray-900">New Expense</h3><p className="text-sm text-gray-500 mt-1">Record an expense and optionally post to journal</p></div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">Expense Details</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
                <Input placeholder="e.g., Office electricity bill" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <Select options={expenseCategories} value={category} onChange={(e) => { setCategory(e.target.value); if (e.target.value === "PETTY_CASH") setIsPettyCash(true) }} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Amount (Gross) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                  <Input className="pl-10" type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tax Amount (PPN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                  <Input className="pl-10" type="number" placeholder="0" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Chart of Account</label>
                <Select
                  options={accounts
                    .filter((a) => a.accountCode.startsWith("5"))
                    .map((a) => ({ label: `${a.accountCode} - ${a.accountName}`, value: a.id }))}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="Select expense account"
                />
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={isPettyCash} onChange={(e) => setIsPettyCash(e.target.checked)} className="rounded" />
                  <Wallet className="h-4 w-4 text-orange-500" />
                  Petty Cash
                </label>
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} className="rounded" />
                  Auto-post to Journal
                </label>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Net Amount (after tax)</label>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(netAmount)}</p>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/accounting/expenses"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Expense {autoPost ? "+ Post to Journal" : ""}
          </Button>
        </div>
      </form>
    </div>
  )
}


