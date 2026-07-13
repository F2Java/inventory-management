"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Download, Loader2, Plus, ShoppingCart, X, CheckCircle2, AlertTriangle, Package } from "lucide-react"
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
import { Select } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"

interface SaleItem {
  id: string
  orderNumber: string
  customerName: string | null
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  branch?: { name: string }
  items?: { quantity: number }[]
}

interface BranchOption {
  id: string
  name: string
  code: string
}

interface ProductOption {
  id: string
  name: string
  sku: string
  sellPerUnit: number
  unit: string
}

interface OrderLineItem {
  productId: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
  unit: string
  stockAvailable: number | null
  stockLoading: boolean
  stockError: string | null
}

export default function SalesPage() {
  const router = useRouter()
  const [sales, setSales] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  // ─── Create Sale Modal ──────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [allProducts, setAllProducts] = useState<ProductOption[]>([])
  const [formBranch, setFormBranch] = useState("")
  const [formCustomerName, setFormCustomerName] = useState("")
  const [formCustomerEmail, setFormCustomerEmail] = useState("")
  const [formCustomerPhone, setFormCustomerPhone] = useState("")
  const [formShipping, setFormShipping] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formItems, setFormItems] = useState<OrderLineItem[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState(false)

  // Re-check stock for all items when branch changes
  useEffect(() => {
    if (!formBranch || formItems.length === 0) return

    let cancelled = false

    const recheck = async () => {
      // Reset items to loading state
      setFormItems((prev) =>
        prev.map((i) => ({ ...i, stockLoading: true, stockAvailable: null, stockError: null }))
      )

      const results = await Promise.all(
        formItems.map(async (item) => {
          try {
            const res = await fetch(
              `/api/sales/stock-check?productId=${item.productId}&branchId=${formBranch}`
            )
            const json = await res.json()
            return { productId: item.productId, available: json.data?.netAvailable ?? 0 }
          } catch {
            return { productId: item.productId, available: null }
          }
        })
      )

      if (!cancelled) {
        setFormItems((prev) =>
          prev.map((i) => {
            const result = results.find((r) => r.productId === i.productId)
            return result
              ? { ...i, stockAvailable: result.available, stockLoading: false }
              : i
          })
        )
      }
    }

    recheck()
    return () => { cancelled = true }
  }, [formBranch]) // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally only depend on formBranch — formItems is used inside but
  // the functional updater pattern ensures we always have the latest items.

  const openCreateModal = async () => {
    setFormBranch("")
    setFormCustomerName("")
    setFormCustomerEmail("")
    setFormCustomerPhone("")
    setFormShipping("")
    setFormNotes("")
    setFormItems([])
    setProductSearch("")
    setFormError("")
    setFormSuccess(false)
    try {
      const [brRes, prRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/products?limit=500&activeOnly=true"),
      ])
      const brJson = await brRes.json()
      const prJson = await prRes.json()
      if (brJson.data) setBranches(brJson.data)
      if (prJson.data) setAllProducts(prJson.data)
    } catch {}
    setShowModal(true)
  }

  const addProductToOrder = async (product: ProductOption) => {
    if (formItems.some((i) => i.productId === product.id)) return
    setProductSearch("")
    const newItem: OrderLineItem = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity: 1,
      unitPrice: Number(product.sellPerUnit),
      unit: product.unit,
      stockAvailable: null,
      stockLoading: true,
      stockError: null,
    }
    setFormItems((prev) => [...prev, newItem])

    // Check stock availability asynchronously
    if (formBranch) {
      try {
        const res = await fetch(`/api/sales/stock-check?productId=${product.id}&branchId=${formBranch}`)
        const json = await res.json()
        const available = json.data?.netAvailable ?? 0
        setFormItems((prev) =>
          prev.map((i) =>
            i.productId === product.id
              ? { ...i, stockAvailable: available, stockLoading: false }
              : i
          )
        )
      } catch {
        setFormItems((prev) =>
          prev.map((i) =>
            i.productId === product.id
              ? { ...i, stockLoading: false, stockError: "Check failed" }
              : i
          )
        )
      }
    } else {
      setFormItems((prev) =>
        prev.map((i) =>
          i.productId === product.id
            ? { ...i, stockLoading: false, stockError: "Select a branch first" }
            : i
        )
      )
    }
  }

  const updateItem = (productId: string, updates: Partial<OrderLineItem>) => {
    setFormItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, ...updates } : i))
    )
  }

  const removeItem = (productId: string) => {
    setFormItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const submitSale = async () => {
    if (!formBranch) { setFormError("Please select a branch"); return }
    if (formItems.length === 0) { setFormError("Please add at least one product"); return }

    // Check for insufficient stock
    const insufficientStock = formItems.filter(
      (i) => i.stockAvailable !== null && i.quantity > i.stockAvailable
    )
    if (insufficientStock.length > 0) {
      setFormError(
        `Insufficient stock for: ${insufficientStock.map((i) => i.name).join(", ")}. Adjust quantities or restock.`
      )
      return
    }

    setFormSubmitting(true)
    setFormError("")

    try {
      const subtotal = formItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: formBranch,
          customerName: formCustomerName || undefined,
          customerEmail: formCustomerEmail || undefined,
          customerPhone: formCustomerPhone || undefined,
          shippingAddress: formShipping || undefined,
          subtotal,
          taxAmount: 0,
          shippingCost: 0,
          discountAmount: 0,
          totalAmount: subtotal,
          notes: formNotes || undefined,
          items: formItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create sale")

      setFormSuccess(true)
      // Refresh the sales list
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      const refreshRes = await fetch(`/api/sales?${params}`)
      const refreshJson = await refreshRes.json()
      if (refreshJson.data) setSales(refreshJson.data)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormSubmitting(false)
    }
  }

  useEffect(() => {
    async function fetchSales() {
      try {
        const params = new URLSearchParams()
        if (statusFilter) params.set("status", statusFilter)
        const res = await fetch(`/api/sales?${params.toString()}`)
        if (!res.ok) throw new Error("Failed to fetch")
        const json = await res.json()
        setSales(json.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchSales()
  }, [statusFilter])

  const filteredSales = sales.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.orderNumber.toLowerCase().includes(q) ||
      (s.customerName || "").toLowerCase().includes(q)
    )
  })

  const stats = [
    { label: "Total Orders", value: sales.length, color: "text-blue-600" },
    { label: "Processing", value: sales.filter((s) => s.status === "PROCESSING" || s.status === "PACKAGING").length, color: "text-orange-600" },
    { label: "Shipped", value: sales.filter((s) => s.status === "SHIPPED").length, color: "text-purple-600" },
    { label: "Delivered", value: sales.filter((s) => s.status === "DELIVERED").length, color: "text-green-600" },
  ]

  // Filter branch's products for search dropdown
  const filteredProducts = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  )

  // Check if any item has insufficient stock
  const hasStockIssues = formItems.some(
    (i) => i.stockAvailable !== null && i.quantity > i.stockAvailable
  )
  // Check if stock is still loading for any item
  const stockLoading = formItems.some((i) => i.stockLoading)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Sales Orders</h3>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? "Loading..." : `${sales.length} orders from all channels`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openCreateModal} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Sale
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Orders</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="PACKAGING">Packaging</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filteredSales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/sales/${s.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{s.orderNumber}</TableCell>
                    <TableCell>{s.customerName || "Guest"}</TableCell>
                    <TableCell className="text-sm">{s.branch?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="status" status={s.status.toLowerCase()}>
                        {s.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{s.items?.length || 0}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(s.totalAmount)}</TableCell>
                    <TableCell className="text-sm">{formatDate(s.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-sm text-gray-500">
              {search ? "No orders match your search." : "No orders yet. Sync your e-commerce platform to see orders."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Create Sale Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !formSubmitting && !formSuccess && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">Create Sales Order</h3>
                  <p className="text-sm text-gray-500">Add products and check warehouse stock before ordering</p>
                </div>
                {formSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Order Created!
                  </div>
                )}
                <button onClick={() => setShowModal(false)} className="p-1 text-gray-300 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Branch + Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Branch <span className="text-red-500">*</span></label>
                  <Select
                    options={branches.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }))}
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    placeholder="Select branch"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Customer Name</label>
                  <Input
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="Walk-in customer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Customer Email</label>
                  <Input
                    type="email"
                    value={formCustomerEmail}
                    onChange={(e) => setFormCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Customer Phone</label>
                  <Input
                    value={formCustomerPhone}
                    onChange={(e) => setFormCustomerPhone(e.target.value)}
                    placeholder="+62..."
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Shipping Address</label>
                <textarea
                  className="flex min-h-16 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formShipping}
                  onChange={(e) => setFormShipping(e.target.value)}
                  placeholder="Shipping address (optional)"
                />
              </div>

              {/* Product Search */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Products <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={formBranch ? "Search products to add..." : "Select a branch first..."}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                    disabled={!formBranch}
                  />
                </div>
                {productSearch && formBranch && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto shadow-sm">
                    {filteredProducts.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${
                          formItems.some((i) => i.productId === p.id) ? "opacity-50" : ""
                        }`}
                        onClick={() => addProductToOrder(p)}
                        disabled={formItems.some((i) => i.productId === p.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium">{p.name}</span>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{p.sku}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">No products found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Items with Stock Status */}
              {formItems.length > 0 && (
                <div className="border rounded-lg divide-y">
                  <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span>{formItems.length} product(s)</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">Stock</span>
                      <span>Qty</span>
                      <span className="w-16 text-right">Price</span>
                    </div>
                  </div>
                  {formItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {/* Stock Status Indicator */}
                          {item.stockLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin text-gray-300" />
                          ) : item.stockAvailable !== null ? (
                            item.quantity <= item.stockAvailable ? (
                              <Badge variant="status" status="in_stock" className="text-[10px]">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                {item.stockAvailable} avail.
                              </Badge>
                            ) : (
                              <Badge variant="status" status="low_stock" className="text-[10px]">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                Only {item.stockAvailable}
                              </Badge>
                            )
                          ) : item.stockError ? (
                            <Badge variant="status" status="out_of_stock" className="text-[10px]">
                              <X className="h-2.5 w-2.5 mr-0.5" />
                              {item.stockError}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">{item.sku}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          className={`w-16 h-8 text-sm text-right ${
                            item.stockAvailable !== null && item.quantity > item.stockAvailable
                              ? "border-red-300 bg-red-50"
                              : ""
                          }`}
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 1
                            updateItem(item.productId, { quantity: qty })
                          }}
                        />
                        <span className="text-xs text-gray-400 w-16 text-right tabular-nums">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                        <button
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          onClick={() => removeItem(item.productId)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock Check Summary */}
              {formBranch && formItems.length > 0 && !stockLoading && (
                <div className={`rounded-lg p-3 text-sm ${
                  hasStockIssues
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-green-50 border border-green-200 text-green-700"
                }`}>
                  <div className="flex items-center gap-2">
                    {hasStockIssues ? (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    )}
                    <span>
                      {hasStockIssues
                        ? "Some items exceed available stock. Adjust quantities below."
                        : "All items have sufficient stock in this branch's warehouses."}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  className="flex min-h-14 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {formItems.length > 0 && (
                  <span>
                    <strong className="text-gray-700">{formItems.reduce((s, i) => s + i.quantity, 0)}</strong> units ·
                    Total <strong className="text-gray-700">{formatCurrency(formItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={formSubmitting}>
                  {formSuccess ? "Close" : "Cancel"}
                </Button>
                {!formSuccess && (
                  <Button
                    onClick={submitSale}
                    disabled={formSubmitting || formItems.length === 0 || stockLoading || hasStockIssues}
                    className="flex items-center gap-2"
                  >
                    {formSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    {formSubmitting ? "Creating..." : "Create Order"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
