"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ACTIVITY_LOGS_ENDPOINT,
  ACTIVITY_LOGS_STATS_ENDPOINT,
  ACTIVITY_LOGS_BY_USER_ENDPOINT,
} from "@/constant/api-endpoints"
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  LogIn,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react"
import Badge from "@/components/ui/badge/Badge"
import { Pagination } from "@/components/ui/pagination/Pagination"

interface ActivityLog {
  id: number
  userId: number
  loginAt: string
  logoutAt: string | null
  durationSecs: number | null
  ipAddress: string | null
  userAgent: string | null
  browser: string | null
  browserVersion: string | null
  os: string | null
  device: string | null
  loginMethod: string | null
  user?: {
    id: number
    name: string
    email: string
    image: string | null
  }
}

interface Stats {
  totalSessions: number
  todaySessions: number
  weekSessions: number
  activeSessions: number
  avgDurationSecs: number
}

function formatDuration(secs: number | null): string {
  if (!secs) return "-"
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "mobile") return <Smartphone className="h-4 w-4 text-blue-500" />
  if (device === "tablet") return <Tablet className="h-4 w-4 text-purple-500" />
  return <Monitor className="h-4 w-4 text-gray-500" />
}

function BrowserIcon({ browser }: { browser: string | null }) {
  const b = (browser || "").toLowerCase()
  const colors: Record<string, string> = {
    chrome: "text-yellow-500",
    firefox: "text-orange-500",
    safari: "text-blue-400",
    edge: "text-blue-600",
  }
  const color = Object.entries(colors).find(([k]) => b.includes(k))?.[1] ?? "text-gray-500"
  return <Globe className={`h-4 w-4 ${color}`} />
}

export default function ActivityLogsContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  const filterUserId = searchParams.get("userId")
  const filterUserName = searchParams.get("userName")

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const accessToken = (session?.user as any)?.accessToken

  const fetchStats = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch(ACTIVITY_LOGS_STATS_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) setStats(await res.json())
    } catch {}
  }, [accessToken])

  const fetchLogs = useCallback(
    async (page = 1) => {
      if (!accessToken) return
      setIsLoading(true)
      try {
        let url: string
        if (filterUserId) {
          url = ACTIVITY_LOGS_BY_USER_ENDPOINT(Number(filterUserId))
        } else {
          const u = new URL(ACTIVITY_LOGS_ENDPOINT)
          u.searchParams.set("page", String(page))
          u.searchParams.set("limit", "20")
          url = u.toString()
        }

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) return
        const data = await res.json()

        if (filterUserId) {
          setLogs(data)
          setTotal(data.length)
          setTotalPages(1)
        } else {
          setLogs(data.data)
          setTotal(data.meta.total)
          setTotalPages(data.meta.totalPages)
        }
      } catch {
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, filterUserId]
  )

  useEffect(() => {
    fetchLogs(currentPage)
    if (!filterUserId) fetchStats()
  }, [fetchLogs, fetchStats, currentPage, filterUserId])

  const handleRefresh = () => {
    fetchLogs(currentPage)
    if (!filterUserId) fetchStats()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {filterUserId && (
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black dark:text-gray-100">
              Historial de Sesiones
            </h1>
            {filterUserId && filterUserName && (
              <p className="text-sm text-gray-500 mt-0.5">
                Filtrando por: <span className="font-medium text-gray-700 dark:text-gray-300">{filterUserName}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-600 dark:text-gray-400"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Stats Cards - solo cuando no hay filtro por usuario */}
      {!filterUserId && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total sesiones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalSessions}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <LogIn className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Hoy</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.todaySessions}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Activas ahora</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.activeSessions}</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Duración promedio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatDuration(stats.avgDurationSecs)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {total} {total === 1 ? "registro" : "registros"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09A4B5]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <LogIn className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No hay registros de sesión</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {!filterUserId && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Usuario
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Ingreso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Salida
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Duración
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Navegador / OS
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {!filterUserId && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {log.user?.image ? (
                            <img
                              src={
                                log.user.image.startsWith('http')
                                  ? log.user.image
                                  : `${process.env.NEXT_PUBLIC_BACKEND_URL}${log.user.image}`
                              }
                              alt={log.user.name}
                              className="h-7 w-7 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const initial = log.user?.name?.charAt(0).toUpperCase() ?? "?";
                                target.style.display = 'none';
                                target.insertAdjacentHTML('afterend', `<div class="h-7 w-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-500">${initial}</div>`);
                              }}
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-500">
                              {log.user?.name?.charAt(0).toUpperCase() ?? "?"}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                              {log.user?.name ?? "-"}
                            </p>
                            <p className="text-xs text-gray-400">{log.user?.email ?? ""}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                        <LogIn className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {formatDate(log.loginAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.logoutAt ? (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                          <LogOut className="h-3.5 w-3.5 text-red-400 shrink-0" />
                          {formatDate(log.logoutAt)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatDuration(log.durationSecs)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                        {log.ipAddress ?? "-"}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <BrowserIcon browser={log.browser} />
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            {log.browser ?? "-"} {log.browserVersion ? `v${log.browserVersion}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DeviceIcon device={log.device} />
                          <span className="text-xs text-gray-500">{log.os ?? "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        size="sm"
                        color={log.loginMethod === "google" ? "info" : "primary"}
                        variant="light"
                      >
                        {log.loginMethod === "google" ? "Google" : "Credenciales"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {log.logoutAt ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                          Cerrada
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          Activa
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!filterUserId && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={20}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
