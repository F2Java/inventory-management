"use client"

import { useState } from "react"
import Link from "next/link"
import { Store, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function B2BRegisterPage() {
  const [form, setForm] = useState({ companyName: "", contactPerson: "", email: "", phone: "", password: "", confirmPassword: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!form.companyName || !form.contactPerson || !form.email || !form.password) { setError("Please fill in all required fields"); return }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/b2b/customers/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: form.companyName, contactPerson: form.contactPerson, email: form.email, phone: form.phone, password: form.password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Registration failed")
      setSuccess(true)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="h-8 w-8 text-green-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">Registration Submitted!</h1>
          <p className="text-gray-500 mt-2">Thank you for registering. Your account is pending approval.</p>
          <p className="text-sm text-gray-400 mt-1">We will notify you via email once your account is activated.</p>
          <Link href="/shop/auth/login"><Button className="mt-6">Go to Sign In</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4"><Store className="h-6 w-6 text-white" /></div>
          <h1 className="text-2xl font-bold text-gray-900">B2B Registration</h1>
          <p className="text-sm text-gray-500 mt-1">Register your company for wholesale ordering</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">Company Name *</label><Input placeholder="PT Maju Bersama" value={form.companyName} onChange={handleChange("companyName")} required /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">Contact Person *</label><Input placeholder="John Doe" value={form.contactPerson} onChange={handleChange("contactPerson")} required /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">Email *</label><Input type="email" placeholder="john@company.com" value={form.email} onChange={handleChange("email")} required /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">Phone</label><Input placeholder="+62 812 3456 7890" value={form.phone} onChange={handleChange("phone")} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Password *</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={form.password} onChange={handleChange("password")} required className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>
            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700">Confirm Password *</label><Input type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange("confirmPassword")} required /></div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{loading ? "Registering..." : "Create Account"}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">Already have an account? <Link href="/shop/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link></p>
      </div>
    </div>
  )
}
