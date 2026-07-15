"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShoppingCart, ArrowLeft, Loader2, CheckCircle2, AlertCircle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"

interface CartProduct {
  id: string
  name: string
  sku: string
  price: number
  unit: string
}

interface CustomerSession {
  id: string
  companyName: string
  contactPerson: string
  email: string
  paymentTerms: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerSession | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [products, setProducts] = useState<Record<string, CartProduct>>({})
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("b2b_cart") || "{}")
    setCart(saved)
    const ids = Object.keys(saved)

    const sess = localStorage.getItem("b2b_session")
    if (sess) setCustomer(JSON.parse(sess))

    if (ids.length > 0) {
      fetch("/api/b2b/products").then((r) => r.json()).then((json) => {
        const map: Record<string, CartProduct> = {}
        for (const p of json.data || []) {
          if (ids.includes(p.id)) map[p.id] = p
        }
        setProducts(map)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const cartItems = Object.entries(cart)
    .filter(([id]) => products[id])
    .map(([id, qty]) => ({ ...products[id], quantity: qty }))

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)

  const handleSubmit = async () => {
    if (!customer) {
      router.push("/shop/auth/login?redirect=/shop/checkout")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/b2b/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          items: cartItems.map((i) => ({ productId: i.id, quantity: i.quantity, unitPrice: i.price })),
          shippingAddress: shippingAddress || customer.companyName,
          notes,
          paymentTerms: customer.paymentTerms,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Order failed")
      localStorage.removeItem("b2b_cart")
      setOrderNumber(json.data.orderNumber)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 flex justify-center"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
        <p className="text-gray-500 mt-2">Your order <strong className="text-gray-900">{orderNumber}</strong> has been submitted.</p>
        <p className="text-sm text-gray-400 mt-1">We will review and confirm your order shortly. You will receive an invoice.</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href="/shop/orders"><Button>View Orders</Button></Link>
          <Link href="/shop"><Button variant="outline">Continue Shopping</Button></Link>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    router.push("/shop/cart")
    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/shop/cart" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3 space-y-6">
          <div className={`rounded-xl border p-4 ${customer ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            {customer ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Signed in as <strong>{customer.companyName}</strong> ({customer.email})</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please sign in to place your order</span>
                </div>
                <Link href="/shop/auth/login?redirect=/shop/checkout"><Button size="sm" variant="outline" className="text-xs">Sign In</Button></Link>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Order Items</h3>
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-gray-300" />
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.sku} × {item.quantity}</p>
                  </div>
                </div>
                <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Shipping Address</label>
            <textarea className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter shipping address" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} disabled={!customer} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Order Notes</label>
            <textarea className="flex min-h-16 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Special instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!customer} />
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-gray-50 rounded-xl p-6 space-y-4 sticky top-24">
            <h3 className="font-medium text-gray-900">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-gray-500 truncate">{item.name} × {item.quantity}</span>
                  <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-sm mt-1"><span className="text-gray-500">Tax</span><span className="text-gray-400">+ PPN 11%</span></div>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="font-semibold">Estimated Total</span>
              <span className="font-bold text-lg">{formatCurrency(subtotal)}</span>
            </div>
            {customer && <p className="text-xs text-gray-400">Payment terms: <strong>{customer.paymentTerms}</strong></p>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
            <Button className="w-full" onClick={handleSubmit} disabled={submitting || !customer}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Placing Order...</> : <><ShoppingCart className="h-4 w-4 mr-2" /> Place Order</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
