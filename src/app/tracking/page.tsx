"use client"

import { useState, useEffect } from "react"
import { Search, QrCode, Barcode, PackageCheck, PackageOpen, Truck, Handshake, Clock, AlertTriangle, Loader2, RefreshCw } from "lucide-react"
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
import { formatDate } from "@/lib/utils"

interface TrackingItem {
  id: string
  status: string
  hoursInStatus: number
  daysInStatus: number
  isStale: boolean
  barcode?: string
  qrCode?: string
  trackingNumber?: string
  courier?: string
  packagedAt?: string
  deliveredAt?: string
  lastStatusChangeAt?: string
  sale: { id: string; orderNumber: string; customerName?: string; createdAt: string; branch?: { name: string } }
  product: { id: string; name: string; sku: string; barcode?: string }
  statusSteps: { key: string; label: string; completed: boolean; active: boolean; stale: boolean }[]
}

const statusSteps = [
  { key: "pending", label: "Pending", icon: PackageOpen },
  { key: "packaging", label: "Packaging", icon: PackageCheck },
  { key: "packed", label: "Packed", icon: PackageCheck },
  { key: "handover", label: "Handover", icon: Handshake },
  { key: "delivered", label: "Delivered", icon: Truck },
]

export default function TrackingPage() {
  const [tracking, setTracking] = useState<TrackingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [scanInput, setScanInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => { loadTracking() }, [statusFilter])

  const loadTracking = async () => {
    setIsLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/tracking${params}`)
      const json = await res.json()
      if (json.data) setTracking(json.data)
    } catch (err) {
      console.error("Failed to load:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScanUpdate = async (item: TrackingItem, nextStatus: string) => {
    try {
      await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: item.sale.id,
          productId: item.product.id,
          status: nextStatus,
          barcode: item.product.barcode || undefined,
        }),
      })
      loadTracking()
    } catch (err) {
      console.error("Failed to update:", err)
    }
  }

  const filtered = tracking.filter((t) =>
    !scanInput || t.product.name.toLowerCase().includes(scanInput.toLowerCase()) ||
    t.product.sku.toLowerCase().includes(scanInput.toLowerCase()) ||
    t.sale.orderNumber.toLowerCase().includes(scanInput.toLowerCase())
  )

  const staleCount = tracking.filter((t) => t.isStale).length

  const nextStatusMap: Record<string, string> = {
    pending: "packaging",
    packaging: "packed",
    packed: "handover",
    handover: "delivered",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Order Tracking</h3>
          <p className="text-sm text-gray-500 mt-1">
            Track order status with timers — alerts shown when status stays &gt;3 days
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTracking} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {staleCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              {staleCount} order(s) stuck in same status for 3+ days
            </p>
            <p className="text-xs text-orange-600 mt-0.5">Check notifications for details and take action</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Status Flow</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusSteps.map((step, i) => (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <step.icon className="h-4 w-4 text-blue-600" />
                    </div>
                    {i < statusSteps.length - 1 && <div className="w-0.5 h-8 bg-gray-200" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{step.label}</p>
                    <p className="text-xs text-gray-500">
                      {step.key === "pending" ? "Order received" :
                       step.key === "packaging" ? "Being packaged" :
                       step.key === "packed" ? "Packed & labeled" :
                       step.key === "handover" ? "Handed to courier" :
                       "Delivered to customer"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Scan & Update Status</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search by order, product, or SKU..." value={scanInput} onChange={(e) => setScanInput(e.target.value)} className="pl-10" />
              </div>
            </div>

            {tracking.filter((t) => scanInput && (t.product.name.toLowerCase().includes(scanInput.toLowerCase()) || t.sale.orderNumber.toLowerCase().includes(scanInput.toLowerCase()))).length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tracking.filter((t) => scanInput && (t.product.name.toLowerCase().includes(scanInput.toLowerCase()) || t.sale.orderNumber.toLowerCase().includes(scanInput.toLowerCase()))).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{t.product.name}</p>
                      <p className="text-xs text-gray-500">{t.sale.orderNumber} — Current: {t.status}</p>
                    </div>
                    {nextStatusMap[t.status] && (
                      <Button size="sm" onClick={() => handleScanUpdate(t, nextStatusMap[t.status])}>
                        Move to {nextStatusMap[t.status]}
                      </Button>
                    )}
                    {t.status === "delivered" && <Badge variant="status" status="delivered">Completed</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Tracking List</CardTitle>
              {["", "pending", "packaging", "packed", "handover", "delivered"].map((s) => (
                <Badge key={s} variant={statusFilter === s ? "default" : "outline"}
                  className="cursor-pointer" onClick={() => setStatusFilter(s)}>
                  {s || "All"}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No tracking data yet. Orders will appear here as they progress.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const currentStepIdx = statusSteps.findIndex((s) => s.key === t.status)
                  return (
                    <TableRow key={t.id} className={t.isStale ? "bg-orange-50" : ""}>
                      <TableCell className="font-mono text-xs font-medium">{t.sale.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{t.product.name}</p>
                          <p className="text-xs text-gray-500">{t.product.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Badge variant="status" status={t.status}>
                            {t.isStale && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {t.status}
                          </Badge>
                          <div className="flex gap-1">
                            {statusSteps.map((s, i) => (
                              <div key={s.key} className={`w-4 h-1.5 rounded-full ${
                                i <= currentStepIdx ? (t.isStale ? "bg-orange-400" : "bg-blue-500") : "bg-gray-200"
                              }`} />
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.isStale ? (
                          <div className="flex items-center gap-1 text-orange-600">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">{t.daysInStatus}d</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {t.hoursInStatus > 24 ? `${t.daysInStatus}d` : `${t.hoursInStatus}h`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{t.courier || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{t.trackingNumber || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(t.lastStatusChangeAt || t.sale.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {nextStatusMap[t.status] && (
                          <Button size="sm" variant="outline"
                            onClick={() => handleScanUpdate(t, nextStatusMap[t.status])}
                            className="whitespace-nowrap">
                            {nextStatusMap[t.status] === "packaging" ? "Start Packing" :
                             nextStatusMap[t.status] === "packed" ? "Mark Packed" :
                             nextStatusMap[t.status] === "handover" ? "Hand Over" :
                             "Deliver"}
                          </Button>
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
    </div>
  )
}
