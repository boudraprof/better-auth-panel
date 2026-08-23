import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Cpu, HardDrive, Info, MemoryStick, RefreshCw, Timer } from 'lucide-react'
import { toast } from 'react-toastify'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { adminMiddleware } from '#/middleware/admin'
import api from '#/utils/axios'

type HardwareData = {
  hostname: string
  platform: string
  distro?: string
  release?: string
  kernel?: string
  arch: string
  nodeVersion: string
  uptime: { days: number; hours: number; minutes: number; seconds: number }
  cpu: {
    model: string
    manufacturer?: string
    cores: number
    physicalCores?: number
    speed?: number
    loadPercent: number
    userPercent?: number
    systemPercent?: number
  }
  memory: {
    total: number
    used: number
    free: number
    available?: number
    percent: number
  }
  disk: {
    filesystem?: string
    mount?: string
    total: number
    used: number
    free: number
    percent: number
  } | null
}

export const Route = createFileRoute('/hardware')({
  server: {
    middleware: [adminMiddleware],
  },
  component: HardwarePage,
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function Gauge({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{percent}% used</p>
    </div>
  )
}

function HardwarePage() {
  const [data, setData] = useState<HardwareData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHardware = useCallback(async () => {
    setLoading(true)
    try {
      const { data: hw } = await api.get<HardwareData>('/admin/hardware')
      setData(hw)
    } catch {
      toast.error('Failed to fetch hardware status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHardware()
  }, [fetchHardware])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading hardware status...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Failed to load hardware status
      </div>
    )
  }

  const uptimeStr = `${data.uptime.days}d ${data.uptime.hours}h ${data.uptime.minutes}m ${data.uptime.seconds}s`

  return (
    <div className="h-full p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Hardware Status</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHardware} disabled={loading}>
          <RefreshCw className="size-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* System info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-5 text-sky-500" />
            System Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Hostname</span>
              <p className="font-medium">{data.hostname}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Platform</span>
              <p className="font-medium">{data.platform} {data.arch}</p>
            </div>
            {data.distro && (
              <div>
                <span className="text-muted-foreground">Distro</span>
                <p className="font-medium">{data.distro} {data.release}</p>
              </div>
            )}
            {data.kernel && (
              <div>
                <span className="text-muted-foreground">Kernel</span>
                <p className="font-medium">{data.kernel}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Node.js</span>
              <p className="font-medium">{data.nodeVersion}</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="text-muted-foreground">Uptime</span>
              <p className="font-medium flex items-center gap-2">
                <Timer className="size-4 text-emerald-500" />
                {uptimeStr}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CPU */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="size-5 text-amber-500" />
            CPU
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Model</span>
              <p className="font-medium truncate" title={data.cpu.model}>{data.cpu.model}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Manufacturer</span>
              <p className="font-medium truncate" title={data.cpu.manufacturer}>{data.cpu.manufacturer ?? 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cores</span>
              <p className="font-medium">{data.cpu.cores}{data.cpu.physicalCores ? ` (${data.cpu.physicalCores} phys)` : ''}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Speed</span>
              <p className="font-medium">{data.cpu.speed ? `${data.cpu.speed} GHz` : 'N/A'}</p>
            </div>
          </div>
          <Gauge
            label="Load"
            value={`${data.cpu.loadPercent}%`}
            percent={data.cpu.loadPercent}
            color={data.cpu.loadPercent > 80 ? '#ef4444' : data.cpu.loadPercent > 50 ? '#f59e0b' : '#4fb8b2'}
          />
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>User: {data.cpu.userPercent ?? 0}%</div>
            <div>System: {data.cpu.systemPercent ?? 0}%</div>
          </div>
        </CardContent>
      </Card>

      {/* Memory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MemoryStick className="size-5 text-purple-500" />
            Memory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Gauge
            label="RAM"
            value={`${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}`}
            percent={data.memory.percent}
            color={data.memory.percent > 80 ? '#ef4444' : data.memory.percent > 50 ? '#f59e0b' : '#4fb8b2'}
          />
          <div className="grid grid-cols-3 gap-4 mt-3 text-xs text-muted-foreground">
            <div>Total: {formatBytes(data.memory.total)}</div>
            <div>Used: {formatBytes(data.memory.used)}</div>
            <div>Free: {formatBytes(data.memory.free)}</div>              {data.memory.available !== undefined && (
                <div>Available: {formatBytes(data.memory.available)}</div>
              )}          </div>
        </CardContent>
      </Card>

      {/* Disk */}
      {data.disk && data.disk.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="size-5 text-cyan-500" />
              Disk
              {data.disk.mount && (
                <span className="text-xs font-normal text-muted-foreground">{data.disk.mount}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Gauge
              label="Storage"
              value={`${formatBytes(data.disk.used)} / ${formatBytes(data.disk.total)}`}
              percent={data.disk.percent}
              color={data.disk.percent > 80 ? '#ef4444' : data.disk.percent > 50 ? '#f59e0b' : '#4fb8b2'}
            />
            <div className="grid grid-cols-3 gap-4 mt-3 text-xs text-muted-foreground">
              <div>Total: {formatBytes(data.disk.total)}</div>
              <div>Used: {formatBytes(data.disk.used)}</div>
              <div>Free: {formatBytes(data.disk.free)}</div>
              {data.disk.filesystem && (
                <div className="col-span-3">Filesystem: {data.disk.filesystem}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
