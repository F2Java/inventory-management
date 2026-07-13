"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

const warehouseTypes = [
  { label: "Main Warehouse", value: "MAIN" },
  { label: "Transit Warehouse", value: "TRANSIT" },
  { label: "Branch Warehouse", value: "BRANCH" },
]

export default function NewWarehousePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "MAIN",
    phone: "",
    address: "",
  })

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [field]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.code.trim() || !form.name.trim()) { setError("Warehouse code and name are required"); return }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          type: form.type,
          phone: form.phone,
          address: form.address,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create warehouse")
      router.push("/warehouses")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/warehouses" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Add New Warehouse</h3>
          <p className="text-sm text-gray-500 mt-1">Create a new warehouse location</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warehouse Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Warehouse Code <span className="text-red-500">*</span></label>
                <Input placeholder="e.g., WH-004" value={form.code} onChange={update("code")} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                <Input placeholder="Warehouse name" value={form.name} onChange={update("name")} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Type</label>
                <Select options={warehouseTypes} value={form.type} onChange={update("type")} placeholder="Select type" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input placeholder="Warehouse phone" value={form.phone} onChange={update("phone")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Warehouse address..." value={form.address} onChange={update("address")} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Link href="/warehouses"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSubmitting ? "Saving..." : "Save Warehouse"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
