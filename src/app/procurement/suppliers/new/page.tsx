"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Building2 } from "lucide-react"

const paymentTerms = [
  { label: "Net 7 Days", value: "net7" },
  { label: "Net 15 Days", value: "net15" },
  { label: "Net 30 Days", value: "net30" },
  { label: "Net 45 Days", value: "net45" },
  { label: "Net 60 Days", value: "net60" },
  { label: "Cash on Delivery", value: "cod" },
  { label: "Cash Before Delivery", value: "cbd" },
]

export default function NewSupplierPage() {
  const router = useRouter()
  const [form, setForm] = useState({ code: "", name: "", contactPerson: "", email: "", phone: "", address: "", taxId: "", paymentTerms: "", bankName: "", bankAccount: "", notes: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.code || !form.name) { setError("Code and name are required"); return }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create")
      router.push("/procurement/suppliers")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/procurement/suppliers" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></Link>
        <div><h3 className="text-lg font-medium text-gray-900">Add Supplier</h3><p className="text-sm text-gray-500 mt-1">Register a new supplier</p></div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-500" /> Supplier Information</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Supplier Code <span className="text-red-500">*</span></label>
                <Input placeholder="e.g., SUP-001" value={form.code} onChange={update("code")} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company Name <span className="text-red-500">*</span></label>
                <Input placeholder="PT Supplier Nusantara" value={form.name} onChange={update("name")} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Contact Person</label>
                <Input placeholder="John Doe" value={form.contactPerson} onChange={update("contactPerson")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input type="email" placeholder="supplier@example.com" value={form.email} onChange={update("email")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input placeholder="+62 21 1234 5678" value={form.phone} onChange={update("phone")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tax ID (NPWP)</label>
                <Input placeholder="XX.XXX.XXX.X-XXX.XXX" value={form.taxId} onChange={update("taxId")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Terms</label>
                <Select options={paymentTerms} value={form.paymentTerms} onChange={update("paymentTerms")} placeholder="Select terms" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Bank Name</label>
                <Input placeholder="Bank BCA" value={form.bankName} onChange={update("bankName")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Bank Account</label>
                <Input placeholder="123-456-7890" value={form.bankAccount} onChange={update("bankAccount")} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Supplier address..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Link href="/procurement/suppliers"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2"><Save className="h-4 w-4" /> {isSubmitting ? "Saving..." : "Save Supplier"}</Button>
        </div>
      </form>
    </div>
  )
}
