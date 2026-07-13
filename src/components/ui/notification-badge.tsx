"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, BellRing, CheckCheck, Loader2, AlertTriangle, Clock, ShoppingCart, Package } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message?: string
  entityType?: string
  entityId?: string
  isRead: boolean
  createdAt: string
}

const iconMap: Record<string, React.ReactNode> = {
  stale_status: <Clock className="h-4 w-4 text-orange-500" />,
  low_stock: <AlertTriangle className="h-4 w-4 text-red-500" />,
  stock_request: <Package className="h-4 w-4 text-blue-500" />,
  po_approval: <ShoppingCart className="h-4 w-4 text-purple-500" />,
}

const entityLinks: Record<string, (id: string) => string> = {
  sale: (id: string) => `/sales`,
  purchase_order: (id: string) => `/procurement/purchase-orders/${id}`,
  stock_request: (id: string) => `/procurement/stock-requests`,
  order_tracking: (id: string) => `/tracking`,
}

export function NotificationBadge() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?unread=true")
      const json = await res.json()
      if (json.data) setNotifications(json.data)
      if (json.unreadCount !== undefined) setUnreadCount(json.unreadCount)
    } catch { /* silent */ }
  }

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isRead: true }),
    })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    })
    setNotifications([])
    setUnreadCount(0)
  }

  const refreshAlerts = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/notifications", { method: "PUT" })
      await loadNotifications()
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }

  const getLink = (n: Notification) => {
    if (n.entityType && entityLinks[n.entityType]) {
      return entityLinks[n.entityType](n.entityId || "")
    }
    return "#"
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHrs < 1) return `${Math.floor(diffMs / (1000 * 60))}m`
    if (diffHrs < 24) return `${diffHrs}h`
    return `${Math.floor(diffHrs / 24)}d`
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-orange-500" />
        ) : (
          <Bell className="h-5 w-5 text-gray-500" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshAlerts}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Checking..." : "Check Stale"}
              </button>
              {notifications.length > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <CheckCheck className="h-3 w-3" /> Read all
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs mt-1">Click "Check Stale" to scan for stale statuses</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <a
                    key={n.id}
                    href={getLink(n)}
                    className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="mt-0.5 shrink-0">
                      {iconMap[n.type] || <Bell className="h-4 w-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.createdAt)} ago</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
