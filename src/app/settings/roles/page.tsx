"use client"

import { useState, useEffect } from "react"
import { Plus, Shield, Loader2, Save, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Permission {
  id: string
  feature: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  trackingStatusPermissions?: Record<string, boolean>
}

interface Role {
  id: string
  name: string
  description?: string
  isSystem: boolean
  permissions: Permission[]
  _count: { users: number }
}

const FEATURES = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "products", label: "Products", icon: "📦" },
  { key: "inventory", label: "Inventory", icon: "🏭" },
  { key: "warehouses", label: "Warehouses", icon: "🏗️" },
  { key: "procurement", label: "Procurement", icon: "🛒" },
  { key: "sales", label: "Sales", icon: "📈" },
  { key: "branches", label: "Branches", icon: "🏪" },
  { key: "accounting", label: "Accounting", icon: "💰" },
  { key: "employees", label: "Employees", icon: "👥" },
  { key: "payroll", label: "Payroll", icon: "⏰" },
  { key: "tracking", label: "Tracking", icon: "📋" },
  { key: "reports", label: "Reports", icon: "📄" },
  { key: "settings", label: "Settings", icon: "⚙️" },
  { key: "users_roles", label: "Users & Roles", icon: "🔐" },
  { key: "activity_logs", label: "Activity Logs", icon: "📋" },
  { key: "subscription", label: "Subscription", icon: "💳" },
]

const ACTION_LABELS: Record<string, string> = {
  canView: "View",
  canCreate: "Create",
  canEdit: "Edit",
  canDelete: "Delete",
}

function PermissionToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className={`text-[11px] font-medium ${checked ? "text-blue-700" : "text-gray-400"} group-hover:text-gray-700 transition-colors`}>
        {label}
      </span>
    </label>
  )
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { loadRoles() }, [])

  const loadRoles = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/roles")
      const json = await res.json()
      if (json.data) setRoles(json.data)
    } catch (err) { console.error("Failed to load:", err) }
    finally { setIsLoading(false) }
  }

  const togglePermission = (roleId: string, feature: string, action: keyof Permission, value: boolean) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r
        return {
          ...r,
          permissions: r.permissions.map((p) =>
            p.feature === feature ? { ...p, [action]: value } : p
          ),
        }
      })
    )
  }

  const savePermissions = async (role: Role) => {
    setSavingId(role.id)
    setError("")
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: role.permissions.map((p) => ({
            feature: p.feature,
            canView: p.canView,
            canCreate: p.canCreate,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            trackingStatusPermissions: (p as any).trackingStatusPermissions,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
    } catch (err: any) { setError(err.message) }
    finally { setSavingId(null) }
  }

  const getPermission = (role: Role, feature: string) => {
    return role.permissions.find((p) => p.feature === feature)
  }

  const hasAllView = (role: Role) => role.permissions.every((p) => p.canView)
  const hasAllCreate = (role: Role) => role.permissions.every((p) => p.canCreate)

  const toggleAllForRole = (role: Role, action: keyof Permission, value: boolean) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== role.id) return r
        return {
          ...r,
          permissions: r.permissions.map((p) => ({ ...p, [action]: value })),
        }
      })
    )
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName) return
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create")
      setShowNewForm(false)
      setNewName("")
      setNewDesc("")
      loadRoles()
    } catch (err: any) { setError(err.message) }
    finally { setCreating(false) }
  }

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      alert("System roles cannot be deleted.")
      return
    }
    if (!confirm(`Delete role "${role.name}"? This will unassign ${role._count.users} user(s).`)) return
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete")
      loadRoles()
    } catch (err: any) { alert(err.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Roles & Permissions</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "Loading..." : `${roles.length} roles — configure granular permissions per feature`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNewForm(!showNewForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> {showNewForm ? "Cancel" : "New Role"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {showNewForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create New Role</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRole} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700">Role Name <span className="text-red-500">*</span></label>
                <Input placeholder="e.g., HR Manager" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Input placeholder="Human resources management" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <Button type="submit" disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
      ) : roles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-base font-medium text-gray-500">No roles configured</p>
          <p className="text-sm mt-1">Create a role to start defining permissions</p>
        </div>
      ) : (
        <div className="space-y-6">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {role.name}
                        {role.isSystem && <Badge variant="outline" className="text-[10px]">System</Badge>}
                      </CardTitle>
                      {role.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">{role._count.users} user(s)</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => savePermissions(role)}
                      disabled={savingId === role.id}
                      className="flex items-center gap-2"
                    >
                      {savingId === role.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save
                    </Button>
                    {!role.isSystem && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteRole(role)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Bulk actions */}
                <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Bulk:</span>
                  <button
                    onClick={() => toggleAllForRole(role, "canView", !hasAllView(role))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {hasAllView(role) ? "Uncheck All View" : "Check All View"}
                  </button>
                  <button
                    onClick={() => toggleAllForRole(role, "canCreate", !hasAllCreate(role))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {hasAllCreate(role) ? "Uncheck All Create" : "Check All Create"}
                  </button>
                </div>

                {/* Permission grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-4 font-medium text-gray-500 text-xs">Feature</th>
                        {["canView", "canCreate", "canEdit", "canDelete"].map((action) => (
                          <th key={action} className="text-center py-2 px-2 font-medium text-gray-500 text-xs uppercase tracking-wider">
                            {ACTION_LABELS[action]}
                          </th>
                        ))}
                        <th className="text-center py-2 px-1 font-medium text-gray-500 text-xs uppercase tracking-wider">
                          Tracking<br/>Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURES.map((feat) => {
                        const perm = getPermission(role, feat.key)
                        const isTracking = feat.key === "tracking"
                        const trackingPerms = (perm as any)?.trackingStatusPermissions || {}
                        return (
                          <tr key={feat.key} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-2.5 pr-4">
                              <span className="text-sm font-medium text-gray-700">
                                {feat.icon} {feat.label}
                              </span>
                            </td>
                            {(["canView", "canCreate", "canEdit", "canDelete"] as const).map((action) => (
                              <td key={action} className="text-center py-2.5 px-2">
                                <PermissionToggle
                                  label=""
                                  checked={perm?.[action] ?? false}
                                  onChange={(v) => togglePermission(role.id, feat.key, action, v)}
                                />
                              </td>
                            ))}
                            {/* Tracking status permissions column */}
                            <td className="text-center py-2.5 px-1">
                              {isTracking ? (
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {["pending", "packaging", "packed", "handover", "delivered"].map((status) => {
                                    const checked = trackingPerms[status] === true
                                    return (
                                      <label
                                        key={status}
                                        className={`flex items-center gap-0.5 px-1 py-0.5 rounded cursor-pointer text-[10px] transition-colors ${
                                          checked ? "bg-blue-50 text-blue-700" : "text-gray-400 hover:text-gray-600"
                                        }`}
                                        title={`Permission to update to "${status}"`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            const newPerms = { ...trackingPerms, [status]: e.target.checked }
                                            togglePermission(role.id, feat.key, "trackingStatusPermissions" as any, newPerms as any)
                                          }}
                                          className="w-2.5 h-2.5 rounded border-gray-300 text-blue-600"
                                        />
                                        {status.slice(0, 3)}
                                      </label>
                                    )
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-200 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
