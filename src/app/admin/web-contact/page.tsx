"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import LeadFormDialog, {
	type WebContactPrefill,
} from "@/components/crm/LeadFormDialog";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebContactSubmissions } from "@/components/web-contact/useWebContactSubmissions";
import { WebContactTable } from "@/components/web-contact/WebContactTable";
import type { WebContactSubmission } from "@/types/web-contact";

const TABS = [
	{ value: "PENDING", label: "Pendientes" },
	{ value: "CONVERTED", label: "Convertidos" },
	{ value: "REJECTED", label: "Rechazados" },
] as const;

function buildPrefill(s: WebContactSubmission): WebContactPrefill {
	const notes = [
		s.services ? `Servicio de interés: ${s.services}` : null,
		s.message ? `Mensaje: ${s.message}` : null,
		s.origen ? `Origen: ${s.origen}` : null,
	]
		.filter(Boolean)
		.join("\n");

	return {
		firstName: s.firstName,
		lastName: s.lastName,
		email: s.email,
		phone: s.phone,
		notes,
		utmSource: s.utmSource,
		utmMedium: s.utmMedium,
		utmCampaign: s.utmCampaign,
		utmContent: s.utmContent,
		utmTerm: s.utmTerm,
		gclid: s.gclid,
		landingPage: s.landingPage,
	};
}

export default function WebContactPage() {
	const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("PENDING");
	const { data, loading, reject, convert } = useWebContactSubmissions(tab);
	const [selected, setSelected] = useState<WebContactSubmission | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleConvertClick = (s: WebContactSubmission) => {
		setSelected(s);
		setDialogOpen(true);
	};

	const handleReject = async (s: WebContactSubmission) => {
		if (!window.confirm(`¿Rechazar el contacto de ${s.firstName ?? "este lead"}?`)) {
			return;
		}
		const ok = await reject(s.id);
		if (ok) toast.success("Contacto rechazado");
		else toast.error("Error al rechazar el contacto");
	};

	const handleLeadCreated = async (leadId: number) => {
		if (!selected) return;
		await convert(selected.id, leadId);
	};

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
			<header className="flex items-center gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
					<MessageSquare className="size-5 text-primary" />
				</div>
				<div>
					<h1 className="text-2xl font-semibold text-slate-900">
						Contacto Web
					</h1>
					<p className="text-sm text-slate-500">
						Envíos del formulario de contacto de legalistas.ar. Convertí en
						lead o rechazá cada uno.
					</p>
				</div>
			</header>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Bandeja de contactos</CardTitle>
				</CardHeader>
				<CardContent>
					<Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
						<TabsList>
							{TABS.map((t) => (
								<TabsTrigger key={t.value} value={t.value}>
									{t.label}
								</TabsTrigger>
							))}
						</TabsList>
						{TABS.map((t) => (
							<TabsContent key={t.value} value={t.value} className="mt-4">
								{loading ? (
									<div className="p-8 text-center text-sm text-slate-500">
										Cargando...
									</div>
								) : (
									<WebContactTable
										submissions={data}
										onConvert={handleConvertClick}
										onReject={handleReject}
									/>
								)}
							</TabsContent>
						))}
					</Tabs>
				</CardContent>
			</Card>

			<LeadFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				lead={null}
				prefill={selected ? buildPrefill(selected) : null}
				onLeadCreated={handleLeadCreated}
			/>
		</div>
	);
}
