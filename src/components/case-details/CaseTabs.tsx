"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import type {
	Cases,
	CaseConsultations,
	CaseLogs,
	CasesFiles,
	CasesNotes,
} from "@/types/cases";
import CaseFilesMinio from "./CaseFilesMinio";
import { CedulasView } from "./CedulasView";
import ConsultationsView from "./ConsultationsView";
import { EscritosView } from "./EscritosView";
import { EventosView } from "./EventosView";
import { FilesListView } from "./FilesListView";
import { GastosView } from "./GastosView";
import { InformacionView } from "./InformacionView";
import { InformeTrimestralView } from "./InformeTrimestralView";
import { LiquidacionView } from "./LiquidacionView";
import { NotesView } from "./NotesView";
import { PlazosView } from "./PlazosView";
import SrtFormsHistory from "./SrtFormsHistory";
import { TimelineView } from "./TimelineView";

// Navegación de la causa (relevamiento 7). Orden acordado:
//   Notas → Expedientes → Cédulas → Escritos → Eventos → Liquidación
// y después Información (Info + Partes unificadas) y Línea de tiempo. Las que
// el relevamiento no ordena quedan al final, para no perder nada. "Análisis"
// se mantiene pero deshabilitado hasta que se reestructure su API.

const TABS = [
	{ value: "notes", label: "Notas" },
	{ value: "files", label: "Expedientes" },
	{ value: "cedulas", label: "Cédulas" },
	{ value: "escritos", label: "Escritos" },
	{ value: "eventos", label: "Eventos" },
	{ value: "liquidacion", label: "Liquidación" },
	{ value: "informacion", label: "Información" },
	{ value: "timeline", label: "Línea de tiempo" },
	{ value: "documents", label: "Documentos" },
	{ value: "plazos", label: "Plazos" },
	{ value: "gastos", label: "Gastos" },
	{ value: "consultations", label: "Consultas" },
	{ value: "informe", label: "Informe" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

// Links viejos: Info y Partes ahora son subtabs de Información.
const LEGACY_TABS: Record<string, TabValue> = {
	info: "informacion",
	partes: "informacion",
};

const normalizarTab = (t: string | null | undefined): TabValue | null => {
	if (!t) return null;
	if (t in LEGACY_TABS) return LEGACY_TABS[t];
	return TABS.some((x) => x.value === t) ? (t as TabValue) : null;
};

interface CaseTabsProps {
	activeTab: string;
	onTabChange: (tab: string) => void;
	notes: CasesNotes[];
	/** @deprecated La actividad se ve en "Línea de tiempo" (GET /timeline). */
	logs?: CaseLogs[];
	consultation: CaseConsultations[];
	caseId: string;
	caseData: Cases;
	filteredFiles: CasesFiles[];
	onAddNewFile: () => void;
	onNotesUpdated?: () => void;
	onCaseUpdated?: () => void;
	customer: {
		name: string;
	};
	responsibleLawyer?: {
		id: number;
		name: string;
		image?: string | null;
	} | null;
	internalLawyer?: { id: number; name: string; image?: string | null } | null;
}

export const CaseTabs = ({
	activeTab,
	onTabChange,
	notes = [],
	consultation = [],
	caseId,
	caseData,
	filteredFiles,
	onAddNewFile,
	customer,
	onNotesUpdated = () => {},
	onCaseUpdated,
	responsibleLawyer,
	internalLawyer,
}: CaseTabsProps) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [tab, setTab] = useState<TabValue>(
		() => normalizarTab(searchParams.get("tab")) ?? normalizarTab(activeTab) ?? "notes",
	);

	const handleTabChange = (value: string) => {
		const newTab = normalizarTab(value) ?? "notes";
		setTab(newTab);
		onTabChange(newTab);
		const params = new URLSearchParams(window.location.search);
		params.set("tab", newTab);
		params.delete("sub");
		router.replace(`${window.location.pathname}?${params.toString()}`);
	};

	const handleCreateConsultation = () => {
		router.refresh();
	};

	const handleNoteCreated = () => {
		onNotesUpdated();
		router.push(`/admin/legal-cases/${caseId}`);
	};

	const tabContentClass = "bg-card text-card-foreground";

	return (
		<Tabs value={tab} onValueChange={handleTabChange} className="w-full">
			<TabsList className="w-full bg-card text-card-foreground p-2 overflow-x-auto">
				{TABS.map((t) => (
					<TabsTrigger key={t.value} value={t.value}>
						{t.label}
					</TabsTrigger>
				))}
				{/* Provisorio: se mantiene pero deshabilitado hasta reestructurar su API. */}
				<TabsTrigger value="ia" disabled title="En reestructuración">
					Análisis
				</TabsTrigger>
			</TabsList>

			<TabsContent value="notes" className={tabContentClass}>
				<NotesView
					notes={notes}
					caseId={caseId}
					onNoteCreated={handleNoteCreated}
					responsibleLawyer={responsibleLawyer}
					internalLawyer={internalLawyer}
				/>
			</TabsContent>

			<TabsContent value="files" className={tabContentClass}>
				<FilesListView
					files={filteredFiles}
					caseId={caseId}
					customer={customer}
					onAddNewFile={onAddNewFile}
				/>
			</TabsContent>

			<TabsContent value="cedulas" className={tabContentClass}>
				<CedulasView caseId={caseId} files={filteredFiles} customerName={customer?.name} />
			</TabsContent>

			<TabsContent value="escritos" className={tabContentClass}>
				<EscritosView caseId={caseId} files={filteredFiles} customerName={customer?.name} />
			</TabsContent>

			<TabsContent value="eventos" className={tabContentClass}>
				<EventosView
					files={filteredFiles}
					caseId={caseId}
					responsibleLawyer={responsibleLawyer}
					internalLawyer={internalLawyer}
					customerName={customer?.name}
				/>
			</TabsContent>

			<TabsContent value="liquidacion" className={tabContentClass}>
				<LiquidacionView caseId={caseId} files={filteredFiles} customerName={customer?.name} />
			</TabsContent>

			<TabsContent value="informacion" className={tabContentClass}>
				<InformacionView
					caseId={caseId}
					caseData={caseData}
					files={filteredFiles}
					customerName={customer?.name}
				/>
			</TabsContent>

			<TabsContent value="timeline" className={tabContentClass}>
				<TimelineView caseId={caseId} />
			</TabsContent>

			{/* Árbol MinIO del caso: Documentos del caso + Escritos por expediente. */}
			<TabsContent value="documents" className={tabContentClass}>
				<div className="space-y-4 p-4">
					<CaseFilesMinio caseId={caseId} files={filteredFiles} customerName={customer?.name} />
					<SrtFormsHistory caseId={caseId} />
				</div>
			</TabsContent>

			<TabsContent value="plazos" className={tabContentClass}>
				<PlazosView
					files={filteredFiles}
					caseId={caseId}
					responsibleLawyer={responsibleLawyer}
					internalLawyer={internalLawyer}
					customerName={customer?.name}
				/>
			</TabsContent>

			<TabsContent value="gastos" className={tabContentClass}>
				<GastosView caseId={caseId} files={filteredFiles} customerName={customer?.name} />
			</TabsContent>

			<TabsContent value="consultations" className={tabContentClass}>
				<ConsultationsView
					consultations={consultation}
					caseId={caseId}
					onCreateConsultation={handleCreateConsultation}
				/>
			</TabsContent>

			<TabsContent value="informe" className={tabContentClass}>
				<InformeTrimestralView caseData={caseData} onCaseUpdated={onCaseUpdated} />
			</TabsContent>
		</Tabs>
	);
};
