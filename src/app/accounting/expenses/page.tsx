"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Wallet, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface Expense {
  id: string
  expenseNumber: string
  description: string
  category: string
  amount: number
  taxAmount: number
  netAmount: number
  date: string
  isPettyCash: boolean
  isPosted: boolean
  account?: { accountCode: string; accountName: string }
  journal?: { journalNumber: string; postedAt: string }
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showPettyCash, setShowPettyCash] = useState<boolean | null>(null)

  useEffect(() => { loadExpenses() }, [showPettyCash])

  const loadExpenses = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (showPettyCash !== null) params.set("pettyCash", String(showPettyCash))
      const res = await fetch(`/api/expenses?${params}`)
      const json = await res.json()
      if (json.data) setExpenses(json.data)
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = expenses.filter((e) =>
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.expenseNumber.toLowerCase().includes(search.toLowerCase())
  )

  const pettyCashTotal = expenses.filter((e) => e.isPettyCash).reduce((s, e) => s + Number(e.netAmount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Expenses</h3>
          <p className="text-sm text-gray-500 mt-1">Track expenses, petty cash, and auto-post to journals</p>
        </div>
        <Link href="/accounting/expenses/new">
          <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Expense</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Expenses</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(expenses.reduce((s, e) => s + Number(e.amount), 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Net Amount</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(expenses.reduce((s, e) => s + Number(e.netAmount), 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Petty Cash</p>
            <p className="text-xl font-bold mt-1 text-orange-600">{formatCurrency(pettyCashTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Posted to Journal</p>
            <p className="text-xl font-bold mt-1 text-green-600">{expenses.filter((e) => e.isPosted).length}/{expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">All Expenses</CardTitle>
              {[null, true, false].map((v) => (
                <Badge
                  key={String(v)}
                  variant={showPettyCash === v ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setShowPettyCash(v)}
                >
                  {v === null ? "All" : v ? "Petty Cash" : "Regular"}
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No expenses yet.{' '}
              <Link href="/accounting/expenses/new" className="text-blue-500 hover:underline">Add your first expense</Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.expenseNumber}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{e.description}</TableCell>
                    <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(e.amount))}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(e.netAmount))}</TableCell>
                    <TableCell>
                      {e.isPettyCash ? (
                        <Badge variant="status" status="pending"><Wallet className="h-3 w-3 mr-1" /> Petty Cash</Badge>
                      ) : (
                        <Badge variant="outline">Regular</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.journal ? (
                        <Badge variant="status" status="active" className="font-mono text-xs">{e.journal.journalNumber}</Badge>
                      ) : (
                        <Badge variant="status" status="inactive">Unposted</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
