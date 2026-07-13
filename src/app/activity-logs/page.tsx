"use client"

import { useState, useEffect } from "react"
import { Search, Filter, RefreshCw, Loader2, Clock, User, FileText, Info, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, QrCode, Globe, DollarSign, Shield, Package, ShoppingCart, Warehouse, Building2, Users, Settings, LogIn, LogOut, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

interface ActivityLog {
  id: string
  action: string
  entity: string
  entityId?: string
  details?: Record<string, any> | null
  ipAddress?: string
  createdAt: string
  user?: { id: string; name: string; email: string; avatar?: string } | null
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  update: <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />,
  delete: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  login: <LogIn className="h-3.5 w-3.5 text-blue-500" />,
  logout: <LogOut className="h-3.5 w-3.5 text-gray-500" />,
  export: <ArrowUpRight className="h-3.5 w-3.5 text-purple-500" />,
  approve: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  reject: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  send: <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />,
  receive: <ArrowDownRight className="h-3.5 w-3.5 text-green-500" />,
  sync: <RefreshCw className="h-3.5 w-3.5 text-purple-500" />,
  status_change: <Info className="h-3.5 w-3.5 text-orange-500" />,
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  product: <Package className="h-3.5 w-3.5" />,
  sale: <ShoppingCart className="h-3.5 w-3.5" />,
  purchase_order: <FileText className="h-3.5 w-3.5" />,
  supplier: <Users className="h-3.5 w-3.5" />,
  stock_request: <FileText className="h-3.5 w-3.5" />,
  warehouse: <Warehouse className="h-3.5 w-3.5" />,
  branch: <Building2 className="h-3.5 w-3.5" />,
  employee: <Users className="h-3.5 w-3.5" />,
  expense: <DollarSign className="h-3.5 w-3.5" />,
  payroll: <DollarSign className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  role: <Shield className="h-3.5 w-3.5" />,
  inventory: <Package className="h-3.5 w-3.5" />,
  tracking: <QrCode className="h-3.5 w-3.5" />,
  ecommerce: <Globe className="h-3.5 w-3.5" />,
  setting: <Settings className="h-3.5 w-3.5" />,
}

const ACTION_COLORS: Record<string, string> = {
  create: "active",
  update: "active",
  delete: "cancelled",
  login: "active",
  logout: "inactive",
  export: "processing",
  approve: "delivered",
  reject: "cancelled",
  send: "active",
  receive: "delivered",
  sync: "processing",
  status_change: "pending",
}

const ENTITY_LABELS: Record<string, string> = {
  product: "Product",
  sale: "Sale",
  purchase_order: "Purchase Order",
  supplier: "Supplier",
  stock_request: "Stock Request",
  warehouse: "Warehouse",
  branch: "Branch",
  employee: "Employee",
  expense: "Expense",
  payroll: "Payroll",
  user: "User",
  role: "Role",
  inventory: "Inventory",
  tracking: "Tracking",
  ecommerce: "E-Commerce",
  setting: "Setting",
  notification: "Notification",
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filters, setFilters] = useState<{ actions: string[]; entities: string[] }>({ actions: [], entities: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [entityFilter, setEntityFilter] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { loadLogs() }, [page, actionFilter, entityFilter])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", "50")
      if (actionFilter) params.set("action", actionFilter)
      if (entityFilter) params.set("entity", entityFilter)
      if (search) params.set("search", search)

      const res = await fetch(`/api/activity-logs?${params}`)
      const json = await res.json()
      if (json.data) {
        setLogs(json.data)
        setTotalPages(json.totalPages || 1)
        setTotal(json.total || 0)
        if (json.filters) setFilters(json.filters)
      }
    } catch (err) { console.error(err) }
    finally { setIsLoading(false) }
  }

  const handleSearch = () => { setPage(1); loadLogs() }

  const formatDetails = (details: Record<string, any> | null | undefined): string => {
    if (!details) return ""
    const parts: string[] = []
    for (const [key, value] of Object.entries(details)) {
      if (key === "changes" && Array.isArray(value)) {
        parts.push(`changes: ${value.join(", ")}`)
      } else if (typeof value === "object") {
        parts.push(`${key}: ${JSON.stringify(value)}`)
      } else {
        parts.push(`${key}: ${value}`)
      }
    }
    return parts.join(" | ")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Activity Logs</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "Loading..." : `${total.toLocaleString("id-ID")} total activities`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 w-48"
                />
              </div>
              <Select
                options={[
                  { label: "All Actions", value: "" },
                  ...(filters.actions || []).map((a) => ({ label: a.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()), value: a })),
                ]}
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
                placeholder="Action"
                className="w-36"
              />
              <Select
                options={[
                  { label: "All Entities", value: "" },
                  ...(filters.entities || []).map((e) => ({ label: ENTITY_LABELS[e] || e.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()), value: e })),
                ]}
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setPage(1) }}
                placeholder="Entity"
                className="w-40"
              />
            </div>
            <span className="text-xs text-gray-400">
              Page {page} of {totalPages}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-medium text-gray-500">No activity logs yet</p>
              <p className="text-sm mt-1">User actions will appear here as they happen</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {ACTION_ICONS[log.action] || <Info className="h-3.5 w-3.5 text-gray-400" />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="status" status={ACTION_COLORS[log.action] || "inactive"} className="text-[10px] uppercase">
                          {log.action.replace("_", " ")}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          {ENTITY_ICONS[log.entity] || <FileText className="h-3 w-3" />}
                          {ENTITY_LABELS[log.entity] || log.entity}
                        </span>
                        {log.entityId && (
                          <span className="text-xs font-mono text-gray-400 truncate max-w-[120px]">{log.entityId}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          {log.user ? (
                            <>
                              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-medium text-blue-600">
                                {log.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <span className="font-medium text-gray-900">{log.user.name}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">System</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                      </div>

                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{formatDetails(log.details)}</p>
                      )}

                      {/* Expanded details */}
                      {isExpanded && log.details && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                          {log.ipAddress && (
                            <p className="text-xs text-gray-400 mt-2">IP: {log.ipAddress}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-400">
                        {new Date(log.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
