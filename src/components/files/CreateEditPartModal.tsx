"use client";

import { BookMarked, Loader2, Plus, Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import {
	CASE_PART_BY_ID_ENDPOINT,
	CASE_PARTS_ENDPOINT,
	PARTIES_ENDPOINT,
	SETTINGS_COUNTRIES_ENDPOINT,
} from "@/constant/api-endpoints";
import {
	type CatalogParty,
	PARTY_TYPE_LABELS,
	PARTY_TYPES,
	type PartyType,
	partyTypeLabel,
} from "@/constant/parties";
import { apiErrorMessage } from "@/lib/api-error";

/**
 * Alta y edición de una parte de un expediente (relevamiento 5).
 *
 * Dos caminos: elegir una parte del catálogo reutilizable —aseguradoras,
 * peritos habituales— o cargar una nueva. El catálogo existe porque antes la
 * misma aseguradora se re-tipeaba en cada expediente: había 629 partes
 * cargadas para 66 nombres distintos, y "Prevención ART" sola aparecía con
 * seis grafías.
 *
 * Los campos son los del relevamiento 5.1: cinco obligatorios, teléfono y DNI
 * opcionales. Tipo de persona, tipo de documento, mail y letrado patrocinante
 * ya no están; el país queda fijo en Argentina y no se pregunta.
 */

export interface CaseParty {
	id?: number;
	partyId?: number | null;
	name: string;
	partyType: string;
	address?: string | null;
	city?: string | null;
	stateId?: number | null;
	postalCode?: string | null;
	phone?: string | null;
	documentNumber?: string | null;
	party?: { id: number; name: string; isActive: boolean } | null;
}

interface State {
	id: number;
	name: string;
	countryId: number;
}

interface CreateEditPartModalProps {
	open: boolean;
	onClose: () => void;
	part?: CaseParty | null;
	onSave: (part: CaseParty) => void;
	caseId: number;
	fileId: number;
}

/** El país es fijo (relevamiento 5.1), así que solo se cargan sus provincias. */
const ARGENTINA = "argentina";

interface FormState {
	partyId: number | null;
	partyType: PartyType;
	name: string;
	address: string;
	city: string;
	stateId: string;
	postalCode: string;
	phone: string;
	documentNumber: string;
}

const EMPTY_FORM: FormState = {
	partyId: null,
	partyType: "DEMANDADO",
	name: "",
	address: "",
	city: "",
	stateId: "",
	postalCode: "",
	phone: "",
	documentNumber: "",
};

export default function CreateEditPartModal({
	open,
	onClose,
	part,
	onSave,
	caseId,
	fileId,
}: CreateEditPartModalProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [activeTab, setActiveTab] = useState("catalogo");
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [states, setStates] = useState<State[]>([]);

	// Catálogo
	const [search, setSearch] = useState("");
	const [results, setResults] = useState<CatalogParty[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [selectedFromCatalog, setSelectedFromCatalog] =
		useState<CatalogParty | null>(null);

	const authHeaders = useCallback(
		() => ({
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		}),
		[token],
	);

	// ── Provincias ────────────────────────────────────────────────
	const fetchStates = useCallback(async () => {
		if (!token) return;
		try {
			const res = await fetch(SETTINGS_COUNTRIES_ENDPOINT, {
				headers: authHeaders(),
			});
			if (!res.ok) throw new Error(String(res.status));
			const data = await res.json();
			const argentina = (data.data || []).find(
				(c: { name?: string }) => c.name?.toLowerCase() === ARGENTINA,
			);
			setStates(argentina?.states ?? []);
		} catch {
			toast.error("No se pudieron cargar las provincias");
		}
	}, [token, authHeaders]);

	// ── Catálogo ──────────────────────────────────────────────────
	const searchCatalog = useCallback(
		async (term: string) => {
			if (!token) return;
			try {
				setIsSearching(true);
				const url = new URL(PARTIES_ENDPOINT);
				if (term.trim()) url.searchParams.set("search", term.trim());
				url.searchParams.set("limit", "30");
				const res = await fetch(url.toString(), { headers: authHeaders() });
				if (!res.ok) throw new Error(String(res.status));
				const data = await res.json();
				setResults(data.items ?? []);
			} catch {
				toast.error("No se pudo buscar en el catálogo");
			} finally {
				setIsSearching(false);
			}
		},
		[token, authHeaders],
	);

	// Se espera a que deje de tipear: el catálogo tiene decenas de entradas y
	// no hace falta una consulta por tecla.
	useEffect(() => {
		if (!open || activeTab !== "catalogo") return;
		const t = setTimeout(() => searchCatalog(search), 300);
		return () => clearTimeout(t);
	}, [open, activeTab, search, searchCatalog]);

	// ── Apertura ──────────────────────────────────────────────────
	useEffect(() => {
		if (!open) return;
		fetchStates();
		setSearch("");
		setResults([]);
		setSelectedFromCatalog(null);

		if (part) {
			setForm({
				partyId: part.partyId ?? null,
				// Una parte vieja puede tener un tipo heredado que ya no se ofrece;
				// en ese caso el select arranca vacío y obliga a elegir uno válido.
				partyType: (PARTY_TYPES as readonly string[]).includes(part.partyType)
					? (part.partyType as PartyType)
					: ("" as PartyType),
				name: part.name ?? "",
				address: part.address ?? "",
				city: part.city ?? "",
				stateId: part.stateId ? String(part.stateId) : "",
				postalCode: part.postalCode ?? "",
				phone: part.phone ?? "",
				documentNumber: part.documentNumber ?? "",
			});
			setActiveTab("nueva");
		} else {
			setForm(EMPTY_FORM);
			setActiveTab("catalogo");
		}
	}, [open, part, fetchStates]);

	const setField = (campo: keyof FormState, valor: string) =>
		setForm((prev) => ({ ...prev, [campo]: valor }));

	/** Toma los datos del catálogo y pasa al formulario para poder ajustarlos. */
	const handleSelectFromCatalog = (p: CatalogParty) => {
		setSelectedFromCatalog(p);
		setForm({
			partyId: p.id,
			partyType: (PARTY_TYPES as readonly string[]).includes(p.partyType)
				? (p.partyType as PartyType)
				: "DEMANDADO",
			name: p.name,
			address: p.address ?? "",
			city: p.city ?? "",
			stateId: p.stateId ? String(p.stateId) : "",
			postalCode: p.postalCode ?? "",
			phone: p.phone ?? "",
			documentNumber: p.documentNumber ?? "",
		});
		setActiveTab("nueva");
	};

	const desvincularCatalogo = () => {
		setSelectedFromCatalog(null);
		setForm((prev) => ({ ...prev, partyId: null }));
	};

	// ── Guardado ──────────────────────────────────────────────────
	const faltantes = (): string[] => {
		const f: string[] = [];
		if (!form.name.trim()) f.push("razón social o nombre");
		if (!form.partyType) f.push("tipo de parte");
		if (!form.address.trim()) f.push("domicilio");
		if (!form.city.trim()) f.push("ciudad");
		if (!form.stateId) f.push("provincia");
		if (!form.postalCode.trim()) f.push("código postal");
		return f;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const faltan = faltantes();
		if (faltan.length > 0) {
			toast.error(`Falta completar: ${faltan.join(", ")}`);
			return;
		}

		try {
			setIsSubmitting(true);
			const payload = {
				fileId,
				partyId: form.partyId,
				partyType: form.partyType,
				name: form.name.trim(),
				address: form.address.trim(),
				city: form.city.trim(),
				stateId: Number(form.stateId),
				postalCode: form.postalCode.trim(),
				phone: form.phone.trim() || null,
				documentNumber: form.documentNumber.trim() || null,
			};

			const editando = Boolean(part?.id);
			const res = await fetch(
				editando
					? CASE_PART_BY_ID_ENDPOINT(caseId, part?.id as number)
					: CASE_PARTS_ENDPOINT(caseId),
				{
					method: editando ? "PUT" : "POST",
					headers: authHeaders(),
					body: JSON.stringify(payload),
				},
			);

			if (!res.ok) {
				toast.error(await apiErrorMessage(res, "No se pudo guardar la parte"));
				return;
			}

			const data = await res.json();
			toast.success(editando ? "Parte actualizada" : "Parte agregada");
			onSave(data.data ?? data);
			onClose();
		} catch {
			toast.error("No se pudo guardar la parte");
		} finally {
			setIsSubmitting(false);
		}
	};

	const obligatorio = <span className="text-red-500 mr-1">*</span>;
	const inputClass = "text-sm";
	const selectClass =
		"w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300";

	return (
		<Modal
			isOpen={open}
			onClose={onClose}
			className="w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto"
		>
			<div className="max-h-[90vh] overflow-y-auto">
				<div className="p-3 sm:p-4 md:p-6">
					<h2 className="text-lg sm:text-xl font-semibold mb-1">
						{part ? "Editar parte" : "Agregar parte al expediente"}
					</h2>
					<p className="text-sm text-muted-foreground mb-4">
						{part
							? "Los cambios afectan solo a esta parte de este expediente."
							: "Elegí una parte ya cargada o creá una nueva. Las nuevas quedan guardadas para reutilizarlas."}
					</p>

					<Tabs value={activeTab} onValueChange={setActiveTab}>
						{!part && (
							<TabsList className="grid w-full grid-cols-2 mb-4">
								<TabsTrigger value="catalogo" className="text-sm">
									<BookMarked className="mr-2 h-4 w-4" />
									Del catálogo
								</TabsTrigger>
								<TabsTrigger value="nueva" className="text-sm">
									<Plus className="mr-2 h-4 w-4" />
									Nueva
								</TabsTrigger>
							</TabsList>
						)}

						{/* ── Catálogo ─────────────────────────────────── */}
						<TabsContent value="catalogo">
							<div className="space-y-3">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Buscar aseguradora, perito, estudio…"
										className="pl-9 text-sm"
									/>
								</div>

								{isSearching ? (
									<div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Buscando…
									</div>
								) : results.length === 0 ? (
									<div className="rounded-lg border border-dashed py-8 text-center">
										<p className="text-sm text-muted-foreground">
											{search.trim()
												? `No hay ninguna parte que coincida con "${search}".`
												: "El catálogo está vacío."}
										</p>
										<Button
											type="button"
											variant="outline"
											className="mt-3 text-sm"
											onClick={() => {
												setForm({ ...EMPTY_FORM, name: search.trim() });
												setActiveTab("nueva");
											}}
										>
											<Plus className="mr-2 h-4 w-4" />
											Cargarla como nueva
										</Button>
									</div>
								) : (
									<ul className="divide-y rounded-lg border max-h-80 overflow-y-auto">
										{results.map((p) => (
											<li key={p.id}>
												<button
													type="button"
													onClick={() => handleSelectFromCatalog(p)}
													className="w-full px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
												>
													<div className="flex items-center justify-between gap-2">
														<span className="font-medium text-sm truncate">
															{p.name}
														</span>
														<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
															{partyTypeLabel(p.partyType)}
														</span>
													</div>
													<p className="text-xs text-muted-foreground truncate">
														{[p.address, p.city, p.state?.name]
															.filter(Boolean)
															.join(" · ") || "Sin domicilio cargado"}
													</p>
												</button>
											</li>
										))}
									</ul>
								)}
							</div>
						</TabsContent>

						{/* ── Formulario ───────────────────────────────── */}
						<TabsContent value="nueva">
							<form onSubmit={handleSubmit} className="space-y-4">
								{selectedFromCatalog && (
									<div className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
										<div className="text-sm">
											<p className="font-medium text-blue-900 dark:text-blue-200">
												Datos tomados de "{selectedFromCatalog.name}"
											</p>
											<p className="text-xs text-blue-800/80 dark:text-blue-300/80">
												Podés ajustarlos para este expediente sin modificar el
												catálogo.
											</p>
										</div>
										<button
											type="button"
											onClick={desvincularCatalogo}
											className="shrink-0 rounded p-1 text-blue-900/60 hover:bg-blue-100 dark:text-blue-300/60 dark:hover:bg-blue-900"
											title="Desvincular del catálogo"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								)}

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="part-name" className="text-sm">
											{obligatorio}Razón social / Nombre
										</Label>
										<Input
											id="part-name"
											value={form.name}
											onChange={(e) => setField("name", e.target.value)}
											placeholder="Ej: Prevención ART S.A."
											disabled={isSubmitting}
											className={inputClass}
										/>
									</div>

									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="part-type" className="text-sm">
											{obligatorio}Tipo de parte
										</Label>
										<select
											id="part-type"
											value={form.partyType}
											onChange={(e) => setField("partyType", e.target.value)}
											disabled={isSubmitting}
											className={selectClass}
										>
											<option value="">Seleccionar…</option>
											{PARTY_TYPES.map((t) => (
												<option key={t} value={t}>
													{PARTY_TYPE_LABELS[t]}
												</option>
											))}
										</select>
										{part && !form.partyType && (
											<p className="text-xs text-amber-600 dark:text-amber-400">
												Esta parte tenía un tipo antiguo ("
												{partyTypeLabel(part.partyType)}"). Elegí uno de la
												lista para guardar.
											</p>
										)}
									</div>

									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="part-address" className="text-sm">
											{obligatorio}Domicilio
										</Label>
										<Input
											id="part-address"
											value={form.address}
											onChange={(e) => setField("address", e.target.value)}
											placeholder="Calle y número"
											disabled={isSubmitting}
											className={inputClass}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="part-city" className="text-sm">
											{obligatorio}Ciudad
										</Label>
										<Input
											id="part-city"
											value={form.city}
											onChange={(e) => setField("city", e.target.value)}
											disabled={isSubmitting}
											className={inputClass}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="part-state" className="text-sm">
											{obligatorio}Provincia
										</Label>
										<select
											id="part-state"
											value={form.stateId}
											onChange={(e) => setField("stateId", e.target.value)}
											disabled={isSubmitting || states.length === 0}
											className={selectClass}
										>
											<option value="">Seleccionar…</option>
											{states.map((s) => (
												<option key={s.id} value={s.id}>
													{s.name}
												</option>
											))}
										</select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="part-postal" className="text-sm">
											{obligatorio}Código postal
										</Label>
										<Input
											id="part-postal"
											value={form.postalCode}
											onChange={(e) => setField("postalCode", e.target.value)}
											placeholder="2000"
											disabled={isSubmitting}
											className={inputClass}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="part-phone" className="text-sm">
											Teléfono
										</Label>
										<Input
											id="part-phone"
											value={form.phone}
											onChange={(e) => setField("phone", e.target.value)}
											disabled={isSubmitting}
											className={inputClass}
										/>
									</div>

									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="part-dni" className="text-sm">
											DNI
										</Label>
										<Input
											id="part-dni"
											value={form.documentNumber}
											onChange={(e) =>
												setField("documentNumber", e.target.value)
											}
											disabled={isSubmitting}
											className={inputClass}
										/>
										<p className="text-xs text-muted-foreground">
											Solo relevante para testigos.
										</p>
									</div>
								</div>

								<div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
									<Button
										type="button"
										variant="outline"
										onClick={onClose}
										disabled={isSubmitting}
										className="w-full sm:w-auto text-sm bg-transparent"
									>
										Cancelar
									</Button>
									<Button
										type="submit"
										disabled={isSubmitting}
										className="w-full sm:w-auto text-sm"
									>
										{isSubmitting ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Guardando…
											</>
										) : part ? (
											"Actualizar parte"
										) : (
											"Agregar parte"
										)}
									</Button>
								</div>
							</form>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</Modal>
	);
}
