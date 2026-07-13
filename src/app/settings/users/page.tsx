"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Shield, UserCheck, UserX, Loader2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

interface UserItem {
  id: string
  email: string
  name: string
  phone?: string
  role: string
  isActive: boolean
  roleId?: string
  roleObj?: { id: string; name: string; description?: string }
  branch?: { id: string; name: string; code: string }
  createdAt: string
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  CASHIER: "Cashier",
  WAREHOUSE_STAFF: "Warehouse Staff",
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "active",
  ADMIN: "active",
  MANAGER: "approved",
  STAFF: "inactive",
  CASHIER: "pending",
  WAREHOUSE_STAFF: "processing",
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/users")
      const json = await res.json()
      if (json.data) setUsers(json.data)
    } catch (err) { console.error("Failed to load:", err) }
    finally { setIsLoading(false) }
  }

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Users</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "Loading..." : `${users.length} users in your organization`}
          </p>
        </div>
        <Link href="/settings/users/new">
          <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add User</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Users</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {search ? "No users match your search." : "No users yet. Add your first user."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Role Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                          {u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="status" status={roleColors[u.role] || "inactive"}>
                        {roleLabels[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.roleObj ? (
                        <Badge variant="outline">{u.roleObj.name}</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge variant="status" status="active"><UserCheck className="h-3 w-3 mr-1" /> Active</Badge>
                      ) : (
                        <Badge variant="status" status="inactive"><UserX className="h-3 w-3 mr-1" /> Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{u.branch?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/settings/users/${u.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
