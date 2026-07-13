"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Save, ArrowLeftRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

const currencies = [
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", rate: 1, isDefault: true, status: "active" },
  { code: "USD", name: "US Dollar", symbol: "$", rate: 16250, isDefault: false, status: "active" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 12000, isDefault: false, status: "active" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", rate: 3450, isDefault: false, status: "active" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 108, isDefault: false, status: "inactive" },
]

export default function CurrencySettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Currency Settings</h3>
        <p className="text-sm text-gray-500 mt-1">Manage multi-currency with automatic conversion to default IDR</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Supported Currencies</CardTitle>
            <Button size="sm" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Currency</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Exchange Rate (to IDR)</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="font-mono font-bold text-sm">{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell className="text-lg">{c.symbol}</TableCell>
                  <TableCell className="text-right">
                    {c.isDefault ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className="font-medium">Rp {c.rate.toLocaleString("id-ID")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.isDefault ? (
                      <Badge variant="status" status="active">Primary</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-xs">Set as Default</Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="status" status={c.status}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <ArrowLeftRight className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Automatic Conversion</p>
                <p className="text-sm text-blue-600 mt-1">
                  All sales and transactions in foreign currencies will be automatically converted 
                  to Indonesian Rupiah (IDR) using the configured exchange rates. 
                  Update rates regularly to ensure accurate reporting.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
