"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Building2, Globe, Plug, Package, AlertTriangle, ShoppingCart, Loader2 } from "lucide-react"
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
import { formatCurrency, formatDate } from "@/lib/utils"

interface StockItem {
  stockId: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  reservedQty: number
  available: number
  unit: string
  sellPrice: number
  warehouseName: string
}

interface BranchData {
  id: string
  code: string
  name: string
  address?: string
  phone?: string
  email?: string
  stockSummary: StockItem[]
  ecommerceConnector?: { platform: string; storeName?: string; isActive: boolean; lastSyncAt?: string }
  warehouses: { id: string; code: string; name: string; type: string; stockCount: number }[]
  _count: { sales: number }
}

export default function BranchDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [branch, setBranch] = useState<BranchData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/branches/${id}`)
      .then((r) => r.json())
      .then((j) => { if (j.data) setBranch(j.data) })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
  if (!branch) return <div className="text-center py-20 text-gray-500">Branch not found</div>

  const totalStock = branch.stockSummary.reduce((s, i) => s + i.quantity, 0)
  const lowStock = branch.stockSummary.filter((i) => i.available <= 5 && i.available > 0).length
  const outOfStock = branch.stockSummary.filter((i) => i.quantity === 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/branches" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-medium text-gray-900">{branch.name}</h3>
            <Badge variant="outline">{branch.code}</Badge>
            {branch.ecommerceConnector && (
              <Badge variant="status" status={branch.ecommerceConnector.isActive ? "active" : "inactive"}>
                <Plug className="h-3 w-3 mr-1" />
                {branch.ecommerceConnector.platform}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {branch.address || "No address"} — Stock: {totalStock} units across {branch.warehouses.length} warehouse(s)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Total Stock</p><p className="text-xl font-bold mt-1">{totalStock}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Products</p><p className="text-xl font-bold mt-1">{branch.stockSummary.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Low Stock</p><p className="text-xl font-bold mt-1 text-orange-600">{lowStock}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Out of Stock</p><p className="text-xl font-bold mt-1 text-red-600">{outOfStock}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Warehouses</p><p className="text-xl font-bold mt-1">{branch.warehouses.length}</p></CardContent></Card>
      </div>

      {/* Connected Warehouses */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-500" /> Connected Warehouses</CardTitle></CardHeader>
        <CardContent>
          {branch.warehouses.length === 0 ? (
            <p className="text-sm text-gray-400">No warehouses linked to this branch</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {branch.warehouses.map((wh) => (
                <div key={wh.id} className="p-3 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium">{wh.name}</p>
                  <p className="text-xs text-gray-500">{wh.code} — {wh.type}</p>
                  <p className="text-xs text-gray-400 mt-1">{wh.stockCount} products</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* E-Commerce Connector */}
      {branch.ecommerceConnector && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /> E-Commerce Sync</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{branch.ecommerceConnector.platform}</p>
                  {branch.ecommerceConnector.storeName && (
                    <p className="text-xs text-gray-500">{branch.ecommerceConnector.storeName}</p>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Last Sync: {branch.ecommerceConnector.lastSyncAt ? formatDate(branch.ecommerceConnector.lastSyncAt) : "Never"}</p>
                <Badge variant="status" status={branch.ecommerceConnector.isActive ? "active" : "inactive"}>
                  {branch.ecommerceConnector.isActive ? "Auto-sync enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock On Hand */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-blue-500" /> Stock on Hand</CardTitle>
            <span className="text-xs text-gray-400">Stock auto-updates from linked warehouse — synced to e-commerce</span>
          </div>
        </CardHeader>
        <CardContent>
          {branch.stockSummary.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No stock data available for this branch</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branch.stockSummary.map((item) => (
                  <TableRow key={item.stockId}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-xs font-mono">{item.productSku}</TableCell>
                    <TableCell className="text-sm">{item.warehouseName}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.reservedQty}</TableCell>
                    <TableCell className="text-right font-medium">{item.available}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.sellPrice)}</TableCell>
                    <TableCell>
                      {item.quantity === 0 ? (
                        <Badge variant="status" status="out_of_stock">Out</Badge>
                      ) : item.available <= 5 ? (
                        <Badge variant="status" status="low_stock">Low</Badge>
                      ) : (
                        <Badge variant="status" status="in_stock">OK</Badge>
                      )}
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
