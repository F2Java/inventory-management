"use client"

import { useState } from "react"
import { Plus, Trash2, Package, Check, GripVertical } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { Select } from "./select"

export interface UomOption {
  id: string
  name: string
  abbreviation: string
}

export interface ProductUomEntry {
  uomId: string
  uomName: string
  uomAbbreviation: string
  isBase: boolean
  conversionToBase: number
  sellPrice?: number | null
  costPrice?: number | null
}

interface UomSelectorProps {
  uoms: ProductUomEntry[]
  availableUoms: UomOption[]
  onChange: (uoms: ProductUomEntry[]) => void
  defaultBaseUom?: string // Name of default base unit
}

export function UomSelector({
  uoms,
  availableUoms,
  onChange,
  defaultBaseUom = "Pcs",
}: UomSelectorProps) {
  const [selectedUomId, setSelectedUomId] = useState("")

  // Filter out already selected UoMs
  const availableToAdd = availableUoms.filter(
    (au) => !uoms.some((u) => u.uomId === au.id)
  )

  const addUom = () => {
    if (!selectedUomId) return
    const uom = availableUoms.find((u) => u.id === selectedUomId)
    if (!uom) return

    const isFirst = uoms.length === 0
    const newEntry: ProductUomEntry = {
      uomId: uom.id,
      uomName: uom.name,
      uomAbbreviation: uom.abbreviation,
      isBase: isFirst,
      conversionToBase: isFirst ? 1 : 1,
    }

    // If this is adding the base UoM, set default name
    if (isFirst) {
      newEntry.uomName = defaultBaseUom
    }

    onChange([...uoms, newEntry])
    setSelectedUomId("")
  }

  const removeUom = (index: number) => {
    const removed = uoms[index]
    const updated = uoms.filter((_, i) => i !== index)
    // If we removed the base, make the first remaining the base
    if (removed.isBase && updated.length > 0) {
      updated[0] = { ...updated[0], isBase: true, conversionToBase: 1 }
    }
    onChange(updated)
  }

  const setBase = (index: number) => {
    const updated = uoms.map((u, i) => ({
      ...u,
      isBase: i === index,
      conversionToBase: i === index ? 1 : u.conversionToBase,
    }))
    onChange(updated)
  }

  const updateConversion = (index: number, value: number) => {
    const updated = uoms.map((u, i) =>
      i === index ? { ...u, conversionToBase: value } : u
    )
    onChange(updated)
  }

  const updateSellPrice = (index: number, value: number | null) => {
    const updated = uoms.map((u, i) =>
      i === index ? { ...u, sellPrice: value } : u
    )
    onChange(updated)
  }

  const updateCostPrice = (index: number, value: number | null) => {
    const updated = uoms.map((u, i) =>
      i === index ? { ...u, costPrice: value } : u
    )
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Units of Measure (UoM)
        </label>
        {uoms.length > 0 && (
          <span className="text-xs text-gray-400">
            {uoms.filter((u) => u.isBase).length > 0
              ? `Base: ${uoms.find((u) => u.isBase)?.uomName || "—"}`
              : "No base unit set"}
          </span>
        )}
      </div>

      {/* UoM list */}
      {uoms.length > 0 && (
        <div className="space-y-2">
          {uoms.map((uom, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                uom.isBase
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />

              <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                {/* UoM Name */}
                <div className="col-span-2">
                  <span className="text-sm font-medium">{uom.uomName}</span>
                  <span className="text-xs text-gray-400 ml-1">
                    ({uom.uomAbbreviation})
                  </span>
                </div>

                {/* Conversion */}
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">1 {uom.uomAbbreviation}</span>
                  <span className="text-xs text-gray-400">=</span>
                  {uom.isBase ? (
                    <span className="text-sm font-medium text-blue-600">1 {uom.uomAbbreviation}</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={1}
                        value={uom.conversionToBase}
                        onChange={(e) =>
                          updateConversion(index, parseInt(e.target.value) || 1)
                        }
                        className="w-20 h-7 text-sm text-center"
                      />
                      <span className="text-xs text-gray-500">
                        {uoms.find((u) => u.isBase)?.uomAbbreviation || "base"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sell Price */}
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      Rp
                    </span>
                    <Input
                      type="number"
                      placeholder={uom.isBase ? "Default" : "Auto"}
                      value={uom.sellPrice ?? ""}
                      onChange={(e) =>
                        updateSellPrice(
                          index,
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-full h-7 text-sm pl-7"
                    />
                  </div>
                </div>

                {/* Cost Price */}
                <div className="col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      Rp
                    </span>
                    <Input
                      type="number"
                      placeholder={uom.isBase ? "Default" : "Auto"}
                      value={uom.costPrice ?? ""}
                      onChange={(e) =>
                        updateCostPrice(
                          index,
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-full h-7 text-sm pl-7"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {!uom.isBase && (
                    <>
                      <button
                        type="button"
                        onClick={() => setBase(index)}
                        className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                        title="Set as base unit"
                      >
                        <Check className="h-3.5 w-3.5 text-gray-400 hover:text-blue-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeUom(index)}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors"
                        title="Remove UoM"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    </>
                  )}
                  {uom.isBase && (
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      BASE
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add UoM */}
      {availableToAdd.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1">
            <Select
              options={availableToAdd.map((u) => ({
                label: `${u.name} (${u.abbreviation})`,
                value: u.id,
              }))}
              value={selectedUomId}
              onChange={(e) => setSelectedUomId(e.target.value)}
              placeholder="Add unit of measure..."
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addUom}
            disabled={!selectedUomId}
            className="flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      )}

      {/* Info text */}
      <p className="text-xs text-gray-400">
        Set the base unit (smallest selling unit) and add alternative UoMs with their conversion rates.
        {uoms.length === 0 && " Add at least one unit to enable multi-unit selling."}
      </p>
    </div>
  )
}
