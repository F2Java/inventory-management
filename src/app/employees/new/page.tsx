"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

const departments = [
  { label: "Warehouse", value: "Warehouse" },
  { label: "Sales", value: "Sales" },
  { label: "Finance", value: "Finance" },
  { label: "HR", value: "HR" },
  { label: "Marketing", value: "Marketing" },
  { label: "IT", value: "IT" },
]

const payTypes = [
  { label: "Monthly", value: "MONTHLY" },
  { label: "Daily", value: "DAILY" },
]

export default function NewEmployeePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    baseSalary: "",
    payType: "MONTHLY",
    bankName: "",
    bankAccount: "",
    taxId: "",
    joinDate: "",
    address: "",
  })

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [field]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.name.trim()) { setError("Full name is required"); return }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone,
          position: form.position,
          department: form.department,
          baseSalary: form.baseSalary,
          payType: form.payType,
          bankName: form.bankName,
          bankAccount: form.bankAccount,
          taxId: form.taxId,
          joinDate: form.joinDate || undefined,
          address: form.address,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create employee")
      router.push("/employees")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/employees" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Add New Employee</h3>
          <p className="text-sm text-gray-500 mt-1">Register a new employee</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                <Input placeholder="Employee name" value={form.name} onChange={update("name")} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input type="email" placeholder="employee@company.com" value={form.email} onChange={update("email")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input placeholder="Phone number" value={form.phone} onChange={update("phone")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Position</label>
                <Input placeholder="Job position" value={form.position} onChange={update("position")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <Select options={departments} value={form.department} onChange={update("department")} placeholder="Select department" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pay Type</label>
                <Select options={payTypes} value={form.payType} onChange={update("payType")} placeholder="Select pay type" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Base Salary</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                  <Input className="pl-10" type="number" placeholder="0" value={form.baseSalary} onChange={update("baseSalary")} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Bank Name</label>
                <Input placeholder="e.g., BCA" value={form.bankName} onChange={update("bankName")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Bank Account</label>
                <Input placeholder="Account number" value={form.bankAccount} onChange={update("bankAccount")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Tax ID (NPWP)</label>
                <Input placeholder="Tax ID" value={form.taxId} onChange={update("taxId")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Join Date</label>
                <Input type="date" value={form.joinDate} onChange={update("joinDate")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Employee address..." value={form.address} onChange={update("address")} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Link href="/employees"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSubmitting ? "Saving..." : "Save Employee"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
