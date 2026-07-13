"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package, Barcode, Ruler, Warehouse, Edit, Image, Loader2, DollarSign, Tag, Box, ArrowUpRight, ArrowDownLeft, ArrowRight, RefreshCw, AlertTriangle, RotateCcw, Clock, Layers, Copy } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface ProductDetail {
  id: string
  name: string
  description?: string
  sku: string
  barcode?: string
  unit: string
  weight?: number
  costPerUnit: number
  sellPerUnit: number
  isActive: boolean
  hasVariants?: boolean
  createdAt: string
  updatedAt: string
  category: { id: string; name: string }
  images: { url: string; thumbnail?: string; isPrimary: boolean }[]
  uoms: { isBase: boolean; conversionToBase: number; uom: { name: string; abbreviation: string } }[]
  warehouseStock: { quantity: number; minStock: number; warehouse: { id: string; name: string; code: string } }[]
  suppliers: { supplier: { id: string; name: string; code: string } }[]
  warehouseStockMovements: {
    id: string
    reference: string
    type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT" | "RETURN"
    quantity: number
    notes?: string
    createdAt: string
    fromWarehouse?: { id: string; name: string; code: string } | null
    toWarehouse?: { id: string; name: string; code: string } | null
  }[]
  variantGroups?: {
    id: string
    name: string
    options: { id: string; name: string; value: string }[]
  }[]
  childVariants?: {
    id: string
    sku: string
    costPerUnit: number
    sellPerUnit: number
    unit: string
    isActive: boolean
    warehouseStock: { quantity: number; warehouse: { id: string; name: string; code: string } }[]
    uoms: { isBase: boolean; uom: { name: string; abbreviation: string } }[]
    variantOptionAssignments: {
      option: { id: string; name: string; value: string; group: { id: string; name: string } }
    }[]
  }[]
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/products/${id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to load")
        setProduct(json.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error || "Product not found"}</p>
        <Link href="/products" className="text-blue-500 hover:underline mt-2 inline-block">
          Back to products
        </Link>
      </div>
    )
  }

  const totalStock = product.warehouseStock.reduce((sum, s) => sum + s.quantity, 0)

  const stockStatus: { label: string; color: string } =
    totalStock <= 0
      ? { label: "Out of Stock", color: "text-red-600 bg-red-50 border-red-200" }
      : totalStock <= 10
        ? { label: "Low Stock", color: "text-orange-600 bg-orange-50 border-orange-200" }
        : { label: "In Stock", color: "text-green-600 bg-green-50 border-green-200" }

  const primaryImage = product.images.find((i) => i.isPrimary) || product.images[0]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
              <Badge variant="outline" className="text-xs font-mono">{product.sku}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">Product detail and warehouse stock overview</p>
          </div>
        </div>
        <Link href={`/products/${id}/edit`}>
          <Button className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Product
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Product info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</label>
                  <p className="mt-1 text-sm text-gray-900">{product.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</label>
                  <p className="mt-1">
                    <Badge variant="outline">{product.category.name}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</label>
                  <p className="mt-1 text-sm font-mono text-gray-900">{product.sku}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</label>
                  <p className="mt-1 text-sm flex items-center gap-1.5 text-gray-900">
                    <Barcode className="h-3.5 w-3.5 text-gray-400" />
                    {product.barcode || <span className="text-gray-400 italic">Not set</span>}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                    {product.description || <span className="text-gray-400 italic">No description</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          {product.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Image className="h-4 w-4 text-blue-500" />
                  Product Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {product.images.map((img, i) => (
                    <div key={i} className="relative">
                      <img
                        src={img.url}
                        alt={`${product.name} ${i + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      {img.isPrimary && (
                        <Badge variant="status" status="active" className="absolute top-2 left-2 text-[10px]">
                          Primary
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* UoMs */}
          {product.uoms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-blue-500" />
                  Units of Measure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {product.uoms.map((u, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        u.isBase ? "border-blue-200 bg-blue-50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-900">{u.uom.name}</span>
                        <Badge variant={u.isBase ? "status" : "outline"} status={u.isBase ? "active" : undefined}>
                          {u.uom.abbreviation}
                        </Badge>
                      </div>
                      {u.isBase && <p className="text-xs text-blue-600 mt-1">Base unit</p>}
                      {!u.isBase && (
                        <p className="text-xs text-gray-500 mt-1">1 {u.uom.abbreviation} = {u.conversionToBase}x base</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Variants / Sub-SKUs */}
          {product.hasVariants && product.childVariants && product.childVariants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500" />
                  Variants / Sub-SKUs
                  <Badge variant="status" status="processing" className="text-[10px]">
                    {product.childVariants.length} variants
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.childVariants.map((v) => {
                    const vStock = v.warehouseStock.reduce((s, ws) => s + ws.quantity, 0)
                    const optionLabels = v.variantOptionAssignments?.map(a => a.option.name).join(" / ") || "—"
                    return (
                      <div key={v.id} className="p-4 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex flex-wrap gap-1 mb-1">                              {v.variantOptionAssignments?.map((a, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] bg-gray-50">
                                    {a.option.group.name}: {a.option.name}
                                  </Badge>
                                ))}
                            </div>
                            <code className="text-xs font-mono text-gray-500">{v.sku}</code>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400">Cost (HPP)</span>
                            <p className="font-medium text-gray-700">{formatCurrency(Number(v.costPerUnit))}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Sell Price</span>
                            <p className="font-medium text-green-600">{formatCurrency(Number(v.sellPerUnit))}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-400">Stock per Warehouse</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {v.warehouseStock.length === 0 ? (
                                <span className="text-gray-300 italic">No stock</span>
                              ) : (
                                v.warehouseStock.map((ws, wi) => (
                                  <Badge key={wi} variant="outline" className="text-[10px]">
                                    <Warehouse className="h-2.5 w-2.5 mr-1" />
                                    {ws.warehouse.name}: {ws.quantity}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Suppliers */}
          {product.suppliers?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-500" />
                  Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {product.suppliers.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-900">{s.supplier.name}</span>
                      <Badge variant="outline" className="text-xs">{s.supplier.code}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock Movement History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Stock Movement History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!product.warehouseStockMovements || product.warehouseStockMovements.length === 0) ? (
                <p className="text-sm text-gray-400 italic py-2 text-center">
                  No stock movements recorded yet
                </p>
              ) : (
                <div className="space-y-0">
                  {product.warehouseStockMovements.map((mov, i) => {
                    const isIn = mov.type === "IN"
                    const isOut = mov.type === "OUT"
                    const isTransfer = mov.type === "TRANSFER"
                    const icon = isIn ? ArrowDownLeft : isOut ? ArrowUpRight : isTransfer ? RefreshCw : mov.type === "ADJUSTMENT" ? AlertTriangle : RotateCcw
                    const color = isIn ? "text-green-600 bg-green-50" : isOut ? "text-red-600 bg-red-50" : isTransfer ? "text-blue-600 bg-blue-50" : mov.type === "ADJUSTMENT" ? "text-yellow-600 bg-yellow-50" : "text-purple-600 bg-purple-50"
                    const label = isIn ? "Received" : isOut ? "Shipped" : isTransfer ? "Transferred" : mov.type === "ADJUSTMENT" ? "Adjusted" : "Returned"
                    const Icon = icon

                    return (
                      <div key={mov.id} className={`flex gap-3 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">{label}</p>
                            <span className={`text-sm font-semibold ${isIn ? "text-green-600" : "text-red-600"}`}>
                              {isIn ? "+" : "-"}{mov.quantity}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {isIn && mov.toWarehouse && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Warehouse className="h-3 w-3" />
                                {mov.toWarehouse.name}
                              </span>
                            )}
                            {isOut && mov.fromWarehouse && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Warehouse className="h-3 w-3" />
                                {mov.fromWarehouse.name}
                              </span>
                            )}
                            {isTransfer && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Warehouse className="h-3 w-3" />
                                {mov.fromWarehouse?.name || "?"}
                                <ArrowRight className="h-3 w-3" />
                                {mov.toWarehouse?.name || "?"}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{mov.reference}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(mov.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {mov.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{mov.notes}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Stock & Pricing summary */}
        <div className="space-y-6">
          {/* Stock Status card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Box className="h-4 w-4 text-blue-500" />
                Stock Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border mb-4 ${stockStatus.color}`}>
                <p className="text-2xl font-bold">{totalStock}</p>
                <p className="text-sm mt-0.5">{product.unit} total — {stockStatus.label}</p>
              </div>

              {/* Per-warehouse stock */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Per Warehouse
                </p>
                {product.warehouseStock.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">No stock in any warehouse</p>
                ) : (
                  <div className="divide-y border rounded-lg">
                    {product.warehouseStock.map((ws) => (
                      <div key={ws.warehouse.id} className="flex items-center justify-between px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{ws.warehouse.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            ws.quantity <= 0 ? "text-red-600" :
                            ws.quantity <= ws.minStock ? "text-orange-600" :
                            "text-gray-900"
                          }`}>
                            {ws.quantity}
                          </span>
                          <span className="text-xs text-gray-400">{product.unit}</span>
                          {ws.quantity <= 0 && (
                            <Badge variant="status" status="inactive" className="text-[10px]">Empty</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Link href={`/products/${id}/edit`}>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Edit className="h-3.5 w-3.5 mr-2" />
                  Manage Stock
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pricing card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cost per Unit (HPP)</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">{formatCurrency(Number(product.costPerUnit))}</p>
              </div>
              <div className="border-t pt-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sell Price per Unit</label>
                <p className="text-lg font-semibold text-green-600 mt-1">{formatCurrency(Number(product.sellPerUnit))}</p>
              </div>
              <div className="border-t pt-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Base Unit</label>
                <p className="text-sm text-gray-900 mt-1">{product.unit}</p>
              </div>
              {product.weight && (
                <div className="border-t pt-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</label>
                  <p className="text-sm text-gray-900 mt-1">{product.weight} kg</p>
                </div>
              )}
              <div className="border-t pt-4 flex items-center justify-between text-xs text-gray-400">
                <span>Created {new Date(product.createdAt).toLocaleDateString()}</span>
                <span>Updated {new Date(product.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
