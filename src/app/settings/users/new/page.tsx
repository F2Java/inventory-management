"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Loader2, Eye, EyeOff } from "lucide-react"

interface RoleOption {
  id: string
  name: string
  description?: string
}

const roleEnumOptions = [
  { label: "Super Admin", value: "SUPER_ADMIN" },
  { label: "Admin", value: "ADMIN" },
  { label: "Manager", value: "MANAGER" },
  { label: "Staff", value: "STAFF" },
  { label: "Cashier", value: "CASHIER" },
  { label: "Warehouse Staff", value: "WAREHOUSE_STAFF" },
]

export default function NewUserPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("STAFF")
  const [roleId, setRoleId] = useState("")
  const [branchId, setBranchId] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/roles").then(r => r.json()),
      fetch("/api/branches").then(r => r.json()),
    ]).then(([rolesJson, branchJson]) => {
      if (rolesJson.data) setRoles(rolesJson.data)
      if (branchJson.data) setBranches(branchJson.data)
    }).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!name || !email || !password) {
      setError("Name, email, and password are required")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone, role, roleId: roleId || null, branchId: branchId || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create user")
      router.push("/settings/users")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/settings/users" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></Link>
        <div><h3 className="text-lg font-medium text-gray-900">Add User</h3><p className="text-sm text-gray-500 mt-1">Create a new user account with role-based permissions</p></div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">User Details</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                <Input type="email" placeholder="john@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input placeholder="+62 812 3456 7890" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role Level</label>
                <Select options={roleEnumOptions} value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role Template (permissions)</label>
                <Select options={[{ label: "No template", value: "" }, ...roles.map((r) => ({ label: r.name, value: r.id }))]} value={roleId} onChange={(e) => setRoleId(e.target.value)} placeholder="Select role template" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Branch</label>
                <Select options={[{ label: "No branch", value: "" }, ...branches.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }))]} value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="Select branch" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/settings/users"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Create User
          </Button>
        </div>
      </form>
    </div>
  )
}
