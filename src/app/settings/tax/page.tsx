"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Save, Percent } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const taxes = [
  { name: "PPN (Pajak Pertambahan Nilai)", rate: "11%", type: "both", status: "active", desc: "Standard VAT for goods and services" },
  { name: "PPh 21 (Pajak Penghasilan)", rate: "5%", type: "purchase", status: "active", desc: "Income tax on employee salary" },
  { name: "PPh 23 (Pajak Penghasilan)", rate: "2%", type: "purchase", status: "active", desc: "Income tax on services/rent" },
  { name: "PPh Final 0.5% (PP 23)", rate: "0.5%", type: "both", status: "active", desc: "Final income tax for UMKM" },
]

export default function TaxSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Tax Settings</h3>
        <p className="text-sm text-gray-500 mt-1">Configure tax rates for sales, purchases, and payroll</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Tax Configuration</CardTitle>
            <Button size="sm" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Tax</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="default" className="text-sm">{t.rate}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t.type === "both" ? "Sales & Purchase" :
                       t.type === "sales" ? "Sales" : "Purchase"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{t.desc}</TableCell>
                  <TableCell><Badge variant="status" status={t.status}>{t.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <Percent className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">PPN 11% (Effective April 2022)</p>
                <p className="text-sm text-yellow-600 mt-1">
                  Standard PPN rate of 11% applies to most goods and services. 
                  Tax will be automatically calculated on sales and purchase transactions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
