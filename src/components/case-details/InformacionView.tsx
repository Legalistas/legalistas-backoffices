"use client";

import { CalendarCheck2, FileBadge, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Cases, CasesFiles } from "@/types/cases";
import { AsistenciaEntradaView } from "./AsistenciaEntradaView";
import { PartesView } from "./PartesView";
import { SrtInfoView } from "./SrtInfoView";

// Pestaña "Información" (relevamiento 7): unifica Info + Partes en subtabs.
//  - Partes.
//  - SRT: solo si la causa es de Accidente de Trabajo (incluye in itinere y
//    enfermedad profesional, que van por la ART) y está en etapa
//    Administrativa. No aplica a Accidente de Tránsito.
//  - Asistencia a la entrada (nombre a confirmar): reunión de entrada del CRM.

// Servicios que van por la ART (backend: constants/services.ts).
const SERVICIOS_ART = [1, 9, 10];
const ETAPA_ADMINISTRATIVO = 2;

type SubTab = "partes" | "srt" | "asistencia";

interface InformacionViewProps {
	caseId: string;
	caseData: Cases;
	files: CasesFiles[];
	customerName?: string;
}

export function InformacionView({ caseId, caseData, files, customerName }: InformacionViewProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const muestraSrt =
		SERVICIOS_ART.includes(caseData.servicesId ?? -1) &&
		caseData.stageId === ETAPA_ADMINISTRATIVO;

	const subtabs = useMemo(
		() =>
			[
				{ key: "partes" as const, label: "Partes", icon: Users },
				...(muestraSrt ? [{ key: "srt" as const, label: "SRT", icon: FileBadge }] : []),
				{ key: "asistencia" as const, label: "Asistencia a la entrada", icon: CalendarCheck2 },
			],
		[muestraSrt],
	);

	const inicial = searchParams.get("sub") as SubTab | null;
	const [sub, setSub] = useState<SubTab>(
		inicial && subtabs.some((s) => s.key === inicial) ? inicial : "partes",
	);

	// Si la causa deja de ser administrativa, SRT desaparece: volver a Partes.
	useEffect(() => {
		if (!subtabs.some((s) => s.key === sub)) setSub("partes");
	}, [subtabs, sub]);

	const elegir = (key: SubTab) => {
		setSub(key);
		const params = new URLSearchParams(window.location.search);
		params.set("sub", key);
		router.replace(`${window.location.pathname}?${params.toString()}`);
	};

	return (
		<div className="grid gap-4 p-4 md:grid-cols-[200px_1fr]">
			<nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Información de la causa">
				{subtabs.map(({ key, label, icon: Icon }) => (
					<button
						key={key}
						type="button"
						onClick={() => elegir(key)}
						aria-current={sub === key ? "page" : undefined}
						className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
							sub === key
								? "bg-primary/10 font-medium text-primary"
								: "text-muted-foreground hover:bg-muted hover:text-foreground"
						}`}
					>
						<Icon className="h-4 w-4" />
						{label}
					</button>
				))}
				{!muestraSrt && (
					<p className="hidden px-3 pt-2 text-xs text-muted-foreground md:block">
						SRT aparece en causas de Accidente de Trabajo en etapa Administrativa.
					</p>
				)}
			</nav>

			<section className="min-w-0">
				{sub === "partes" && (
					<PartesView caseId={caseId} files={files} customerName={customerName} />
				)}
				{sub === "srt" && muestraSrt && <SrtInfoView caseId={caseId} />}
				{sub === "asistencia" && <AsistenciaEntradaView caseId={caseId} />}
			</section>
		</div>
	);
}
