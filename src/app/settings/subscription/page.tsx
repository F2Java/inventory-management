"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Save,
  Loader2,
  Trash2,
  ArrowLeft,
  CreditCard,
  RefreshCw,
} from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"

interface Subscription {
  id: string
  code: string
  companyName: string
  subscriptionPlan: string | null
  subscriptionStatus: string | null
  subscriptionStart: string | null
  subscriptionEnd: string | null
  subscriptionReminderSent: boolean
  createdAt: string
  daysRemaining: number | null
  isExpiringSoon: boolean
  needsReminder: boolean
}

const PLAN_OPTIONS = [
  { label: "Trial", value: "trial" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Lifetime", value: "lifetime" },
]

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Trial", value: "trial" },
]

export default function SubscriptionPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [resetConfirm, setResetConfirm] = useState("")
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Form state
  const [plan, setPlan] = useState("monthly")
  const [status, setStatus] = useState("active")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => { loadSubscription() }, [])

  const loadSubscription = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/subscription")
      const json = await res.json()
      if (json.data) {
        setSubscription(json.data)
        setPlan(json.data.subscriptionPlan || "monthly")
        setStatus(json.data.subscriptionStatus || "active")
        setStartDate(json.data.subscriptionStart ? json.data.subscriptionStart.split("T")[0] : "")
        setEndDate(json.data.subscriptionEnd ? json.data.subscriptionEnd.split("T")[0] : "")
      }
    } catch (err) { setError("Failed to load subscription data") }
    finally { setIsLoading(false) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsSaving(true)
    try {
      const res = await fetch("/api/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionPlan: plan,
          subscriptionStatus: status,
          subscriptionStart: startDate || null,
          subscriptionEnd: endDate || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
      setSuccess("Subscription updated successfully")
      loadSubscription()
    } catch (err: any) { setError(err.message) }
    finally { setIsSaving(false) }
  }

  const handleResetData = async () => {
    if (resetConfirm !== "RESET_ALL_DATA") return
    setError("")
    setSuccess("")
    setIsResetting(true)
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_ALL_DATA" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to reset")
      setSuccess(json.message || "All data has been reset successfully")
      setShowResetConfirm(false)
      setResetConfirm("")
      router.refresh()
    } catch (err: any) { setError(err.message) }
    finally { setIsResetting(false) }
  }

  const dismissReminder = async () => {
    try {
      await fetch("/api/subscription", { method: "PATCH" })
      loadSubscription()
    } catch (err) { console.error(err) }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active": return "active"
      case "trial": return "pending"
      case "expired": return "cancelled"
      case "cancelled": return "cancelled"
      default: return "inactive"
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/settings" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="h-5 w-5 text-gray-500" /></Link>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Subscription & System</h3>
          <p className="text-sm text-gray-500 mt-1">Manage your subscription plan, validity, and system data</p>
        </div>
      </div>

      {/* 3-Month Expiry Reminder Banner */}
      {subscription?.needsReminder && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              Subscription expiring in {subscription.daysRemaining} days
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Your subscription ends on {subscription.subscriptionEnd ? formatDate(subscription.subscriptionEnd) : "N/A"}. 
              Renew now to avoid service interruption.
            </p>
          </div>
          <button
            onClick={dismissReminder}
            className="text-xs text-orange-600 hover:text-orange-800 font-medium shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Subscription Status Summary */}
      {subscription && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Plan</p>
              <p className="text-lg font-bold capitalize mt-1">{subscription.subscriptionPlan || "N/A"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Status</p>
              <Badge variant="status" status={getStatusColor(subscription.subscriptionStatus)} className="mt-1 capitalize">
                {subscription.subscriptionStatus || "N/A"}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Days Remaining</p>
              <p className={`text-lg font-bold mt-1 ${
                subscription.daysRemaining !== null && subscription.daysRemaining <= 90
                  ? "text-orange-600"
                  : "text-green-600"
              }`}>
                {subscription.daysRemaining !== null ? `${subscription.daysRemaining} days` : "Unlimited"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Valid Until</p>
              <p className="text-lg font-bold mt-1">
                {subscription.subscriptionEnd ? formatDate(subscription.subscriptionEnd) : "Never"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Subscription Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-500" /> Subscription Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Subscription Plan</label>
                <Select options={PLAN_OPTIONS} value={plan} onChange={(e) => setPlan(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">End Date (Expiry)</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Quick duration buttons */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Quick set validity:</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "1 Month", days: 30 },
                  { label: "3 Months", days: 90 },
                  { label: "6 Months", days: 180 },
                  { label: "1 Year", days: 365 },
                  { label: "2 Years", days: 730 },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => {
                      const start = startDate ? new Date(startDate) : new Date()
                      const end = new Date(start)
                      end.setDate(end.getDate() + opt.days)
                      setEndDate(end.toISOString().split("T")[0])
                      if (!startDate) setStartDate(start.toISOString().split("T")[0])
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Subscription
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone - Reset All Data */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-600">
            <Trash2 className="h-4 w-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Reset All System Data</p>
                  <p className="text-xs text-red-600 mt-1">
                    This will permanently delete all transactional data including sales, purchase orders, 
                    inventory stock, expenses, payroll, employees, products, suppliers, warehouses, 
                    branches, and activity logs. 
                    <strong> Merchant info, users, roles, and system configuration will be preserved.</strong>
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {!showResetConfirm ? (
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                onClick={() => setShowResetConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset All Data
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-700">
                  Type <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded text-red-800">RESET_ALL_DATA</span> to confirm:
                </p>
                <Input
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="RESET_ALL_DATA"
                  className="font-mono border-red-300 focus:border-red-500"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowResetConfirm(false); setResetConfirm("") }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={resetConfirm !== "RESET_ALL_DATA" || isResetting}
                    onClick={handleResetData}
                    className="bg-red-600 hover:bg-red-700 text-white disabled:bg-red-300"
                  >
                    {isResetting ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Resetting...</>
                    ) : (
                      <><Trash2 className="h-4 w-4 mr-1" /> Confirm Reset All Data</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
