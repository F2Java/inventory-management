"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/ui/image-upload"
import { BarcodeInput } from "@/components/ui/barcode-input"
import { UomSelector, type ProductUomEntry, type UomOption } from "@/components/ui/uom-selector"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Package, Image, Ruler, Barcode, Loader2, Warehouse } from "lucide-react"
import Link from "next/link"

type WarehouseOption = { label: string; value: string }
type WarehouseStockEntry = { warehouseId: string; warehouseName: string; quantity: number }

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [unit, setUnit] = useState("pcs")
  const [weight, setWeight] = useState("")
  const [costPerUnit, setCostPerUnit] = useState("")
  const [sellPerUnit, setSellPerUnit] = useState("")
  const [images, setImages] = useState<{ url: string; thumbnail?: string; isPrimary?: boolean; file?: File }[]>([])
  const [availableUoms, setAvailableUoms] = useState<UomOption[]>([])
  const [productUoms, setProductUoms] = useState<ProductUomEntry[]>([])

  // Categories state (fetched from DB)
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([])

  // Warehouses state (fetched from DB)
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])

  // Warehouse stock state — tracks current stock per warehouse
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockEntry[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
  const [stockQty, setStockQty] = useState("")

  // Fetch product, categories, warehouses, and UoMs
  useEffect(() => {
    async function load() {
      try {
        const [productRes, categoriesRes, warehousesRes, uomsRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch("/api/categories").then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
          fetch("/api/warehouses").then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
          fetch("/api/uoms").then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
        ])

        const productJson = await productRes.json()
        const categoriesJson = await categoriesRes
        const warehousesJson = await warehousesRes
        const uomsJson = await uomsRes

        if (categoriesJson.data) {
          setCategories(
            categoriesJson.data.map((c: any) => ({
              label: c.name,
              value: c.id,
            }))
          )
        }

        if (warehousesJson.data) {
          setWarehouses(
            warehousesJson.data.map((w: any) => ({
              label: w.name,
              value: w.id,
            }))
          )
        }

        if (uomsJson.data) {
          setAvailableUoms(
            uomsJson.data.map((u: any) => ({
              id: u.id,
              name: u.name,
              abbreviation: u.abbreviation,
            }))
          )
        }

        if (productJson.data) {
          const p = productJson.data
          setName(p.name)
          setDescription(p.description || "")
          setSku(p.sku)
          setBarcode(p.barcode || "")
          setCategoryId(p.categoryId)
          setUnit(p.unit || "pcs")
          setWeight(p.weight?.toString() || "")
          setCostPerUnit(p.costPerUnit?.toString() || "")
          setSellPerUnit(p.sellPerUnit?.toString() || "")

          if (p.images?.length > 0) {
            setImages(
              p.images.map((img: any) => ({
                url: img.url,
                thumbnail: img.thumbnail,
                isPrimary: img.isPrimary,
              }))
            )
          }

          if (p.uoms?.length > 0) {
            setProductUoms(
              p.uoms.map((u: any) => ({
                uomId: u.uom.id,
                uomName: u.uom.name,
                uomAbbreviation: u.uom.abbreviation,
                isBase: u.isBase,
                conversionToBase: u.conversionToBase,
                sellPrice: u.sellPrice ? Number(u.sellPrice) : null,
                costPrice: u.costPrice ? Number(u.costPrice) : null,
              }))
            )
          }

          // Load existing warehouse stock
          if (p.warehouseStock?.length > 0) {
            setWarehouseStock(
              p.warehouseStock.map((ws: any) => ({
                warehouseId: ws.warehouseId,
                warehouseName: ws.warehouse?.name || "Unknown",
                quantity: ws.quantity,
              }))
            )
          }
        }
      } catch (err) {
        setError("Failed to load product")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const addStockRow = () => {
    if (!selectedWarehouse || !stockQty) return
    const wh = warehouses.find((w) => w.value === selectedWarehouse)
    setWarehouseStock((prev) => {
      const existing = prev.findIndex((s) => s.warehouseId === selectedWarehouse)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = { ...updated[existing], quantity: parseInt(stockQty) || 0 }
        return updated
      }
      return [
        ...prev,
        {
          warehouseId: selectedWarehouse,
          warehouseName: wh?.label || "Unknown",
          quantity: parseInt(stockQty) || 0,
        },
      ]
    })
    setSelectedWarehouse("")
    setStockQty("")
  }

  const removeStockRow = (warehouseId: string) => {
    setWarehouseStock((prev) => prev.filter((s) => s.warehouseId !== warehouseId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const payload = {
        id,
        name,
        description,
        sku,
        barcode,
        categoryId,
        costPerUnit,
        sellPerUnit,
        unit,
        weight: weight || null,
        images: images.map((img, i) => ({
          url: img.url,
          thumbnail: img.thumbnail,
          isPrimary: img.isPrimary || i === 0,
        })),
        uoms: productUoms.map((u) => ({
          uomId: u.uomId,
          isBase: u.isBase,
          conversionToBase: u.conversionToBase,
          sellPrice: u.sellPrice || null,
          costPrice: u.costPrice || null,
        })),
        warehouseStock: warehouseStock.map((ws) => ({
          warehouseId: ws.warehouseId,
          quantity: ws.quantity,
        })),
      }

      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update")

      router.push("/products")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href={`/products/${id}`} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Edit Product</h3>
          <p className="text-sm text-gray-500 mt-1">
            Update product details — {sku}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Product Name <span className="text-red-500">*</span></label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="flex min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                <Select options={categories} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="Select category" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">SKU</label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} disabled className="bg-gray-50" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Barcode className="h-3.5 w-3.5 text-gray-400" />
                  Barcode
                </label>
                <BarcodeInput value={barcode} onChange={setBarcode} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" />
              Product Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload images={images} onChange={setImages} maxImages={5} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="h-4 w-4 text-blue-500" />
              Units of Measure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UomSelector uoms={productUoms} availableUoms={availableUoms} onChange={setProductUoms} defaultBaseUom="Pcs" />
          </CardContent>
        </Card>

        {/* Warehouse Stock Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-blue-500" />
              Warehouse Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current stock rows */}
            {warehouseStock.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Current Stock</label>
                <div className="divide-y border rounded-lg">
                  {warehouseStock.map((ws) => (
                    <div key={ws.warehouseId} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{ws.warehouseName}</span>
                        <Badge variant="outline" className="ml-2">
                          {ws.quantity} pcs
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStockRow(ws.warehouseId)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add/edit stock row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {warehouseStock.length > 0 ? "Add / Update Stock" : "Select Warehouse"}
                </label>
                <Select
                  options={warehouses}
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  placeholder="Choose warehouse"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addStockRow}
                disabled={!selectedWarehouse || !stockQty}
                className="w-full"
              >
                {selectedWarehouse && warehouseStock.some((s) => s.warehouseId === selectedWarehouse)
                  ? "Update"
                  : "Add"}
              </Button>
            </div>

            {warehouseStock.length === 0 && (
              <p className="text-xs text-gray-400">
                No warehouse stock assigned yet. Select a warehouse and enter quantity above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Base Unit</label>
                <Select options={[{ label: "Pcs", value: "pcs" }, { label: "Kg", value: "kg" }, { label: "Box", value: "box" }, { label: "Liter", value: "liter" }, { label: "Meter", value: "meter" }]} value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Weight (kg)</label>
                <Input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Cost/Unit (HPP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                  <Input className="pl-10" type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sell Price/Unit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rp</span>
                  <Input className="pl-10" type="number" value={sellPerUnit} onChange={(e) => setSellPerUnit(e.target.value)} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href={`/products/${id}`}><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Update Product"}
          </Button>
        </div>
      </form>
    </div>
  )
}
