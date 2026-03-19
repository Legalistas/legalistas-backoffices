"use client";

import {
	AlertCircle,
	Check,
	CheckCircle,
	Copy,
	ExternalLink,
	FileText,
	Loader2,
	Send,
	Shield,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { API_BASE_URL } from "@/constant/api-endpoints";
import type { Lead } from "@/types/crm";

interface ClientPortalModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

interface PortalStatus {
	hasPortalAccess: boolean;
	hasServiceAcceptance: boolean;
	hasCertificate: boolean;
	serviceAcceptanceStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
	portalUrl?: string;
	acceptanceUrl?: string;
	certificateUrl?: string;
}

const CLAIM_TYPES = [
	{ id: "accidente_laboral", name: "Accidente Laboral" },
	{ id: "enfermedad_profesional", name: "Enfermedad Profesional" },
	{ id: "accidente_transito", name: "Accidente de Tránsito" },
	{ id: "otro", name: "Otro" },
];

export default function ClientPortalModal({
	open,
	onOpenChange,
	lead,
	onLeadUpdate,
}: ClientPortalModalProps) {
	const { data: session } = useSession();
	const [activeTab, setActiveTab] = useState<"status" | "create">("status");
	const [isLoading, setIsLoading] = useState(false);
	const [portalStatus, setPortalStatus] = useState<PortalStatus | null>(null);
	const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

	const [accidentDate, setAccidentDate] = useState("");
	const [claimType, setClaimType] = useState("accidente_laboral");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (open && lead.id) {
			fetchPortalStatus();
		}
	}, [open, lead.id]);

	const fetchPortalStatus = async () => {
		setIsLoading(true);
		try {
			const response = await fetch(
				`${API_BASE_URL}/client-portal/lead/${lead.id}/status`,
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);

			if (response.ok) {
				setPortalStatus(await response.json());
			} else {
				setPortalStatus({
					hasPortalAccess: false,
					hasServiceAcceptance: false,
					hasCertificate: false,
				});
			}
		} catch {
			setPortalStatus({
				hasPortalAccess: false,
				hasServiceAcceptance: false,
				hasCertificate: false,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleCreateServiceAcceptance = async () => {
		if (!lead.user?.name && !lead.name) {
			toast.error("El lead debe tener un cliente asociado o un nombre");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch(
				`${API_BASE_URL}/client-portal/service-acceptance`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({
						leadId: lead.id,
						clientName: lead.user?.name || lead.name || "Cliente",
						accidentDate: accidentDate || null,
						claimType,
						description,
						expiresInDays: 7,
					}),
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Error al crear el formulario");
			}

			const data = await response.json();
			toast.success("Formulario de aceptación creado");
			await fetchPortalStatus();
			setActiveTab("status");

			if (data.acceptanceUrl) {
				await navigator.clipboard.writeText(data.acceptanceUrl);
				toast.success("URL copiada al portapapeles");
			}
		} catch (error) {
			toast.error((error as Error).message || "Error al crear el formulario");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCopyUrl = async (url: string, type: string) => {
		try {
			await navigator.clipboard.writeText(url);
			setCopiedUrl(type);
			toast.success("URL copiada al portapapeles");
			setTimeout(() => setCopiedUrl(null), 2000);
		} catch {
			toast.error("Error al copiar la URL");
		}
	};

	const getStatusBadge = (status?: string) => {
		const map: Record<string, { bg: string; text: string; label: string }> = {
			PENDING: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", label: "Pendiente" },
			ACCEPTED: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Aceptado" },
			REJECTED: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Rechazado" },
			EXPIRED: { bg: "bg-muted", text: "text-muted-foreground", label: "Expirado" },
		};
		const cfg = status ? map[status] : null;
		if (!cfg) return null;
		return (
			<span className={`px-2 py-1 text-xs rounded-full ${cfg.bg} ${cfg.text}`}>
				{cfg.label}
			</span>
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Portal de Cliente</DialogTitle>
					<DialogDescription className="sr-only">Gestionar el portal de acceso del cliente</DialogDescription>
				</DialogHeader>

				<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "status" | "create")}>
					<TabsList className="w-full">
						<TabsTrigger value="status" className="flex-1">Estado del Portal</TabsTrigger>
						<TabsTrigger value="create" className="flex-1">Crear Formulario</TabsTrigger>
					</TabsList>

					<TabsContent value="status" className="mt-4">
						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
							</div>
						) : (
							<div className="space-y-4">
								<PortalStatusItem
									icon={FileText}
									title="Aceptación de Servicios"
									description={portalStatus?.hasServiceAcceptance ? "Formulario enviado" : "No se ha enviado formulario"}
									active={portalStatus?.hasServiceAcceptance}
									badge={getStatusBadge(portalStatus?.serviceAcceptanceStatus)}
									url={portalStatus?.acceptanceUrl}
									urlType="acceptance"
									copiedUrl={copiedUrl}
									onCopy={handleCopyUrl}
								/>
								<PortalStatusItem
									icon={ExternalLink}
									title="Portal de Acceso"
									description={portalStatus?.hasPortalAccess ? "Cliente tiene acceso al portal" : "Se crea al aceptar servicios"}
									active={portalStatus?.hasPortalAccess}
									url={portalStatus?.portalUrl}
									urlType="portal"
									copiedUrl={copiedUrl}
									onCopy={handleCopyUrl}
								/>
								<PortalStatusItem
									icon={Shield}
									title="Certificado Digital"
									description={portalStatus?.hasCertificate ? "Certificado generado" : "Se genera al aceptar servicios"}
									active={portalStatus?.hasCertificate}
									url={portalStatus?.certificateUrl}
									urlType="certificate"
									copiedUrl={copiedUrl}
									onCopy={handleCopyUrl}
								/>

								{!portalStatus?.hasServiceAcceptance && (
									<div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
										<AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
										<div className="text-sm text-blue-700 dark:text-blue-300">
											<p className="font-medium">¿Cómo funciona?</p>
											<p className="mt-1">
												1. Crea un formulario de aceptación de servicios<br />
												2. Envía el link al cliente (WhatsApp, Email, etc.)<br />
												3. Cuando el cliente acepta, se crea automáticamente su portal
											</p>
										</div>
									</div>
								)}
							</div>
						)}
					</TabsContent>

					<TabsContent value="create" className="mt-4">
						<div className="space-y-4">
							{portalStatus?.hasServiceAcceptance &&
							portalStatus.serviceAcceptanceStatus === "PENDING" ? (
								<div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
									<AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
									<div className="text-sm text-yellow-700 dark:text-yellow-300">
										<p className="font-medium">Ya existe un formulario pendiente</p>
										<p className="mt-1">
											Puede copiar la URL desde la pestaña &quot;Estado del Portal&quot;.
										</p>
									</div>
								</div>
							) : portalStatus?.serviceAcceptanceStatus === "ACCEPTED" ? (
								<div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
									<CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
									<div className="text-sm text-green-700 dark:text-green-300">
										<p className="font-medium">El cliente ya aceptó los servicios</p>
										<p className="mt-1">El portal del cliente ya está activo.</p>
									</div>
								</div>
							) : (
								<>
									<div className="space-y-2">
										<Label>Tipo de reclamo</Label>
										<Select value={claimType} onValueChange={setClaimType}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{CLAIM_TYPES.map((type) => (
													<SelectItem key={type.id} value={type.id}>
														{type.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label>Fecha del accidente/evento (opcional)</Label>
										<Input
											type="date"
											value={accidentDate}
											onChange={(e) => setAccidentDate(e.target.value)}
										/>
									</div>

									<div className="space-y-2">
										<Label>Descripción del caso (opcional)</Label>
										<Textarea
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											placeholder="Breve descripción del accidente o situación..."
											rows={3}
										/>
									</div>

									<div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
										<p className="text-sm text-muted-foreground">
											<strong>Nota:</strong> Al crear el formulario se generará
											un link único que podrás enviar al cliente.
										</p>
									</div>
								</>
							)}
						</div>
					</TabsContent>
				</Tabs>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cerrar
					</Button>
					{activeTab === "create" && !portalStatus?.hasServiceAcceptance && (
						<Button onClick={handleCreateServiceAcceptance} disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Creando...
								</>
							) : (
								<>
									<Send className="h-4 w-4 mr-2" />
									Crear Formulario
								</>
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// --- Sub-componente para items de estado ---

function PortalStatusItem({
	icon: Icon,
	title,
	description,
	active,
	badge,
	url,
	urlType,
	copiedUrl,
	onCopy,
}: {
	icon: typeof FileText;
	title: string;
	description: string;
	active?: boolean;
	badge?: React.ReactNode;
	url?: string;
	urlType: string;
	copiedUrl: string | null;
	onCopy: (url: string, type: string) => void;
}) {
	return (
		<div
			className={`p-4 rounded-lg border ${
				active
					? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
					: "border-border bg-muted/50"
			}`}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-start gap-3">
					<div
						className={`p-2 rounded-lg ${
							active
								? "bg-green-100 dark:bg-green-800"
								: "bg-muted"
						}`}
					>
						<Icon
							className={`h-5 w-5 ${
								active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
							}`}
						/>
					</div>
					<div>
						<p className="font-medium">{title}</p>
						<p className="text-sm text-muted-foreground">{description}</p>
						{badge && <div className="mt-1">{badge}</div>}
					</div>
				</div>
				{url && (
					<button
						onClick={() => onCopy(url, urlType)}
						className="p-2 text-muted-foreground hover:text-primary transition-colors"
						title="Copiar URL"
					>
						{copiedUrl === urlType ? (
							<Check className="h-4 w-4 text-green-500" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</button>
				)}
			</div>
		</div>
	);
}
