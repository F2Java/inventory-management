"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingCart, Trash2, ArrowLeft, Loader2, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"

interface CartProduct {
  id: string
  name: string
  sku: string
  price: number
  unit: string
  totalStock: number
}

export default function CartPage() {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [products, setProducts] = useState<Record<string, CartProduct>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("b2b_cart") || "{}")
    setCart(saved)
    const ids = Object.keys(saved)
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

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeItem(id); return }
    const newCart = { ...cart, [id]: qty }
    setCart(newCart)
    localStorage.setItem("b2b_cart", JSON.stringify(newCart))
  }

  const removeItem = (id: string) => {
    const newCart = { ...cart }
    delete newCart[id]
    setCart(newCart)
    localStorage.setItem("b2b_cart", JSON.stringify(newCart))
  }

  const cartItems = Object.entries(cart)
    .filter(([id]) => products[id])
    .map(([id, qty]) => ({ ...products[id], quantity: qty }))

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0)

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-20 flex justify-center"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-sm text-gray-500 mt-1">{totalItems} item(s)</p>
        </div>
        <Link href="/shop"><Button variant="outline" size="sm" className="flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Continue Shopping</Button></Link>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Your cart is empty</p>
          <Link href="/shop"><Button className="mt-4">Browse Products</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/shop/products/${item.sku}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">{item.name}</Link>
                <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
                <p className="text-sm font-medium text-gray-700 mt-1">{formatCurrency(item.price)} / {item.unit}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button className="px-2 py-1 text-gray-500 hover:bg-gray-50 text-sm" onClick={() => updateQty(item.id, item.quantity - 1)}>−</button>
                  <Input type="number" min={1} max={item.totalStock} value={item.quantity}
                    onChange={(e) => updateQty(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 text-center border-0 h-8 text-sm" />
                  <button className="px-2 py-1 text-gray-500 hover:bg-gray-50 text-sm" onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                </div>
                <p className="text-sm font-semibold text-gray-900 w-20 text-right">{formatCurrency(item.price * item.quantity)}</p>
                <button onClick={() => removeItem(item.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}

          <div className="bg-gray-50 rounded-xl p-6 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal ({totalItems} items)</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span className="text-gray-400">Calculated at checkout</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Shipping</span><span className="text-gray-400">Calculated at checkout</span></div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Estimated Total</span>
              <span className="font-bold text-lg text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            <Link href="/shop/checkout"><Button className="w-full mt-2 flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Proceed to Checkout</Button></Link>
            <p className="text-xs text-gray-400 text-center">You will need to sign in or register to place an order</p>
          </div>
        </div>
      )}
    </div>
  )
}
