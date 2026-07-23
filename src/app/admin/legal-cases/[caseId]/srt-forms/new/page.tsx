"use client";

import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	CASE_SRT_FORMS_ENDPOINT,
	CASE_SRT_INFO_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	Anexo4Reason,
	CaseSrtInfo,
	ContingencyType,
	SrtProcedureType,
} from "@/types/srt";

// ── Config del selector ────────────────────────────────────────────────────

const PROCEDURE_OPTIONS: {
	value: SrtProcedureType;
	label: string;
	anexoKey: "anexoIData" | "anexoIIData" | "anexoIIIData" | "anexoIVData";
}[] = [
	{
		value: "DIVERGENCIA_INCAPACIDAD",
		label: "Divergencia en la determinación de la incapacidad",
		anexoKey: "anexoIData",
	},
	{
		value: "RECHAZO_ACCIDENTE_TRABAJO",
		label: "Rechazo de accidente de trabajo",
		anexoKey: "anexoIIData",
	},
	{
		value: "RECHAZO_ACCIDENTE_IN_ITINERE",
		label: "Rechazo de accidente in itinere",
		anexoKey: "anexoIIData",
	},
	{
		value: "RECHAZO_ENFERMEDAD_PROF",
		label: "Rechazo de enfermedad profesional",
		anexoKey: "anexoIIIData",
	},
	{
		value: "DIVERGENCIA_PRESTACIONES",
		label: "Divergencia en el alta / Reingreso / Prestaciones",
		anexoKey: "anexoIVData",
	},
];

// ── Página ────────────────────────────────────────────────────────────────

export default function GenerateSrtFormPage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const caseId = Number(params.caseId);
	const token = session?.user?.accessToken;

	const [procedure, setProcedure] = useState<SrtProcedureType | "">("");
	const [info, setInfo] = useState<CaseSrtInfo | null>(null);
	const [anexoData, setAnexoData] = useState<Record<string, unknown>>({});
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [generated, setGenerated] = useState<{
		formId: number;
		downloadUrl: string | null;
	} | null>(null);

	// Carga info del caso al mount.
	const loadInfo = useCallback(async () => {
		if (!token) return;
		try {
			const res = await fetch(CASE_SRT_INFO_ENDPOINT(caseId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Error al cargar info del caso");
			const data = await res.json();
			setInfo(data.info);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [caseId, token]);

	useEffect(() => {
		loadInfo();
	}, [loadInfo]);

	// Cuando cambia el procedureType, precargar el anexo correspondiente
	// desde la info del caso (si ya existía).
	useEffect(() => {
		if (!procedure || !info) return;
		const opt = PROCEDURE_OPTIONS.find((o) => o.value === procedure);
		if (!opt) return;
		const existing = info[opt.anexoKey] as Record<string, unknown> | null;
		setAnexoData(existing ?? {});
	}, [procedure, info]);

	const setField = (key: string, value: unknown) =>
		setAnexoData((d) => ({ ...d, [key]: value }));

	const infoIncomplete =
		!info?.workerFullName || !info?.employerName || !info?.artName;

	const handleGenerate = async () => {
		if (!token || !procedure) return;
		const opt = PROCEDURE_OPTIONS.find((o) => o.value === procedure);
		if (!opt) return;

		setGenerating(true);
		setGenerated(null);
		try {
			// 1) Persistir el anexo en CaseSrtInfo (para reuso futuro).
			const putRes = await fetch(CASE_SRT_INFO_ENDPOINT(caseId), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ [opt.anexoKey]: anexoData }),
			});
			if (!putRes.ok) {
				const e = await putRes.json().catch(() => ({}));
				throw new Error(e.error || "Error al guardar el anexo");
			}

			// 2) Generar el PDF.
			const genRes = await fetch(CASE_SRT_FORMS_ENDPOINT(caseId), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ procedureType: procedure }),
			});
			if (!genRes.ok) {
				const e = await genRes.json().catch(() => ({}));
				throw new Error(e.error || "Error al generar el PDF");
			}
			const data = await genRes.json();
			setGenerated({ formId: data.formId, downloadUrl: data.downloadUrl });
			toast.success("Formulario generado");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setGenerating(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-16">
				<Loader2 className="animate-spin h-6 w-6" />
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-4">
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="sm" onClick={() => router.back()}>
					<ArrowLeft className="h-4 w-4 mr-1" /> Volver
				</Button>
				<h1 className="text-xl font-semibold">Generar formulario SRT</h1>
			</div>

			{infoIncomplete && (
				<Card className="border-amber-500">
					<CardContent className="py-3 text-sm">
						La info del caso está incompleta. Cargá los bloques{" "}
						<strong>Trabajador</strong>, <strong>Empleador</strong> y{" "}
						<strong>ART</strong> en la tab{" "}
						<Link
							href={`/admin/legal-cases/${caseId}?tab=info`}
							className="underline"
						>
							Info
						</Link>{" "}
						antes de generar.
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">1. Tipo de trámite</CardTitle>
				</CardHeader>
				<CardContent>
					<Select
						value={procedure}
						onValueChange={(v) => setProcedure(v as SrtProcedureType)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Seleccionar trámite…" />
						</SelectTrigger>
						<SelectContent>
							{PROCEDURE_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			{procedure && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							2. Datos específicos del anexo
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{procedure === "DIVERGENCIA_INCAPACIDAD" && (
							<AnexoIForm data={anexoData} setField={setField} />
						)}
						{(procedure === "RECHAZO_ACCIDENTE_TRABAJO" ||
							procedure === "RECHAZO_ACCIDENTE_IN_ITINERE") && (
							<AnexoIIForm
								data={anexoData}
								setField={setField}
								withInItinere={procedure === "RECHAZO_ACCIDENTE_IN_ITINERE"}
							/>
						)}
						{procedure === "RECHAZO_ENFERMEDAD_PROF" && (
							<AnexoIIIForm data={anexoData} setField={setField} />
						)}
						{procedure === "DIVERGENCIA_PRESTACIONES" && (
							<AnexoIVForm data={anexoData} setField={setField} />
						)}
					</CardContent>
				</Card>
			)}

			{procedure && (
				<div className="flex justify-end gap-2">
					<Button onClick={handleGenerate} disabled={generating}>
						{generating ? (
							<Loader2 className="animate-spin h-4 w-4 mr-2" />
						) : (
							<FileText className="h-4 w-4 mr-2" />
						)}
						Guardar y generar PDF
					</Button>
				</div>
			)}

			{generated && (
				<Card className="border-green-600">
					<CardContent className="py-4 flex items-center justify-between">
						<div>
							<div className="font-medium">Formulario #{generated.formId}</div>
							<div className="text-sm text-muted-foreground">
								Listo para imprimir, hacer firmar y escanear.
							</div>
						</div>
						{generated.downloadUrl ? (
							<a href={generated.downloadUrl} target="_blank" rel="noreferrer">
								<Button>
									<Download className="h-4 w-4 mr-2" /> Descargar PDF
								</Button>
							</a>
						) : (
							<span className="text-sm text-muted-foreground">
								Sin URL directa — descargar desde el historial.
							</span>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// ── Sub-componentes de formulario por anexo ────────────────────────────────

type Setter = (key: string, value: unknown) => void;
type FormProps = { data: Record<string, unknown>; setField: Setter };

function Field({
	label,
	children,
	className,
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`flex flex-col gap-1 ${className ?? ""}`}>
			<Label className="text-xs text-muted-foreground">{label}</Label>
			{children}
		</div>
	);
}

function BoolYesNo({
	value,
	onChange,
}: {
	value: unknown;
	onChange: (v: boolean | null) => void;
}) {
	const current = value === true ? "SI" : value === false ? "NO" : "";
	return (
		<Select
			value={current}
			onValueChange={(v) => onChange(v === "SI" ? true : v === "NO" ? false : null)}
		>
			<SelectTrigger>
				<SelectValue placeholder="Seleccionar…" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="SI">Sí</SelectItem>
				<SelectItem value="NO">No</SelectItem>
			</SelectContent>
		</Select>
	);
}

function ContingencySelect({
	value,
	onChange,
}: {
	value: unknown;
	onChange: (v: ContingencyType) => void;
}) {
	return (
		<Select
			value={(value as string) || ""}
			onValueChange={(v) => onChange(v as ContingencyType)}
		>
			<SelectTrigger>
				<SelectValue placeholder="Seleccionar…" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="ACCIDENTE_TRABAJO">Accidente de trabajo</SelectItem>
				<SelectItem value="IN_ITINERE">In itinere</SelectItem>
				<SelectItem value="ENFERMEDAD_PROF">Enfermedad profesional</SelectItem>
			</SelectContent>
		</Select>
	);
}

function s(v: unknown): string {
	return v == null ? "" : String(v);
}

// ── Anexo I ────────────────────────────────────────────────────────────────

function AnexoIForm({ data, setField }: FormProps) {
	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<Field label="Tipo de contingencia" className="md:col-span-3">
					<ContingencySelect
						value={data.contingencyType}
						onChange={(v) => setField("contingencyType", v)}
					/>
				</Field>
				<Field label="Fecha de denuncia">
					<Input
						type="date"
						value={s(data.denunciaDate)}
						onChange={(e) => setField("denunciaDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de baja laboral (opcional)">
					<Input
						type="date"
						value={s(data.bajaLaboralDate)}
						onChange={(e) => setField("bajaLaboralDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de ocurrencia / diagnóstico">
					<Input
						type="date"
						value={s(data.ocurrenciaDate)}
						onChange={(e) => setField("ocurrenciaDate", e.target.value)}
					/>
				</Field>
			</div>
			<Field label="Detalle del accidente o enfermedad profesional">
				<Textarea
					rows={4}
					value={s(data.accidentDetail)}
					onChange={(e) => setField("accidentDetail", e.target.value)}
				/>
			</Field>
			<Field label="Afecciones o diagnósticos derivados">
				<Textarea
					rows={3}
					value={s(data.diagnosticDetail)}
					onChange={(e) => setField("diagnosticDetail", e.target.value)}
				/>
			</Field>
			<MedicalQuestions data={data} setField={setField} includeAlta />
			<Field label="Prueba médica para acreditar la incapacidad">
				<Textarea
					rows={3}
					value={s(data.medicalProof)}
					onChange={(e) => setField("medicalProof", e.target.value)}
				/>
			</Field>
		</>
	);
}

// ── Anexo II ───────────────────────────────────────────────────────────────

function AnexoIIForm({
	data,
	setField,
	withInItinere,
}: FormProps & { withInItinere: boolean }) {
	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<Field label="Fecha de denuncia">
					<Input
						type="date"
						value={s(data.denunciaDate)}
						onChange={(e) => setField("denunciaDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de baja laboral (opcional)">
					<Input
						type="date"
						value={s(data.bajaLaboralDate)}
						onChange={(e) => setField("bajaLaboralDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de ocurrencia">
					<Input
						type="date"
						value={s(data.ocurrenciaDate)}
						onChange={(e) => setField("ocurrenciaDate", e.target.value)}
					/>
				</Field>
			</div>
			<Field label="Descripción de hechos y circunstancias del accidente">
				<Textarea
					rows={4}
					value={s(data.accidentDescription)}
					onChange={(e) => setField("accidentDescription", e.target.value)}
				/>
			</Field>
			<Field label="Compromisos o diagnósticos derivados">
				<Textarea
					rows={3}
					value={s(data.diagnosticDetail)}
					onChange={(e) => setField("diagnosticDetail", e.target.value)}
				/>
			</Field>

			{withInItinere && (
				<div className="rounded-md border p-3 space-y-3 bg-muted/20">
					<div className="text-sm font-medium">
						Datos específicos — In itinere
					</div>
					<Field label="Horario de ingreso y egreso al puesto de trabajo">
						<Input
							value={s(data.workScheduleInOut)}
							onChange={(e) => setField("workScheduleInOut", e.target.value)}
							placeholder="Ej: 08:00 a 17:00"
						/>
					</Field>
					<Field label="Domicilio del lugar de prestación / donde reporta">
						<Input
							value={s(data.workAddress)}
							onChange={(e) => setField("workAddress", e.target.value)}
						/>
					</Field>
					<Field label="Domicilio de residencia">
						<Input
							value={s(data.residenceAddress)}
							onChange={(e) => setField("residenceAddress", e.target.value)}
						/>
					</Field>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<Field label="Lugar del accidente">
							<Input
								value={s(data.accidentPlace)}
								onChange={(e) => setField("accidentPlace", e.target.value)}
							/>
						</Field>
						<Field label="Hora del accidente">
							<Input
								type="time"
								value={s(data.accidentTime)}
								onChange={(e) => setField("accidentTime", e.target.value)}
							/>
						</Field>
						<Field label="¿Realizó denuncia policial?">
							<BoolYesNo
								value={data.policeReport}
								onChange={(v) => setField("policeReport", v)}
							/>
						</Field>
					</div>
				</div>
			)}

			<Field label="Fecha de primera atención médica">
				<Input
					type="date"
					value={s(data.firstAttentionDate)}
					onChange={(e) => setField("firstAttentionDate", e.target.value)}
				/>
			</Field>
			<MedicalQuestions data={data} setField={setField} />
			<Field label="Pruebas que acreditan el origen laboral">
				<Textarea
					rows={3}
					value={s(data.originProof)}
					onChange={(e) => setField("originProof", e.target.value)}
				/>
			</Field>
		</>
	);
}

// ── Anexo III ──────────────────────────────────────────────────────────────

function AnexoIIIForm({ data, setField }: FormProps) {
	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<Field label="Fecha de denuncia">
					<Input
						type="date"
						value={s(data.denunciaDate)}
						onChange={(e) => setField("denunciaDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de baja laboral (opcional)">
					<Input
						type="date"
						value={s(data.bajaLaboralDate)}
						onChange={(e) => setField("bajaLaboralDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de diagnóstico">
					<Input
						type="date"
						value={s(data.diagnosticoDate)}
						onChange={(e) => setField("diagnosticoDate", e.target.value)}
					/>
				</Field>
				<Field label="Sector o área de trabajo">
					<Input
						value={s(data.workSector)}
						onChange={(e) => setField("workSector", e.target.value)}
					/>
				</Field>
				<Field label="Antigüedad en la tarea">
					<Input
						value={s(data.taskSeniority)}
						onChange={(e) => setField("taskSeniority", e.target.value)}
						placeholder="Ej: 5 años"
					/>
				</Field>
				<Field label="Año de ingreso a la empresa">
					<Input
						type="number"
						value={s(data.hireYear)}
						onChange={(e) => setField("hireYear", e.target.value)}
						placeholder="Ej: 2018"
					/>
				</Field>
			</div>
			<Field label="Descripción detallada de tareas realizadas">
				<Textarea
					rows={4}
					value={s(data.tasksDescription)}
					onChange={(e) => setField("tasksDescription", e.target.value)}
				/>
			</Field>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<Field label="¿Realizó tareas similares para otros empleadores?">
					<BoolYesNo
						value={data.similarTasksOthers}
						onChange={(v) => setField("similarTasksOthers", v)}
					/>
				</Field>
				<Field label="¿Denunció la misma enfermedad a otro empleador?">
					<BoolYesNo
						value={data.sameDiseaseReported}
						onChange={(v) => setField("sameDiseaseReported", v)}
					/>
				</Field>
			</div>
			{data.sameDiseaseReported === true && (
				<Field label="Relación de otros empleadores">
					<Textarea
						rows={3}
						value={s(data.otherEmployers)}
						onChange={(e) => setField("otherEmployers", e.target.value)}
					/>
				</Field>
			)}
			<MedicalQuestions data={data} setField={setField} />
			<Field label="Pruebas ofrecidas">
				<Textarea
					rows={3}
					value={s(data.proofOffered)}
					onChange={(e) => setField("proofOffered", e.target.value)}
				/>
			</Field>
		</>
	);
}

// ── Anexo IV ───────────────────────────────────────────────────────────────

function AnexoIVForm({ data, setField }: FormProps) {
	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
				<Field label="Tipo de contingencia" className="md:col-span-3">
					<ContingencySelect
						value={data.contingencyType}
						onChange={(v) => setField("contingencyType", v)}
					/>
				</Field>
				<Field label="Fecha de denuncia">
					<Input
						type="date"
						value={s(data.denunciaDate)}
						onChange={(e) => setField("denunciaDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de baja laboral (opcional)">
					<Input
						type="date"
						value={s(data.bajaLaboralDate)}
						onChange={(e) => setField("bajaLaboralDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de ocurrencia">
					<Input
						type="date"
						value={s(data.ocurrenciaDate)}
						onChange={(e) => setField("ocurrenciaDate", e.target.value)}
					/>
				</Field>
				<Field label="Fecha de alta médica / cese de ILT">
					<Input
						type="date"
						value={s(data.altaMedicaDate)}
						onChange={(e) => setField("altaMedicaDate", e.target.value)}
					/>
				</Field>
				<Field label="Motivo de la solicitud" className="md:col-span-2">
					<Select
						value={(data.reason as string) || ""}
						onValueChange={(v) => setField("reason", v as Anexo4Reason)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Seleccionar…" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALTA">Alta</SelectItem>
							<SelectItem value="REINGRESO">Reingreso</SelectItem>
							<SelectItem value="PRESTACIONES">Prestaciones</SelectItem>
						</SelectContent>
					</Select>
				</Field>
			</div>
			<Field label="Detalle del accidente o enfermedad profesional">
				<Textarea
					rows={4}
					value={s(data.accidentDetail)}
					onChange={(e) => setField("accidentDetail", e.target.value)}
				/>
			</Field>
			<Field label="Afecciones o diagnósticos derivados">
				<Textarea
					rows={3}
					value={s(data.diagnosticDetail)}
					onChange={(e) => setField("diagnosticDetail", e.target.value)}
				/>
			</Field>
			<MedicalQuestions data={data} setField={setField} includeAlta />
			<Field label="Prueba médica">
				<Textarea
					rows={3}
					value={s(data.medicalProof)}
					onChange={(e) => setField("medicalProof", e.target.value)}
				/>
			</Field>
		</>
	);
}

// ── Preguntas médicas comunes ──────────────────────────────────────────────

function MedicalQuestions({
	data,
	setField,
	includeAlta,
}: FormProps & { includeAlta?: boolean }) {
	return (
		<div className="rounded-md border p-3 space-y-3 bg-muted/10">
			<div className="text-sm font-medium">Atención médica</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<Field label="¿Recibió atención de la ART?">
					<BoolYesNo
						value={data.art_attention}
						onChange={(v) => setField("art_attention", v)}
					/>
				</Field>
				{includeAlta && (
					<Field label="¿Recibió el alta médica de la aseguradora?">
						<BoolYesNo
							value={data.art_alta}
							onChange={(v) => setField("art_alta", v)}
						/>
					</Field>
				)}
				<Field label="¿Recibió atención médica de OS / Prepaga / Salud Pública?">
					<BoolYesNo
						value={data.os_attention}
						onChange={(v) => setField("os_attention", v)}
					/>
				</Field>
				<Field label="¿Realizó estudios médicos en OS / Prepaga / Salud Pública?">
					<BoolYesNo
						value={data.os_studies}
						onChange={(v) => setField("os_studies", v)}
					/>
				</Field>
			</div>
		</div>
	);
}
