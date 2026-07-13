"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Package, Eye, EyeOff, Loader2, Building2 } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ merchantCode: "", email: "", password: "" })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        merchantCode: form.merchantCode,
        email: form.email,
        password: form.password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === "Invalid merchant code") {
          setError("Invalid merchant code. Please check and try again.")
        } else {
          setError("Invalid email or password")
        }
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err: any) {
      if (err?.message?.includes("CSRF") || err?.message?.includes("csrf")) {
        setError("Session expired. Please refresh the page and try again.")
      } else {
        setError("An error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
              <p className="text-sm text-gray-500">Management System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Merchant Code */}
            <div className="space-y-2">
              <label htmlFor="merchantCode" className="text-sm font-medium text-gray-700">
                Merchant Code
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="merchantCode"
                  type="text"
                  placeholder="e.g. ACME"
                  value={form.merchantCode}
                  onChange={(e) => setForm({ ...form, merchantCode: e.target.value.toUpperCase() })}
                  required
                  className="w-full pl-10 uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@acme.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" className="rounded border-gray-300" />
                Remember me
              </label>
              <Link
                href="#"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            &copy; 2026 Inventory Platform &middot; Multi-tenant E-commerce Suite
          </p>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 items-center justify-center p-12">
        <div className="max-w-lg text-white">
          <h2 className="text-3xl font-bold mb-4">
            Complete Inventory Management Solution
          </h2>
          <p className="text-blue-100 mb-8 leading-relaxed">
            Manage multi-warehouse inventory, connect with Indonesia&apos;s top
            e-commerce platforms, handle procurement, payroll, and financial
            accounting — all in one platform.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              "Multi E-Commerce Integration",
              "Warehouse Management",
              "Procurement & PO",
              "Financial Accounting",
              "Payroll & Attendance",
              "Real-time Reports",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 text-sm bg-white/10 rounded-lg px-4 py-3 backdrop-blur-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
