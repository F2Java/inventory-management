"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Search, Filter, Plus, Loader2, AlertTriangle, Warehouse as WarehouseIcon,
  Camera, X, CheckCircle2, XCircle, Clock, Image as ImageIcon,
  ShoppingCart, FileText, Save, Pencil, ArrowLeftRight, Merge, ArrowRight, Building2,
} from "lucide-react"
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
import { formatDate } from "@/lib/utils"

interface ProductUom {
  uomId: string
  isBase: boolean
  conversionToBase: number
  uom: { id: string; name: string; abbreviation: string }
}

interface StockItem {
  id: string
  quantity: number
  minStock: number
  maxStock: number | null
  reservedQty: number
  product: {
    id: string
    name: string
    sku: string
    unit: string
    uoms: ProductUom[]
    category: { name: string }
  }
  warehouse: { id: string; name: string; code: string }
}

interface PendingAdjustment {
  id: string
  adjustmentNumber: string
  previousQty: number
  newQty: number
  difference: number
  reason: string
  photoEvidence?: string | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  product: { id: string; name: string; sku: string; unit: string }
  warehouse: { id: string; name: string; code: string }
  requestedBy: { name: string }
  approvedBy?: { name: string } | null
}

export default function InventoryPage() {
  const [stock, setStock] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [warehouseFilter, setWarehouseFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  // ─── Adjustment Request Modal ──────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [adjProduct, setAdjProduct] = useState<StockItem | null>(null)
  const [adjQty, setAdjQty] = useState("")
  const [adjReason, setAdjReason] = useState("")
  const [adjPhoto, setAdjPhoto] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [adjError, setAdjError] = useState("")
  const [adjSuccess, setAdjSuccess] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // ─── Threshold Editing ────────────────────────────────────────────────────
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null)
  const [editMin, setEditMin] = useState("")
  const [editMax, setEditMax] = useState("")

  // ─── Transfer Modal ───────────────────────────────────────────────────────
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferItem, setTransferItem] = useState<StockItem | null>(null)
  const [transferToWarehouse, setTransferToWarehouse] = useState("")
  const [transferQty, setTransferQty] = useState("")
  const [transferNotes, setTransferNotes] = useState("")
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState("")
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null)

  const openTransfer = (item: StockItem) => {
    setTransferItem(item)
    setTransferToWarehouse("")
    setTransferQty(item.quantity.toString())
    setTransferNotes("")
    setTransferError("")
    setTransferSuccess(null)
    setShowTransferModal(true)
  }

  const handleTransfer = async () => {
    if (!transferItem) return
    if (!transferToWarehouse) { setTransferError("Please select a destination warehouse"); return }
    const qty = parseInt(transferQty)
    if (!qty || qty < 1) { setTransferError("Quantity must be at least 1"); return }
    if (qty > transferItem.quantity) { setTransferError(`Insufficient stock. Available: ${transferItem.quantity}`); return }

    setTransferring(true)
    setTransferError("")

    try {
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: transferItem.product.id,
          fromWarehouseId: transferItem.warehouse.id,
          toWarehouseId: transferToWarehouse,
          quantity: qty,
          notes: transferNotes || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Transfer failed")

      setTransferSuccess(json.data?.message || "Transfer successful")
      loadData()
    } catch (err: any) {
      setTransferError(err.message)
    } finally {
      setTransferring(false)
    }
  }

  // ─── Convert UoM Modal ───────────────────────────────────────────────────
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertStock, setConvertStock] = useState<StockItem | null>(null)
  const [convertDirection, setConvertDirection] = useState<"split" | "combine">("split")
  const [convertTargetUomId, setConvertTargetUomId] = useState("")
  const [convertQty, setConvertQty] = useState("1")
  const [convertReason, setConvertReason] = useState("")
  const [isConverting, setIsConverting] = useState(false)
  const [convertError, setConvertError] = useState("")
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null)

  const openConvertModal = (item: StockItem) => {
    setConvertStock(item)
    setConvertDirection("split")
    setConvertTargetUomId("")
    setConvertQty("1")
    setConvertReason("")
    setConvertError("")
    setConvertSuccess(null)
    setShowConvertModal(true)
  }

  const handleConvert = async () => {
    if (!convertStock) return
    if (!convertTargetUomId) { setConvertError("Please select a target unit"); return }
    const qty = parseInt(convertQty)
    if (!qty || qty < 1) { setConvertError("Quantity must be at least 1"); return }

    setIsConverting(true)
    setConvertError("")

    try {
      const res = await fetch("/api/inventory/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId: convertStock.id,
          direction: convertDirection,
          targetUomId: convertTargetUomId,
          quantity: qty,
          reason: convertReason || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Conversion failed")

      setConvertSuccess(json.message || "Conversion successful")
      loadData()
    } catch (err: any) {
      setConvertError(err.message)
    } finally {
      setIsConverting(false)
    }
  }

  const saveThreshold = async (stockId: string) => {
    try {
      await fetch("/api/inventory/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockId, minStock: editMin, maxStock: editMax || null }),
      })
      setEditingThreshold(null)
      loadData()
    } catch (err) {
      console.error("Failed to save threshold:", err)
    }
  }

  const startEditThreshold = (item: StockItem) => {
    setEditingThreshold(item.id)
    setEditMin(String(item.minStock))
    setEditMax(item.maxStock !== null ? String(item.maxStock) : "")
  }

  // ─── Stock Request Modal ───────────────────────────────────────────────────
  const [showStockRequest, setShowStockRequest] = useState(false)
  const [srWarehouse, setSrWarehouse] = useState("")
  const [srPriority, setSrPriority] = useState("NORMAL")
  const [srNotes, setSrNotes] = useState("")
  const [srProducts, setSrProducts] = useState<{ productId: string; name: string; sku: string; quantity: string; notes: string }[]>([])
  const [srProductSearch, setSrProductSearch] = useState("")
  const [srAllProducts, setSrAllProducts] = useState<{ id: string; name: string; sku: string }[]>([])
  const [srSubmitting, setSrSubmitting] = useState(false)
  const [srSuccess, setSrSuccess] = useState(false)
  const [srError, setSrError] = useState("")

  const openStockRequest = async (initial?: { products?: typeof srProducts; warehouseId?: string }) => {
    setShowStockRequest(true)
    setSrSuccess(false)
    setSrError("")
    setSrNotes("")
    setSrProducts(initial?.products ?? [])
    setSrWarehouse(initial?.warehouseId ?? "")
    setSrProductSearch("")
    try {
      const res = await fetch("/api/products?limit=200")
      const json = await res.json()
      if (json.data) setSrAllProducts(json.data)
    } catch {}
  }

  const addSrProduct = (product: { id: string; name: string; sku: string }) => {
    if (srProducts.some((p) => p.productId === product.id)) return
    setSrProducts([...srProducts, { productId: product.id, name: product.name, sku: product.sku, quantity: "10", notes: "" }])
    setSrProductSearch("")
  }

  const removeSrProduct = (productId: string) => {
    setSrProducts(srProducts.filter((p) => p.productId !== productId))
  }

  const updateSrProductQty = (productId: string, qty: string) => {
    setSrProducts(srProducts.map((p) => p.productId === productId ? { ...p, quantity: qty } : p))
  }

  const submitStockRequest = async () => {
    if (!srWarehouse) { setSrError("Please select a warehouse"); return }
    if (srProducts.length === 0) { setSrError("Please add at least one product"); return }
    setSrSubmitting(true); setSrError("")
    try {
      const res = await fetch("/api/stock-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: srWarehouse, priority: srPriority, notes: srNotes || undefined,
          items: srProducts.map((p) => ({ productId: p.productId, quantityRequested: parseInt(p.quantity) || 1, notes: p.notes || undefined })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create stock request")
      setSrSuccess(true)
      loadData()
    } catch (err: any) { setSrError(err.message) }
    finally { setSrSubmitting(false) }
  }

  // ─── Pending Adjustments ───────────────────────────────────────────────────
  const [pendingAdjustments, setPendingAdjustments] = useState<PendingAdjustment[]>([])
  const [showPending, setShowPending] = useState(false)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (warehouseFilter) params.set("warehouseId", warehouseFilter)
      if (statusFilter) params.set("status", statusFilter)

      const [stockRes, whRes] = await Promise.all([
        fetch(`/api/inventory?${params.toString()}`),
        fetch("/api/warehouses").then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      ])

      const stockJson = await stockRes.json()
      const whJson = await whRes

      if (stockJson.data) setStock(stockJson.data)
      if (whJson.data) {
        setWarehouses([{ label: "All Warehouses", value: "" }, ...whJson.data.map((w: any) => ({ label: w.name, value: w.id }))])
      }
    } catch (err) { console.error("Failed to load inventory:", err) }
    finally { setIsLoading(false) }
  }

  const loadPending = async () => {
    try {
      const res = await fetch("/api/inventory/adjust?status=PENDING")
      const json = await res.json()
      if (json.data) setPendingAdjustments(json.data)
    } catch (err) { console.error("Failed to load pending adjustments:", err) }
  }

  useEffect(() => { loadData() }, [warehouseFilter, statusFilter])
  useEffect(() => { loadPending() }, [])

  // ─── Camera functions ──────────────────────────────────────────────────────
  const startCamera = async () => {
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
    } catch { alert("Camera access denied. Please allow camera permissions."); setShowCamera(false) }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current; const canvas = canvasRef.current
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext("2d")!.drawImage(video, 0, 0)
    setAdjPhoto(canvas.toDataURL("image/jpeg", 0.8))
    const stream = video.srcObject as MediaStream
    stream?.getTracks().forEach((t) => t.stop()); setShowCamera(false)
  }

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream
    stream?.getTracks().forEach((t) => t.stop()); setShowCamera(false)
  }

  // ─── Submit adjustment request ─────────────────────────────────────────────
  const submitRequest = async () => {
    if (!adjProduct) return
    const newQty = parseInt(adjQty)
    if (isNaN(newQty) || newQty < 0) { setAdjError("Quantity must be a positive number"); return }
    if (!adjReason.trim()) { setAdjError("Reason is required"); return }
    setIsSubmitting(true); setAdjError("")
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: adjProduct.product.id, warehouseId: adjProduct.warehouse.id, newQuantity: newQty, reason: adjReason.trim(), photoEvidence: adjPhoto }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      setAdjSuccess(`${json.data.adjustmentNumber} — Pending approval`)
      loadPending(); loadData()
    } catch (err: any) { setAdjError(err.message) }
    finally { setIsSubmitting(false) }
  }

  // ─── Approve / Reject ──────────────────────────────────────────────────────
  const handleApproval = async (id: string, action: "approve" | "reject", reason?: string) => {
    setIsProcessing(id)
    try {
      await fetch(`/api/inventory/adjust/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason || null }),
      })
      loadPending(); loadData()
    } catch (err) { console.error("Failed:", err) }
    finally { setIsProcessing(null) }
  }

  // ─── Derived data ──────────────────────────────────────────────────────────
  const filtered = stock.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.product.name.toLowerCase().includes(q) || s.product.sku.toLowerCase().includes(q)
  })

  const totalQty = stock.reduce((sum, s) => sum + s.quantity, 0)
  const lowStock = stock.filter((s) => s.quantity > 0 && s.quantity <= s.minStock).length
  const outOfStock = stock.filter((s) => s.quantity === 0).length
  const overStock = stock.filter((s) => s.maxStock && s.quantity > s.maxStock).length

  const getStatus = (item: StockItem) => {
    if (item.quantity <= 0) return { label: "Out of Stock", status: "out_of_stock" as const, color: "text-red-600" }
    if (item.quantity <= item.minStock) return { label: "Low Stock", status: "low_stock" as const, color: "text-orange-600" }
    if (item.maxStock && item.quantity > item.maxStock) return { label: "Over Stock", status: "over_stock" as const, color: "text-yellow-600" }
    return { label: "In Stock", status: "in_stock" as const, color: "text-green-600" }
  }

  // Get dual-UoM representation for a stock item
  const getDualUom = (item: StockItem) => {
    const uoms = item.product.uoms || []
    const baseUom = uoms.find((u) => u.isBase) || uoms[0]
    const altUom = uoms.find((u) => !u.isBase)
    if (!altUom || !baseUom || altUom.conversionToBase <= 1) return null

    const convRate = altUom.conversionToBase
    const fullUnits = Math.floor(item.quantity / convRate)
    const remainder = item.quantity % convRate

    if (fullUnits <= 0) return null
    return {
      fullUnits,
      remainder,
      altAbbr: altUom.uom?.abbreviation || "?",
      baseAbbr: baseUom.uom?.abbreviation || "?",
      altName: altUom.uom?.name || "?",
      baseName: baseUom.uom?.name || "?",
    }
  }

  const openModal = (item: StockItem) => {
    setAdjProduct(item)
    setAdjQty(item.quantity.toString())
    setAdjReason("")
    setAdjPhoto(null)
    setAdjError("")
    setAdjSuccess(null)
    setShowCamera(false)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Stock Overview</h3>
          <p className="text-sm text-gray-500 mt-1">Monitor and adjust stock levels across all warehouses</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingAdjustments.length > 0 && (
            <Button variant="outline" size="sm" className="flex items-center gap-2 relative" onClick={() => setShowPending(!showPending)}>
              <Clock className="h-4 w-4" /> Pending ({pendingAdjustments.length})
            </Button>
          )}
          <Link href="/inventory/thresholds">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Thresholds
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openStockRequest()}>
            <ShoppingCart className="h-4 w-4" /> Request Stock
          </Button>
          <Link href="/procurement/stock-requests">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> My Requests
            </Button>
          </Link>
          <Link href="/inventory/movements">
            <Button variant="outline" className="flex items-center gap-2">
              <WarehouseIcon className="h-4 w-4" /> Movements
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Total Stock</p><p className="text-2xl font-bold mt-1 text-blue-600">{isLoading ? "..." : totalQty}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Low Stock</p><p className="text-2xl font-bold mt-1 text-orange-600">{isLoading ? "..." : lowStock}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Out of Stock</p><p className="text-2xl font-bold mt-1 text-red-600">{isLoading ? "..." : outOfStock}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Pending Adj.</p><p className="text-2xl font-bold mt-1 text-amber-600">{pendingAdjustments.length}</p></CardContent></Card>
      </div>

      {/* ─── Pending Adjustments Section ─────────────────────────────────── */}
      {showPending && pendingAdjustments.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Clock className="h-4 w-4" /> Pending Adjustments ({pendingAdjustments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAdjustments.map((adj) => (
                <div key={adj.id} className="flex items-start justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-amber-700">{adj.adjustmentNumber}</span>
                      <Badge variant="outline" className="text-[10px]">Pending</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{adj.product.name}</p>
                    <p className="text-xs text-gray-500">{adj.warehouse.name} — {adj.previousQty} → <strong>{adj.newQty}</strong> ({adj.difference > 0 ? "+" : ""}{adj.difference})</p>
                    <p className="text-xs text-gray-400 mt-0.5">{adj.reason}</p>
                    <p className="text-xs text-gray-400">by {adj.requestedBy.name} · {formatDate(adj.createdAt)}</p>
                    {adj.photoEvidence && <img src={adj.photoEvidence} alt="Evidence" className="mt-2 h-16 w-16 object-cover rounded border" />}
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleApproval(adj.id, "approve")} disabled={isProcessing === adj.id}>
                      {isProcessing === adj.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />} Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => { const reason = prompt("Rejection reason (optional):"); handleApproval(adj.id, "reject", reason || undefined) }} disabled={isProcessing === adj.id}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Stock Table ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Warehouse Stock</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-56" />
              </div>
              <Select options={warehouses} value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} placeholder="All Warehouses" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm">
                <option value="">All Status</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="over_stock">Over Stock</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              {search || warehouseFilter || statusFilter ? "No stock records match your filters." : "No stock data available."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead>
                  <TableHead>Warehouse</TableHead><TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Reserved</TableHead><TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Min</TableHead><TableHead className="text-right">Max</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const status = getStatus(item)
                  const dual = getDualUom(item)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <span>{item.product.name}</span>
                        {dual && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            (≈ {dual.fullUnits} {dual.altAbbr} + {dual.remainder} {dual.baseAbbr})
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{item.product.sku}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{item.product.category?.name}</Badge></TableCell>
                      <TableCell className="text-sm">{item.warehouse.name}</TableCell>
                      <TableCell className={`text-right font-medium ${status.color}`}>{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.reservedQty}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity - item.reservedQty}</TableCell>
                      <TableCell className="text-right">
                        {editingThreshold === item.id ? (
                          <Input type="number" min={0} className="w-16 h-7 text-xs text-right px-1" value={editMin}
                            onChange={(e) => setEditMin(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveThreshold(item.id); if (e.key === "Escape") setEditingThreshold(null) }}
                            autoFocus />
                        ) : (
                          <button className="inline-flex items-center gap-1 text-sm hover:text-blue-600 cursor-pointer" onClick={() => startEditThreshold(item)} title="Edit minimum stock">
                            {item.minStock} <Pencil className="h-2.5 w-2.5 text-gray-300 hover:text-blue-400" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingThreshold === item.id ? (
                          <Input type="number" min={0} className="w-16 h-7 text-xs text-right px-1" value={editMax}
                            onChange={(e) => setEditMax(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveThreshold(item.id); if (e.key === "Escape") setEditingThreshold(null) }} />
                        ) : (
                          <button className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 cursor-pointer" onClick={() => startEditThreshold(item)} title="Edit maximum stock">
                            {item.maxStock ?? <span className="text-gray-300 italic">—</span>} <Pencil className="h-2.5 w-2.5 text-gray-300 hover:text-blue-400" />
                          </button>
                        )}
                        {editingThreshold === item.id && (
                          <button className="ml-1 text-green-500 hover:text-green-700" onClick={() => saveThreshold(item.id)} title="Save">
                            <Save className="h-3 w-3" />
                          </button>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="status" status={status.status}>{status.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600" onClick={() => openTransfer(item)} title="Transfer to another warehouse">
                            <ArrowRight className="h-3.5 w-3.5 mr-1" /> Transfer
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openConvertModal(item)} title="Convert UoM">
                            <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> UoM
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openModal(item)}>
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Adjust
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600" title="Quick request this product" onClick={() => {
                            openStockRequest({
                              products: [{ productId: item.product.id, name: item.product.name, sku: item.product.sku, quantity: "10", notes: "" }],
                              warehouseId: item.warehouse.id,
                            })
                          }}>
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── Transfer Modal ──────────────────────────────────────────────────── */}
      {showTransferModal && transferItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !transferring && setShowTransferModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Transfer Stock</h3>
                <p className="text-sm text-gray-500">{transferItem.product.name} · {transferItem.warehouse.name}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Current Stock</p>
                  <p className="text-lg font-bold text-gray-900">{transferItem.quantity} {transferItem.product.unit}</p>
                </div>
                <div className="text-xs text-gray-400 font-mono">{transferItem.product.sku}</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{transferItem.warehouse.name} ({transferItem.warehouse.code})</span>
                <ArrowRight className="h-4 w-4 text-indigo-400 mx-1" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Destination Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                value={transferToWarehouse}
                onChange={(e) => setTransferToWarehouse(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select warehouse...</option>
                {warehouses
                  .filter((w) => w.value !== "" && w.value !== transferItem.warehouse.id)
                  .map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Quantity to Transfer <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={transferItem.quantity}
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">/ {transferItem.quantity} available</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Notes <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className="flex min-h-16 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Reallocating stock for regional demand"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />
            </div>

            {transferError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{transferError}</div>
            )}
            {transferSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {transferSuccess}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowTransferModal(false)} disabled={transferring}>
                {transferSuccess ? "Close" : "Cancel"}
              </Button>
              {!transferSuccess && (
                <Button
                  onClick={handleTransfer}
                  disabled={transferring || !transferToWarehouse || !transferQty}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  {transferring ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {transferring ? "Transferring..." : "Transfer Stock"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Convert UoM Modal ──────────────────────────────────────────────── */}
      {showConvertModal && convertStock && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !isConverting && setShowConvertModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                {convertDirection === "split" ? <ArrowLeftRight className="h-5 w-5 text-purple-600" /> : <Merge className="h-5 w-5 text-purple-600" />}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Convert UoM — {convertStock.product.name}</h3>
                <p className="text-sm text-gray-500">{convertStock.warehouse.name} · {convertStock.quantity} in stock</p>
              </div>
            </div>

            {/* Direction toggle */}
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${convertDirection === "split" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => { setConvertDirection("split"); setConvertTargetUomId(""); setConvertError("") }}
              >
                <ArrowLeftRight className="h-4 w-4 inline mr-1.5" />
                Split (Break Down)
              </button>
              <button
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${convertDirection === "combine" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => { setConvertDirection("combine"); setConvertTargetUomId(""); setConvertError("") }}
              >
                <Merge className="h-4 w-4 inline mr-1.5" />
                Combine (Package)
              </button>
            </div>

            {/* Info description */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
              {convertDirection === "split" ? (
                <p>Break down larger units into smaller. E.g., 1 Carton → {convertStock.product.uoms?.find((u) => !u.isBase)?.conversionToBase || "?"} Pcs. Stock total stays the same.</p>
              ) : (
                <p>Package smaller units into larger. E.g., combine Pcs into Cartons. Stock total stays the same — just changes how you track it.</p>
              )}
            </div>

            {/* Target UoM */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                {convertDirection === "split" ? "Convert FROM (larger unit)" : "Convert TO (larger unit)"}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={convertTargetUomId}
                onChange={(e) => setConvertTargetUomId(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select unit...</option>
                {(convertStock.product.uoms || [])
                  .filter((u) => !u.isBase) // Non-base UoMs for both directions (base is the alternative)
                  .map((u) => (
                    <option key={u.uomId} value={u.uomId}>
                      {u.uom?.name} ({u.uom?.abbreviation}) — 1 = {u.conversionToBase} base units
                    </option>
                  ))}
                {/* Also include the base UoM as an option */}
                {(convertStock.product.uoms || [])
                  .filter((u) => u.isBase)
                  .map((u) => (
                    <option key={u.uomId} value={u.uomId}>
                      {u.uom?.name} ({u.uom?.abbreviation}) — Base unit
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-400">
                {convertDirection === "split"
                  ? "Select the larger unit to break down into smaller pieces"
                  : "Select the larger unit to package smaller pieces into"}
              </p>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={1}
                value={convertQty}
                onChange={(e) => setConvertQty(e.target.value)}
                placeholder="1"
              />
              {convertTargetUomId && (
                <p className="text-xs text-gray-400">
                  {convertDirection === "split"
                    ? `Will free up ${parseInt(convertQty) || 1} × conversion rate base units for individual sale`
                    : `Will package ${parseInt(convertQty) || 1} × conversion rate base units into larger units`}
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Reason for conversion</label>
              <textarea
                className="flex min-h-16 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Opening carton for retail display"
                value={convertReason}
                onChange={(e) => setConvertReason(e.target.value)}
              />
            </div>

            {convertError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{convertError}</div>
            )}
            {convertSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {convertSuccess}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowConvertModal(false)} disabled={isConverting}>
                {convertSuccess ? "Close" : "Cancel"}
              </Button>                {!convertSuccess && (
                <Button
                  onClick={handleConvert}
                  disabled={isConverting || !convertTargetUomId}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : (convertDirection === "split" ? <ArrowLeftRight className="h-4 w-4" /> : <Merge className="h-4 w-4" />)}
                  {isConverting ? "Converting..." : "Convert"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Stock Request Modal ──────────────────────────────────────────── */}
      {showStockRequest && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !srSubmitting && setShowStockRequest(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">Create Stock Request</h3>
                  <p className="text-sm text-gray-500">Request replenishment from procurement</p>
                </div>
                {srSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Request created!
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Warehouse <span className="text-red-500">*</span></label>
                  <Select options={warehouses.filter((w) => w.value !== "")} value={srWarehouse} onChange={(e) => setSrWarehouse(e.target.value)} placeholder="Select warehouse" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <select value={srPriority} onChange={(e) => setSrPriority(e.target.value)} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea className="flex min-h-16 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Urgent restock" value={srNotes} onChange={(e) => setSrNotes(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Products to Request <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search and add products..." value={srProductSearch} onChange={(e) => setSrProductSearch(e.target.value)} className="pl-10" />
                </div>
                {srProductSearch && (
                  <div className="mt-1 border border-gray-200 rounded-lg max-h-40 overflow-y-auto shadow-sm">
                    {srAllProducts.filter((p) => p.name.toLowerCase().includes(srProductSearch.toLowerCase()) || p.sku.toLowerCase().includes(srProductSearch.toLowerCase())).slice(0, 10).map((p) => (
                      <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between" onClick={() => addSrProduct(p)}>
                        <span className="font-medium">{p.name}</span><span className="text-xs text-gray-400 font-mono">{p.sku}</span>
                      </button>
                    ))}
                    {srAllProducts.filter((p) => p.name.toLowerCase().includes(srProductSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400">No products found</div>
                    )}
                  </div>
                )}
              </div>
              {srProducts.length > 0 && (
                <div className="border rounded-lg divide-y">
                  <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span>{srProducts.length} product(s)</span><span className="text-gray-400">Qty</span>
                  </div>
                  {srProducts.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} className="w-16 h-8 text-sm text-right" value={p.quantity} onChange={(e) => updateSrProductQty(p.productId, e.target.value)} />
                        <button className="p-1 text-gray-300 hover:text-red-500 transition-colors" onClick={() => removeSrProduct(p.productId)}><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {srError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{srError}</div>}
            </div>
            <div className="p-6 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">{srProducts.length > 0 ? `${srProducts.reduce((s, p) => s + (parseInt(p.quantity) || 0), 0)} total units requested` : "Add products to create a stock request"}</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setShowStockRequest(false)} disabled={srSubmitting}>{srSuccess ? "Close" : "Cancel"}</Button>
                {!srSuccess && (
                  <Button onClick={submitStockRequest} disabled={srSubmitting || srProducts.length === 0} className="flex items-center gap-2">
                    {srSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    {srSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Adjustment Request Modal ─────────────────────────────────────── */}
      {showModal && adjProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !isSubmitting && setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Request Stock Adjustment</h3>
                <p className="text-sm text-gray-500">{adjProduct.product.name} — {adjProduct.warehouse.name}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
              <div><p className="text-xs text-gray-500">Current Stock</p><p className="text-lg font-bold text-gray-900">{adjProduct.quantity} {adjProduct.product.unit}</p></div>
              <div className="text-right"><p className="text-xs text-gray-500">New Quantity</p><Input type="number" min={0} className="w-24 text-lg font-bold text-center h-10" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Reason <span className="text-red-500">*</span></label>
              <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Stock opname, damaged goods" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Camera className="h-3.5 w-3.5 text-gray-400" /> Photo Evidence <span className="text-xs text-gray-400 font-normal">(optional)</span></label>
              {!showCamera && !adjPhoto && (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <Camera className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <Button type="button" variant="outline" size="sm" onClick={startCamera} className="text-xs"><Camera className="h-3 w-3 mr-1" /> Capture Photo</Button>
                </div>
              )}
              {showCamera && (
                <div className="space-y-2">
                  <div className="relative bg-black rounded-lg overflow-hidden"><video ref={videoRef} className="w-full max-h-48 object-cover" /><canvas ref={canvasRef} className="hidden" /></div>
                  <div className="flex gap-2"><Button type="button" size="sm" onClick={capturePhoto}><Camera className="h-3 w-3 mr-1" /> Capture</Button><Button type="button" variant="outline" size="sm" onClick={stopCamera}>Cancel</Button></div>
                </div>
              )}
              {adjPhoto && (
                <div className="relative inline-block">
                  <img src={adjPhoto} alt="Evidence" className="h-20 w-20 object-cover rounded-lg border" />
                  <button onClick={() => setAdjPhoto(null)} className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full"><X className="h-3 w-3" /></button>
                </div>
              )}
            </div>
            {adjError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{adjError}</div>}
            {adjSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {adjSuccess}</div>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={isSubmitting}>{adjSuccess ? "Close" : "Cancel"}</Button>
              {!adjSuccess && (
                <Button onClick={submitRequest} disabled={isSubmitting} className="flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  {isSubmitting ? "Submitting..." : "Submit for Approval"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
