"use client"

import Link from "next/link"
import { Plus, Search, Mail, Phone } from "lucide-react"
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
import { formatDate } from "@/lib/utils"

const employees = [
  { emp: "EMP20240001", name: "Ahmad Rizki", pos: "Staff Gudang", dept: "Warehouse", salary: 5000000, status: "active", joinDate: new Date("2023-01-15") },
  { emp: "EMP20240002", name: "Siti Nurhaliza", pos: "Admin Penjualan", dept: "Sales", salary: 4500000, status: "active", joinDate: new Date("2023-03-01") },
  { emp: "EMP20240003", name: "Bambang Susilo", pos: "Staff Keuangan", dept: "Finance", salary: 5500000, status: "active", joinDate: new Date("2022-06-15") },
  { emp: "EMP20240004", name: "Dewi Sartika", pos: "Staff HRD", dept: "HR", salary: 4800000, status: "leave", joinDate: new Date("2023-09-01") },
  { emp: "EMP20240005", name: "Rudi Hartono", pos: "Kepala Gudang", dept: "Warehouse", salary: 6500000, status: "active", joinDate: new Date("2021-11-01") },
  { emp: "EMP20240006", name: "Fitri Handayani", pos: "Staff Pemasaran", dept: "Marketing", salary: 4200000, status: "resigned", joinDate: new Date("2023-06-01") },
]

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Employees</h3>
          <p className="text-sm text-gray-500 mt-1">Manage employee data and information</p>
        </div>
        <Link href="/employees/new">
          <Button className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Employee</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Employees</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search employees..." className="pl-10 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.emp}>
                  <TableCell className="font-mono text-xs">{e.emp}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                        {e.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className="font-medium">{e.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{e.pos}</TableCell>
                  <TableCell>{e.dept}</TableCell>
                  <TableCell className="text-right font-medium">Rp {e.salary.toLocaleString("id-ID")}</TableCell>
                  <TableCell><Badge variant="status" status={e.status}>{e.status}</Badge></TableCell>
                  <TableCell className="text-sm">{formatDate(e.joinDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
