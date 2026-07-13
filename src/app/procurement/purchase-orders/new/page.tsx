"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface Supplier { id: string; code: string; name: string }
interface Product { id: string; name: string; sku: string; sellPerUnit: number }
interface Warehouse { id: string; code: string; name: string }

interface ProductUom {
  uomId: string
  isBase: boolean
  conversionToBase: number
  uom: { id: string; name: string; abbreviation: string }
}

interface POItemForm {
  productId: string
  productName: string
  quantity: number       // qty in the selected UoM
  unitCost: number       // cost per unit of selected UoM
  totalCost: number
  uomId: string
  uomAbbr: string
  uomName: string
  conversionToBase: number // how many base units = 1 of this UoM
  baseUomAbbr: string
}

function NewPOFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromRequestId = searchParams.get("fromRequest")

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [supplierId, setSupplierId] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [supplierContact, setSupplierContact] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [expectedAt, setExpectedAt] = useState("")
  const [notes, setNotes] = useState("")
  const [productUoms, setProductUoms] = useState<Record<string, ProductUom[]>>({})
  const [items, setItems] = useState<POItemForm[]>([{
    productId: "", productName: "", quantity: 1,
    unitCost: 0, totalCost: 0,
    uomId: "", uomAbbr: "pcs", uomName: "Pcs",
    conversionToBase: 1, baseUomAbbr: "pcs",
  }])

  // Load reference data
  useEffect(() => {
    async function loadData() {
      try {
        const [supRes, prodRes, whRes] = await Promise.all([
          fetch("/api/suppliers"),
          fetch("/api/products?limit=100"),
          fetch("/api/warehouses"),
        ])
        const supJson = await supRes.json()
        const prodJson = await prodRes.json()
        const whJson = await whRes.json()
        if (supJson.data) setSuppliers(supJson.data)
        if (prodJson.data) setProducts(prodJson.data)
        if (whJson.data) setWarehouses(whJson.data)

        // Pre-fill supplier from URL param if provided (from stock request release)
        const supplierFromParam = searchParams.get("supplierId")
        if (supplierFromParam) setSupplierId(supplierFromParam)
      } catch (err) {
        console.error("Failed to load data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [searchParams])

  const handleSupplierChange = (value: string) => {
    setSupplierId(value)
    const sup = suppliers.find((s) => s.id === value)
    if (sup) setSupplierName(sup.name)
  }

  const fetchProductUoms = async (productId: string) => {
    if (productUoms[productId]) return productUoms[productId]
    try {
      const res = await fetch(`/api/products/${productId}`)
      const json = await res.json()
      const data = json.data || json
      const uoms: ProductUom[] = data?.uoms || []
      setProductUoms((prev) => ({ ...prev, [productId]: uoms }))
      return uoms
    } catch { return [] }
  }

  const handleProductChange = async (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId)
    if (!prod) return

    // Fetch UoMs for this product
    const uoms = await fetchProductUoms(productId)
    const baseUom = uoms.find((u) => u.isBase) || uoms[0]

    const updated = [...items]
    updated[index] = {
      productId,
      productName: prod.name,
      quantity: updated[index].quantity,
      unitCost: prod ? Math.round(Number(prod.sellPerUnit) * 0.7) : 0,
      totalCost: updated[index].quantity * (prod ? Math.round(Number(prod.sellPerUnit) * 0.7) : 0),
      uomId: baseUom?.uomId || "",
      uomAbbr: baseUom?.uom?.abbreviation || "pcs",
      uomName: baseUom?.uom?.name || "Pcs",
      conversionToBase: baseUom?.conversionToBase || 1,
      baseUomAbbr: baseUom?.uom?.abbreviation || "pcs",
    }
    setItems(updated)
  }

  const handleUomChange = (index: number, uomId: string) => {
    const item = items[index]
    const uoms = productUoms[item.productId] || []
    const selectedUom = uoms.find((u) => u.uomId === uomId)
    if (!selectedUom) return

    const updated = [...items]
    // Adjust unit cost proportionally to UoM size
    const ratio = selectedUom.conversionToBase / item.conversionToBase
    updated[index] = {
      ...updated[index],
      uomId: selectedUom.uomId,
      uomAbbr: selectedUom.uom?.abbreviation || "",
      uomName: selectedUom.uom?.name || "",
      conversionToBase: selectedUom.conversionToBase,
      unitCost: Math.round(updated[index].unitCost * ratio),
      totalCost: Math.round(updated[index].quantity * updated[index].unitCost * ratio),
    }
    setItems(updated)
  }

  const updateQty = (index: number, qty: number) => {
    const updated = [...items]
    updated[index].quantity = qty
    updated[index].totalCost = qty * updated[index].unitCost
    setItems(updated)
  }

  const updateCost = (index: number, cost: number) => {
    const updated = [...items]
    updated[index].unitCost = cost
    updated[index].totalCost = updated[index].quantity * cost
    setItems(updated)
  }

  const addItem = () => {
    setItems([...items, {
      productId: "", productName: "", quantity: 1,
      unitCost: 0, totalCost: 0,
      uomId: "", uomAbbr: "pcs", uomName: "Pcs",
      conversionToBase: 1, baseUomAbbr: "pcs",
    }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const totals = items.reduce((acc, item) => ({
    subtotal: acc.subtotal + item.totalCost,
  }), { subtotal: 0 })
  const taxAmount = totals.subtotal * 0.11
  const grandTotal = totals.subtotal + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!supplierId && !supplierName) { setError("Please select a supplier"); return }
    if (!items.some((i) => i.productId)) { setError("Please add at least one product"); return }

    setIsSubmitting(true)
    try {
      const payload = {
        supplierId: supplierId || null,
        supplierName: supplierName || suppliers.find((s) => s.id === supplierId)?.name || "Unknown",
        supplierContact,
        warehouseId: warehouseId || null,
        expectedAt: expectedAt || null,
        notes,
        items: items.filter((i) => i.productId).map((i) => ({
          productId: i.productId,
          quantity: i.quantity * i.conversionToBase, // Store in base units
          unitCost: i.unitCost,
          purchaseUomId: i.uomId,
          purchaseUomAbbr: i.uomAbbr,
          purchaseQty: i.quantity, // Original qty in purchase UoM
          conversionToBase: i.conversionToBase,
        })),
        status: fromRequestId ? "PENDING_APPROVAL" : "DRAFT",
      }

      const res = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create PO")

      // If created from a stock request, link it
      if (fromRequestId) {
        await fetch("/api/stock-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: fromRequestId,
            status: "RELEASED",
            purchaseOrderId: json.data.id,
          }),
        })
      }

      router.push("/procurement/purchase-orders")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  const productOptions = products
    .filter((p) => !items.some((i) => i.productId === p.id) || items.some((i) => i.productId === p.id && items.indexOf(i) === items.findIndex((x) => x.productId === p.id)))
    .map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/procurement/purchase-orders" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h3 className="text-lg font-medium text-gray-900">New Purchase Order</h3>
          <p className="text-sm text-gray-500 mt-1">
            {fromRequestId ? "Generated from stock request" : "Create a purchase order to restock inventory"}
          </p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">PO Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Supplier <span className="text-red-500">*</span></label>
                <Select
                  options={suppliers.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))}
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  placeholder="Select supplier..."
                />
                {!supplierId && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-400 mb-1">Or type supplier name:</p>
                    <Input placeholder="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Contact</label>
                <Input placeholder="Supplier contact" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Expected Date</label>
                <Input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Warehouse</label>
                <Select
                  options={warehouses.map((w) => ({ label: `${w.name} (${w.code})`, value: w.id }))}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  placeholder="Select warehouse"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Order Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-24">Purchase UoM</TableHead>
                  <TableHead className="text-right w-20">Qty</TableHead>
                  <TableHead className="text-right w-20">Base Qty</TableHead>
                  <TableHead className="text-right w-36">Unit Cost</TableHead>
                  <TableHead className="text-right w-36">Total</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select
                        options={[
                          ...productOptions,
                          ...(item.productId && !productOptions.some((o) => o.value === item.productId)
                            ? [{ label: `${item.productName}`, value: item.productId }]
                            : []),
                        ]}
                        value={item.productId}
                        onChange={(e) => handleProductChange(i, e.target.value)}
                        placeholder="Select product"
                      />
                    </TableCell>
                    <TableCell>
                      {item.productId ? (
                        <select
                          value={item.uomId}
                          onChange={(e) => handleUomChange(i, e.target.value)}
                          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {(productUoms[item.productId] || []).map((u) => (
                            <option key={u.uomId} value={u.uomId}>
                              {u.uom?.abbreviation || "?"} {!u.isBase && `(1=${u.conversionToBase}x)`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateQty(i, parseInt(e.target.value) || 0)}
                        className="text-right h-9"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-gray-500">
                        {item.quantity * item.conversionToBase}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.baseUomAbbr}</span>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                        <Input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) => updateCost(i, parseFloat(e.target.value) || 0)}
                          className="pl-8 text-right h-9"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalCost)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeItem(i)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end mt-4">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">PPN 11%</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-base">
                  <span className="font-semibold">Grand Total</span>
                  <span className="font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/procurement/purchase-orders"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button variant="outline" type="button" className="flex items-center gap-2" onClick={async () => {
            setError("")
            if (!supplierId && !supplierName) { setError("Please select a supplier"); return }
            if (!items.some((i) => i.productId)) { setError("Please add at least one product"); return }
            setIsSubmitting(true)
            try {
              const payload = {
                supplierId: supplierId || null,
                supplierName: supplierName || suppliers.find((s) => s.id === supplierId)?.name || "Unknown",
                supplierContact, warehouseId: warehouseId || null,
                expectedAt: expectedAt || null, notes,
                items: items.filter((i) => i.productId).map((i) => ({
                  productId: i.productId,
                  quantity: i.quantity * i.conversionToBase, // Store in base units
                  unitCost: i.unitCost,
                  purchaseUomId: i.uomId,
                  purchaseUomAbbr: i.uomAbbr,
                  purchaseQty: i.quantity,
                  conversionToBase: i.conversionToBase,
                })),
                status: "DRAFT",
              }
              const res = await fetch("/api/procurement/purchase-orders", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              })
              const json = await res.json()
              if (!res.ok) throw new Error(json.error || "Failed")
              router.push("/procurement/purchase-orders")
              router.refresh()
            } catch (err: any) { setError(err.message) }
            finally { setIsSubmitting(false) }
          }}>
            <Save className="h-4 w-4" /> Save as Draft
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {fromRequestId ? "Create & Link PO" : "Submit PO"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewPurchaseOrderPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>}>
      <NewPOFormContent />
    </Suspense>
  )
}
