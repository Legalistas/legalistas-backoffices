"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { LEADS_ENDPOINT, LEADS_NOTES_DELETE_ENDPOINT, LEADS_NOTES_ENDPOINT, LEADS_NOTES_UPDATE_ENDPOINT } from "@/constant/api-endpoints"
import type { Lead } from "@/types/crm"
import Button from "../ui/button/Button"
import { ArrowLeft, Briefcase, CheckCircle, Clock, Edit, FileText, Mail, Phone, User, XCircle } from 'lucide-react'
import Badge from "../ui/badge/Badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card/Card"
import { CRM_COLUMNS, SOURCE_CHANNEL } from "@/constant/crm"
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
import Can from "../auth/Can"


export default function LeadDetailPageContent({ id }: { id: string }) {
    const router = useRouter()
    const { data: session } = useSession()
    const [lead, setLead] = useState<Lead | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [noteContent, setNoteContent] = useState<string>(lead?.notes || "")
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [currentLead, setCurrentLead] = useState<Lead | null>(null)

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
                    <Badge className="bg-amber-500 text-white px-5">
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

            // Clear the note content
            setNoteContent("")

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
                                    <Button className="w-full" size="sm">
                                        <Mail className="h-4 w-4 mr-2" />
                                        Enviar email
                                    </Button>
                                    {/*  <Button variant="outline" className="w-full" size="sm">
                                <Calendar className="h-4 w-4 mr-2" />
                                Programar reunión
                            </Button>
                           <Button variant="outline" className="w-full" size="sm">
                                <Tag className="h-4 w-4 mr-2" />
                                Cambiar etapa
                            </Button> */}
                                    <AddDocumentButton lead={lead} onLeadUpdate={handleLeadUpdate} />
                                    <ScheduleMeetingButton lead={lead} onLeadUpdate={handleLeadUpdate} />
                                    <ChangeStageButton lead={lead} onLeadUpdate={handleLeadUpdate} />
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