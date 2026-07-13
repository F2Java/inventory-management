"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Building2, Globe, Plug, Package, AlertTriangle, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface Branch {
  id: string
  code: string
  name: string
  address?: string
  isActive: boolean
  warehouses: { id: string; name: string; type: string; productCount: number }[]
  ecommerceConnector?: { platform: string; isActive: boolean; lastSyncAt?: string }
  totalStock: number
  lowStockItems: number
  salesCount: number
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete branch "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/branches?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete")
      setBranches((prev) => prev.filter((b) => b.id !== id))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((j) => { if (j.data) setBranches(j.data) })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Branches</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage branches with linked warehouses — stock auto-syncs to e-commerce platforms
          </p>
        </div>
        <Link href="/branches/new">
          <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Branch</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400">
              No branches yet.{' '}
              <Link href="/branches/new" className="text-blue-500 hover:underline">Add your first branch</Link>
            </div>
          ) : (
            branches.map((branch) => (
              <div key={branch.id} className="relative group">
                <button
                  onClick={() => handleDelete(branch.id, branch.name)}
                  disabled={deletingId === branch.id}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all shadow-sm"
                  title="Delete branch"
                >
                  {deletingId === branch.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
                <Link href={`/branches/${branch.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="outline">{branch.code}</Badge>
                        {branch.ecommerceConnector && branch.ecommerceConnector.isActive && (
                          <Badge variant="status" status="active"><Plug className="h-3 w-3" /></Badge>
                        )}
                      </div>
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 mb-1">{branch.name}</h4>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-1">{branch.address || "No address"}</p>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">{branch.totalStock}</p>
                        <p className="text-[10px] text-gray-500">Stock</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-orange-600">{branch.lowStockItems}</p>
                        <p className="text-[10px] text-gray-500">Low</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">{branch.salesCount}</p>
                        <p className="text-[10px] text-gray-500">Sales</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {branch.warehouses.map((wh) => (
                        <Badge key={wh.id} variant="outline" className="text-[10px]">
                          <Package className="h-3 w-3 mr-1" />
                          {wh.name}
                        </Badge>
                      ))}
                      {branch.ecommerceConnector && (
                        <Badge variant="outline" className="text-[10px]">
                          <Globe className="h-3 w-3 mr-1" />
                          {branch.ecommerceConnector.platform}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
