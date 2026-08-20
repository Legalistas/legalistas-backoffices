"use client";

import { Loader2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ProvinceCitySelect from "@/components/common/ProvinceCitySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SRT_LAWYER_BY_ID_ENDPOINT } from "@/constant/api-endpoints";
import type { SrtLawyer } from "@/types/srt";

// =============================================================================
// Datos profesionales del abogado (matrícula, CUIT, domicilio electrónico SRT).
// Son los mismos que el ABM de /admin/lawyers, pero para que cada uno mantenga
// los propios sin depender de que se los cargue un administrador.
//
// Solo aparece si el usuario está dado de alta como abogado SRT.
// =============================================================================

interface FormState {
	cuit: string;
	phone: string;
	srtMatricula: string;
	srtElectronicDomicile: string;
	srtBarJurisdiction: string;
	srtLegalOffice: string;
}

const EMPTY: FormState = {
	cuit: "",
	phone: "",
	srtMatricula: "",
	srtElectronicDomicile: "",
	srtBarJurisdiction: "",
	srtLegalOffice: "",
};

export default function LegalSection() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const userId = Number(session?.user?.id);

	const [form, setForm] = useState<FormState>(EMPTY);
	const [isLawyer, setIsLawyer] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// La jurisdicción se guarda como texto, pero se elige del maestro de
	// provincias y localidades para que no queden diez formas de escribir
	// "Rosario". Los ids son solo para manejar los desplegables.
	const [stateId, setStateId] = useState<number | null>(null);
	const [cityId, setCityId] = useState<number | null>(null);

	const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm((f) => ({ ...f, [key]: value }));

	const load = useCallback(async () => {
		if (!token || !userId) return;
		try {
			const res = await fetch(SRT_LAWYER_BY_ID_ENDPOINT(userId), {
				headers: { Authorization: `Bearer ${token}` },
			});
			// 404 / 403 = el usuario no es abogado: la sección no aplica.
			if (!res.ok) return;

			const data = await res.json();
			const l = data.lawyer as SrtLawyer | undefined;
			if (!l) return;

			setIsLawyer(true);
			setForm({
				cuit: l.cuit ?? "",
				phone: l.phone ?? "",
				srtMatricula: l.srtMatricula ?? "",
				srtElectronicDomicile: l.srtElectronicDomicile ?? "",
				srtBarJurisdiction: l.srtBarJurisdiction ?? "",
				srtLegalOffice: l.srtLegalOffice ?? "",
			});
			setStateId(l.legalAddress?.stateId ?? null);
		} catch {
			// Silencioso: no es un error del perfil si el usuario no es abogado.
		} finally {
			setLoading(false);
		}
	}, [token, userId]);

	useEffect(() => {
		load();
	}, [load]);

	const handleSave = async () => {
		if (!token || !userId) return;
		if (!form.srtMatricula.trim()) {
			toast.error("La matrícula es obligatoria");
			return;
		}

		setSaving(true);
		try {
			const res = await fetch(SRT_LAWYER_BY_ID_ENDPOINT(userId), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					userId,
					cuit: form.cuit || null,
					phone: form.phone || null,
					srtMatricula: form.srtMatricula,
					srtElectronicDomicile: form.srtElectronicDomicile || null,
					srtBarJurisdiction: form.srtBarJurisdiction || null,
					srtLegalOffice: form.srtLegalOffice || null,
				}),
			});
			if (!res.ok) {
				const e = await res.json().catch(() => ({}));
				throw new Error(e.error || "No se pudieron guardar los datos");
			}
			toast.success("Datos profesionales actualizados");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center py-10">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!isLawyer) {
		return (
			<p className="py-6 text-sm text-muted-foreground">
				Esta sección es para quienes están dados de alta como abogado ante la
				SRT. Si te corresponde y no la ves, pedí que te den de alta en el
				maestro de abogados.
			</p>
		);
	}

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Field label="Matrícula *">
					<Input
						value={form.srtMatricula}
						onChange={(e) => setField("srtMatricula", e.target.value)}
						placeholder="1-43459 o T. VIII F. 216"
					/>
				</Field>
				<Field label="CUIT">
					<Input
						value={form.cuit}
						onChange={(e) => setField("cuit", e.target.value)}
						placeholder="20-12345678-9"
					/>
				</Field>
				<Field label="Teléfono">
					<Input
						value={form.phone}
						onChange={(e) => setField("phone", e.target.value)}
					/>
				</Field>
				<Field label="Piso / Oficina">
					<Input
						value={form.srtLegalOffice}
						onChange={(e) => setField("srtLegalOffice", e.target.value)}
						placeholder="Ej: 3° B"
					/>
				</Field>
				<Field label="Domicilio electrónico SRT" className="md:col-span-2">
					<Input
						type="email"
						value={form.srtElectronicDomicile}
						onChange={(e) => setField("srtElectronicDomicile", e.target.value)}
						placeholder="El registrado en e-Servicios SRT"
					/>
				</Field>
			</div>

			<div className="space-y-2">
				<Label className="text-sm font-medium">Jurisdicción del colegio</Label>
				<ProvinceCitySelect
					stateId={stateId}
					cityId={cityId}
					stateLabel="Provincia"
					cityLabel="Localidad"
					onChange={({ stateId: s, cityId: c, cityName }) => {
						setStateId(s);
						setCityId(c);
						if (cityName) setField("srtBarJurisdiction", cityName);
					}}
				/>
				{form.srtBarJurisdiction && (
					<p className="text-xs text-muted-foreground">
						Jurisdicción guardada:{" "}
						<strong className="text-foreground">
							{form.srtBarJurisdiction}
						</strong>
					</p>
				)}
			</div>

			<div className="flex justify-end">
				<Button onClick={handleSave} disabled={saving}>
					{saving ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Save className="mr-2 h-4 w-4" />
					)}
					Guardar cambios
				</Button>
			</div>

			<p className="text-xs text-muted-foreground">
				El domicilio legal sale de la dirección por defecto de tu usuario, en
				Información general.
			</p>
		</div>
	);
}

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
		<div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
			<Label className="text-sm font-medium">{label}</Label>
			{children}
		</div>
	);
}
