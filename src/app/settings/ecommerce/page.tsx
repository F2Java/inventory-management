"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Globe, Plug, Key, RefreshCw, Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Connector {
  id: string
  platform: string
  storeName: string | null
  apiEndpoint: string
  isActive: boolean
  lastSyncAt: string | null
  syncInterval: number
  branchId: string
  branch: { id: string; code: string; name: string }
  productCount: number
  orderCount: number
  lastSyncLog: { status: string; message: string | null; completedAt: string | null; startedAt: string } | null
}

interface Branch {
  id: string
  code: string
  name: string
}

const platformOptions = [
  { label: "Tokopedia", value: "TOKOPEDIA" },
  { label: "Shopee", value: "SHOPEE" },
  { label: "Bukalapak", value: "BUKALAPAK" },
  { label: "Lazada", value: "LAZADA" },
  { label: "Blibli", value: "BLIBLI" },
  { label: "Other", value: "OTHER" },
]

export default function EcommerceSettingsPage() {
  const router = useRouter()
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)

  // New connector form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newPlatform, setNewPlatform] = useState("")
  const [newBranchId, setNewBranchId] = useState("")
  const [newStoreName, setNewStoreName] = useState("")
  const [newApiEndpoint, setNewApiEndpoint] = useState("")
  const [newApiKey, setNewApiKey] = useState("")
  const [newApiSecret, setNewApiSecret] = useState("")
  const [newSyncInterval, setNewSyncInterval] = useState("15")
  const [newFormError, setNewFormError] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [connRes, branchRes] = await Promise.all([
        fetch("/api/ecommerce/connectors"),
        fetch("/api/branches"),
      ])
      const connJson = await connRes.json()
      const branchJson = await branchRes.json()
      if (connJson.data) setConnectors(connJson.data)
      if (branchJson.data) setBranches(branchJson.data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSync = async (connectorId: string) => {
    setIsSyncing(connectorId)
    setSyncResult(null)
    try {
      const res = await fetch("/api/ecommerce/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectorId, syncType: "products" }),
      })
      const json = await res.json()
      setSyncResult({ success: json.success, message: json.message || "Sync completed" })
      loadData()
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message })
    } finally {
      setIsSyncing(null)
    }
  }

  const handleBulkStockSync = async () => {
    setIsSyncing("bulk")
    setSyncResult(null)
    try {
      const res = await fetch("/api/ecommerce/stock-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true }),
      })
      const json = await res.json()
      setSyncResult({
        success: json.success,
        message: `Bulk sync: ${json.productsSynced} products synced, ${json.totalErrors} errors`,
      })
      loadData()
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message })
    } finally {
      setIsSyncing(null)
    }
  }

  const handleCreateConnector = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewFormError("")
    if (!newPlatform || !newBranchId || !newApiEndpoint || !newApiKey) {
      setNewFormError("Platform, branch, API endpoint, and API key are required")
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch("/api/ecommerce/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: newPlatform,
          branchId: newBranchId,
          storeName: newStoreName || undefined,
          apiEndpoint: newApiEndpoint,
          apiKey: newApiKey,
          apiSecret: newApiSecret || undefined,
          syncInterval: parseInt(newSyncInterval),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create connector")
      setShowNewForm(false)
      resetNewForm()
      loadData()
    } catch (err: any) {
      setNewFormError(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const resetNewForm = () => {
    setNewPlatform("")
    setNewBranchId("")
    setNewStoreName("")
    setNewApiEndpoint("")
    setNewApiKey("")
    setNewApiSecret("")
    setNewSyncInterval("15")
    setNewFormError("")
  }

  const getPlatformStatus = (c: Connector) => {
    if (!c.isActive) return "disconnected"
    if (c.lastSyncLog?.status === "failed") return "error"
    return "connected"
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">E-Commerce Settings</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure API connectors for e-commerce platforms (one connector per branch)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkStockSync}
            disabled={isSyncing === "bulk"}
            className="flex items-center gap-2"
          >
            {isSyncing === "bulk" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync All Stock
          </Button>
          <Button size="sm" onClick={() => setShowNewForm(!showNewForm)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {showNewForm ? "Cancel" : "Add Connector"}
          </Button>
        </div>
      </div>

      {syncResult && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
            syncResult.success
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {syncResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {syncResult.message}
        </div>
      )}

      {/* New Connector Form */}
      {showNewForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Add New E-Commerce Connector</CardTitle></CardHeader>
          <CardContent>
            {newFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {newFormError}
              </div>
            )}
            <form onSubmit={handleCreateConnector} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Platform <span className="text-red-500">*</span></label>
                  <Select
                    options={platformOptions}
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    placeholder="Select platform"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Branch <span className="text-red-500">*</span></label>
                  <Select
                    options={branches.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }))}
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    placeholder="Select branch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Store Name</label>
                  <Input
                    placeholder="My Store"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Sync Interval (minutes)</label>
                  <Select
                    options={[
                      { label: "Every 5 minutes", value: "5" },
                      { label: "Every 15 minutes", value: "15" },
                      { label: "Every 30 minutes", value: "30" },
                      { label: "Every hour", value: "60" },
                    ]}
                    value={newSyncInterval}
                    onChange={(e) => setNewSyncInterval(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">API Endpoint <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="https://api.platform.com/v2"
                    value={newApiEndpoint}
                    onChange={(e) => setNewApiEndpoint(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">API Key <span className="text-red-500">*</span></label>
                  <Input
                    type="password"
                    placeholder="Enter API key"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">API Secret</label>
                  <Input
                    type="password"
                    placeholder="Enter API secret"
                    value={newApiSecret}
                    onChange={(e) => setNewApiSecret(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isCreating} className="flex items-center gap-2">
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                  Connect Platform
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Connector List */}
      <div className="grid grid-cols-1 gap-6">
        {connectors.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Globe className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-medium text-gray-500">No e-commerce connectors configured</p>
            <p className="text-sm mt-1">Connect your first platform to enable multi-channel stock sync</p>
          </div>
        ) : (
          connectors.map((c) => {
            const status = getPlatformStatus(c)
            return (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Globe className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {c.platform}
                          {c.storeName && (
                            <span className="text-sm font-normal text-gray-500">— {c.storeName}</span>
                          )}
                        </CardTitle>
                        <p className="text-xs text-gray-400">
                          Branch: {c.branch.name} ({c.branch.code})
                        </p>
                      </div>
                      <Badge
                        variant="status"
                        status={status === "connected" ? "active" : status === "disconnected" ? "inactive" : "destructive"}
                      >
                        {status === "connected" ? (
                          <><Plug className="h-3 w-3 mr-1" /> Connected</>
                        ) : status === "disconnected" ? (
                          "Disconnected"
                        ) : (
                          <><AlertCircle className="h-3 w-3 mr-1" /> Error</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(c.id)}
                        disabled={isSyncing === c.id}
                        className="flex items-center gap-2"
                      >
                        {isSyncing === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Sync Now
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">API Endpoint</p>
                      <p className="text-sm font-mono truncate">{c.apiEndpoint}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Sync Interval</p>
                      <p className="text-sm">Every {c.syncInterval} min</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Orders Synced</p>
                      <p className="text-sm font-medium">{c.orderCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Last Sync</p>
                      <p className="text-sm">{c.lastSyncAt ? formatDate(c.lastSyncAt) : "Never"}</p>
                    </div>
                  </div>
                  {c.lastSyncLog && (
                    <div
                      className={`text-xs px-3 py-2 rounded ${
                        c.lastSyncLog.status === "success"
                          ? "bg-green-50 text-green-700"
                          : c.lastSyncLog.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      Latest sync: {c.lastSyncLog.message || c.lastSyncLog.status} —{' '}
                      {c.lastSyncLog.completedAt
                        ? formatDate(c.lastSyncLog.completedAt)
                        : formatDate(c.lastSyncLog.startedAt)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
