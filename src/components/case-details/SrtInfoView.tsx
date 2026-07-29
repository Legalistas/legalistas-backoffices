"use client";

import { Loader2, Save } from "lucide-react";
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
import {
	CASE_SRT_INFO_ENDPOINT,
	SRT_LAWYERS_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	CaseSrtDefaults,
	CaseSrtInfo,
	CompetenceGround,
	SrtLawyer,
} from "@/types/srt";

interface SrtInfoViewProps {
	caseId: string;
}

/**
 * Estado local del formulario. Todos strings para simplificar el binding con
 * los inputs; la conversión a null / número la hace el backend cuando llega
 * el PUT con string vacío.
 */
type FormState = {
	// Bloque A
	workerFullName: string;
	workerCuil: string;
	workerDni: string;
	workerAddress: string;
	workerCity: string;
	workerState: string;
	workerZip: string;
	workerPhone: string;
	// Bloque B
	lawyerUserId: string;
	// Bloque C
	employerName: string;
	employerCuit: string;
	workplace: string;
	workplaceCity: string;
	workplaceState: string;
	// Bloque D
	artName: string;
	artCuit: string;
	// Bloque E
	cmNumber: string;
	cmJurisdiction: string;
	competenceGround: CompetenceGround | "";
	competenceAddress: string;
};

const EMPTY_FORM: FormState = {
	workerFullName: "",
	workerCuil: "",
	workerDni: "",
	workerAddress: "",
	workerCity: "",
	workerState: "",
	workerZip: "",
	workerPhone: "",
	lawyerUserId: "",
	employerName: "",
	employerCuit: "",
	workplace: "",
	workplaceCity: "",
	workplaceState: "",
	artName: "",
	artCuit: "",
	cmNumber: "",
	cmJurisdiction: "",
	competenceGround: "",
	competenceAddress: "",
};

/**
 * Convierte la info del backend a estado del form. Cuando un campo del
 * bloque Trabajador viene vacío/null, se prefillea desde `defaults.worker`
 * (data del cliente del caso) para no forzar la carga manual.
 */
function fromApi(
	info: CaseSrtInfo,
	defaults: CaseSrtDefaults | null,
): FormState {
	const w = defaults?.worker ?? null;
	const pick = (fromInfo: string | null, fromDefault: string | null | undefined) =>
		fromInfo && fromInfo.trim() !== "" ? fromInfo : (fromDefault ?? "") || "";
	return {
		workerFullName: pick(info.workerFullName, w?.fullName),
		workerCuil: pick(info.workerCuil, w?.cuil),
		workerDni: pick(info.workerDni, w?.dni),
		workerAddress: pick(info.workerAddress, w?.address),
		workerCity: pick(info.workerCity, w?.city),
		workerState: pick(info.workerState, w?.state),
		workerZip: pick(info.workerZip, w?.zip),
		workerPhone: pick(info.workerPhone, w?.phone),
		lawyerUserId: info.lawyerUserId != null ? String(info.lawyerUserId) : "",
		employerName: info.employerName ?? "",
		employerCuit: info.employerCuit ?? "",
		workplace: info.workplace ?? "",
		workplaceCity: info.workplaceCity ?? "",
		workplaceState: info.workplaceState ?? "",
		artName: info.artName ?? "",
		artCuit: info.artCuit ?? "",
		cmNumber: info.cmNumber ?? "",
		cmJurisdiction: info.cmJurisdiction ?? "",
		competenceGround: info.competenceGround ?? "",
		competenceAddress: info.competenceAddress ?? "",
	};
}

function toApi(form: FormState) {
	return {
		...form,
		lawyerUserId: form.lawyerUserId === "" ? null : Number(form.lawyerUserId),
		competenceGround: form.competenceGround === "" ? null : form.competenceGround,
	};
}

export const SrtInfoView = ({ caseId }: SrtInfoViewProps) => {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [lawyers, setLawyers] = useState<SrtLawyer[]>([]);
	const [defaults, setDefaults] = useState<CaseSrtDefaults | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm((f) => ({ ...f, [key]: value }));

	const fetchAll = useCallback(async () => {
		if (!token) return;
		try {
			const [infoRes, lawyersRes] = await Promise.all([
				fetch(CASE_SRT_INFO_ENDPOINT(Number(caseId)), {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(SRT_LAWYERS_ENDPOINT, {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);
			if (!infoRes.ok) throw new Error("Error al cargar info SRT");
			if (!lawyersRes.ok) throw new Error("Error al cargar maestro de abogados");

			const infoData = await infoRes.json();
			const lawyersData = await lawyersRes.json();

			const defaultsPayload: CaseSrtDefaults | null =
				infoData.defaults ?? null;
			setDefaults(defaultsPayload);
			setForm(fromApi(infoData.info, defaultsPayload));
			setLawyers(lawyersData.lawyers || []);
		} catch (err) {
			console.error(err);
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [caseId, token]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	const handleSave = async () => {
		if (!token) return;
		setSaving(true);
		try {
			const res = await fetch(CASE_SRT_INFO_ENDPOINT(Number(caseId)), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(toApi(form)),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || "Error al guardar");
			}
			toast.success("Info guardada");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<Loader2 className="animate-spin h-6 w-6" />
			</div>
		);
	}

	const selectedLawyer = lawyers.find(
		(l) => l.userId === Number(form.lawyerUserId),
	);

	return (
		<div className="space-y-4 p-4">
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-lg font-semibold">Info del caso — SRT</h2>
					<p className="text-sm text-muted-foreground">
						Datos comunes a todos los formularios SRT. Se autocompletan cuando
						se genera un formulario nuevo.
					</p>
				</div>
				<Button onClick={handleSave} disabled={saving}>
					{saving ? (
						<Loader2 className="animate-spin h-4 w-4 mr-2" />
					) : (
						<Save className="h-4 w-4 mr-2" />
					)}
					Guardar
				</Button>
			</div>

			{/* Bloque A — Trabajador */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Trabajador</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<Field label="Nombre y apellido">
						<Input
							value={form.workerFullName}
							onChange={(e) => setField("workerFullName", e.target.value)}
						/>
					</Field>
					<Field label="CUIL">
						<Input
							value={form.workerCuil}
							onChange={(e) => setField("workerCuil", e.target.value)}
							placeholder="20-12345678-9"
						/>
					</Field>
					<Field label="DNI">
						<Input
							value={form.workerDni}
							onChange={(e) => setField("workerDni", e.target.value)}
						/>
					</Field>
					<Field label="Teléfono">
						<Input
							value={form.workerPhone}
							onChange={(e) => setField("workerPhone", e.target.value)}
						/>
					</Field>
					<Field label="Domicilio (calle y número)" className="md:col-span-2">
						<Input
							value={form.workerAddress}
							onChange={(e) => setField("workerAddress", e.target.value)}
						/>
					</Field>
					<Field label="Localidad">
						<Input
							value={form.workerCity}
							onChange={(e) => setField("workerCity", e.target.value)}
						/>
					</Field>
					<Field label="Provincia">
						<Input
							value={form.workerState}
							onChange={(e) => setField("workerState", e.target.value)}
						/>
					</Field>
					<Field label="Código postal">
						<Input
							value={form.workerZip}
							onChange={(e) => setField("workerZip", e.target.value)}
						/>
					</Field>
				</CardContent>
			</Card>

			{/* Bloque B — Letrada */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Asistencia letrada</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<Field label="Abogado del maestro SRT">
						<Select
							value={form.lawyerUserId}
							onValueChange={(v) => setField("lawyerUserId", v)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Seleccionar abogado…" />
							</SelectTrigger>
							<SelectContent>
								{lawyers.length === 0 && (
									<div className="px-3 py-2 text-sm text-muted-foreground">
										No hay abogados con matrícula cargada.
									</div>
								)}
								{lawyers.map((l) => (
									<SelectItem key={l.userId} value={String(l.userId)}>
										{l.name}
										{l.srtMatricula ? ` — Mat. ${l.srtMatricula}` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					{(() => {
						const rep = defaults?.representativeLawyer ?? null;
						if (selectedLawyer) return <LawyerCard lawyer={selectedLawyer} />;
						if (!rep) return null;
						return (
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<div className="text-xs text-muted-foreground">
										Sin abogado SRT elegido — mostrando al{" "}
										<strong>representante del caso</strong> como referencia.
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() =>
											setField("lawyerUserId", String(rep.userId))
										}
									>
										Usar este abogado
									</Button>
								</div>
								<LawyerCard lawyer={rep} />
							</div>
						);
					})()}
				</CardContent>
			</Card>

			{/* Bloque C — Empleador */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Empleador</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<Field label="Razón social">
						<Input
							value={form.employerName}
							onChange={(e) => setField("employerName", e.target.value)}
						/>
					</Field>
					<Field label="CUIT">
						<Input
							value={form.employerCuit}
							onChange={(e) => setField("employerCuit", e.target.value)}
						/>
					</Field>
					<Field
						label="Establecimiento / lugar de prestación"
						className="md:col-span-2"
					>
						<Input
							value={form.workplace}
							onChange={(e) => setField("workplace", e.target.value)}
						/>
					</Field>
					<Field label="Localidad">
						<Input
							value={form.workplaceCity}
							onChange={(e) => setField("workplaceCity", e.target.value)}
						/>
					</Field>
					<Field label="Provincia">
						<Input
							value={form.workplaceState}
							onChange={(e) => setField("workplaceState", e.target.value)}
						/>
					</Field>
				</CardContent>
			</Card>

			{/* Bloque D — ART */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						ART / Empleador autoasegurado
					</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<Field label="Denominación / razón social">
						<Input
							value={form.artName}
							onChange={(e) => setField("artName", e.target.value)}
						/>
					</Field>
					<Field label="CUIT (opcional)">
						<Input
							value={form.artCuit}
							onChange={(e) => setField("artCuit", e.target.value)}
						/>
					</Field>
				</CardContent>
			</Card>

			{/* Bloque E — Competencia */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Opción de competencia</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<Field label="N° de Comisión Médica">
						<Input
							value={form.cmNumber}
							onChange={(e) => setField("cmNumber", e.target.value)}
							placeholder="Ej: 40D"
						/>
					</Field>
					<Field label="Delegación / jurisdicción">
						<Input
							value={form.cmJurisdiction}
							onChange={(e) => setField("cmJurisdiction", e.target.value)}
							placeholder="Ej: Rafaela"
						/>
					</Field>
					<Field label="Fundamento de competencia">
						<Select
							value={form.competenceGround}
							onValueChange={(v) =>
								setField("competenceGround", v as CompetenceGround)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Seleccionar…" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="DOMICILIO">Domicilio</SelectItem>
								<SelectItem value="PRESTACION">
									Lugar de prestación de servicios
								</SelectItem>
								<SelectItem value="REPORTA">Lugar donde reporta</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field label="Domicilio ejercido">
						<Input
							value={form.competenceAddress}
							onChange={(e) => setField("competenceAddress", e.target.value)}
						/>
					</Field>
				</CardContent>
			</Card>
		</div>
	);
};

// ── Sub-componentes ──────────────────────────────────────────────────────

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

/**
 * Card de datos del abogado — se usa tanto para el abogado seleccionado del
 * maestro como para el fallback del representante del caso. Acepta el subset
 * compartido: SrtLawyer y `defaults.representativeLawyer` comparten estos
 * campos.
 */
type LawyerCardData = Pick<
	SrtLawyer,
	| "cuit"
	| "srtMatricula"
	| "srtBarJurisdiction"
	| "srtElectronicDomicile"
	| "srtLegalOffice"
	| "legalAddress"
>;

function LawyerCard({ lawyer }: { lawyer: LawyerCardData }) {
	const addr = lawyer.legalAddress;
	const addrText = addr
		? `${addr.street ?? ""} ${addr.streetNumber ?? ""}${lawyer.srtLegalOffice ? `, ${lawyer.srtLegalOffice}` : ""} — ${addr.city ?? ""}${addr.stateName ? `, ${addr.stateName}` : ""}`
		: "—";
	return (
		<div className="text-sm rounded-md border p-3 bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
			<div>
				<strong>CUIT:</strong> {lawyer.cuit ?? "—"}
			</div>
			<div>
				<strong>Matrícula:</strong> {lawyer.srtMatricula ?? "—"}
			</div>
			<div>
				<strong>Jurisdicción:</strong> {lawyer.srtBarJurisdiction ?? "—"}
			</div>
			<div>
				<strong>Domicilio SRT:</strong> {lawyer.srtElectronicDomicile ?? "—"}
			</div>
			<div className="md:col-span-2">
				<strong>Domicilio legal:</strong> {addrText}
			</div>
		</div>
	);
}
