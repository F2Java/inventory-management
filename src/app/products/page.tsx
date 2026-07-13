"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, ImageOff, Package, Barcode, Layers } from "lucide-react"
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
import { Loader2 } from "lucide-react"

interface ProductWithRelations {
  id: string
  name: string
  sku: string
  barcode?: string
  unit: string
  costPerUnit: number
  sellPerUnit: number
  hasVariants?: boolean
  category: { name: string }
  images: { url: string; thumbnail?: string; isPrimary: boolean }[]
  uoms: {
    isBase: boolean
    conversionToBase: number
    uom: { name: string; abbreviation: string }
  }[]
  warehouseStock: { quantity: number; warehouse: { name: string } }[]
  childVariants?: {
    id: string
    sku: string
    costPerUnit: number
    sellPerUnit: number
    unit: string
    warehouseStock: { quantity: number }[]
    variantOptionAssignments: {
      option: { name: string; value: string; group: { name: string } }
    }[]
  }[]
}

export default function ProductsPage() {
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/products")
      const json = await res.json()
      if (json.data) setProducts(json.data)
    } catch (err) {
      console.error("Failed to load products:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search))
  )

  const getTotalStock = (stocks: { quantity: number }[]) =>
    stocks.reduce((sum, s) => sum + s.quantity, 0)

  const getStockStatus = (total: number) => {
    if (total <= 0) return "out_of_stock"
    if (total <= 10) return "low_stock"
    if (total >= 200) return "over_stock"
    return "in_stock"
  }

  const primaryImage = (images: ProductWithRelations["images"]) =>
    images.find((i) => i.isPrimary) || images[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">All Products</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage your product catalog with UoM, barcode, and images
          </p>
        </div>
        <Link href="/products/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Product List</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, SKU, or barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-72"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU / Barcode</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead className="text-right">Cost/Unit</TableHead>
                  <TableHead className="text-right">Sell/Unit</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-gray-400">
                      No products found.{" "}
                      <Link href="/products/new" className="text-blue-500 hover:underline">
                        Add your first product
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((product) => {
                    const img = primaryImage(product.images)
                    const totalStock = getTotalStock(product.warehouseStock)
                    const stockStatus = getStockStatus(totalStock)
                    const baseUom = product.uoms.find((u) => u.isBase)
                    const otherUoms = product.uoms.filter((u) => !u.isBase)

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          {img ? (
                            <img
                              src={img.thumbnail || img.url}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <ImageOff className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/products/${product.id}`} className="hover:text-blue-600 transition-colors">
                            {product.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-mono">{product.sku}</span>
                            {product.barcode && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Barcode className="h-3 w-3" />
                                {product.barcode}
                              </span>
                            )}
                            {product.hasVariants && (
                              <Badge variant="status" status="processing" className="text-[9px] mt-0.5 w-fit">
                                <Layers className="h-2.5 w-2.5 mr-0.5" />
                                {product.childVariants?.length || 0} variants
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {baseUom && (
                              <Badge variant="status" status="active" className="text-[10px]">
                                {baseUom.uom.abbreviation}
                              </Badge>
                            )}
                            {otherUoms.map((u, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                {u.uom.abbreviation} ({u.conversionToBase}x)
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(Number(product.costPerUnit))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(product.sellPerUnit))}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${
                            stockStatus === "low_stock" ? "text-orange-600" :
                            stockStatus === "out_of_stock" ? "text-red-600" :
                            stockStatus === "over_stock" ? "text-yellow-600" :
                            "text-gray-900"
                          }`}>
                            {totalStock}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">{product.unit}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="status" status={stockStatus}>
                            {stockStatus === "in_stock" ? "In Stock" :
                             stockStatus === "low_stock" ? "Low Stock" :
                             stockStatus === "over_stock" ? "Over Stock" : "Out of Stock"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.hasVariants && product.childVariants ? (
                            <div className="flex flex-col gap-0.5">
                              {product.childVariants.slice(0, 3).map((v) => {
                                const vStock = v.warehouseStock.reduce((s, ws) => s + ws.quantity, 0)
                                return (
                                  <span key={v.id} className="text-[10px] text-gray-500 flex items-center gap-1">
                                    <span className="font-mono">{v.sku}</span>
                                    {v.variantOptionAssignments?.[0] && (
                                      <span className="text-gray-400">
                                        {v.variantOptionAssignments.map(a => a.option.value).join(" / ")}
                                      </span>
                                    )}
                                    <span className={vStock <= 0 ? "text-red-400" : "text-gray-400"}>
                                      : {vStock}
                                    </span>
                                  </span>
                                )
                              })}
                              {(product.childVariants.length > 3) && (
                                <span className="text-[10px] text-blue-500">
                                  +{product.childVariants.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/products/${product.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit product">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete product"
                              onClick={async () => {
                                if (!confirm(`Delete ${product.name}?`)) return
                                try {
                                  await fetch(`/api/products?id=${product.id}`, { method: "DELETE" })
                                  loadProducts()
                                } catch (err) {
                                  console.error("Failed to delete:", err)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
