"use client"

import { useState } from "react"
import { Search, Camera, MapPin, Lock, Unlock, Clock, CheckCircle2, XCircle } from "lucide-react"
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

const attendances = [
  { name: "Ahmad Rizki", date: new Date(), checkIn: "08:00", checkOut: "17:00", status: "present", photo: true, geo: true },
  { name: "Siti Nurhaliza", date: new Date(), checkIn: "08:15", checkOut: "17:00", status: "late", photo: true, geo: true },
  { name: "Bambang Susilo", date: new Date(), checkIn: "-", checkOut: "-", status: "absent", photo: false, geo: false },
  { name: "Dewi Sartika", date: new Date(), checkIn: "-", checkOut: "-", status: "leave", photo: false, geo: false },
  { name: "Rudi Hartono", date: new Date(), checkIn: "07:55", checkOut: "17:05", status: "present", photo: true, geo: true },
]

export default function AttendancePage() {
  const [geoLocked, setGeoLocked] = useState(true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Attendance</h3>
          <p className="text-sm text-gray-500 mt-1">Check-in / Check-out with live photo & geolocation verification</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={geoLocked ? "default" : "outline"}
            onClick={() => setGeoLocked(!geoLocked)}
            className="flex items-center gap-2"
          >
            {geoLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            {geoLocked ? "Geo Locked" : "Geo Unlocked"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Present Today", value: "3", color: "text-green-600" },
          { label: "Late", value: "1", color: "text-orange-600" },
          { label: "Absent", value: "1", color: "text-red-600" },
          { label: "On Leave", value: "1", color: "text-blue-600" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today's Attendance - {formatDateShort(new Date())}</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." className="pl-10 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Geo Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{formatDateShort(a.date)}</TableCell>
                  <TableCell>
                    <span className={a.checkIn === "-" ? "text-gray-400" : "font-medium"}>{a.checkIn}</span>
                  </TableCell>
                  <TableCell>
                    <span className={a.checkOut === "-" ? "text-gray-400" : "font-medium"}>{a.checkOut}</span>
                  </TableCell>
                  <TableCell>
                    {a.photo ? (
                      <Badge variant="status" status="active"><Camera className="h-3 w-3 mr-1" /> Captured</Badge>
                    ) : (
                      <Badge variant="status" status="inactive"><Camera className="h-3 w-3 mr-1" /> No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.geo ? (
                      <Badge variant="status" status="active"><MapPin className="h-3 w-3 mr-1" /> Verified</Badge>
                    ) : (
                      <Badge variant="status" status="inactive"><MapPin className="h-3 w-3 mr-1" /> N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="status" status={a.status}>
                      {a.status === "present" ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
                       a.status === "absent" ? <XCircle className="h-3 w-3 mr-1" /> : null}
                      {a.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
