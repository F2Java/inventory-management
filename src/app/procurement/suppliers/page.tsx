"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Building2, Mail, Phone, MapPin, FileText, Package, Trash2, Loader2 } from "lucide-react"
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


interface Supplier {
  id: string
  code: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  paymentTerms?: string
  isActive: boolean
  _count: { products: number; purchaseOrders: number }
}

export default function SuppliersPage() {
  const [search, setSearch] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { loadSuppliers() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete supplier "${name}"? This will also remove all linked product costs.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete")
      loadSuppliers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const loadSuppliers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/suppliers")
      const json = await res.json()
      if (json.data) setSuppliers(json.data)
    } catch (err) {
      console.error("Failed to load suppliers:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Suppliers</h3>
          <p className="text-sm text-gray-500 mt-1">Manage suppliers connected to purchase orders</p>
        </div>
        <Link href="/procurement/suppliers/new">
          <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Supplier</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Suppliers</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No suppliers found.{' '}
              <Link href="/procurement/suppliers/new" className="text-blue-500 hover:underline">Add your first supplier</Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead className="text-center">POs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <Link href={`/procurement/suppliers/${s.id}`} className="font-medium hover:text-blue-600">
                          {s.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {s.contactPerson && <span className="text-gray-700">{s.contactPerson}</span>}
                        {s.email && <span className="text-gray-400 text-xs">{s.email}</span>}
                        {s.phone && <span className="text-gray-400 text-xs">{s.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.paymentTerms || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{s._count.products}</TableCell>
                    <TableCell className="text-center">{s._count.purchaseOrders}</TableCell>
                    <TableCell>
                      <Badge variant="status" status={s.isActive ? "active" : "inactive"}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={deletingId === s.id}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete supplier"
                      >
                        {deletingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
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
