"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Building2, Loader2 } from "lucide-react"

const paymentTerms = [
  { label: "Net 7", value: "net7" }, { label: "Net 15", value: "net15" },
  { label: "Net 30", value: "net30" }, { label: "Net 45", value: "net45" },
  { label: "Net 60", value: "net60" }, { label: "COD", value: "cod" },
  { label: "CBD", value: "cbd" },
]

export default function EditSupplierPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [form, setForm] = useState({ code: "", name: "", contactPerson: "", email: "", phone: "", address: "", taxId: "", paymentTerms: "", bankName: "", bankAccount: "", notes: "", isActive: true })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/suppliers/${id}`)
        const json = await res.json()
        if (json.data) {
          const s = json.data
          setForm({ code: s.code, name: s.name, contactPerson: s.contactPerson || "", email: s.email || "", phone: s.phone || "", address: s.address || "", taxId: s.taxId || "", paymentTerms: s.paymentTerms || "", bankName: s.bankName || "", bankAccount: s.bankAccount || "", notes: s.notes || "", isActive: s.isActive })
        }
      } catch { setError("Failed to load supplier") }
      finally { setIsLoading(false) }
    }
    load()
  }, [id])

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/suppliers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Update failed")
      router.push("/procurement/suppliers")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/procurement/suppliers" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></Link>
        <div><h3 className="text-lg font-medium text-gray-900">Edit Supplier</h3><p className="text-sm text-gray-500 mt-1">{form.code} — {form.name}</p></div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-500" /> Supplier Information</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Code <span className="text-red-500">*</span></label>
                <Input value={form.code} onChange={update("code")} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company <span className="text-red-500">*</span></label>
                <Input value={form.name} onChange={update("name")} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Contact</label>
                <Input value={form.contactPerson} onChange={update("contactPerson")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input type="email" value={form.email} onChange={update("email")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input value={form.phone} onChange={update("phone")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tax ID</label>
                <Input value={form.taxId} onChange={update("taxId")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Payment Terms</label>
                <Select options={paymentTerms} value={form.paymentTerms} onChange={update("paymentTerms")} placeholder="Select" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} value={String(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Bank</label>
                <Input value={form.bankName} onChange={update("bankName")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Account</label>
                <Input value={form.bankAccount} onChange={update("bankAccount")} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/procurement/suppliers"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2"><Save className="h-4 w-4" /> {isSubmitting ? "Saving..." : "Update Supplier"}</Button>
        </div>
      </form>
    </div>
  )
}
