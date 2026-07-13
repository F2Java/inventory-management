"use client"

import { Plus, Search, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateShort } from "@/lib/utils"

const leaves = [
  { name: "Dewi Sartika", type: "Annual", start: new Date(), end: new Date(Date.now() + 86400000 * 5), days: 5, status: "approved", reason: "Liburan keluarga" },
  { name: "Bambang Susilo", type: "Sick", start: new Date(Date.now() + 604800000), end: new Date(Date.now() + 86400000 * 7), days: 2, status: "pending", reason: "Istirahat sakit" },
  { name: "Fitri Handayani", type: "Personal", start: new Date(Date.now() - 604800000), end: new Date(Date.now() - 86400000 * 4), days: 3, status: "approved", reason: "Urusan pribadi" },
  { name: "Ahmad Rizki", type: "Sick", start: new Date(Date.now() - 86400000 * 3), end: new Date(Date.now() - 86400000), days: 2, status: "rejected", reason: "Tanpa keterangan" },
]

const balances = [
  { name: "Ahmad Rizki", annual: 12, used: 3, sick: 14, usedS: 1, personal: 0, usedP: 0 },
  { name: "Siti Nurhaliza", annual: 12, used: 5, sick: 14, usedS: 2, personal: 0, usedP: 0 },
  { name: "Bambang Susilo", annual: 12, used: 8, sick: 14, usedS: 0, personal: 0, usedP: 0 },
  { name: "Rudi Hartono", annual: 12, used: 10, sick: 14, usedS: 3, personal: 0, usedP: 0 },
]

export default function LeavesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Leave Management</h3>
          <p className="text-sm text-gray-500 mt-1">Manage employee leave requests and balances</p>
        </div>
        <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Leave Request</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell><Badge variant="outline">{l.type}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {formatDateShort(l.start)} - {formatDateShort(l.end)}
                    </TableCell>
                    <TableCell className="text-right font-medium">{l.days}</TableCell>
                    <TableCell><Badge variant="status" status={l.status}>{l.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Annual</TableHead>
                  <TableHead className="text-right">Sick</TableHead>
                  <TableHead className="text-right">Personal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-right">
                      <span className={b.used >= 10 ? "text-orange-600 font-semibold" : ""}>
                        {b.used}/{b.annual}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{b.usedS}/{b.sick}</TableCell>
                    <TableCell className="text-right">{b.usedP}/{b.personal}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
