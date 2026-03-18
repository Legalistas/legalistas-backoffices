"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { LEADS_ENDPOINT, LEADS_NOTES_DELETE_ENDPOINT, LEADS_NOTES_ENDPOINT, LEADS_NOTES_UPDATE_ENDPOINT, LAWYERS_ENDPOINT } from "@/constant/api-endpoints"
import type { Lead } from "@/types/crm"
import Button from "../ui/button/Button"
import { ArrowLeft, Briefcase, CheckCircle, Clock, Edit, FileText, Globe, Mail, Phone, Share, Share2, User, XCircle } from 'lucide-react'
import Badge from "../ui/badge/Badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card/Card"
import { CRM_COLUMNS, SOURCE_CHANNEL, WHATSAPP_MESSAGES } from "@/constant/crm"
import { formatDate } from "@/lib/functions"
import { servicesType } from "@/lib/constant"
import Checkbox from "../ui/input/Checkbox"
import { toast } from "sonner"
import Label from "../ui/label/Label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs/Tabs"
import ChangeStageButton from "./ChangeStageButton"
import ScheduleMeetingButton from "./ScheduleMeetingButton"
import LeadNotes from "./LeadNotes"
import LeadLogDetails from "./LeadLogDetails"
import Image from "next/image"
import LeadActivity from "./LeadActivity"
import LeadDocuments from "./LeadDocuments"
import AddDocumentButton from "./AddDocumentButton"
import LeadFormDialog from "./LeadFormDialog"
import ClientPortalButton from "./ClientPortalButton"
import Can from "../auth/Can"
import Link from "next/link"


export default function LeadDetailPageContent({ id }: { id: string }) {
    const router = useRouter()
    const { data: session } = useSession()
    const [lead, setLead] = useState<Lead | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [noteContent, setNoteContent] = useState<string>(lead?.notes || "")
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [currentLead, setCurrentLead] = useState<Lead | null>(null)
    const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([])
    const [allLawyers, setAllLawyers] = useState<{ id: number; name: string; image?: string | null }[]>([])

    const leadId = Number(id)

    const getUserLocation = (user: any) => {
        if (!user?.userAddresses || user.userAddresses.length === 0) {
            return "Sin ubicación"
        }

        const defaultAddress = user.userAddresses.find((addr: any) => addr.isDefault) || user.userAddresses[0]

        const parts = []

        // Usar directamente el nombre del estado si está presente
        if (defaultAddress.state?.name) {
            parts.push(defaultAddress.state.name)
        }

        // Agregar ciudad si existe y no está vacía
        if (defaultAddress.city?.trim()) {
            parts.push(defaultAddress.city)
        }

        return parts.length > 0 ? parts.join(" - ") : "Sin ubicación"
    }

    useEffect(() => {
        const fetchLeads = async () => {
            if (!id || !session?.user?.accessToken) {
                console.error("Missing ID or access token")
                setError("Faltan datos necesarios para cargar el lead")
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                const response = await fetch(`${LEADS_ENDPOINT}/${id}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                })

                if (response.status === 404) {
                    // Handle 404 specifically
                    setError("Lead no encontrado")
                    setLead(null)

                    return
                }

                if (!response.ok) {
                    throw new Error(`Error: ${response.status} ${response.statusText}`)
                }

                const data = await response.json()
                console.log("🚀 ~ fetchLeads ~ data:", data)

                setLead(data)
            } catch (error) {
                console.error("Error fetching leads:", error)
                setError(error instanceof Error ? error.message : "Error desconocido al cargar los leads")
            } finally {
                setIsLoading(false)
            }
        }

        fetchLeads()

        // Fetch lawyers para menciones
        const fetchLawyers = async () => {
            if (!session?.user?.accessToken) return
            try {
                const res = await fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                })
                if (!res.ok) return
                const json = await res.json()
                if (json.data && Array.isArray(json.data)) {
                    setAllLawyers(json.data.map((l: any) => ({
                        id: l.id,
                        name: l.name,
                        image: l.image,
                    })))
                }
            } catch {
                // No bloquear si falla
            }
        }
        fetchLawyers()
    }, [session?.user?.accessToken, id])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Cargando...</h2>
                    <p className="text-muted-foreground">Obteniendo información del lead</p>
                </div>
            </div>
        )
    }

    if (!lead) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Lead no encontrado</h2>
                    <p className="text-muted-foreground">El lead que buscas no existe o ha sido eliminado</p>
                    <Button className="mt-4" onClick={() => router.push("/admin/crm")}>
                        Volver al Embudo
                    </Button>
                </div>
            </div>
        )
    }

    const getStatusBadge = () => {
        switch (lead.status) {
            case "IN_PROGRESS":
                return (
                    <Badge className="bg-gray-500 text-white px-5">
                        <Clock className="h-4 w-4 mr-2" />
                        En Progreso
                    </Badge>
                )
            case "WON":
                return (
                    <Badge className="bg-green-500 text-white px-5">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Ganado
                    </Badge>
                )
            case "LOST":
                return (
                    <Badge className="bg-red-500 text-white px-5">
                        <XCircle className="h-4 w-4 mr-2" />
                        Perdido
                    </Badge>
                )
            default:
                return null
        }
    }

    const getColumnName = (columnId: number | undefined) => {
        if (!columnId) return "No asignado"

        const column = CRM_COLUMNS.find((col) => Number(col.id) === columnId)
        return column ? column.title : "Columna desconocida"
    }

    const getChanelName = (channelId: number | undefined) => {
        if (!channelId) return "No asignado"

        const channel = SOURCE_CHANNEL.find((channel) => Number(channel.id) === channelId)
        return channel ? channel.name : "Canal desconocido"
    }

    const getServicesName = (servicesId: string[] | number) => {
        if (!servicesId) return "No asignado"

        const services = servicesType.find((service) => Number(service.id) === Number(servicesId))
        return services ? services.label : "Servicio desconocido"
    }

    const handleDocumentationChange = async (checked: boolean) => {
        if (!lead) return

        // Update the lead in our state first (optimistic update)
        const updatedLead = {
            ...lead,
            documentationComplete: checked,
        }
        setLead(updatedLead)

        try {
            // Make API call to update the lead
            const response = await fetch(`${LEADS_ENDPOINT}/${lead.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    documentationComplete: checked,
                }),
            })

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`)
            }

            // Show success message
            toast.success(checked ? "Documentación completada" : "Documentación pendiente")
        } catch (error) {
            console.error("Error updating lead:", error)

            // Revert the optimistic update if the API call fails
            setLead(lead)

            toast.error("Error al actualizar la documentación")
        }
    }

    const handleSaveNote = async () => {
        if (!lead) return

        // Show loading state
        const savingToast = toast.loading("Guardando nota...")

        try {
            // Make API call to create the note
            const response = await fetch(`${LEADS_NOTES_ENDPOINT(Number(lead.id))}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    note: noteContent,
                    userId: session?.user?.id ? Number.parseInt(session.user.id) : undefined,
                    mentionedUserIds,
                }),
            })

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`)
            }

            // Fetch the updated lead data
            const updatedLeadResponse = await fetch(`${LEADS_ENDPOINT}/${lead.id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (!updatedLeadResponse.ok) {
                throw new Error(`Error fetching updated lead: ${updatedLeadResponse.status}`)
            }

            // Update the lead state with the fresh data
            const updatedLeadData = await updatedLeadResponse.json()
            setLead(updatedLeadData)

            // Clear the note content and mentions
            setNoteContent("")
            setMentionedUserIds([])

            // Show success message
            toast.dismiss(savingToast)
            toast.success("Nota guardada correctamente")
        } catch (error) {
            console.error("Error updating lead notes:", error)

            // Show error message
            toast.dismiss(savingToast)
            toast.error("Error al guardar la nota")
        }
    }

    // handleEditNote ahora es una función normal, no un useCallback
    async function handleEditNote(noteId: number, content: string) {
        if (!content.trim() || isNaN(leadId) || !session?.user?.accessToken) {
            toast.error("El contenido de la nota no puede estar vacío o el ID del lead es inválido.")
            return
        }

        try {
            const response = await fetch(LEADS_NOTES_UPDATE_ENDPOINT(leadId, noteId), {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.user.accessToken}`,
                },
                body: JSON.stringify({ note: content }),
            })

            if (!response.ok) {
                throw new Error("Failed to update note")
            }

            toast.success("Nota actualizada correctamente.")
            fetchLeadData() // Refresh lead data to show the updated note
        } catch (error) {
            console.error("Error updating note:", error)
            toast.error("Error al actualizar la nota.")
        }
    }

    async function handleDeleteNote(noteId: number) {
        if (isNaN(leadId) || !session?.user?.accessToken) {
            toast.error("No se pudo eliminar la nota o el ID del lead es inválido.")
            return
        }

        try {
            const response = await fetch(LEADS_NOTES_DELETE_ENDPOINT(leadId, noteId), {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session.user.accessToken}`,
                },
            })

            if (!response.ok) {
                throw new Error("Failed to delete note")
            }

            toast.success("Nota eliminada correctamente.")
            fetchLeadData() // Refresh lead data to remove the deleted note
        } catch (error) {
            console.error("Error deleting note:", error)
            toast.error("Error al eliminar la nota.")
        }
    }

    const handleLeadUpdate = (updatedLead: Lead) => {
        setLead(updatedLead)
    }

    const handleEditLead = (lead: Lead) => {
        setCurrentLead(lead)
        setIsFormOpen(true)
    }

    // Defino fetchLeadData para refrescar los datos del lead
    async function fetchLeadData() {
        if (!id || !session?.user?.accessToken) return;
        try {
            const response = await fetch(`${LEADS_ENDPOINT}/${id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.user.accessToken}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setLead(data);
            }
        } catch (error) {

            // Manejo de error opcional
        }
    }

    return (
        <>
            <div className="w-full">
                <div className="flex items-center mb-6">
                    <Button variant="outline" size="sm" className="mr-4" onClick={() => router.push("/admin/crm")}>
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{lead.user?.name || "Sin nombre"}</h1>
                        <p className="text-muted-foreground">
                            {getUserLocation(lead.user)}
                        </p>
                    </div>
                    <Can role="asistente_legal" inverse>
                        <div className="ml-auto flex gap-2">

                            {getStatusBadge()}
                            <Button variant="custom" size="sm" onClick={() => handleEditLead(lead)} className="hover:bg-gray-300 hover:text-gray-800 transform transition duration-200 ease-in-out p-2 rounded-full">
                                <Edit className="h-6 w-6" />
                            </Button>
                        </div>
                    </Can>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Información del Lead</CardTitle>
                                <CardDescription>Detalles completos de la oportunidad</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Etapa</p>
                                        <p>{getColumnName(lead.columnId)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
                                        <p>{formatDate(lead.createdAt)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Fecha de accidente</p>
                                        <p>{formatDate(lead.accidentDate)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Canal de origen</p>
                                        <p>
                                            {getChanelName(lead.sourceChannelId)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Servicios</p>
                                        <div className="flex flex-wrap gap-1">
                                            {getServicesName(lead.servicesId)}
                                        </div>
                                    </div>
                                </div>
                                <Can role="asistente_legal" inverse>
                                    {/* Separador */}
                                    <div className="h-px bg-gray-200 dark:bg-gray-700" />

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="documentationComplete"
                                            checked={lead.documentationComplete || false}
                                            onChange={handleDocumentationChange}
                                        />

                                        <div>
                                            <Label htmlFor="documentationComplete" className="font-medium mb-0">
                                                Documentación completa
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                {lead.documentationComplete
                                                    ? "Esta oportunidad puede moverse a estado Ganado"
                                                    : "Esta oportunidad no puede moverse a estado Ganado hasta completar la documentación"}
                                            </p>
                                        </div>

                                        {lead.documentationComplete ? (
                                            <CheckCircle className="h-5 w-5 text-green-500 ml-2" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500 ml-2" />
                                        )}
                                    </div>
                                </Can>
                            </CardContent>
                        </Card>
                        <Can role="asistente_legal" inverse>
                            <Tabs defaultValue="activities" className="w-full bg-white dark:bg-gray-800">
                                <TabsList className="w-full">
                                    <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
                                    <TabsTrigger value="documents">Documentos</TabsTrigger>
                                    <TabsTrigger value="tasks">Tareas</TabsTrigger>
                                    <TabsTrigger value="activities">Notas</TabsTrigger>
                                    <TabsTrigger value="activity">
                                        Actividades{" "}
                                        {(lead.crmMeetings?.length ?? 0) > 0 && (
                                            <Badge className="ml-2">{lead.crmMeetings?.length ?? 0}</Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="timeline">
                                    <LeadLogDetails lead={lead} />
                                </TabsContent>
                                <TabsContent value="documents">
                                    <LeadDocuments lead={lead} onLeadUpdate={handleLeadUpdate} />
                                </TabsContent>
                                <TabsContent value="tasks">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Tareas</CardTitle>
                                            <CardDescription>Tareas pendientes y completadas</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-center py-6">
                                                <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                                                <p className="mt-2 text-muted-foreground">No hay tareas asignadas</p>
                                                <Button variant="outline" className="mt-4">
                                                    Crear tarea
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                <TabsContent value="activities">
                                    <LeadNotes
                                        lead={lead}
                                        handleSaveNote={handleSaveNote}
                                        noteContent={noteContent}
                                        setNoteContent={setNoteContent}
                                        handleEditNote={handleEditNote}
                                        handleDeleteNote={handleDeleteNote}
                                        mentionUsers={allLawyers}
                                        onMentionsChange={setMentionedUserIds}
                                    />
                                </TabsContent>
                                <TabsContent value="activity">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Actividades</CardTitle>
                                            <CardDescription>Actividades pendientes y completadas</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <LeadActivity lead={lead} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </Can>
                    </div>

                    <div className="space-y-6">
                        <Can role="asistente_legal" inverse>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Contacto</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {lead.user ? (
                                        <>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gray-500/10 flex items-center justify-center mr-3">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{lead.user.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {lead.user.userAddresses?.[0]?.city || "Sin ubicación"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center text-sm">
                                                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                                                    <span>{lead.user.email || "Sin email"}</span>
                                                </div>
                                                <div className="flex items-center text-sm">
                                                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                                                    <span>{lead.user.userProfile?.phone || "Sin teléfono"}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-muted-foreground">No hay cliente asociado</p>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" size="sm" className="w-full">
                                        Ver perfil completo
                                    </Button>
                                </CardFooter>
                            </Card>
                        </Can>

                        <Card>
                            <CardHeader>
                                <CardTitle>Equipo asignado</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                            <User className="h-4 w-4 text-primary" />
                                            <p>Vendedor</p>
                                        </div>

                                        <div className="flex items-center">
                                            {lead.seller?.image ? (
                                                <Image
                                                    src={
                                                        lead.seller?.image
                                                            ? (lead.seller.image.startsWith('http')
                                                                ? lead.seller.image
                                                                : `${process.env.NEXT_PUBLIC_BACKEND_URL}${lead.seller.image}`)
                                                            : "/images/placeholder.svg"
                                                    }
                                                    alt={lead.seller.name || "User Avatar"}
                                                    width={36}
                                                    height={36}
                                                    quality={100}
                                                    priority
                                                    className="rounded-full mr-2 aspect-square object-cover"
                                                />
                                            ) : (
                                                <Image src="/images/placeholder.svg" alt="User Avatar" width={36} height={36} className="rounded-full mr-2 aspect-square object-cover" />
                                            )}
                                            <span>{lead.seller?.name || "Sin vendedor"}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                            <Briefcase className="h-4 w-4 text-primary" />
                                            <span>Abogado interno</span>
                                        </div>

                                        <div className="flex items-center">
                                            {lead.internalLawyer?.image ? (
                                                <Image
                                                    src={
                                                        lead.internalLawyer?.image
                                                            ? (lead.internalLawyer.image.startsWith('http')
                                                                ? lead.internalLawyer.image
                                                                : `${process.env.NEXT_PUBLIC_BACKEND_URL}${lead.internalLawyer.image}`)
                                                            : "/images/placeholder.svg"
                                                    }
                                                    alt={lead.internalLawyer?.name || "Sin abogado interno"}
                                                    width={36}
                                                    height={36}
                                                    quality={100}
                                                    priority
                                                    className="rounded-full mr-2 aspect-square object-cover"
                                                />
                                            ) : (
                                                <Image src="/images/placeholder.svg" alt="User Avatar" width={36} height={36} className="rounded-full mr-2 aspect-square object-cover" />
                                            )}
                                            <span>{lead.internalLawyer?.name || "Sin abogado interno"}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                                            <Briefcase className="h-4 w-4 text-primary" />
                                            <span>Abogado responsable</span>
                                        </div>

                                        <div className="flex items-center">
                                            {lead.responsibleLawyer?.image ? (
                                                <Image
                                                    src={
                                                        lead.responsibleLawyer?.image
                                                            ? (lead.responsibleLawyer.image.startsWith('http')
                                                                ? lead.responsibleLawyer.image
                                                                : `${process.env.NEXT_PUBLIC_BACKEND_URL}${lead.responsibleLawyer.image}`)
                                                            : "/images/placeholder.svg"
                                                    }
                                                    alt={lead.responsibleLawyer?.name || "Sin abogado responsable"}
                                                    width={36}
                                                    height={36}
                                                    quality={100}
                                                    priority
                                                    className="rounded-full mr-2 aspect-square object-cover"
                                                />
                                            ) : (
                                                <Image src="/images/placeholder.svg" alt="User Avatar" width={36} height={36} className="rounded-full mr-2 aspect-square object-cover" />
                                            )}
                                            <span>{lead.responsibleLawyer?.name || "Sin abogado responsable"}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Can role="asistente_legal" inverse>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Acciones</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button
                                        className="w-full border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/30"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const phone = lead.phone || lead.user?.userProfile?.phone || ""
                                            if (!phone) {
                                                toast.error("Este lead no tiene número de teléfono registrado")
                                                return
                                            }
                                            const cleanPhone = phone.replace(/[\s\-\(\)]/g, "")
                                            const columnId = String(lead.columnId || "1")
                                            const msgTemplate = WHATSAPP_MESSAGES[columnId] || WHATSAPP_MESSAGES["1"]
                                            const nombre = lead.user?.name || lead.name || "cliente"
                                            const message = encodeURIComponent(msgTemplate.replace("{nombre}", nombre))
                                            window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank")
                                        }}
                                    >
                                        <svg className="h-4 w-4 fill-green-600 mr-2" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        Enviar WhatsApp
                                    </Button>
                                    <AddDocumentButton lead={lead} onLeadUpdate={handleLeadUpdate} />
                                    <ScheduleMeetingButton lead={lead} onLeadUpdate={handleLeadUpdate} />
                                    <ChangeStageButton lead={lead} onLeadUpdate={handleLeadUpdate} />
                                    {/* <ClientPortalButton lead={lead} onLeadUpdate={handleLeadUpdate} /> */}

                                    <Button
                                        variant="outline"
                                        className="w-full flex justify-between items-center"
                                        size="sm"
                                        onClick={() => {
                                            const url = `https://legalistas.ar/tramite/${lead.id}`;
                                            window.open(url, "_blank");
                                        }}>
                                        <Globe className="h-4 w-4 ml-2" />
                                        <span>Web de trámite</span>
                                    </Button>

                                    {/* Botón compartir */}
                                    <Button
                                        variant="outline"
                                        className="w-full flex justify-between items-center"
                                        size="sm"
                                        onClick={() => {
                                            const url = `https://legalistas.ar/tramite/${lead.id}`;
                                            const text = `Mirá el estado de tu trámite en Legalistas: ${url}`;
                                            if (navigator.share) {
                                                navigator.share({ title: 'Legalistas', text, url });
                                            } else {
                                                // WhatsApp fallback
                                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                            }
                                        }}
                                    >
                                        <Share2 className="h-4 w-4 ml-2" />
                                        <span>Compartir Tramite</span>

                                    </Button>
                                </CardContent>
                            </Card>
                        </Can>
                    </div>
                </div>
            </div>

            <LeadFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} lead={currentLead} />
        </>
    )
}