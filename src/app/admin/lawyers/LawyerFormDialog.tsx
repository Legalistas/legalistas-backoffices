"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
	SRT_LAWYER_BY_ID_ENDPOINT,
	SRT_LAWYERS_ELIGIBLE_USERS_ENDPOINT,
	SRT_LAWYERS_ENDPOINT,
} from "@/constant/api-endpoints";
import type { EligibleUser, SrtLawyer } from "@/types/srt";

interface LawyerFormDialogProps {
	open: boolean;
	userId: number | null; // null → alta, number → edición
	onClose: () => void;
	onSaved: () => void;
}

type FormState = {
	userId: string; // en alta lo eligen; en edición viene fijo
	cuit: string;
	phone: string;
	srtMatricula: string;
	srtElectronicDomicile: string;
	srtBarJurisdiction: string;
	srtLegalOffice: string;
};

const EMPTY: FormState = {
	userId: "",
	cuit: "",
	phone: "",
	srtMatricula: "",
	srtElectronicDomicile: "",
	srtBarJurisdiction: "",
	srtLegalOffice: "",
};

export function LawyerFormDialog({
	open,
	userId,
	onClose,
	onSaved,
}: LawyerFormDialogProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const isEdit = userId != null;

	const [form, setForm] = useState<FormState>(EMPTY);
	const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
	const [eligibleSearch, setEligibleSearch] = useState("");
	const [eligibleLoading, setEligibleLoading] = useState(false);
	const [comboOpen, setComboOpen] = useState(false);
	const [selectedUserLabel, setSelectedUserLabel] = useState("");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
		setForm((f) => ({ ...f, [k]: v }));

	// Al abrir, cargar datos: si es edición, el abogado. Si es alta, arranca vacío
	// (los eligibles se cargan on-demand desde el combobox con search).
	const load = useCallback(async () => {
		if (!token || !open) return;
		setLoading(true);
		try {
			if (isEdit && userId) {
				const res = await fetch(SRT_LAWYER_BY_ID_ENDPOINT(userId), {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) throw new Error("Error al cargar abogado");
				const data = await res.json();
				const l = data.lawyer as SrtLawyer;
				setForm({
					userId: String(l.userId),
					cuit: l.cuit ?? "",
					phone: l.phone ?? "",
					srtMatricula: l.srtMatricula ?? "",
					srtElectronicDomicile: l.srtElectronicDomicile ?? "",
					srtBarJurisdiction: l.srtBarJurisdiction ?? "",
					srtLegalOffice: l.srtLegalOffice ?? "",
				});
			} else {
				setForm(EMPTY);
				setSelectedUserLabel("");
				setEligibleSearch("");
			}
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [token, open, isEdit, userId]);

	// Fetch de eligibles con debounce. Se dispara cuando abre el combobox o
	// cambia la búsqueda. Backend limita a 50 resultados por default.
	useEffect(() => {
		if (!token || isEdit || !comboOpen) return;
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			setEligibleLoading(true);
			try {
				const q = eligibleSearch.trim();
				const url = q
					? `${SRT_LAWYERS_ELIGIBLE_USERS_ENDPOINT}?search=${encodeURIComponent(q)}`
					: SRT_LAWYERS_ELIGIBLE_USERS_ENDPOINT;
				const res = await fetch(url, {
					headers: { Authorization: `Bearer ${token}` },
					signal: controller.signal,
				});
				if (!res.ok) throw new Error("Error al buscar users");
				const data = await res.json();
				setEligibleUsers(data.users || []);
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					console.error(err);
				}
			} finally {
				setEligibleLoading(false);
			}
		}, 200);
		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [token, isEdit, comboOpen, eligibleSearch]);

	useEffect(() => {
		if (open) load();
	}, [open, load]);

	const handleSave = async () => {
		if (!token) return;

		if (!isEdit && !form.userId) {
			toast.error("Seleccioná un usuario para promover a abogado");
			return;
		}
		if (!form.srtMatricula.trim()) {
			toast.error("La matrícula es obligatoria");
			return;
		}

		setSaving(true);
		try {
			const body = {
				userId: Number(form.userId),
				cuit: form.cuit || null,
				phone: form.phone || null,
				srtMatricula: form.srtMatricula,
				srtElectronicDomicile: form.srtElectronicDomicile || null,
				srtBarJurisdiction: form.srtBarJurisdiction || null,
				srtLegalOffice: form.srtLegalOffice || null,
			};

			const url = isEdit
				? SRT_LAWYER_BY_ID_ENDPOINT(Number(form.userId))
				: SRT_LAWYERS_ENDPOINT;
			const method = isEdit ? "PUT" : "POST";

			const res = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const e = await res.json().catch(() => ({}));
				throw new Error(e.error || "Error al guardar");
			}
			toast.success(isEdit ? "Abogado actualizado" : "Abogado creado");
			onSaved();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Editar abogado" : "Nuevo abogado SRT"}
					</DialogTitle>
				</DialogHeader>

				{loading ? (
					<div className="flex justify-center py-8">
						<Loader2 className="animate-spin h-5 w-5" />
					</div>
				) : (
					<div className="space-y-3 py-2">
						{!isEdit && (
							<Field label="Usuario a promover (sin rol de abogado)">
								<Popover open={comboOpen} onOpenChange={setComboOpen}>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={comboOpen}
											className="justify-between font-normal"
										>
											{selectedUserLabel || "Seleccionar…"}
											<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="p-0 w-[--radix-popover-trigger-width]"
										align="start"
									>
										<Command shouldFilter={false}>
											<CommandInput
												placeholder="Buscar por nombre o email…"
												value={eligibleSearch}
												onValueChange={setEligibleSearch}
											/>
											<CommandList>
												{eligibleLoading ? (
													<div className="flex items-center justify-center py-4">
														<Loader2 className="h-4 w-4 animate-spin" />
													</div>
												) : (
													<>
														<CommandEmpty>Sin resultados.</CommandEmpty>
														<CommandGroup>
															{eligibleUsers.map((u) => {
																const label = u.email
																	? `${u.name} — ${u.email}`
																	: u.name;
																const selected = form.userId === String(u.id);
																return (
																	<CommandItem
																		key={u.id}
																		value={String(u.id)}
																		onSelect={() => {
																			setField("userId", String(u.id));
																			setSelectedUserLabel(label);
																			setComboOpen(false);
																		}}
																	>
																		<Check
																			className={cn(
																				"mr-2 h-4 w-4",
																				selected ? "opacity-100" : "opacity-0",
																			)}
																		/>
																		{label}
																	</CommandItem>
																);
															})}
														</CommandGroup>
													</>
												)}
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							</Field>
						)}

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
							<Field label="Matrícula *">
								<Input
									value={form.srtMatricula}
									onChange={(e) => setField("srtMatricula", e.target.value)}
									placeholder="1-43459 o T. VIII F. 216"
								/>
							</Field>
							<Field label="Jurisdicción del colegio">
								<Input
									value={form.srtBarJurisdiction}
									onChange={(e) =>
										setField("srtBarJurisdiction", e.target.value)
									}
									placeholder="Rosario, Córdoba, Buenos Aires…"
								/>
							</Field>
							<Field
								label="Domicilio electrónico SRT"
								className="md:col-span-2"
							>
								<Input
									type="email"
									value={form.srtElectronicDomicile}
									onChange={(e) =>
										setField("srtElectronicDomicile", e.target.value)
									}
									placeholder="registrado en e-Servicios SRT"
								/>
							</Field>
							<Field label="Piso / Oficina" className="md:col-span-2">
								<Input
									value={form.srtLegalOffice}
									onChange={(e) => setField("srtLegalOffice", e.target.value)}
									placeholder="Ej: 3° B (opcional)"
								/>
							</Field>
						</div>

						<p className="text-xs text-muted-foreground">
							El domicilio legal se toma del <strong>address default</strong>{" "}
							del usuario. Editalo desde su ficha si hace falta.
						</p>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button onClick={handleSave} disabled={saving || loading}>
						{saving && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
						{isEdit ? "Guardar cambios" : "Crear abogado"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
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
		<div className={`flex flex-col gap-1 ${className ?? ""}`}>
			<Label className="text-xs text-muted-foreground">{label}</Label>
			{children}
		</div>
	);
}
