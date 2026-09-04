"use client";

import {
	ArrowLeft,
	Briefcase,
	Calendar,
	CalendarCheck,
	CalendarClock,
	CalendarPlus,
	CheckCircle,
	Clock,
	Edit,
	FileText,
	Globe,
	History,
	Mail,
	MapPin,
	Megaphone,
	Phone,
	ShieldCheck,
	Sparkles,
	Star,
	Stethoscope,
	StickyNote,
	Tag,
	User,
	XCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import moment from "moment";
import "moment/locale/es";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
	LAWYERS_ENDPOINT,
	LEADS_ENDPOINT,
	LEADS_NOTES_DELETE_ENDPOINT,
	LEADS_NOTES_ENDPOINT,
	LEADS_NOTES_UPDATE_ENDPOINT,
} from "@/constant/api-endpoints";
import { ART_COMPANIES, CRM_COLUMNS, INSURANCE_COMPANIES, MEETING_TYPES, SOURCE_CHANNEL } from "@/constant/crm";
import { servicesType } from "@/lib/constant";
import { formatDate } from "@/lib/functions";
import type { Lead } from "@/types/crm";
import Can from "../auth/Can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dropdown } from "@/components/shared/Dropdown";
import { DropdownItem } from "@/components/shared/DropdownItem";
import ChangeStageDropdown from "./ChangeStageDropdown";
import LeadActivity from "./LeadActivity";
import LeadAiAnalyzer from "./LeadAiAnalyzer";
import LeadDocuments from "./LeadDocuments";
import LeadFormDialog from "./LeadFormDialog";
import LeadLogDetails from "./LeadLogDetails";
import LeadNotes from "./LeadNotes";
import ScheduleMeetingModal from "./ScheduleMeetingModal";
import {
	sendStageEmail,
	shouldBlockAutomaticEmail,
} from "@/lib/send-stage-email";

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

const STATUS_CONFIG: Record<string, { pillClassName: string; icon: typeof Clock; label: string }> = {
	IN_PROGRESS: { pillClassName: "border-primary/30 bg-primary/5 text-primary", icon: Clock, label: "En Progreso" },
	WON: { pillClassName: "border-green-200 bg-green-50 text-green-700", icon: CheckCircle, label: "Ganado" },
	LOST: { pillClassName: "border-red-200 bg-red-50 text-red-700", icon: XCircle, label: "Perdido" },
};

function getAvatarSrc(image: string | null | undefined) {
	if (!image) return "/images/placeholder.svg";
	return image.startsWith("http")
		? image
		: `${process.env.NEXT_PUBLIC_BACKEND_URL}${image}`;
}

// Columnas con email asignado en CRM_COLUMN_TO_TEMPLATE (ver src/lib/email.ts)
const TEMPLATED_COLUMNS = [1, 4, 9];
// Columnas de etapas de reunión — el reenvío manda el mail de la reunión
const MEETING_COLUMNS = [2, 3, 6, 7];

function getMostRecentMeeting(lead: Lead) {
	if (!lead.crmMeetings?.length) return null;
	return [...lead.crmMeetings].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	)[0];
}

type ResendStrategy =
	| { type: "meeting"; meeting: NonNullable<ReturnType<typeof getMostRecentMeeting>> }
	| { type: "column" }
	| null;

function getResendStrategy(lead: Lead): ResendStrategy {
	const lastMeeting = getMostRecentMeeting(lead);
	if (MEETING_COLUMNS.includes(lead.columnId) && lastMeeting) {
		return { type: "meeting", meeting: lastMeeting };
	}
	if (TEMPLATED_COLUMNS.includes(lead.columnId)) {
		return { type: "column" };
	}
	return null;
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
		<div className="flex items-center justify-between gap-3">
			<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
				<Icon className="h-4 w-4 shrink-0 text-primary" />
				<span>{label}</span>
			</div>
			<div className="flex items-center gap-2">
				<Image
					src={getAvatarSrc(image)}
					alt={name || label}
					width={28}
					height={28}
					quality={100}
					className="rounded-full aspect-square object-cover"
				/>
				<span className="text-sm font-medium">{name || `Sin ${label.toLowerCase()}`}</span>
			</div>
		</div>
	);
}

// Tabs tipo "carpeta": track gris y la activa como píldora blanca flotando.
const tabTriggerClassName =
	"gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm";

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
	const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
	const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
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

		if (shouldBlockAutomaticEmail(email)) {
			toast.error(
				"Este lead tiene un email interno o de prueba — no se envían correos automáticos.",
			);
			return;
		}

		const strategy = getResendStrategy(lead);
		if (!strategy) {
			toast.error("No hay email para reenviar en esta etapa");
			return;
		}

		const accessToken = session?.user?.accessToken;
		const leadName = lead.name || lead.user?.name;
		const phoneNumber = lead.phone || lead.user?.userProfile?.phone;

		try {
			if (strategy.type === "meeting") {
				const m = strategy.meeting;
				const meetingDate = moment.utc(m.date as unknown as string | Date);
				const meetingLabel =
					MEETING_TYPES.find((t) => t.id === m.type)?.name || m.type;
				const confirmationUrl = m.token
					? `https://legalistas.ar/confirmacion-reunion/${m.token}`
					: "https://legalistas.ar";

				const res = await fetch("/api/notifications/email", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						to: email,
						leadId: Number(lead.id),
						template: "crm-reunion-concretar",
						isResend: true,
						accessToken,
						variables: {
							leadName,
							meetingType: meetingLabel,
							meetingTypeId: m.type,
							meetingNotes: m.note,
							date: meetingDate.format("dddd D [de] MMMM [de] YYYY"),
							hours: meetingDate.format("HH:mm"),
							phoneNumber,
							confirmationUrl,
						},
					}),
				});
				if (!res.ok) throw new Error(`Error: ${res.status}`);
			} else {
				await sendStageEmail({
					email,
					leadName,
					leadId: Number(lead.id),
					columnId: lead.columnId,
					phoneNumber,
					accessToken,
					isResend: true,
				});
			}
			toast.success("Email reenviado correctamente");
		} catch {
			toast.error("Error al reenviar el email");
		}
	};

	const canResendEmail =
		!!lead &&
		!!(lead.email || lead.user?.email) &&
		getResendStrategy(lead) !== null;


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
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
					<div className="flex min-w-0 flex-1 items-start gap-4">
						<Button
							variant="outline"
							size="icon"
							className="shrink-0 rounded-md shadow-sm"
							title="Volver"
							onClick={() => router.push("/admin/crm")}
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>

						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
									{lead.user?.name || "Sin nombre"}
								</h1>
								<button
									type="button"
									title="Favorito"
									className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition hover:bg-accent hover:text-foreground"
								>
									<Star className="h-4.75 w-4.75" />
								</button>
							</div>
							<p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
								<MapPin className="h-3.75 w-3.75 text-primary" />
								{getUserLocation(lead.user)}
							</p>
						</div>
					</div>

					<Can role="asistente_legal" inverse>
						<div className="flex flex-nowrap shrink-0 items-center gap-2">
							{statusCfg && (
								<div
									className={`flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold whitespace-nowrap ${statusCfg.pillClassName}`}
								>
									<statusCfg.icon className="h-4 w-4" />
									{statusCfg.label}
								</div>
							)}
							<ChangeStageDropdown
								lead={lead}
								onLeadUpdate={handleLeadUpdate}
							/>
							<Button
								variant="outline"
								size="icon"
								className="shrink-0 rounded-md shadow-sm"
								title="Programar reunión"
								onClick={() => setIsScheduleMeetingOpen(true)}
							>
								<Calendar className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="shrink-0 rounded-md shadow-sm"
								title="Editar"
								onClick={() => handleEditLead(lead)}
							>
								<Edit className="h-4 w-4" />
							</Button>
							<div className="relative">
								<Button
									variant="outline"
									size="icon"
									className="shrink-0 rounded-md shadow-sm"
									title="Más opciones"
									onClick={() => setHeaderMenuOpen((v) => !v)}
								>
									<Globe className="h-4 w-4" />
								</Button>
								<Dropdown
									isOpen={headerMenuOpen}
									onClose={() => setHeaderMenuOpen(false)}
									className="w-48"
								>
									{canResendEmail && (
										<DropdownItem
											onClick={() => {
												handleResendEmail();
												setHeaderMenuOpen(false);
											}}
										>
											Reenviar email
										</DropdownItem>
									)}
									<DropdownItem
										onClick={() => {
											window.open(`https://legalistas.ar/tramite/${lead.id}`, "_blank");
											setHeaderMenuOpen(false);
										}}
									>
										Web de trámite
									</DropdownItem>
								</Dropdown>
							</div>
						</div>
					</Can>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Columna principal */}
					<div className="md:col-span-2">
						{/* Tabs tipo carpeta */}
						<Can role="asistente_legal" inverse>
							<Tabs defaultValue="activities" className="w-full">
								<TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-muted p-1.5">
									<TabsTrigger value="activities" className={tabTriggerClassName}>
										<StickyNote className="h-4 w-4" />
										Notas
									</TabsTrigger>
									<TabsTrigger value="activity" className={tabTriggerClassName}>
										<CalendarCheck className="h-4 w-4" />
										Actividades
										{(lead.crmMeetings?.length ?? 0) > 0 && (
											<Badge variant="secondary" className="ml-1 text-xs">
												{lead.crmMeetings?.length}
											</Badge>
										)}
									</TabsTrigger>
									<TabsTrigger value="documents" className={tabTriggerClassName}>
										<FileText className="h-4 w-4" />
										Documentos
									</TabsTrigger>
									<TabsTrigger value="timeline" className={tabTriggerClassName}>
										<History className="h-4 w-4" />
										Línea de tiempo
									</TabsTrigger>
									<TabsTrigger value="ai-analyzer" className={tabTriggerClassName}>
										<Sparkles className="h-4 w-4" />
										Analizar con IA
									</TabsTrigger>
								</TabsList>

								<TabsContent value="activities" className="mt-4">
									<Card>
										<CardContent>
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
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="activity" className="mt-4">
									<Card>
										<CardContent>
											<h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
												<CalendarCheck className="h-5 w-5 text-primary" />
												Actividades
											</h3>
											<LeadActivity lead={lead} />
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="documents" className="mt-4">
									<Card>
										<CardContent>
											<LeadDocuments lead={lead} onLeadUpdate={handleLeadUpdate} />
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="timeline" className="mt-4">
									<Card>
										<CardContent>
											<LeadLogDetails lead={lead} />
										</CardContent>
									</Card>
								</TabsContent>

								<TabsContent value="ai-analyzer" className="mt-4">
									<Card>
										<CardContent>
											<LeadAiAnalyzer lead={lead} />
										</CardContent>
									</Card>
								</TabsContent>
							</Tabs>
						</Can>
					</div>

					{/* Sidebar derecho */}
					<div className="space-y-6">
						{/* Resumen del lead */}
						<Card>
							<CardHeader>
								<CardTitle className="font-normal text-muted-foreground">Resumen del lead</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<Can role="asistente_legal" inverse>
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

									<button
										type="button"
										onClick={() => handleDocumentationChange(!lead.documentationComplete)}
										className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
											lead.documentationComplete
												? "border-green-200 bg-green-50 hover:bg-green-100"
												: "border-amber-200 bg-amber-50 hover:bg-amber-100"
										}`}
									>
										{lead.documentationComplete ? (
											<CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
										) : (
											<XCircle className="h-5 w-5 shrink-0 text-amber-600" />
										)}
										<div>
											<p className={`text-sm font-medium ${lead.documentationComplete ? "text-green-800" : "text-amber-800"}`}>
												Documentación completa
											</p>
											<p className={`text-xs ${lead.documentationComplete ? "text-green-700/80" : "text-amber-700/80"}`}>
												{lead.documentationComplete
													? "Listo para avanzar"
													: "No puede moverse a Ganado hasta completar la documentación"}
											</p>
										</div>
									</button>

									<div className="h-px bg-border" />
								</Can>

								<div>
									<InfoField icon={Tag} label="Etapa" value={getColumnName(lead.columnId)} />
									<InfoField icon={CalendarClock} label="Fecha de accidente" value={formatDate(lead.accidentDate)} />
									<InfoField icon={Briefcase} label="Servicio" value={getServiceName(lead.servicesId)} />
									{getArtName(lead.artId) && (
										<InfoField icon={ShieldCheck} label="ART" value={getArtName(lead.artId)!} />
									)}
									{getInsuranceName(lead.insuranceId) && (
										<InfoField icon={ShieldCheck} label="Seguro" value={getInsuranceName(lead.insuranceId)!} />
									)}
									{lead.injury && (
										<InfoField icon={Stethoscope} label="Lesión" value={lead.injury} />
									)}
									<InfoField icon={Megaphone} label="Canal de origen" value={getChannelName(lead.sourceChannelId)} />
									<InfoField icon={CalendarPlus} label="Fecha de creación" value={formatDate(lead.createdAt)} />
								</div>
							</CardContent>
						</Card>

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
					</div>
				</div>
			</div>

			<LeadFormDialog
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				lead={currentLead}
			/>

			<ScheduleMeetingModal
				open={isScheduleMeetingOpen}
				onOpenChange={setIsScheduleMeetingOpen}
				lead={lead}
				onLeadUpdate={handleLeadUpdate}
			/>
		</>
	);
}

// --- Componente auxiliar para campos de info (fila con ícono, tipo "resumen") ---

function InfoField({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof User;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center justify-between gap-3 py-1.5 text-sm">
			<span className="flex items-center gap-1.5 text-muted-foreground">
				<Icon className="h-4 w-4 shrink-0 text-primary" />
				{label}
			</span>
			<span className="font-medium text-right">{value}</span>
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
