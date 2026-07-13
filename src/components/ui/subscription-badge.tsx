"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CreditCard, ShieldCheck, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubscriptionInfo {
  subscriptionPlan: string | null
  subscriptionStatus: string | null
  subscriptionEnd: string | null
  daysRemaining: number | null
  isExpiringSoon: boolean
  needsReminder: boolean
}

export function SubscriptionBadge() {
  const { data: session } = useSession()
  const [sub, setSub] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Only fetch for SUPER_ADMIN
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false)
      return
    }
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((j) => {
        if (j.data) setSub(j.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isSuperAdmin])

  if (!isSuperAdmin || loading || !sub) return null

  const isActive = sub.subscriptionStatus === "active" || sub.subscriptionStatus === "trial"
  const isExpired = sub.subscriptionStatus === "expired"

  return (
    <Link
      href="/settings/subscription"
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
        sub.needsReminder
          ? "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
          : isExpired
          ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          : isActive
          ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
          : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
      )}
      title="Manage subscription"
    >
      {sub.needsReminder ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : isExpired ? (
        <Clock className="h-3.5 w-3.5" />
      ) : (
        <CreditCard className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline capitalize">{sub.subscriptionPlan}</span>
      {sub.daysRemaining !== null && sub.daysRemaining <= 90 && (
        <span className="hidden md:inline">
          — {sub.daysRemaining}d left
        </span>
      )}
    </Link>
  )
}
