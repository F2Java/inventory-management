"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"

interface OrderItem {
  productName: string
  sku: string
  quantity: number
  unitPrice: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  items: OrderItem[]
  invoice: { invoiceNumber: string; status: string } | null
}

export default function B2BOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sess = localStorage.getItem("b2b_session")
    if (!sess) {
      router.push("/shop/auth/login?redirect=/shop/orders")
      return
    }
    const c = JSON.parse(sess)
    setCustomer(c)

    fetch(`/api/b2b/orders?customerId=${c.id}`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setOrders(json.data) })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      DELIVERED: "delivered", PENDING: "pending", CONFIRMED: "approved",
      PROCESSING: "processing", SHIPPED: "shipped", CANCELLED: "cancelled",
    }
    return map[status] || "pending"
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 flex justify-center"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500">{customer?.companyName}</p>
        </div>
        <Link href="/shop"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Shop</Button></Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-base font-medium text-gray-500">No orders yet</p>
          <Link href="/shop"><Button className="mt-4">Start Shopping</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                </div>
                <Badge variant="status" status={getStatusColor(order.status)}>{order.status}</Badge>
              </div>
              <div className="space-y-1">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.productName} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
                {order.items.length > 3 && <p className="text-xs text-gray-400">+{order.items.length - 3} more items</p>}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div>{order.invoice && <span className="text-xs text-gray-500">Invoice: {order.invoice.invoiceNumber} ({order.invoice.status})</span>}</div>
                <p className="font-bold">{formatCurrency(order.totalAmount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
