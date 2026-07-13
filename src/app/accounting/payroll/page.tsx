"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, CheckCircle2, Loader2 } from "lucide-react"
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

interface Payroll {
  id: string
  payrollNumber: string
  periodStart: string
  periodEnd: string
  payType: string
  status: string
  totalGross: number
  totalDeductions: number
  totalAllowances: number
  totalNet: number
  postedToJournal: boolean
  journal?: { journalNumber: string }
  items: { id: string; employee: { name: string }; grossAmount: number; netAmount: number }[]
  createdAt: string
}

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => { loadPayrolls() }, [statusFilter])

  const loadPayrolls = async () => {
    setIsLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/payroll${params}`)
      const json = await res.json()
      if (json.data) setPayrolls(json.data)
    } catch (err) { console.error(err) }
    finally { setIsLoading(false) }
  }

  const handleAction = async (id: string, status: string) => {
    try {
      await fetch("/api/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, postToJournal: status === "APPROVED" }),
      })
      loadPayrolls()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Payroll</h3>
          <p className="text-sm text-gray-500 mt-1">Calculate and manage employee payroll</p>
        </div>
        <Link href="/accounting/payroll/new">
          <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Payroll</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">All Payrolls</CardTitle>
            {["", "DRAFT", "APPROVED", "PAID", "CANCELLED"].map((s) => (
              <Badge key={s} variant={statusFilter === s ? "default" : "outline"}
                className="cursor-pointer" onClick={() => setStatusFilter(s)}>
                {s || "All"}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No payrolls yet.{' '}
              <Link href="/accounting/payroll/new" className="text-blue-500 hover:underline">Create one</Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payroll #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.payrollNumber}</TableCell>
                    <TableCell className="text-sm">
                      {formatDate(p.periodStart)} — {formatDate(p.periodEnd)}
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.payType}</Badge></TableCell>
                    <TableCell>{p.items.length}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(p.totalGross))}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(p.totalNet))}</TableCell>
                    <TableCell>
                      {p.postedToJournal ? (
                        <Badge variant="status" status="active" className="text-xs">Posted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">—</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="status" status={
                        p.status === "DRAFT" ? "inactive" :
                        p.status === "APPROVED" ? "approved" :
                        p.status === "PAID" ? "delivered" : "cancelled"
                      }>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {p.status === "DRAFT" && (
                          <Button variant="ghost" size="sm" className="text-green-600"
                            onClick={() => handleAction(p.id, "APPROVED")}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                        )}
                        {p.status === "APPROVED" && (
                          <Button variant="ghost" size="sm" className="text-blue-600"
                            onClick={() => handleAction(p.id, "PAID")}>
                            Mark Paid
                          </Button>
                        )}
                      </div>
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
