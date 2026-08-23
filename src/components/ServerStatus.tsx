// import { useCallback, useEffect, useState } from 'react'
// import { Link } from '@tanstack/react-router'
// import { Cpu, MemoryStick } from 'lucide-react'

// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from '#/components/ui/tooltip'
// import api from '#/utils/axios'

// type ServerStatusData = {
//   hostname: string
//   uptime: { days: number; hours: number; minutes: number; seconds: number }
//   cpu: {
//     cores: number
//     loadAvg: { '1m': number; '5m': number; '15m': number }
//     loadPercent: number
//   }
//   memory: {
//     total: number
//     used: number
//     free: number
//     percent: number
//   }
// }

// const POLL_INTERVAL_MS = 15_000

// function formatBytes(bytes: number): string {
//   if (bytes === 0) return '0 B'
//   const units = ['B', 'KB', 'MB', 'GB', 'TB']
//   const i = Math.floor(Math.log(bytes) / Math.log(1024))
//   return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
// }

// function barColor(percent: number): string {
//   if (percent > 80) return '#ef4444'
//   if (percent > 50) return '#f59e0b'
//   return '#4fb8b2'
// }

// /**
//  * Compact CPU / memory gauges for the header. Polls the admin hardware
//  * endpoint so the numbers stay fresh without a page reload.
//  */
// export default function ServerStatus() {
//   const [data, setData] = useState<ServerStatusData | null>(null)
//   const [offline, setOffline] = useState(false)

//   const fetchStatus = useCallback(async () => {
//     try {
//       const { data: hw } = await api.get<ServerStatusData>('/admin/hardware')
//       setData(hw)
//       setOffline(false)
//     } catch {
//       setOffline(true)
//     }
//   }, [])

//   useEffect(() => {
//     fetchStatus()
//     const interval = setInterval(fetchStatus, POLL_INTERVAL_MS)
//     return () => clearInterval(interval)
//   }, [fetchStatus])

//   const cpuPercent = data?.cpu.loadPercent ?? null
//   const memPercent = data?.memory.percent ?? null

//   const uptimeStr = data
//     ? `${data.uptime.days}d ${data.uptime.hours}h ${data.uptime.minutes}m ${data.uptime.seconds}s`
//     : '—'

//   return (
//     <TooltipProvider delayDuration={0}>
//       <Tooltip>
//         <TooltipTrigger asChild>
//           <Link
//             to="/hardware"
//             aria-label="Server status — click for details"
//             className="group flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition hover:border-ring hover:text-foreground"
//           >
//             {offline && !data ? (
//               <span className="flex items-center gap-1.5 text-destructive">
//                 <span className="relative flex size-2">
//                   <span className="relative inline-flex size-2 rounded-full bg-destructive" />
//                 </span>
//                 Offline
//               </span>
//             ) : (
//               <>
//                 <span className="flex items-center gap-1.5">
//                   <Cpu className="size-3.5 text-amber-500" />
//                   <span className="font-semibold tabular-nums text-foreground">
//                     {cpuPercent === null ? '–' : `${cpuPercent}%`}
//                   </span>
//                 </span>
//                 <span className="mx-1 h-3 w-px bg-border" aria-hidden="true" />
//                 <span className="flex items-center gap-1.5">
//                   <MemoryStick className="size-3.5 text-purple-500" />
//                   <span className="font-semibold tabular-nums text-foreground">
//                     {memPercent === null ? '–' : `${memPercent}%`}
//                   </span>
//                 </span>
//               </>
//             )}
//           </Link>
//         </TooltipTrigger>
//         <TooltipContent side="bottom" align="end" className="w-64 space-y-2 p-3">
//           {data ? (
//             <>
//               <div className="flex items-center justify-between gap-4 text-xs">
//                 <span className="text-muted-foreground">Host</span>
//                 <span className="font-medium truncate">{data.hostname}</span>
//               </div>
//               <div className="flex items-center justify-between gap-4 text-xs">
//                 <span className="text-muted-foreground">Uptime</span>
//                 <span className="font-medium">{uptimeStr}</span>
//               </div>
//               <div className="flex items-center justify-between gap-4 text-xs">
//                 <span className="text-muted-foreground">Cores</span>
//                 <span className="font-medium">{data.cpu.cores}</span>
//               </div>
//               <div>
//                 <div className="flex items-center justify-between text-xs">
//                   <span className="text-muted-foreground">CPU load</span>
//                   <span className="font-medium">{cpuPercent}%</span>
//                 </div>
//                 <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
//                   <div
//                     className="h-full rounded-full transition-all duration-500"
//                     style={{ width: `${Math.min(cpuPercent ?? 0, 100)}%`, backgroundColor: barColor(cpuPercent ?? 0) }}
//                   />
//                 </div>
//                 <p className="mt-1 text-[10px] text-muted-foreground">
//                   1m: {data.cpu.loadAvg['1m'].toFixed(2)} · 5m: {data.cpu.loadAvg['5m'].toFixed(2)} · 15m: {data.cpu.loadAvg['15m'].toFixed(2)}
//                 </p>
//               </div>
//               <div>
//                 <div className="flex items-center justify-between text-xs">
//                   <span className="text-muted-foreground">Memory</span>
//                   <span className="font-medium">
//                     {formatBytes(data.memory.used)} / {formatBytes(data.memory.total)}
//                   </span>
//                 </div>
//                 <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
//                   <div
//                     className="h-full rounded-full transition-all duration-500"
//                     style={{ width: `${Math.min(memPercent ?? 0, 100)}%`, backgroundColor: barColor(memPercent ?? 0) }}
//                   />
//                 </div>
//                 <p className="mt-1 text-[10px] text-muted-foreground">{memPercent}% used</p>
//               </div>
//             </>
//           ) : (
//             <p className="text-xs text-muted-foreground">
//               {offline ? 'Server status unavailable.' : 'Loading server status…'}
//             </p>
//           )}
//           <p className="pt-1 text-[10px] text-muted-foreground border-t border-border">
//             Refreshes every {POLL_INTERVAL_MS / 1000}s
//           </p>
//         </TooltipContent>
//       </Tooltip>
//     </TooltipProvider>
//   )
// }

import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Cpu, MemoryStick } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import api from '#/utils/axios'

type ServerStatusData = {
  hostname: string
  platform: string
  distro: string
  release: string
  arch: string
  kernel: string
  nodeVersion: string

  uptime: {
    days: number
    hours: number
    minutes: number
    seconds: number
  }

  cpu: {
    model: string
    manufacturer: string
    cores: number
    physicalCores: number
    speed: number
    loadPercent: number
    userPercent: number
    systemPercent: number
  }

  memory: {
    total: number
    used: number
    free: number
    available: number
    percent: number
  }

  disk: {
    filesystem: string
    mount: string
    total: number
    used: number
    free: number
    percent: number
  } | null
}

const POLL_INTERVAL_MS = 15_000

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function barColor(percent: number): string {
  if (percent > 80) return '#ef4444'
  if (percent > 50) return '#f59e0b'
  return '#4fb8b2'
}

/**
 * Compact CPU / memory gauges for the header.
 * Polls the admin hardware endpoint every 15 seconds.
 */
export default function ServerStatus() {
  const [data, setData] = useState<ServerStatusData | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const { data: hw } =
        await api.get<ServerStatusData>('/admin/hardware')

      setData(hw)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }, [])

  useEffect(() => {
    fetchStatus()

    const interval = setInterval(
      fetchStatus,
      POLL_INTERVAL_MS,
    )

    return () => clearInterval(interval)
  }, [fetchStatus])

  const cpuPercent = data?.cpu.loadPercent ?? null
  const memPercent = data?.memory.percent ?? null

  const uptimeStr = data
    ? `${data.uptime.days}d ${data.uptime.hours}h ${data.uptime.minutes}m ${data.uptime.seconds}s`
    : '—'

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/hardware"
            aria-label="Server status — click for details"
            className="group flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition hover:border-ring hover:text-foreground"
          >
            {offline && !data ? (
              <span className="flex items-center gap-1.5 text-destructive">
                <span className="relative flex size-2">
                  <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                </span>

                Offline
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <Cpu className="size-3.5 text-amber-500" />

                  <span className="font-semibold tabular-nums text-foreground">
                    {cpuPercent === null
                      ? '–'
                      : `${cpuPercent}%`}
                  </span>
                </span>

                <span
                  className="mx-1 h-3 w-px bg-border"
                  aria-hidden="true"
                />

                <span className="flex items-center gap-1.5">
                  <MemoryStick className="size-3.5 text-purple-500" />

                  <span className="font-semibold tabular-nums text-foreground">
                    {memPercent === null
                      ? '–'
                      : `${memPercent}%`}
                  </span>
                </span>
              </>
            )}
          </Link>
        </TooltipTrigger>

        <TooltipContent
          side="bottom"
          align="end"
          className="w-72 space-y-2 p-3"
        >
          {data ? (
            <>
              {/* Host */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">
                  Host
                </span>

                <span className="truncate font-medium">
                  {data.hostname}
                </span>
              </div>

              {/* OS */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">
                  OS
                </span>

                <span className="truncate font-medium">
                  {data.distro || data.platform}
                </span>
              </div>

              {/* Architecture */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">
                  Architecture
                </span>

                <span className="font-medium">
                  {data.arch}
                </span>
              </div>

              {/* Uptime */}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted-foreground">
                  Uptime
                </span>

                <span className="font-medium">
                  {uptimeStr}
                </span>
              </div>

              {/* CPU */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    CPU
                  </span>

                  <span className="font-medium">
                    {cpuPercent}%
                  </span>
                </div>

                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        cpuPercent ?? 0,
                        100,
                      )}%`,
                      backgroundColor: barColor(
                        cpuPercent ?? 0,
                      ),
                    }}
                  />
                </div>

                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    User: {data.cpu.userPercent}%
                  </span>

                  <span>
                    System: {data.cpu.systemPercent}%
                  </span>
                </div>
              </div>

              {/* CPU details */}
              <div className="space-y-1 border-t border-border pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Cores
                  </span>

                  <span className="font-medium">
                    {data.cpu.cores}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Physical cores
                  </span>

                  <span className="font-medium">
                    {data.cpu.physicalCores}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">
                    CPU
                  </span>

                  <span className="truncate font-medium">
                    {data.cpu.model}
                  </span>
                </div>
              </div>

              {/* Memory */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Memory
                  </span>

                  <span className="font-medium">
                    {formatBytes(data.memory.used)} /{' '}
                    {formatBytes(data.memory.total)}
                  </span>
                </div>

                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        memPercent ?? 0,
                        100,
                      )}%`,
                      backgroundColor: barColor(
                        memPercent ?? 0,
                      ),
                    }}
                  />
                </div>

                <p className="mt-1 text-[10px] text-muted-foreground">
                  {memPercent}% used
                </p>
              </div>

              {/* Disk */}
              {data.disk && (
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Disk
                    </span>

                    <span className="font-medium">
                      {formatBytes(data.disk.used)} /{' '}
                      {formatBytes(data.disk.total)}
                    </span>
                  </div>

                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          data.disk.percent,
                          100,
                        )}%`,
                        backgroundColor: barColor(
                          data.disk.percent,
                        ),
                      }}
                    />
                  </div>

                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {data.disk.percent}% used ·{' '}
                    {data.disk.mount}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {offline
                ? 'Server status unavailable.'
                : 'Loading server status…'}
            </p>
          )}

          <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">
            Refreshes every {POLL_INTERVAL_MS / 1000}s
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}