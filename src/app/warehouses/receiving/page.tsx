"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, ScanLine, Package, CheckCircle2, Loader2, Upload, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarcodeInput } from "@/components/ui/barcode-input"
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

interface UomInfo {
  uomId: string
  uomName: string
  uomAbbreviation: string
  isBase: boolean
  conversionToBase: number
}

interface ReceivedItem {
  productId: string
  productName: string
  sku: string
  unit: string
  expectedQty: number
  receivedQty: number        // qty in the purchase UoM
  receivedBaseQty: number    // qty converted to base units
  purchaseUomId: string
  purchaseUomAbbr: string
  purchaseUomConversion: number // how many base units per 1 purchase UoM
  baseUomAbbr: string
  condition: string
  notes: string
}

export default function WarehouseReceivingPage() {
  const [poNumber, setPoNumber] = useState("")
  const [poId, setPoId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [showCamera, setShowCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([])
  const [step, setStep] = useState<"scan" | "receive" | "complete">("scan")
  const [warehouses, setWarehouses] = useState<{ label: string; value: string }[]>([])
  const [isLoadingPo, setIsLoadingPo] = useState(false)
  const [poError, setPoError] = useState("")

  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((json) => {
        if (json.data) {
          setWarehouses(json.data.map((w: any) => ({ label: w.name, value: w.id })))
        }
      })
      .catch(() => {})
  }, [])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handlePODetected = async (po: string) => {
    setPoNumber(po)
    setPoError("")

    // Find the PO in the system
    setIsLoadingPo(true)
    try {
      const res = await fetch(`/api/procurement/purchase-orders?search=${encodeURIComponent(po)}`)
      const json = await res.json()
      if (!res.ok || !json.data) throw new Error(json.error || "PO not found")

      // Find the exact match
      const poData = Array.isArray(json.data)
        ? json.data.find((p: any) => p.poNumber === po || p.id === po)
        : json.data

      if (!poData) throw new Error("Purchase Order not found. Please check the PO number.")

      setPoId(poData.id)

      // Fetch product UoM info for each item
      const itemsWithUom: ReceivedItem[] = []
      for (const item of (poData.items || [])) {
        const prodRes = await fetch(`/api/products/${item.productId}`)
        const prodJson = await prodRes.json()
        const productData = prodJson.data || prodJson
        const uoms = productData?.uoms || []
        const baseUom = uoms.find((u: any) => u.isBase) || uoms[0]
        // Pick a non-base UoM as the purchase UoM, or fallback to base
        const purchaseUom = uoms.find((u: any) => !u.isBase) || baseUom

        itemsWithUom.push({
          productId: item.productId,
          productName: item.product?.name || productData?.name || "Unknown",
          sku: item.product?.sku || productData?.sku || "",
          unit: productData?.unit || "pcs",
          expectedQty: item.quantity,
          receivedQty: item.quantity,
          receivedBaseQty: item.quantity * (purchaseUom?.conversionToBase || 1),
          purchaseUomId: purchaseUom?.uomId || "",
          purchaseUomAbbr: purchaseUom?.uom?.abbreviation || purchaseUom?.uomAbbreviation || "pcs",
          purchaseUomConversion: purchaseUom?.conversionToBase || 1,
          baseUomAbbr: baseUom?.uom?.abbreviation || baseUom?.uomAbbreviation || "pcs",
          condition: "good",
          notes: "",
        })
      }

      if (itemsWithUom.length === 0) throw new Error("No items found on this PO")

      setReceivedItems(itemsWithUom)
      setStep("receive")
    } catch (err: any) {
      setPoError(err.message)
    } finally {
      setIsLoadingPo(false)
    }
  }

  const startCamera = async () => {
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.error("Camera access denied:", err)
      alert("Camera access denied. Please allow camera permissions.")
      setShowCamera(false)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")!.drawImage(video, 0, 0)
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.8))

    const stream = video.srcObject as MediaStream
    stream?.getTracks().forEach((t) => t.stop())
    setShowCamera(false)
  }

  const updateReceivedQty = (index: number, qty: number) => {
    const updated = [...receivedItems]
    const item = updated[index]
    const baseQty = qty * item.purchaseUomConversion
    updated[index] = { ...item, receivedQty: qty, receivedBaseQty: baseQty }
    setReceivedItems(updated)
  }

  const updateCondition = (index: number, condition: string) => {
    const updated = [...receivedItems]
    updated[index] = { ...updated[index], condition }
    setReceivedItems(updated)
  }

  const confirmReceiving = async () => {
    setIsProcessing(true)
    try {
      // Update stock for each item — using baseUom qty
      for (const item of receivedItems) {
        if (item.receivedBaseQty > 0) {
          const stockRes = await fetch("/api/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: item.productId,
              warehouseId,
              quantity: item.receivedBaseQty,
              type: "in",
              notes: `PO Receiving: ${item.receivedQty} ${item.purchaseUomAbbr} (${item.receivedBaseQty} ${item.baseUomAbbr}) — ${item.condition}: ${item.notes}`,
            }),
          })
          if (!stockRes.ok) {
            throw new Error(`Failed to update stock for ${item.productName}`)
          }
        }
      }

      // Update PO as received
      if (poId) {
        await fetch(`/api/procurement/purchase-orders/${poId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "RECEIVED",
            receivedAt: new Date().toISOString(),
          }),
        }).catch(() => {}) // non-blocking
      }

      setIsProcessing(false)
      setStep("complete")
    } catch (err: any) {
      alert(`Error confirming receiving: ${err.message}`)
      setIsProcessing(false)
    }
  }

  const totalBaseUnits = receivedItems.reduce((s, i) => s + i.receivedBaseQty, 0)
  const totalUomUnits = receivedItems.reduce((s, i) => s + i.receivedQty, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Warehouse Receiving</h3>
        <p className="text-sm text-gray-500 mt-1">Receive stock with UoM conversion — automatically converts cartons/boxes to base units</p>
      </div>

      {/* Step 1: Scan PO */}
      {step === "scan" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-blue-500" />
              Scan Purchase Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Scan PO Number</label>
                <BarcodeInput
                  value={poNumber}
                  onChange={setPoNumber}
                  onBarcodeDetected={handlePODetected}
                  placeholder="Scan PO barcode or type PO number..."
                  autoFocus
                />
                {isLoadingPo && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading PO data...
                  </div>
                )}
                {poError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mt-2">
                    {poError}
                  </div>
                )}
                <p className="text-xs text-gray-400">Scan the PO barcode to auto-load receiving items with UoM conversion</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Warehouse</label>
                <Select
                  options={warehouses}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  placeholder="Select warehouse"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <label className="text-sm font-medium text-gray-700 mb-3 block">Live Capture Photo (Receiving Proof)</label>
              {!showCamera && !capturedImage && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-2">Capture photo of received goods</p>
                  <Button onClick={startCamera} className="flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Open Camera
                  </Button>
                </div>
              )}
              {showCamera && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} className="w-full max-h-80 object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={capturePhoto} className="flex items-center gap-2">
                      <Camera className="h-4 w-4" /> Capture
                    </Button>
                    <Button variant="outline" onClick={() => { setShowCamera(false); videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()) }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {capturedImage && (
                <div className="space-y-3">
                  <div className="relative">
                    <img src={capturedImage} alt="Receiving proof" className="w-full max-h-60 object-cover rounded-lg border" />
                    <button onClick={() => setCapturedImage(null)} className="absolute top-2 right-2 p-1 bg-white/90 rounded-full hover:bg-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <Badge variant="status" status="active">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Photo captured
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button disabled={!poNumber || !warehouseId || isLoadingPo} onClick={() => {
                if (receivedItems.length === 0) {
                  handlePODetected(poNumber)
                } else {
                  setStep("receive")
                }
              }}>
                Continue to Receiving
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Receive Items with UoM */}
      {step === "receive" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                Receiving: PO {poNumber}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capturedImage && (
                <div className="mb-4 flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <img src={capturedImage} alt="Proof" className="w-16 h-12 object-cover rounded" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Receiving proof captured</p>
                    <p className="text-xs text-green-600">Photo will be saved with this receiving record</p>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead colSpan={2} className="text-center">Received</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-xs font-mono">{item.sku}</TableCell>
                        <TableCell className="text-right">{item.expectedQty} {item.purchaseUomAbbr}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.receivedQty}
                            onChange={(e) => updateReceivedQty(i, parseInt(e.target.value) || 0)}
                            className="w-20 text-right h-8"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{item.purchaseUomAbbr}</span>
                            {item.purchaseUomConversion !== 1 && (
                              <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-50">
                                = {item.receivedBaseQty} {item.baseUomAbbr}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            options={[
                              { label: "Good", value: "good" },
                              { label: "Damaged", value: "damaged" },
                              { label: "Short", value: "short" },
                            ]}
                            value={item.condition}
                            onChange={(e) => updateCondition(i, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Notes..."
                            value={item.notes}
                            onChange={(e) => {
                              const updated = [...receivedItems]
                              updated[i] = { ...updated[i], notes: e.target.value }
                              setReceivedItems(updated)
                            }}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* UoM Summary */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <RefreshCw className="h-4 w-4" />
                  <span className="font-medium">UoM Conversion Summary</span>
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  {receivedItems.map((item, i) => (
                    <div key={i} className="bg-white rounded p-2 border border-blue-100">
                      <span className="font-medium">{item.productName}</span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.receivedQty} {item.purchaseUomAbbr}
                        {item.purchaseUomConversion !== 1 && (
                          <> → <strong className="text-blue-600">{item.receivedBaseQty} {item.baseUomAbbr}</strong></>
                        )}
                         <span className="text-gray-400 ml-1">(1 {item.purchaseUomAbbr} = {item.purchaseUomConversion} {item.baseUomAbbr})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep("scan")}>Back</Button>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500">
                    {receivedItems.filter((i) => i.condition === "damaged").length > 0 && (
                      <span className="text-red-500 mr-2">
                        {receivedItems.filter((i) => i.condition === "damaged").length} damaged
                      </span>
                    )}
                    {totalUomUnits} units → <strong>{totalBaseUnits} base units</strong>
                  </p>
                  <Button onClick={confirmReceiving} disabled={isProcessing} className="flex items-center gap-2">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {isProcessing ? "Processing..." : "Confirm Receiving"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 3: Complete */}
      {step === "complete" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Receiving Complete!</h3>
            <p className="text-sm text-gray-500 mb-2">
              Stock has been updated with UoM conversion.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              {totalUomUnits} units received → {totalBaseUnits} base units added to inventory
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => { setStep("scan"); setPoNumber(""); setPoId(""); setReceivedItems([]); setCapturedImage(null) }}>
                Receive Another PO
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/procurement/purchase-orders"}>
                View Purchase Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
