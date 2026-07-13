"use client"

import { useState, useEffect } from "react"
import { Plus, Search, FolderTree, Loader2 } from "lucide-react"
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
import { formatCurrency } from "@/lib/utils"

interface Account {
  id: string
  accountCode: string
  accountName: string
  description?: string
  isActive: boolean
  balance: number
  category?: { name: string; accountType?: { name: string } }
  _count: { journalEntries: number }
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/accounting/chart-of-accounts")
        const json = await res.json()
        if (json.data) setAccounts(json.data)
        else throw new Error(json.error || "Failed to load")
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = accounts.filter((a) => {
    const matchesSearch =
      !search ||
      a.accountName.toLowerCase().includes(search.toLowerCase()) ||
      a.accountCode.toLowerCase().includes(search.toLowerCase())
    const matchesType =
      typeFilter === "All" ||
      a.category?.accountType?.name === typeFilter
    return matchesSearch && matchesType && a.isActive
  })

  const typeNames = [...new Set(accounts.map((a) => a.category?.accountType?.name).filter(Boolean))] as string[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Chart of Accounts</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "Loading..." : `${filtered.length} active accounts`}
          </p>
        </div>
        <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Account</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-base">All Accounts</CardTitle>
              <div className="flex gap-2">
                {["All", ...typeNames].map((t) => (
                  <Badge
                    key={t}
                    variant={typeFilter === t ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setTypeFilter(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {search ? "No accounts match your search." : "No accounts found. Add accounts via the chart of accounts setup."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono text-xs">{acc.accountCode}</TableCell>
                    <TableCell className="font-medium">{acc.accountName}</TableCell>
                    <TableCell>
                      <Badge variant="status" status={
                        acc.category?.accountType?.name === "Aset" ? "active" :
                        acc.category?.accountType?.name === "Kewajiban" ? "pending" :
                        acc.category?.accountType?.name === "Ekuitas" ? "active" :
                        acc.category?.accountType?.name === "Pendapatan" ? "active" : "inactive"
                      }>
                        {acc.category?.accountType?.name || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{acc.category?.name || "—"}</TableCell>
                    <TableCell className="text-right text-sm text-gray-500">{acc._count.journalEntries}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(acc.balance) < 0 ? "text-red-600" : ""}`}>
                      {formatCurrency(Number(acc.balance))}
                    </TableCell>
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
