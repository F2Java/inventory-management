"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2, Eye, EyeOff, Shield } from "lucide-react"

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

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [isLoading, setIsLoading] = useState(true)
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
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${id}`).then(r => r.json()),
      fetch("/api/roles").then(r => r.json()),
      fetch("/api/branches").then(r => r.json()),
    ]).then(([userJson, rolesJson, branchJson]) => {
      if (userJson.data) {
        const u = userJson.data
        setName(u.name || "")
        setEmail(u.email || "")
        setPhone(u.phone || "")
        setRole(u.role || "STAFF")
        setRoleId(u.roleId || "")
        setBranchId(u.branchId || "")
        setIsActive(u.isActive !== false)
      }
      if (rolesJson.data) setRoles(rolesJson.data)
      if (branchJson.data) setBranches(branchJson.data)
    }).catch((err) => setError(err.message))
    .finally(() => setIsLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const body: any = { name, email, phone, role, roleId: roleId || null, branchId: branchId || null, isActive }
      if (password) body.password = password
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update")
      router.push("/settings/users")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsSubmitting(false) }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/settings/users" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></Link>
        <div><h3 className="text-lg font-medium text-gray-900">Edit User</h3><p className="text-sm text-gray-500 mt-1">Update user details and permissions</p></div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">User Details</CardTitle>
              <Badge variant="status" status={isActive ? "active" : "inactive"}>{isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">New Password</label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Leave blank to keep current" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role Level</label>
                <Select options={roleEnumOptions} value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role Template (permissions)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select options={[{ label: "No template", value: "" }, ...roles.map((r) => ({ label: r.name, value: r.id }))]} value={roleId} onChange={(e) => setRoleId(e.target.value)} placeholder="Select role" />
                  </div>
                  <Link href="/settings/roles">
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Manage Roles & Permissions">
                      <Shield className="h-4 w-4 text-blue-600" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Branch</label>
                <Select options={[{ label: "No branch", value: "" }, ...branches.map((b) => ({ label: `${b.name} (${b.code})`, value: b.id }))]} value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="Select branch" />
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                  Active account
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/settings/users"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Update User
          </Button>
        </div>
      </form>
    </div>
  )
}
