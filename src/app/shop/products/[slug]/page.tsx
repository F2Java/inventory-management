"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Package, ShoppingCart, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"

interface ProductDetail {
  id: string
  name: string
  description: string | null
  sku: string
  price: number
  unit: string
  image: string | null
  category: string
  totalStock: number
  warehouseStock: { warehouse: string; quantity: number }[]
  uom: string
}

export default function ProductDetailPage() {
  const params = useParams()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        // Fetch all products and find by SKU (since slug = SKU)
        const res = await fetch(`/api/b2b/products`)
        const json = await res.json()
        if (json.data) {
          const found = json.data.find((p: any) => p.sku === params.slug)
          if (found) setProduct(found)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.slug])

  const addToCart = () => {
    if (!product) return
    const saved = JSON.parse(localStorage.getItem("b2b_cart") || "{}")
    saved[product.id] = (saved[product.id] || 0) + quantity
    localStorage.setItem("b2b_cart", JSON.stringify(saved))
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-20 flex justify-center"><Loader2 className="h-8 w-8 text-blue-500 animate-spin" /></div>
  if (!product) return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">Product not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/shop" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 flex items-center justify-center">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Package className="h-24 w-24 text-gray-300" />
          )}
        </div>

        <div className="space-y-6">
          <div>
            <Badge variant="outline" className="text-xs mb-2">{product.category}</Badge>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-sm text-gray-400 font-mono mt-1">{product.sku}</p>
          </div>

          <p className="text-3xl font-bold text-gray-900">{formatCurrency(product.price)}</p>
          <p className="text-sm text-gray-400">per {product.uom}</p>

          {product.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Stock Availability</h3>
            <div className="space-y-1">
              {product.warehouseStock?.map((ws: any) => (
                <div key={ws.warehouse} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{ws.warehouse}</span>
                  <span className={`font-medium ${ws.quantity > 0 ? "text-green-600" : "text-red-600"}`}>{ws.quantity} {product.unit}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${product.totalStock > 0 ? "bg-green-500" : "bg-red-500"}`} />
              <span className={product.totalStock > 0 ? "text-green-600" : "text-red-600"}>
                {product.totalStock > 0 ? `${product.totalStock} units available` : "Out of stock"}
              </span>
            </div>
          </div>

          {product.totalStock > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 text-lg" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                  <Input type="number" min={1} max={product.totalStock} value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.totalStock, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center border-0 h-10" />
                  <button className="px-3 py-2 text-gray-600 hover:bg-gray-50 text-lg" onClick={() => setQuantity(Math.min(product.totalStock, quantity + 1))}>+</button>
                </div>
                <Button onClick={addToCart} className="flex-1 flex items-center gap-2" disabled={added}>
                  {added ? <><CheckCircle2 className="h-4 w-4" /> Added!</> : <><ShoppingCart className="h-4 w-4" /> Add to Cart</>}
                </Button>
              </div>
              <p className="text-xs text-gray-400">Subtotal: {formatCurrency(product.price * quantity)}</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-400">B2B pricing displayed. Final invoice includes applicable taxes. Payment terms available for registered business customers.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
