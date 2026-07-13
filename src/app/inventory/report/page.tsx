"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Download, Loader2, ArrowLeft, FileText, DollarSign, Printer, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
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

interface DualUom {
  fullUnits: number
  remainder: number
  altAbbr: string
  baseAbbr: string
  altName: string
  baseName: string
}

interface ReportItem {
  id: string
  productId: string
  productName: string
  sku: string
  unit: string
  category: string
  warehouseName: string
  warehouseCode: string
  quantity: number
  reservedQty: number
  availableQty: number
  costPerUnit: number
  sellPerUnit: number
  totalValue: number
  dualUom?: DualUom | null
}

interface ReportSummary {
  totalItems: number
  totalUnits: number
  totalInventoryValue: number
}

export default function InventoryReportPage() {
  const [data, setData] = useState<ReportItem[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [warehouseFilter, setWarehouseFilter] = useState("")
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([])

  useEffect(() => { loadReport() }, [warehouseFilter])

  const loadReport = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (warehouseFilter) params.set("warehouseId", warehouseFilter)

      const [reportRes, whRes] = await Promise.all([
        fetch(`/api/inventory/report?${params}`),
        fetch("/api/warehouses")
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .catch(() => ({ data: [] })),
      ])

      const reportJson = await reportRes.json()
      const whJson = await whRes

      if (reportJson.data) setData(reportJson.data)
      if (reportJson.summary) setSummary(reportJson.summary)
      if (whJson.data) {
        setWarehouses([
          { label: "All Warehouses", value: "" },
          ...whJson.data.map((w: any) => ({ label: w.name, value: w.id })),
        ])
      }
    } catch (err) {
      console.error("Failed to load report:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => window.print()

  const filtered = data.filter((item) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.productName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.warehouseName.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    )
  })

  const totalValue = filtered.reduce((s, r) => s + r.totalValue, 0)
  const totalQty = filtered.reduce((s, r) => s + r.quantity, 0)
  const avgCost = totalQty > 0 ? totalValue / totalQty : 0

  return (
    <div className="space-y-6">
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Link href="/inventory" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Inventory Report</h3>
            <p className="text-sm text-gray-500 mt-1">
              Detailed stock valuation — current stock, cost base, and total inventory value
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" className="flex items-center gap-2" disabled>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              Total Items (SKU-Warehouse)
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">
              {isLoading ? "..." : summary?.totalItems ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              Total Units
            </div>
            <p className="text-2xl font-bold mt-1 text-gray-900">
              {isLoading ? "..." : summary?.totalUnits ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
              <DollarSign className="h-4 w-4" />
              Total Inventory Value
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-700">
              {isLoading ? "..." : formatCurrency(summary?.totalInventoryValue ?? 0)}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              Average cost per unit: {formatCurrency(avgCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader className="pb-3 no-print">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Stock Valuation Details
              {!isLoading && <span className="text-gray-400 font-normal ml-2">({filtered.length} items)</span>}
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-56"
                />
              </div>
              <Select
                options={warehouses}
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                placeholder="All Warehouses"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              {search || warehouseFilter
                ? "No items match your filters."
                : "No stock records found."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Cost / Unit</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <span>{item.productName}</span>
                        {item.dualUom && item.dualUom.fullUnits > 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Package className="h-3 w-3 text-purple-400" />
                            ≈ {item.dualUom.fullUnits} {item.dualUom.altAbbr} + {item.dualUom.remainder} {item.dualUom.baseAbbr}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.warehouseName}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right text-gray-500">{item.reservedQty}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">{item.availableQty}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(item.costPerUnit)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Footer Totals */}
              <div className="flex justify-end mt-4 pt-3 border-t-2 border-gray-200 no-print">
                <div className="w-80 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items shown</span>
                    <span className="font-medium">{filtered.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total units</span>
                    <span className="font-medium">{totalQty}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-1.5">
                    <span>Total Value</span>
                    <span className="text-blue-600">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
