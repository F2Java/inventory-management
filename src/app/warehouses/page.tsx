"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Building2, MapPin, Package, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Warehouse {
  id: string
  code: string
  name: string
  type: string
  address?: string
  isActive: boolean
  _count: { stock: number }
  branches: { branch: { id: string; name: string } }[]
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { loadWarehouses() }, [])

  const loadWarehouses = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/warehouses")
      const json = await res.json()
      if (json.data) setWarehouses(json.data)
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete warehouse "${name}"? This action cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/warehouses?id=${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete")
      loadWarehouses()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Warehouses</h3>
          <p className="text-sm text-gray-500 mt-1">Manage your warehouse locations</p>
        </div>
        <Link href="/warehouses/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Warehouse
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No warehouses yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => (
            <Card key={wh.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="status" status={wh.isActive ? "active" : "inactive"}>
                      {wh.type}
                    </Badge>
                    <button
                      onClick={() => handleDelete(wh.id, wh.name)}
                      disabled={deletingId === wh.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Delete warehouse"
                    >
                      {deletingId === wh.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <h4 className="text-base font-semibold text-gray-900 mb-1">{wh.name}</h4>
                <p className="text-xs font-mono text-gray-500 mb-3">{wh.code}</p>
                {wh.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{wh.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Package className="h-4 w-4" />
                  <span>{wh._count.stock} products</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wh.branches.map((wb) => (
                    <Badge key={wb.branch.id} variant="outline">{wb.branch.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
