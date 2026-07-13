"use client"

import { useState, useEffect } from "react"
import { BarChart3, Wallet, BookOpen, FileText, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

type ReportType = "income_statement" | "balance_sheet" | "general_ledger"

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("income_statement")
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [reportType])

  const loadReport = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/accounting/reports?type=${reportType}`)
      const json = await res.json()
      if (json.data) setData(json.data)
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Accounting Reports</h3>
          <p className="text-sm text-gray-500 mt-1">Income Statement, Balance Sheet & General Ledger</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {([
          { type: "income_statement", label: "Income Statement", icon: <BarChart3 className="h-4 w-4" /> },
          { type: "balance_sheet", label: "Balance Sheet", icon: <Wallet className="h-4 w-4" /> },
          { type: "general_ledger", label: "General Ledger", icon: <BookOpen className="h-4 w-4" /> },
        ] as const).map((r) => (
          <Button
            key={r.type}
            variant={reportType === r.type ? "default" : "outline"}
            size="sm"
            onClick={() => setReportType(r.type)}
            className="flex items-center gap-2"
          >
            {r.icon}
            {r.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
      ) : reportType === "income_statement" && data ? (
        <IncomeStatement data={data} />
      ) : reportType === "balance_sheet" && data ? (
        <BalanceSheet data={data} />
      ) : reportType === "general_ledger" && data ? (
        <GeneralLedger data={data} />
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Generate report data by creating transactions (sales, purchases, expenses, payroll)</p>
            <p className="text-sm mt-2">The report will auto-populate from journal entries</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function IncomeStatement({ data }: { data: any }) {
  const revenues = data?.revenues || []
  const expenses = data?.expenses || []
  const totalRevenue = revenues.reduce((s: number, r: any) => s + Number(r.balance || 0), 0)
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.balance || 0), 0)
  const netIncome = totalRevenue - totalExpenses

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Income Statement</CardTitle>
            <CardDescription>For the period ending {formatDate(new Date())}</CardDescription>
          </div>
          <Badge variant="outline"><BarChart3 className="h-3 w-3 mr-1" /> Pendapatan - Beban</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Revenue (Pendapatan)</h4>
            {revenues.length === 0 ? (
              <p className="text-sm text-gray-400">No revenue data</p>
            ) : (
              <div className="space-y-1">
                {revenues.map((r: any) => (
                  <div key={r.id} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{r.accountName} ({r.accountCode})</span>
                    <span className="font-medium">{formatCurrency(Number(r.balance))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2 mt-2">
              <span>Total Revenue</span>
              <span className="text-green-600">{formatCurrency(totalRevenue)}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Expenses (Beban)</h4>
            {expenses.length === 0 ? (
              <p className="text-sm text-gray-400">No expense data</p>
            ) : (
              <div className="space-y-1">
                {expenses.map((e: any) => (
                  <div key={e.id} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{e.accountName} ({e.accountCode})</span>
                    <span className="font-medium">{formatCurrency(Number(e.balance))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2 mt-2">
              <span>Total Expenses</span>
              <span className="text-red-600">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>

          <div className="border-t-2 border-gray-800 pt-3 mt-3">
            <div className="flex justify-between text-base font-bold">
              <span>Net {netIncome >= 0 ? "Income" : "Loss"}</span>
              <span className={netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                {formatCurrency(Math.abs(netIncome))}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BalanceSheet({ data }: { data: any }) {
  const assets = data?.assets || []
  const liabilities = data?.liabilities || []
  const equities = data?.equities || []
  const totalAssets = assets.reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
  const totalLiabilities = liabilities.reduce((s: number, l: any) => s + Number(l.balance || 0), 0)
  const totalEquities = equities.reduce((s: number, e: any) => s + Number(e.balance || 0), 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Balance Sheet</CardTitle>
            <CardDescription>As of {formatDate(new Date())}</CardDescription>
          </div>
          <Badge variant="outline"><Wallet className="h-3 w-3 mr-1" /> Aset = Kewajiban + Ekuitas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-blue-700 mb-2">Assets (Aset)</h4>
            {assets.map((a: any) => (
              <div key={a.id} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">{a.accountName}</span>
                <span className="font-medium">{formatCurrency(Number(a.balance))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
              <span>Total Assets</span>
              <span className="text-blue-600">{formatCurrency(totalAssets)}</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-orange-700 mb-2">Liabilities (Kewajiban)</h4>
            {liabilities.map((l: any) => (
              <div key={l.id} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">{l.accountName}</span>
                <span className="font-medium">{formatCurrency(Number(l.balance))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
              <span>Total Liabilities</span>
              <span className="text-orange-600">{formatCurrency(totalLiabilities)}</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-green-700 mb-2">Equity (Ekuitas)</h4>
            {equities.map((e: any) => (
              <div key={e.id} className="flex justify-between text-sm py-1">
                <span className="text-gray-600">{e.accountName}</span>
                <span className="font-medium">{formatCurrency(Number(e.balance))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2 mt-2">
              <span>Total Equity</span>
              <span className="text-green-600">{formatCurrency(totalEquities)}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Total Liabilities + Equity</span>
            <span className="font-semibold">{formatCurrency(totalLiabilities + totalEquities)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function GeneralLedger({ data }: { data: any }) {
  const entries = data?.entries || []
  return (
    <Card>
      <CardHeader>
        <CardTitle>General Ledger</CardTitle>
        <CardDescription>All journal entries sorted by date</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No journal entries yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Journal #</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">{formatDate(entry.journal?.date)}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.journal?.journalNumber}</TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-500">{entry.account?.accountCode}</span>
                    <span className="ml-2">{entry.account?.accountName}</span>
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{entry.description || entry.journal?.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(entry.debit) > 0 ? formatCurrency(Number(entry.debit)) : ""}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(entry.credit) > 0 ? formatCurrency(Number(entry.credit)) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
