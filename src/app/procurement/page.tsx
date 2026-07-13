"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingCart, Users, FileText, AlertTriangle, ClipboardList, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

export default function ProcurementPage() {
  const [stats, setStats] = useState({ pendingRequests: 0, pendingPOs: 0, totalSuppliers: 0 })

  useEffect(() => {
    async function loadStats() {
      try {
        const [reqRes, poRes, supRes] = await Promise.all([
          fetch("/api/stock-requests?status=PENDING"),
          fetch("/api/procurement/purchase-orders"),
          fetch("/api/suppliers"),
        ])
        const reqJson = await reqRes.json()
        const poJson = await poRes.json()
        const supJson = await supRes.json()
        setStats({
          pendingRequests: reqJson.data?.length || 0,
          pendingPOs: poJson.data?.filter((p: any) => ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(p.status)).length || 0,
          totalSuppliers: supJson.data?.length || 0,
        })
      } catch (err) {
        console.error(err)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Procurement</h3>
        <p className="text-sm text-gray-500 mt-1">Manage stock requests, purchase orders, and suppliers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/procurement/stock-requests">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-orange-600" />
                </div>
                <Badge variant={stats.pendingRequests > 0 ? "status" : "outline"} status={stats.pendingRequests > 0 ? "pending" : "inactive"}>
                  {stats.pendingRequests} pending
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Stock Requests</h4>
              <p className="text-xs text-gray-500 mt-1">Warehouse replenishment requests awaiting action</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/procurement/purchase-orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <Badge variant={stats.pendingPOs > 0 ? "status" : "outline"} status={stats.pendingPOs > 0 ? "active" : "inactive"}>
                  {stats.pendingPOs} active
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Purchase Orders</h4>
              <p className="text-xs text-gray-500 mt-1">Active and pending purchase orders</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/procurement/suppliers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-lg font-bold text-gray-900">{stats.totalSuppliers}</span>
              </div>
              <h4 className="text-sm font-semibold text-gray-900">Suppliers</h4>
              <p className="text-xs text-gray-500 mt-1">Connected suppliers for purchase orders</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Link href="/procurement/stock-requests" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Process Stock Requests</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link href="/procurement/purchase-orders/new" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Create New PO</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link href="/procurement/suppliers/new" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Add Supplier</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Procurement Workflow</h4>
            <div className="space-y-4">
              {[
                { step: "1", title: "Stock Request", desc: "Warehouse detects low stock → auto-generates request" },
                { step: "2", title: "Procurement Review", desc: "Procurement approves request → generates PO" },
                { step: "3", title: "Receiving", desc: "Warehouse receives goods with photo proof → stock updated" },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-600">{s.step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{s.title}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
