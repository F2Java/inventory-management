"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Plug, Globe, Building2, Package, Loader2 } from "lucide-react"

interface Warehouse { id: string; code: string; name: string; type: string }

const platforms = [
  { label: "Tokopedia", value: "TOKOPEDIA" },
  { label: "Shopee", value: "SHOPEE" },
  { label: "Bukalapak", value: "BUKALAPAK" },
  { label: "Lazada", value: "LAZADA" },
  { label: "Blibli", value: "BLIBLI" },
  { label: "None (Offline Store)", value: "NONE" },
]

export default function NewBranchPage() {
  const router = useRouter()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([])
  const [hasConnector, setHasConnector] = useState(false)
  const [platform, setPlatform] = useState("")
  const [storeName, setStoreName] = useState("")
  const [apiEndpoint, setApiEndpoint] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")

  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((j) => { if (j.data) setWarehouses(j.data) })
      .catch(console.error)
  }, [])

  const toggleWarehouse = (id: string) => {
    setSelectedWarehouses((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!code || !name) { setError("Code and name are required"); return }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code, name, address, phone, email,
          warehouseIds: selectedWarehouses,
          platform: hasConnector ? platform : "NONE",
          apiEndpoint, apiKey, apiSecret, storeName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed")
      router.push("/branches")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/branches" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></Link>
        <div><h3 className="text-lg font-medium text-gray-900">Add New Branch</h3><p className="text-sm text-gray-500 mt-1">Link warehouses and connect an e-commerce platform</p></div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-500" /> Branch Information</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Branch Code <span className="text-red-500">*</span></label>
                <Input placeholder="e.g., BR-005" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Branch Name <span className="text-red-500">*</span></label>
                <Input placeholder="Branch name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input type="email" placeholder="branch@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Branch address..." value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            {/* Warehouse Selection */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                Link Warehouses — Stock auto-syncs from linked warehouses to this branch
              </h4>
              {warehouses.length === 0 ? (
                <p className="text-sm text-gray-400">No warehouses available. Create warehouses first.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {warehouses.map((wh) => (
                    <label
                      key={wh.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedWarehouses.includes(wh.id) ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input type="checkbox" checked={selectedWarehouses.includes(wh.id)} onChange={() => toggleWarehouse(wh.id)} className="rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{wh.name}</p>
                        <p className="text-xs text-gray-500">{wh.code} — {wh.type}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* E-Commerce Connector */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  E-Commerce Connector
                </h4>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={hasConnector} onChange={(e) => setHasConnector(e.target.checked)} className="rounded" />
                  Connect to e-commerce platform
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">Rule: One branch = one API connector. Stock auto-syncs to this platform.</p>
              {hasConnector && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Platform <span className="text-red-500">*</span></label>
                    <Select options={platforms} value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Select platform" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Store Name</label>
                    <Input placeholder="Store name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">API Key <span className="text-red-500">*</span></label>
                    <Input type="password" placeholder="API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">API Secret</label>
                    <Input type="password" placeholder="API secret" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700">API Endpoint</label>
                    <Input placeholder="https://api.platform.com/v2" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/branches"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Branch
          </Button>
        </div>
      </form>
    </div>
  )
}
