"use client";

import { ArrowLeft, FileText, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { buildSrtDocument } from "@/components/srt/pdf";
import { SrtPdfPreview } from "@/components/srt/SrtPdfPreview";
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
	CASE_SRT_INFO_ENDPOINT,
} from "@/constant/api-endpoints";
import { buildPreviewValues } from "@/lib/srt/preview-values";
import type {
	CaseSrtDefaults,
	CaseSrtInfo,
	CompetenceGround,
	ContingencyType,
	SrtProcedureType,
} from "@/types/srt";

// ── Documentos ─────────────────────────────────────────────────────────────
//
// La pantalla se organiza por documento, no por trámite: elegís el papel que
// tenés que presentar y completás sus datos.
//
//  - `procedure` / `anexoKey` van solo en los anexos: son los que el backend
//    sabe generar y los que guardan datos propios en CaseSrtInfo.
//  - Opción de Competencia y Patrocinio acompañan a cualquier trámite y se
//    completan con campos sueltos de CaseSrtInfo, sin anexo asociado.

type AnexoKey = "anexoIData" | "anexoIIData" | "anexoIIIData" | "anexoIVData";

interface SrtDocument {
	key: string;
	label: string;
	hint: string;
	/** HTML de `public/srt/`. `null` = todavía no lo tenemos. */
	src: string | null;
	procedure: SrtProcedureType | null;
	anexoKey: AnexoKey | null;
}

const DOCUMENTS: SrtDocument[] = [
	{
		key: "anexo-i",
		label: "Anexo I",
		hint: "Divergencia en la determinación de la incapacidad",
		src: "/srt/anexo-i.html",
		procedure: "DIVERGENCIA_INCAPACIDAD",
		anexoKey: "anexoIData",
	},
	{
		key: "anexo-ii",
		label: "Anexo II",
		hint: "Rechazo de accidente de trabajo",
		src: "/srt/anexo-ii.html",
		procedure: "RECHAZO_ACCIDENTE_TRABAJO",
		anexoKey: "anexoIIData",
	},
	{
		key: "anexo-ii-itinere",
		label: "Anexo II — in itinere",
		hint: "Rechazo de accidente in itinere",
		src: "/srt/anexo-ii.html",
		procedure: "RECHAZO_ACCIDENTE_IN_ITINERE",
		anexoKey: "anexoIIData",
	},
	{
		key: "anexo-iii",
		label: "Anexo III",
		hint: "Rechazo de enfermedad profesional",
		src: "/srt/anexo-iii.html",
		procedure: "RECHAZO_ENFERMEDAD_PROF",
		anexoKey: "anexoIIIData",
	},
	{
		key: "competencia",
		label: "Opción de Competencia",
		hint: "Elección de Comisión Médica — acompaña a cualquier trámite",
		src: "/srt/opcion-competencia.html",
		procedure: null,
		anexoKey: null,
	},
	{
		key: "patrocinio",
		label: "Patrocinio letrado",
		hint: "Notificación y aceptación — acompaña a cualquier trámite",
		src: "/srt/patrocinio.html",
		procedure: null,
		anexoKey: null,
	},
];

/** Devuelve el valor recién cuando pasó `delay` sin que vuelva a cambiar. */
function useDebounced<T>(value: T, delay: number): T {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setSettled(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);
	return settled;
}

// ── Página ────────────────────────────────────────────────────────────────

export default function GenerateSrtFormPage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const caseId = Number(params.caseId);
	const token = session?.user?.accessToken;

	const [docKey, setDocKey] = useState<string>("");
	const [info, setInfo] = useState<CaseSrtInfo | null>(null);
	// Datos del cliente y del abogado del caso. El endpoint los devuelve para
	// prefill: se usan cuando la info SRT todavía no fue cargada a mano.
	const [defaults, setDefaults] = useState<CaseSrtDefaults | null>(null);
	const [anexoData, setAnexoData] = useState<Record<string, unknown>>({});
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);

	const doc = DOCUMENTS.find((d) => d.key === docKey) ?? null;

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
			setDefaults(data.defaults ?? null);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [caseId, token]);

	useEffect(() => {
		loadInfo();
	}, [loadInfo]);

	// Al elegir un documento, precargar lo que ya se haya guardado antes: así
	// se puede volver a entrar y seguir editando en vez de empezar de cero.
	//
	// La precarga corre UNA vez por documento. Antes dependía de `info` a secas
	// y cualquier cambio ahí (editar competencia, tocar el documento) volvía a
	// pisar lo que estabas tipeando en el anexo.
	const anexoKey = doc?.anexoKey ?? null;
	const preloadedKey = useRef<string | null>(null);
	useEffect(() => {
		if (!anexoKey || !info) return;
		if (preloadedKey.current === anexoKey) return;
		preloadedKey.current = anexoKey;
		setAnexoData((info[anexoKey] as Record<string, unknown> | null) ?? {});
	}, [anexoKey, info]);

	const setField = (key: string, value: unknown) =>
		setAnexoData((d) => ({ ...d, [key]: value }));

	// Opción de Competencia y patrocinio no tienen datos propios: se completan
	// con campos de CaseSrtInfo, los mismos que se cargan en la tab Info.
	const setInfoField = (key: keyof CaseSrtInfo, value: unknown) =>
		setInfo((i) => (i ? { ...i, [key]: value } : i));

	// El PDF se arma con react-pdf: lo que ves en el visor y lo que se
	// descarga salen del mismo componente, así que no pueden diferir.
	const pdfBlobRef = useRef<(() => Promise<Blob>) | null>(null);

	const handleSaveAndPrint = async () => {
		await handleGenerate();

		const makeBlob = pdfBlobRef.current;
		if (!makeBlob) return;

		const blob = await makeBlob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${doc?.key ?? "documento"}-caso-${caseId}.pdf`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const infoIncomplete =
		!info?.workerFullName || !info?.employerName || !info?.artName;

	// Vista previa: el documento se rellena en vivo mientras se tipea.
	const previewValues = useMemo(
		() =>
			doc?.src ? buildPreviewValues(doc.src, info, anexoData, defaults) : {},
		[doc?.src, info, anexoData, defaults],
	);

	const liveDocument = useMemo(
		() => (doc ? buildSrtDocument(doc.key, previewValues, info, defaults) : null),
		[doc, previewValues, info, defaults],
	);

	// Regenerar el PDF en cada tecla hace parpadear el visor: se rearma entero
	// cada vez. Con una pausa corta después de dejar de escribir, se actualiza
	// una sola vez y el parpadeo desaparece.
	const srtDocument = useDebounced(liveDocument, 450);

	const handleGenerate = async () => {
		if (!token || !doc) return;

		setGenerating(true);
		try {
			// 1) Persistir en CaseSrtInfo. Siempre se guarda, tenga o no anexo:
			//    así se puede volver a entrar y seguir editando.
			const putRes = await fetch(CASE_SRT_INFO_ENDPOINT(caseId), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					...(doc.anexoKey ? { [doc.anexoKey]: anexoData } : {}),
					cmNumber: info?.cmNumber ?? null,
					cmJurisdiction: info?.cmJurisdiction ?? null,
					competenceGround: info?.competenceGround ?? null,
					competenceAddress: info?.competenceAddress ?? null,
				}),
			});
			if (!putRes.ok) {
				const e = await putRes.json().catch(() => ({}));
				throw new Error(e.error || "Error al guardar los datos");
			}

			toast.success("Datos guardados");
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
		<div className="mx-auto max-w-screen-2xl p-6 space-y-4">
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="sm" onClick={() => router.back()}>
					<ArrowLeft className="h-4 w-4 mr-1" /> Volver
				</Button>
				<h1 className="text-xl font-semibold">Generar formulario SRT</h1>
			</div>

			{/* 40% formulario / 60% vista previa */}
			<div className="grid gap-4 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]">
				<div className="space-y-4">

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

					{/* Elegido el documento, el listado se colapsa: ocupa media
					    pantalla y ya no hace falta hasta que quieras cambiarlo. */}
					{doc ? (
						<Card>
							<CardContent className="flex items-center justify-between gap-3 py-3">
								<div className="min-w-0">
									<div className="text-sm font-medium">{doc.label}</div>
									<div className="truncate text-xs text-muted-foreground">
										{doc.hint}
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setDocKey("")}
									className="shrink-0"
								>
									Cambiar
								</Button>
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">1. Documento</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-1.5 sm:grid-cols-2">
								{DOCUMENTS.map((d) => (
								<button
									key={d.key}
									type="button"
									onClick={() => setDocKey(d.key)}
									className={`rounded-lg border px-3 py-2 text-left transition-colors ${
										docKey === d.key
											? "border-primary bg-primary/5"
											: "border-border hover:bg-muted/50"
									}`}
								>
									<div className="flex items-center gap-1.5 text-sm font-medium">
										{d.label}
										{!d.src && (
											<span className="rounded bg-muted px-1 py-0.5 text-[10px] font-normal text-muted-foreground">
												sin vista previa
											</span>
										)}
									</div>
									<div className="text-xs text-muted-foreground">{d.hint}</div>
									</button>
								))}
							</CardContent>
						</Card>
					)}

					{/* Cada documento tiene sus propios campos. */}
					{doc && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									2. Datos de {doc.label}
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{doc.key === "competencia" && (
									<CompetenceForm info={info} setInfoField={setInfoField} />
								)}
								{doc.key === "patrocinio" && (
									<p className="text-sm text-muted-foreground">
										Se completa con los datos del trabajador y del letrado que
										ya están en la tab{" "}
										<Link
											href={`/admin/legal-cases/${caseId}?tab=info`}
											className="underline"
										>
											Info
										</Link>
										. Todavía no está conectado a la vista previa.
									</p>
								)}
								{doc.procedure === "DIVERGENCIA_INCAPACIDAD" && (
									<AnexoIForm data={anexoData} setField={setField} />
								)}
								{(doc.procedure === "RECHAZO_ACCIDENTE_TRABAJO" ||
									doc.procedure === "RECHAZO_ACCIDENTE_IN_ITINERE") && (
									<AnexoIIForm
										data={anexoData}
										setField={setField}
										withInItinere={
											doc.procedure === "RECHAZO_ACCIDENTE_IN_ITINERE"
										}
									/>
								)}
								{doc.procedure === "RECHAZO_ENFERMEDAD_PROF" && (
									<AnexoIIIForm data={anexoData} setField={setField} />
								)}
							</CardContent>
						</Card>
					)}

					{doc && (
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => handleGenerate()}
								disabled={generating}
							>
								{generating ? (
									<Loader2 className="animate-spin h-4 w-4 mr-2" />
								) : (
									<Save className="h-4 w-4 mr-2" />
								)}
								Guardar datos
							</Button>
							<Button onClick={handleSaveAndPrint} disabled={generating}>
								<FileText className="h-4 w-4 mr-2" />
								Guardar y generar PDF
							</Button>
						</div>
					)}

				</div>

				{/* Columna derecha — vista previa en vivo */}
				<div className="lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)]">
					{srtDocument ? (
						<SrtPdfPreview
							key={doc?.key}
							doc={srtDocument}
							fileName={`${doc?.key}-caso-${caseId}.pdf`}
							blobRef={pdfBlobRef}
						/>
					) : (
						<div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
							{doc
								? "Todavía no tenemos el HTML de este documento."
								: "Elegí un documento para verlo acá."}
						</div>
					)}
				</div>
			</div>
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

// ── Opción de Competencia ──────────────────────────────────────────────────
//
// No tiene datos propios: son campos de CaseSrtInfo (bloque E). Se editan acá
// para no obligar a ir y volver a la tab Info mientras se arma el trámite.

function CompetenceForm({
	info,
	setInfoField,
}: {
	info: CaseSrtInfo | null;
	setInfoField: (key: keyof CaseSrtInfo, value: unknown) => void;
}) {
	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<Field label="Comisión Médica N°">
					<Input
						value={s(info?.cmNumber)}
						onChange={(e) => setInfoField("cmNumber", e.target.value)}
					/>
				</Field>
				<Field label="Delegación">
					<Input
						value={s(info?.cmJurisdiction)}
						onChange={(e) => setInfoField("cmJurisdiction", e.target.value)}
					/>
				</Field>
			</div>

			<Field label="Competente en virtud de">
				<Select
					value={info?.competenceGround ?? ""}
					onValueChange={(v) =>
						setInfoField("competenceGround", v as CompetenceGround)
					}
				>
					<SelectTrigger>
						<SelectValue placeholder="Seleccionar…" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="DOMICILIO">Domicilio del trabajador</SelectItem>
						<SelectItem value="PRESTACION">
							Lugar de efectiva prestación de servicio
						</SelectItem>
						<SelectItem value="REPORTA">
							Domicilio laboral donde habitualmente reporta
						</SelectItem>
					</SelectContent>
				</Select>
			</Field>

			<Field label="Domicilio correspondiente">
				<Input
					value={s(info?.competenceAddress)}
					onChange={(e) => setInfoField("competenceAddress", e.target.value)}
					placeholder="Si se deja vacío, se usa el domicilio de la tab Info"
				/>
			</Field>

			<p className="text-xs text-muted-foreground">
				La localidad y la provincia salen solas del domicilio que corresponda
				según la opción elegida.
			</p>
		</>
	);
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
			<PreexistenceFields data={data} setField={setField} />
		</>
	);
}

// ── Preexistencias (bloque opcional del Anexo I) ───────────────────────────

function PreexistenceFields({ data, setField }: FormProps) {
	const hasPreexistence = data.hasPreexistence === true;

	return (
		<div className="rounded-md border p-3 space-y-3 bg-muted/10">
			<div className="text-sm font-medium">Preexistencias (opcional)</div>

			<Field label="¿Te han otorgado incapacidad por otro siniestro, por vía administrativa o judicial?">
				<BoolYesNo
					value={data.hasPreexistence}
					onChange={(v) => setField("hasPreexistence", v)}
				/>
			</Field>

			{hasPreexistence && (
				<>
					<Field label="En caso de sí, detallar">
						<Textarea
							rows={2}
							value={s(data.preexistenceDetail)}
							onChange={(e) => setField("preexistenceDetail", e.target.value)}
						/>
					</Field>
					<Field label="Tipo de contingencia de la preexistencia">
						<ContingencySelect
							value={data.preexistenceType}
							onChange={(v) => setField("preexistenceType", v)}
						/>
					</Field>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<Field label="% de incapacidad otorgado">
							<Input
								value={s(data.disabilityPercent)}
								onChange={(e) => setField("disabilityPercent", e.target.value)}
								placeholder="Ej: 12%"
							/>
						</Field>
						<Field label="Región o zona afectada">
							<Input
								value={s(data.affectedRegion)}
								onChange={(e) => setField("affectedRegion", e.target.value)}
							/>
						</Field>
					</div>
					<Field label="Prueba de la vía judicial o administrativa">
						<Textarea
							rows={2}
							value={s(data.judicialProof)}
							onChange={(e) => setField("judicialProof", e.target.value)}
						/>
					</Field>
				</>
			)}
		</div>
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
