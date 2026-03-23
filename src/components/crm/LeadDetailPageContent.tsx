"use client";

import {
	ArrowLeft,
	Briefcase,
	CheckCircle,
	Clock,
	Edit,
	Globe,
	Mail,
	Phone,
	Share2,
	User,
	XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	LAWYERS_ENDPOINT,
	LEADS_ENDPOINT,
	LEADS_NOTES_DELETE_ENDPOINT,
	LEADS_NOTES_ENDPOINT,
	LEADS_NOTES_UPDATE_ENDPOINT,
} from "@/constant/api-endpoints";
import { ART_COMPANIES, CRM_COLUMNS, INSURANCE_COMPANIES, SOURCE_CHANNEL, WHATSAPP_MESSAGES } from "@/constant/crm";
import { servicesType } from "@/lib/constant";
import { formatDate } from "@/lib/functions";
import type { Lead } from "@/types/crm";
import Can from "../auth/Can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import AddDocumentButton from "./AddDocumentButton";
import ChangeStageButton from "./ChangeStageButton";
import LeadActivity from "./LeadActivity";
import LeadDocuments from "./LeadDocuments";
import LeadFormDialog from "./LeadFormDialog";
import LeadLogDetails from "./LeadLogDetails";
import LeadNotes from "./LeadNotes";
import ScheduleMeetingButton from "./ScheduleMeetingButton";
import { sendStageEmail } from "@/lib/send-stage-email";

// --- Helpers (fuera del componente, no se recrean cada render) ---

function getUserLocation(user: any) {
	if (!user?.userAddresses || user.userAddresses.length === 0)
		return "Sin ubicación";
	const addr =
		user.userAddresses.find((a: any) => a.isDefault) || user.userAddresses[0];
	const parts = [];
	if (addr.state?.name) parts.push(addr.state.name);
	if (addr.city?.trim()) parts.push(addr.city);
	return parts.length > 0 ? parts.join(" - ") : "Sin ubicación";
}

function getColumnName(columnId: number | undefined) {
	if (!columnId) return "No asignado";
	return CRM_COLUMNS.find((c) => Number(c.id) === columnId)?.title ?? "Columna desconocida";
}

function getChannelName(channelId: number | undefined) {
	if (!channelId) return "No asignado";
	return SOURCE_CHANNEL.find((c) => Number(c.id) === channelId)?.name ?? "Canal desconocido";
}

function getServiceName(servicesId: string[] | number) {
	if (!servicesId) return "No asignado";
	return servicesType.find((s) => Number(s.id) === Number(servicesId))?.label ?? "Servicio desconocido";
}

function getArtName(artId: number | null | undefined) {
	if (!artId) return null;
	return ART_COMPANIES.find((a) => a.id === artId)?.name ?? null;
}

function getInsuranceName(insuranceId: number | null | undefined) {
	if (!insuranceId) return null;
	return INSURANCE_COMPANIES.find((i) => i.id === insuranceId)?.name ?? null;
}

const STATUS_CONFIG: Record<string, { className: string; icon: typeof Clock; label: string }> = {
	IN_PROGRESS: { className: "bg-gray-500 text-white", icon: Clock, label: "En Progreso" },
	WON: { className: "bg-green-500 text-white", icon: CheckCircle, label: "Ganado" },
	LOST: { className: "bg-red-500 text-white", icon: XCircle, label: "Perdido" },
};

function getAvatarSrc(image: string | null | undefined) {
	if (!image) return "/images/placeholder.svg";
	return image.startsWith("http")
		? image
		: `${process.env.NEXT_PUBLIC_BACKEND_URL}${image}`;
}

// --- Sub-componente para miembros del equipo ---

function TeamMember({
	icon: Icon,
	label,
	name,
	image,
}: {
	icon: typeof User;
	label: string;
	name: string | undefined;
	image: string | null | undefined;
}) {
	return (
		<div className="space-y-1">
			<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
				<Icon className="h-4 w-4 text-primary" />
				<span>{label}</span>
			</div>
			<div className="flex items-center">
				<Image
					src={getAvatarSrc(image)}
					alt={name || label}
					width={36}
					height={36}
					quality={100}
					className="rounded-full mr-2 aspect-square object-cover"
				/>
				<span>{name || `Sin ${label.toLowerCase()}`}</span>
			</div>
		</div>
	);
}

// --- Componente principal ---

export default function LeadDetailPageContent({ id }: { id: string }) {
	const router = useRouter();
	const { data: session } = useSession();
	const [lead, setLead] = useState<Lead | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [, setError] = useState<string | null>(null);
	const [noteContent, setNoteContent] = useState("");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [currentLead, setCurrentLead] = useState<Lead | null>(null);
	const [mentionedUserIds, setMentionedUserIds] = useState<number[]>([]);
	const [allLawyers, setAllLawyers] = useState<
		{ id: number; name: string; image?: string | null }[]
	>([]);

	const leadId = Number(id);
	const token = session?.user?.accessToken;

	// --- Data fetching centralizado ---

	const fetchLeadData = useCallback(async () => {
		if (!id || !token) return;
		try {
			const res = await fetch(`${LEADS_ENDPOINT}/${id}`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});
			if (res.status === 404) {
				setError("Lead no encontrado");
				setLead(null);
				return;
			}
			if (!res.ok) throw new Error(`Error: ${res.status}`);
			setLead(await res.json());
		} catch (err) {
			console.error("Error fetching lead:", err);
			setError(err instanceof Error ? err.message : "Error desconocido");
		}
	}, [id, token]);

	useEffect(() => {
		const init = async () => {
			setIsLoading(true);
			setError(null);
			await fetchLeadData();
			setIsLoading(false);
		};
		init();

		// Fetch lawyers para menciones
		if (!token) return;
		fetch(`${LAWYERS_ENDPOINT}?limit=100000`, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (json?.data && Array.isArray(json.data)) {
					setAllLawyers(
						json.data.map((l: any) => ({
							id: l.id,
							name: l.name,
							image: l.image,
						})),
					);
				}
			})
			.catch(() => { });
	}, [token, id, fetchLeadData]);

	// --- Handlers ---

	const handleDocumentationChange = async (checked: boolean) => {
		if (!lead || !token) return;
		setLead({ ...lead, documentationComplete: checked });
		try {
			const res = await fetch(`${LEADS_ENDPOINT}/${lead.id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ documentationComplete: checked }),
			});
			if (!res.ok) throw new Error(`Error: ${res.status}`);
			toast.success(checked ? "Documentación completada" : "Documentación pendiente");
		} catch {
			setLead(lead);
			toast.error("Error al actualizar la documentación");
		}
	};

	const handleSaveNote = async () => {
		if (!lead || !token) return;
		const savingToast = toast.loading("Guardando nota...");
		try {
			const res = await fetch(`${LEADS_NOTES_ENDPOINT(Number(lead.id))}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					note: noteContent,
					userId: session?.user?.id ? Number.parseInt(session.user.id) : undefined,
					mentionedUserIds,
				}),
			});
			if (!res.ok) throw new Error(`Error: ${res.status}`);
			await fetchLeadData();
			setNoteContent("");
			setMentionedUserIds([]);
			toast.dismiss(savingToast);
			toast.success("Nota guardada correctamente");
		} catch {
			toast.dismiss(savingToast);
			toast.error("Error al guardar la nota");
		}
	};

	const handleEditNote = async (noteId: number, content: string) => {
		if (!content.trim() || Number.isNaN(leadId) || !token) {
			toast.error("El contenido de la nota no puede estar vacío.");
			return;
		}
		try {
			const res = await fetch(LEADS_NOTES_UPDATE_ENDPOINT(leadId, noteId), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ note: content }),
			});
			if (!res.ok) throw new Error("Failed to update note");
			toast.success("Nota actualizada correctamente.");
			fetchLeadData();
		} catch {
			toast.error("Error al actualizar la nota.");
		}
	};

	const handleDeleteNote = async (noteId: number) => {
		if (Number.isNaN(leadId) || !token) {
			toast.error("No se pudo eliminar la nota.");
			return;
		}
		try {
			const res = await fetch(LEADS_NOTES_DELETE_ENDPOINT(leadId, noteId), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Failed to delete note");
			toast.success("Nota eliminada correctamente.");
			fetchLeadData();
		} catch {
			toast.error("Error al eliminar la nota.");
		}
	};

	const handleLeadUpdate = (updatedLead: Lead) => setLead(updatedLead);

	const handleEditLead = (lead: Lead) => {
		setCurrentLead(lead);
		setIsFormOpen(true);
	};

	const handleResendEmail = async () => {
		if (!lead) return;
		const email = lead.email || lead.user?.email;
		if (!email) {
			toast.error("Este lead no tiene email registrado");
			return;
		}
		try {
			await sendStageEmail({
				email,
				leadName: lead.name || lead.user?.name,
				leadId: Number(lead.id),
				columnId: lead.columnId,
				phoneNumber: lead.phone || lead.user?.userProfile?.phone,
				accessToken: session?.user?.accessToken,
				isResend: true,
			});
			toast.success("Email reenviado correctamente");
		} catch {
			toast.error("Error al reenviar el email");
		}
	};

	const handleWhatsApp = () => {
		if (!lead) return;
		const phone = lead.phone || lead.user?.userProfile?.phone || "";
		if (!phone) {
			toast.error("Este lead no tiene número de teléfono registrado");
			return;
		}
		const cleanPhone = phone.replace(/[\s\-()]/g, "");
		const columnId = String(lead.columnId || "1");
		const nombre = lead.user?.name || lead.name || "cliente";

		// Buscar la reunión más reciente
		const lastMeeting = lead.crmMeetings?.length
			? [...lead.crmMeetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
			: null;

		const msgs = WHATSAPP_MESSAGES[columnId] || WHATSAPP_MESSAGES["1"];
		let msgTemplate = lastMeeting ? msgs.withMeeting : msgs.withoutMeeting;

		msgTemplate = msgTemplate.replace("{nombre}", nombre);

		if (lastMeeting) {
			const meetingDate = new Date(lastMeeting.date);
			const tipoReunion = MEETING_TYPES.find((mt) => mt.id === lastMeeting.type)?.name || lastMeeting.type;
			const fechaReunion = meetingDate.toLocaleDateString("es-AR", {
				weekday: "long",
				day: "numeric",
				month: "long",
			});
			const horaReunion = meetingDate.toLocaleTimeString("es-AR", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
				timeZone: "UTC",
			});
			const confirmationUrl = lastMeeting.token
				? `https://legalistas.ar/confirmacion-reunion/${lastMeeting.token}`
				: "https://legalistas.ar";
			msgTemplate = msgTemplate
				.replace("{tipoReunion}", tipoReunion)
				.replace("{fechaReunion}", fechaReunion)
				.replace("{horaReunion}", horaReunion)
				.replace("{confirmationUrl}", confirmationUrl);
		}

		const message = encodeURIComponent(msgTemplate);
		window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
	};

	// --- Loading / Error / Not found ---

	if (isLoading) {
		return <LeadDetailSkeleton />;
	}

	if (!lead) {
		return (
			<div className="flex items-center justify-center h-[calc(100vh-80px)]">
				<div className="text-center">
					<h2 className="text-xl font-semibold">Lead no encontrado</h2>
					<p className="text-muted-foreground">
						El lead que buscas no existe o ha sido eliminado
					</p>
					<Button className="mt-4" onClick={() => router.push("/admin/crm")}>
						Volver al Embudo
					</Button>
				</div>
			</div>
		);
	}

	const statusCfg = STATUS_CONFIG[lead.status];

	return (
		<>
			<div className="w-full">
				{/* Header */}
				<div className="flex items-center mb-6">
					<Button
						variant="outline"
						className="mr-4"
						onClick={() => router.push("/admin/crm")}
					>
						<ArrowLeft className="h-4 w-4" />
						Volver
					</Button>
					<div>
						<h1 className="text-2xl font-bold">
							{lead.user?.name || "Sin nombre"}
						</h1>
						<p className="text-muted-foreground">
							{getUserLocation(lead.user)}
						</p>
					</div>
					<Can role="asistente_legal" inverse>
						<div className="ml-auto flex gap-2">
							{statusCfg && (
								<Badge className={`${statusCfg.className} px-5`}>
									<statusCfg.icon className="h-4 w-4 mr-2" />
									{statusCfg.label}
								</Badge>
							)}
							<Button
								variant="outline"
								size="icon"
								onClick={() => handleEditLead(lead)}
							>
								<Edit className="h-4 w-4" />
							</Button>
						</div>
					</Can>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Columna principal */}
					<div className="md:col-span-2 space-y-6">
						{/* Info del Lead */}
						<Card>
							<CardHeader>
								<CardTitle>Información del Lead</CardTitle>
								<CardDescription>Detalles completos de la oportunidad</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<InfoField label="Etapa" value={getColumnName(lead.columnId)} />
									<InfoField label="Fecha de creación" value={formatDate(lead.createdAt)} />
									<InfoField label="Fecha de accidente" value={formatDate(lead.accidentDate)} />
									<InfoField label="Canal de origen" value={getChannelName(lead.sourceChannelId)} />
									<InfoField label="Servicios" value={getServiceName(lead.servicesId)} />
									{getArtName(lead.artId) && (
										<InfoField label="ART" value={getArtName(lead.artId)!} />
									)}
									{getInsuranceName(lead.insuranceId) && (
										<InfoField label="Seguro" value={getInsuranceName(lead.insuranceId)!} />
									)}
								</div>
								<Can role="asistente_legal" inverse>
									<div className="h-px bg-border" />
									<div className="flex items-center space-x-2">
										<Checkbox
											id="documentationComplete"
											checked={lead.documentationComplete || false}
											onCheckedChange={handleDocumentationChange}
										/>
										<div>
											<Label htmlFor="documentationComplete" className="font-medium mb-0">
												Documentación completa
											</Label>
											<p className="text-xs text-muted-foreground">
												{lead.documentationComplete
													? "Esta oportunidad puede moverse a estado Ganado"
													: "No puede moverse a Ganado hasta completar la documentación"}
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

						{/* Tabs */}
						<Can role="asistente_legal" inverse>
							<Tabs defaultValue="activities" className="w-full">
								<TabsList variant="line" className="w-full border-b border-border rounded-none bg-transparent">
									<TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
									<TabsTrigger value="documents">Documentos</TabsTrigger>
									<TabsTrigger value="activities">Notas</TabsTrigger>
									<TabsTrigger value="activity">
										Actividades
										{(lead.crmMeetings?.length ?? 0) > 0 && (
											<Badge variant="secondary" className="ml-2 text-xs">
												{lead.crmMeetings?.length}
											</Badge>
										)}
									</TabsTrigger>
								</TabsList>

								<TabsContent value="timeline" className="mt-4">
									<LeadLogDetails lead={lead} />
								</TabsContent>

								<TabsContent value="documents" className="mt-4">
									<LeadDocuments lead={lead} onLeadUpdate={handleLeadUpdate} />
								</TabsContent>

								<TabsContent value="activities" className="mt-4">
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

								<TabsContent value="activity" className="mt-4">
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

					{/* Sidebar derecho */}
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
							</Card>
						</Can>

						{/* Equipo asignado */}
						<Card>
							<CardHeader>
								<CardTitle>Equipo asignado</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<TeamMember
										icon={User}
										label="Vendedor"
										name={lead.seller?.name}
										image={lead.seller?.image}
									/>
									<TeamMember
										icon={Briefcase}
										label="Abogado interno"
										name={lead.internalLawyer?.name}
										image={lead.internalLawyer?.image}
									/>
									<TeamMember
										icon={Briefcase}
										label="Abogado responsable"
										name={lead.responsibleLawyer?.name}
										image={lead.responsibleLawyer?.image}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Acciones */}
						<Can role="asistente_legal" inverse>
							<Card>
								<CardHeader>
									<CardTitle>Acciones</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<Button
										className="w-full border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/30"
										variant="outline"
										onClick={handleWhatsApp}
									>
										<svg className="h-4 w-4 fill-green-600 mr-2" viewBox="0 0 24 24">
											<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
										</svg>
										Enviar WhatsApp
									</Button>
									<Button
										variant="outline"
										className="w-full"
										onClick={handleResendEmail}
									>
										<Mail className="h-4 w-4 mr-2" />
										Reenviar email
									</Button>
									<AddDocumentButton lead={lead} onLeadUpdate={handleLeadUpdate} />
									<ScheduleMeetingButton lead={lead} onLeadUpdate={handleLeadUpdate} />
									<ChangeStageButton lead={lead} onLeadUpdate={handleLeadUpdate} />

									<Button
										variant="outline"
										className="w-full"
										onClick={() => window.open(`https://legalistas.ar/tramite/${lead.id}`, "_blank")}
									>
										<Globe className="h-4 w-4 mr-2" />
										Web de trámite
									</Button>
								</CardContent>
							</Card>
						</Can>
					</div>
				</div>
			</div>

			<LeadFormDialog
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				lead={currentLead}
			/>
		</>
	);
}

// --- Componente auxiliar para campos de info ---

function InfoField({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="text-sm font-medium text-muted-foreground">{label}</p>
			<p>{value}</p>
		</div>
	);
}

// --- Skeleton para la página de detalle del lead ---

function LeadDetailSkeleton() {
	return (
		<div className="w-full">
			{/* Header */}
			<div className="flex items-center mb-6">
				<Skeleton className="h-10 w-24 mr-4" />
				<div className="space-y-2">
					<Skeleton className="h-7 w-48" />
					<Skeleton className="h-4 w-32" />
				</div>
				<div className="ml-auto flex gap-2">
					<Skeleton className="h-7 w-28 rounded-full" />
					<Skeleton className="h-9 w-9 rounded-md" />
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Columna principal */}
				<div className="md:col-span-2 space-y-6">
					{/* Card info */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-44" />
							<Skeleton className="h-4 w-64" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="space-y-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-5 w-36" />
									</div>
								))}
							</div>
							<Skeleton className="h-px w-full" />
							<div className="flex items-center space-x-2">
								<Skeleton className="h-4 w-4 rounded" />
								<div className="space-y-1">
									<Skeleton className="h-4 w-44" />
									<Skeleton className="h-3 w-72" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Tabs skeleton */}
					<div className="space-y-4">
						<div className="flex gap-4 border-b border-border pb-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-8 w-24" />
							))}
						</div>
						<Card>
							<CardContent className="p-6 space-y-4">
								{Array.from({ length: 4 }).map((_, i) => (
									<div key={i} className="flex gap-4">
										<Skeleton className="h-10 w-10 rounded-full shrink-0" />
										<div className="space-y-2 flex-1">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="h-3 w-1/2" />
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Contacto */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-24" />
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center">
								<Skeleton className="h-10 w-10 rounded-full mr-3" />
								<div className="space-y-2">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-3 w-20" />
								</div>
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-40" />
								<Skeleton className="h-4 w-32" />
							</div>
						</CardContent>
					</Card>

					{/* Equipo */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-32" />
						</CardHeader>
						<CardContent className="space-y-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<div className="flex items-center">
										<Skeleton className="h-9 w-9 rounded-full mr-2" />
										<Skeleton className="h-4 w-28" />
									</div>
								</div>
							))}
						</CardContent>
					</Card>

					{/* Acciones */}
					<Card>
						<CardHeader>
							<Skeleton className="h-6 w-24" />
						</CardHeader>
						<CardContent className="space-y-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
