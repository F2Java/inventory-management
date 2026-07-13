"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Bell, AlertTriangle, RefreshCw, X, CheckCircle2 } from "lucide-react"
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
import { Loader2 } from "lucide-react"

interface Threshold {
  id: string
  product: { id: string; name: string; sku: string }
  warehouse: { id: string; name: string }
  currentStock: number
  minLevel: number
  maxLevel?: number
  alert: boolean
}

interface WarehouseOption {
  id: string
  name: string
  code: string
}

interface ProductOption {
  id: string
  name: string
  sku: string
}

export default function ThresholdsPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<string | null>(null)

  // ─── Set Threshold Modal ────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [allProducts, setAllProducts] = useState<ProductOption[]>([])
  const [formWarehouse, setFormWarehouse] = useState("")
  const [formProduct, setFormProduct] = useState("")
  const [formMin, setFormMin] = useState("10")
  const [formMax, setFormMax] = useState("")
  const [formAlert, setFormAlert] = useState(true)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState(false)
  const [productSearch, setProductSearch] = useState("")

  useEffect(() => { loadThresholds() }, [])

  const loadThresholds = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/inventory/thresholds")
      const json = await res.json()
      if (json.data) setThresholds(json.data)
    } catch (err) {
      console.error("Failed to load thresholds:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWarehousesAndProducts = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        fetch("/api/warehouses"),
        fetch("/api/products?limit=500&activeOnly=true"),
      ])
      const whJson = await whRes.json()
      const prodJson = await prodRes.json()
      if (whJson.data) setWarehouses(whJson.data)
      if (prodJson.data) setAllProducts(prodJson.data)
    } catch {}
  }

  const openSetThreshold = async () => {
    setFormWarehouse("")
    setFormProduct("")
    setFormMin("10")
    setFormMax("")
    setFormAlert(true)
    setFormError("")
    setFormSuccess(false)
    setProductSearch("")
    await loadWarehousesAndProducts()
    setShowModal(true)
  }

  const submitThreshold = async () => {
    if (!formWarehouse) { setFormError("Please select a warehouse"); return }
    if (!formProduct) { setFormError("Please select a product"); return }
    const minVal = parseInt(formMin)
    if (isNaN(minVal) || minVal < 0) { setFormError("Min level must be a valid number"); return }

    setFormSubmitting(true)
    setFormError("")

    try {
      const res = await fetch("/api/inventory/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formProduct,
          warehouseId: formWarehouse,
          minStock: minVal,
          maxStock: formMax ? parseInt(formMax) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to set threshold")
      setFormSuccess(true)
      loadThresholds()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const generateRequests = async () => {
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await fetch("/api/inventory/thresholds", {
        method: "POST",
      })
      const json = await res.json()
      if (json.success) {
        setGenResult(json.message)
        loadThresholds()
      } else {
        setGenResult(json.error || "Failed to generate requests")
      }
    } catch (err) {
      console.error("Failed:", err)
      setGenResult("An error occurred while generating requests")
    } finally {
      setGenerating(false)
    }
  }

  const getCurrentStock = (t: Threshold) => t.currentStock || 0

  const filtered = thresholds.filter(
    (t) =>
      t.product.name.toLowerCase().includes(search.toLowerCase()) ||
      t.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      t.warehouse.name.toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = thresholds.filter((t) => getCurrentStock(t) <= t.minLevel).length

  const filteredProducts = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Stock Thresholds</h3>
          <p className="text-sm text-gray-500 mt-1">
            Set minimum stock levels. When stock hits the minimum, auto-generate requests to procurement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={generateRequests}
            disabled={generating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate Stock Requests"}
          </Button>
          <Button className="flex items-center gap-2" onClick={openSetThreshold}>
            <Plus className="h-4 w-4" /> Set Threshold
          </Button>
        </div>
      </div>

      {/* Generation Result Toast */}
      {genResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-800 flex-1">{genResult}</p>
          <button onClick={() => setGenResult(null)} className="text-blue-400 hover:text-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {lowStockCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              {lowStockCount} product(s) below minimum stock level
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Click "Generate Stock Requests" to create replenishment requests for procurement
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Threshold Settings</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="mb-2">No thresholds configured yet.</div>
              <Button variant="outline" size="sm" onClick={openSetThreshold}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Configure Your First Threshold
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Min Level</TableHead>
                  <TableHead className="text-right">Max Level</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auto Alert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const current = getCurrentStock(t)
                  const isBelowMin = current <= t.minLevel
                  return (
                    <TableRow key={t.id} className={isBelowMin ? "bg-orange-50" : ""}>
                      <TableCell className="font-medium">{t.product.name}</TableCell>
                      <TableCell className="text-xs font-mono">{t.product.sku}</TableCell>
                      <TableCell>{t.warehouse.name}</TableCell>
                      <TableCell className={`text-right font-medium ${isBelowMin ? "text-orange-600" : ""}`}>{t.minLevel}</TableCell>
                      <TableCell className="text-right">{t.maxLevel || "—"}</TableCell>
                      <TableCell className={`text-right font-bold ${isBelowMin ? "text-orange-600" : current === 0 ? "text-red-600" : ""}`}>
                        {current}
                      </TableCell>
                      <TableCell>
                        {isBelowMin ? (
                          <Badge variant="status" status="low_stock">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Below Min
                          </Badge>
                        ) : current === 0 ? (
                          <Badge variant="status" status="out_of_stock">Out of Stock</Badge>
                        ) : (
                          <Badge variant="status" status="in_stock">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.alert ? (
                          <Badge variant="status" status="active"><Bell className="h-3 w-3 mr-1" /> Active</Badge>
                        ) : (
                          <Badge variant="status" status="inactive">Off</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── Set Threshold Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !formSubmitting && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Set Stock Threshold</h3>
                  <p className="text-sm text-gray-500">Configure min/max stock levels for a product</p>
                </div>
              </div>
              {formSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved!
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Warehouse */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Warehouse <span className="text-red-500">*</span></label>
                <Select
                  options={warehouses.map((w) => ({ label: `${w.name} (${w.code})`, value: w.id }))}
                  value={formWarehouse}
                  onChange={(e) => setFormWarehouse(e.target.value)}
                  placeholder="Select warehouse"
                />
              </div>

              {/* Product Search */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Product <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {productSearch && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-32 overflow-y-auto shadow-sm">
                    {filteredProducts.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${formProduct === p.id ? "bg-blue-50 font-medium" : ""}`}
                        onClick={() => { setFormProduct(p.id); setProductSearch("") }}
                      >
                        <span>{p.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{p.sku}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">No products found</div>
                    )}
                  </div>
                )}
                {formProduct && !productSearch && (
                  <p className="text-xs text-green-600">✓ Product selected</p>
                )}
              </div>

              {/* Min & Max */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Min Level <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={formMin}
                    onChange={(e) => setFormMin(e.target.value)}
                    placeholder="e.g. 10"
                  />
                  <p className="text-[10px] text-gray-400">Alert when stock drops to this level</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Max Level</label>
                  <Input
                    type="number"
                    min={0}
                    value={formMax}
                    onChange={(e) => setFormMax(e.target.value)}
                    placeholder="Optional"
                  />
                  <p className="text-[10px] text-gray-400">Alert when stock exceeds this level</p>
                </div>
              </div>

              {/* Auto Alert Toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formAlert}
                    onChange={(e) => setFormAlert(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm text-gray-700">Enable automatic alerts</span>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={formSubmitting}>
                {formSuccess ? "Close" : "Cancel"}
              </Button>
              {!formSuccess && (
                <Button onClick={submitThreshold} disabled={formSubmitting} className="flex items-center gap-2">
                  {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  {formSubmitting ? "Saving..." : "Save Threshold"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
