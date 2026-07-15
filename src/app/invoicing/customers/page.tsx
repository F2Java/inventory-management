"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, CheckCircle2, XCircle, Users, Plus, ArrowUpRight } from "lucide-react"
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
import { formatCurrency, formatDateShort } from "@/lib/utils"

interface B2BCustomer {
  id: string
  code: string
  companyName: string
  contactPerson: string
  email: string
  phone: string | null
  taxId: string | null
  paymentTerms: string
  creditLimit: number
  currentBalance: number
  status: string
  orderCount: number
  invoiceCount: number
  createdAt: string
}

export default function B2BCustomersPage() {
  const [customers, setCustomers] = useState<B2BCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/b2b/customers?${params.toString()}`)
      const json = await res.json()
      if (json.data) setCustomers(json.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [search, statusFilter])

  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/b2b/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSuspend = async (id: string) => {
    try {
      await fetch(`/api/b2b/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUSPENDED" }),
      })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">B2B Customers</h3>
          <p className="text-sm text-gray-500 mt-1">{loading ? "Loading..." : `${customers.length} registered customers`}</p>
        </div>
        <Button size="sm" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Customer</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {["", "ACTIVE", "PENDING", "SUSPENDED"].map((s) => (
                <Badge
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter(s)}
                >
                  {s || "All"}
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-medium text-gray-500">No B2B customers yet</p>
              <p className="text-sm mt-1">Customers can register via the B2B portal or you can add them manually</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead className="text-right">Credit Limit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.companyName}</TableCell>
                    <TableCell className="text-sm">{c.contactPerson}</TableCell>
                    <TableCell className="text-sm text-gray-500">{c.email}</TableCell>
                    <TableCell className="text-xs font-mono">{c.paymentTerms}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.creditLimit)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.currentBalance)}</TableCell>
                    <TableCell>
                      <Badge variant="status" status={c.status === "ACTIVE" ? "active" : c.status === "PENDING" ? "pending" : "inactive"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.orderCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === "PENDING" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleApprove(c.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        )}
                        {c.status === "ACTIVE" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => handleSuspend(c.id)}>
                            <XCircle className="h-3 w-3 mr-1" /> Suspend
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
