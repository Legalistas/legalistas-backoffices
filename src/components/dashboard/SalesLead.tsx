"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card/Card"
import Badge from "@/components/ui/badge/Badge"
import Button from "@/components/ui/button/Button"
import { User } from "lucide-react"
import type { Lead } from "@/types/crm"
import { LEADS_ENDPOINT } from "@/constant/api-endpoints"
import { servicesType } from "@/lib/constant"
import { formatDateCustom } from "@/lib/functions"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SOURCE_CHANNEL } from "@/constant/crm"

export function SalesLead() {
  const { data: session } = useSession()
  const router = useRouter() // Corregido el nombre de la variable
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getColumnIdFromStatus = (status: string): number => {
    switch (status) {
      case "IN_PROGRESS":
        return 1
      case "WON":
        return 2
      case "LOST":
        return 3
      default:
        return 1
    }
  }

  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`${LEADS_ENDPOINT}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.user?.accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        const userId = Number(session?.user?.id)

        // 1. Filtrar por usuario relacionado
        const filteredLeads = data.filter((item: any) => {
          return item.sellerId === userId || item.internalLawyerId === userId || item.responsibleLawyerId === userId
        })

        // 2. Ordenar por fecha (de más nuevo a más viejo)
        const sortedLeads = filteredLeads.sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        // 3. Tomar sólo los últimos 5
        const latestFiveLeads = sortedLeads.slice(0, 5)

        // 4. Mapear los 5 leads seleccionados
        const mappedLeads = latestFiveLeads.map((item: any) => {
          const columnId = item.columnId || getColumnIdFromStatus(item.status)

          return {
            id: item.id.toString(),
            // Usar los datos correctos del objeto user
            name: item.user?.name || "",
            company: item.user?.userAddresses?.[0]?.city || "",
            email: item.user?.email || "",
            phone: item.user?.userProfile?.phone || "",
            contactId: item.contactId,
            sellerId: item.sellerId,
            internalLawyerId: item.internalLawyerId,
            responsibleLawyerId: item.responsibleLawyerId,
            servicesId: item.servicesId,
            sourceChannelId: item.sourceChannelId,
            status: item.status,
            columnId: columnId,
            notes: item.notes,
            documentationComplete: item.documentationComplete,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            services: {
              values: item.servicesId,
              label: getServiceLabel(item.servicesId),
            },
            // Guardar el objeto user completo
            user: item.user,
            internalLawyer: item.internalLawyer,
            responsibleLawyer: item.responsibleLawyer,
            seller: item.seller,
          }
        })

        setLeads(mappedLeads)
        console.log("Leads mapeados:", mappedLeads) // Para depuración
      } catch (error) {
        console.error("Error fetching leads:", error)
        setError(error instanceof Error ? error.message : "Error desconocido al cargar los leads")
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.accessToken) {
      fetchLeads()
    }
  }, [session?.user?.accessToken, session?.user?.id])

  const getServiceLabel = (serviceId: number) => {
    const service = servicesType.find((s) => s.value === serviceId)
    return service ? service.label : "Servicio desconocido"
  }

  const getSourceChannelLabel = (sourceChannelId: number | undefined) => {
    if (!sourceChannelId) return "Desconocido"

    const channel = SOURCE_CHANNEL.find((ch) => ch.id === sourceChannelId)
    return channel ? channel.name : `Canal ${sourceChannelId}`
  }

  if (isLoading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Oportunidades Recientes</CardTitle>
          <CardDescription>Últimas oportunidades creadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Cargando oportunidades...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Oportunidades Recientes</CardTitle>
          <CardDescription>Últimas oportunidades creadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Oportunidades Recientes</CardTitle>
        <CardDescription>Últimas oportunidades creadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leads.length === 0 ? (
            <div className="text-center py-4">No hay oportunidades disponibles</div>
          ) : (
            leads
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 3)
              .map((lead, index) => (
                <div
                  className="bg-white dark:bg-gray-800 rounded-md shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
                  key={lead.id || index}
                >
                  <div className="p-3 flex justify-between items-start">
                    <div className="space-y-0.5">
                      <Link href={`/admin/crm/leads/${lead.id}`}>
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white hover:text-blue-600">
                          {lead.id} - {lead.user?.name || "Sin nombre"}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {lead.user?.userAddresses?.[0]?.state?.name ? `${lead.user.userAddresses[0].state.name}` : ""}
                        {lead.user?.userAddresses?.[0]?.city
                          ? (lead.user.userAddresses[0].state?.name ? " - " : "") + lead.user.userAddresses[0].city
                          : ""}
                        {!lead.user?.userAddresses?.[0]?.state?.name &&
                          !lead.user?.userAddresses?.[0]?.city &&
                          "Ubicación no especificada"}
                      </p>
                    </div>
                    <div className="relative">
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatDateCustom(lead.createdAt)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2 px-3 pb-2">
                      {lead.services && (
                        <Badge
                          variant="light"
                          className="text-xs flex items-center gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
                        >
                          {lead.services.label}
                        </Badge>
                      )}
                      <Badge
                        variant="light"
                        className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {getSourceChannelLabel(lead.sourceChannelId)}
                      </Badge>
                    </div>

                  <div className="px-3 pb-2">
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                      <User className="h-3 w-3 mr-1 text-gray-500" />
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <strong>Abog. Responsable:</strong> {lead.responsibleLawyer?.name || "No asignado"}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                      <User className="h-3 w-3 mr-1 text-gray-500" />
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <strong>Abog. Interno:</strong> {lead.internalLawyer?.name || "No asignado"}
                      </div>
                    </div>

                    
                  </div>
                </div>
              ))
          )}
          <Button variant="outline" className="w-full" onClick={() => router.push("/admin/crm")}>
            Ver todas las oportunidades
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
