"use client";

import {
	Calendar,
	CheckSquare,
	ChevronDown,
	FileText,
	Loader2,
	Search,
	Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	CASES_ENDPOINT,
	LEADS_ENDPOINT,
	TASKS_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";

// ── Types ─────────────────────────────────────────────────────────

interface TaskCase {
	id: number;
	title: string;
	number?: string;
}
interface TaskUser {
	id: number;
	name: string;
}
interface Lead {
	id: number;
	name: string;
	email?: string;
}
type LinkType = "case" | "lead";

interface TaskFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreated: () => void;
}

const TASK_ASSIGNABLE_ROLES = [
	"admin",
	"director_general_ceo",
	"director_area_it",
	"directora_area_ventas",
	"representante_ventas",
	"directora_area_contable",
	"directora_area_marketing",
	"gestor_contenidos",
	"disenador_grafico",
	"abogado_interno",
	"abogado_representante",
];

const PRIORITIES = [
	{
		value: "baja",
		label: "Baja",
		color: "bg-blue-50 text-blue-700 border-blue-200",
	},
	{
		value: "media",
		label: "Media",
		color: "bg-amber-50 text-amber-700 border-amber-200",
	},
	{
		value: "alta",
		label: "Alta",
		color: "bg-red-50 text-red-700 border-red-200",
	},
];

// ── Component ─────────────────────────────────────────────────────

export default function TaskFormModal({
	isOpen,
	onClose,
	onCreated,
}: TaskFormModalProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const userId = session?.user?.id ? Number(session.user.id) : null;

	// Form state
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [linkType, setLinkType] = useState<LinkType>("case");
	const [caseId, setCaseId] = useState<number | "">("");
	const [leadId, setLeadId] = useState<number | "">("");
	const [assignedTo, setAssignedTo] = useState<number | "">("");
	const [priority, setPriority] = useState("media");
	const [dueDate, setDueDate] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Data for dropdowns
	const [cases, setCases] = useState<TaskCase[]>([]);
	const [users, setUsers] = useState<TaskUser[]>([]);
	const [leads, setLeads] = useState<Lead[]>([]);

	// Dropdown UI state
	const [openDropdown, setOpenDropdown] = useState<
		"case" | "lead" | "user" | null
	>(null);
	const [caseSearch, setCaseSearch] = useState("");
	const [leadSearch, setLeadSearch] = useState("");
	const [userSearch, setUserSearch] = useState("");

	const caseDropdownRef = useRef<HTMLDivElement>(null);
	const leadDropdownRef = useRef<HTMLDivElement>(null);
	const userDropdownRef = useRef<HTMLDivElement>(null);
	const caseSearchRef = useRef<HTMLInputElement>(null);
	const leadSearchRef = useRef<HTMLInputElement>(null);
	const userSearchRef = useRef<HTMLInputElement>(null);

	// ── Load data when modal opens + reset on close ──────────────
	useEffect(() => {
		if (!isOpen) {
			setTitle("");
			setDescription("");
			setLinkType("case");
			setCaseId("");
			setLeadId("");
			setAssignedTo("");
			setPriority("media");
			setDueDate("");
			setOpenDropdown(null);
			return;
		}
		if (!token || !userId) return;

		const h = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		};

		Promise.all([
			fetch(`${CASES_ENDPOINT}?limit=100000`, { headers: h }).then((r) =>
				r.ok ? r.json() : null,
			),
			fetch(`${USERS_ENDPOINT}?limit=100000`, { headers: h }).then((r) =>
				r.ok ? r.json() : null,
			),
			fetch(`${LEADS_ENDPOINT}?limit=100000`, { headers: h }).then((r) =>
				r.ok ? r.json() : null,
			),
		])
			.then(([casesJson, usersJson, leadsJson]) => {
				if (casesJson) {
					const all = Array.isArray(casesJson)
						? casesJson
						: (casesJson.data ?? []);
					const myCases = all.filter(
						(c: any) => c.responsibleLawyerId === userId,
					);
					setCases(
						myCases.map((c: any) => ({
							id: c.id,
							title: c.title,
							number: c.number,
						})),
					);
				}
				if (usersJson) {
					const all = Array.isArray(usersJson)
						? usersJson
						: (usersJson.data ?? []);
					const filtered = all.filter((u: any) => {
						const roleName = u.roleUser?.[0]?.role?.name?.toLowerCase() || "";
						return TASK_ASSIGNABLE_ROLES.includes(roleName);
					});
					setUsers(filtered.map((u: any) => ({ id: u.id, name: u.name })));
				}
				if (leadsJson) {
					const raw = Array.isArray(leadsJson)
						? leadsJson
						: (leadsJson.data ?? []);
					const myLeads = raw.filter(
						(l: any) => l.responsibleLawyerId === userId,
					);
					setLeads(
						myLeads.map((l: any) => ({
							id: l.id,
							name: l.user?.name || `Lead #${l.id}`,
							email: l.user?.email || "",
						})),
					);
				}
			})
			.catch(() => {});
	}, [isOpen, token, userId]);

	// ── Close dropdown on click outside ──────────────────────────
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				caseDropdownRef.current &&
				!caseDropdownRef.current.contains(target) &&
				leadDropdownRef.current &&
				!leadDropdownRef.current.contains(target) &&
				userDropdownRef.current &&
				!userDropdownRef.current.contains(target)
			) {
				setOpenDropdown(null);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// ── Focus search on dropdown open ────────────────────────────
	useEffect(() => {
		if (openDropdown === "case") caseSearchRef.current?.focus();
		else if (openDropdown === "lead") leadSearchRef.current?.focus();
		else if (openDropdown === "user") userSearchRef.current?.focus();
	}, [openDropdown]);

	// ── Filtered lists ───────────────────────────────────────────
	const filteredCases = cases.filter((c) => {
		const q = caseSearch.toLowerCase();
		return (
			c.title.toLowerCase().includes(q) ||
			(c.number?.toLowerCase().includes(q) ?? false)
		);
	});
	const filteredLeads = leads.filter((l) =>
		l.name.toLowerCase().includes(leadSearch.toLowerCase()),
	);
	const filteredUsers = users.filter((u) =>
		u.name.toLowerCase().includes(userSearch.toLowerCase()),
	);

	const selectedCase = caseId ? cases.find((c) => c.id === caseId) : null;
	const selectedCaseLabel = selectedCase
		? `${selectedCase.number || ""} - ${selectedCase.title}`.trim()
		: "Seleccionar caso...";
	const selectedLeadLabel = leadId
		? leads.find((l) => l.id === leadId)?.name || "Seleccionar..."
		: "Seleccionar lead...";
	const selectedUserLabel = assignedTo
		? users.find((u) => u.id === assignedTo)?.name || "Seleccionar..."
		: "Seleccionar responsable...";

	// ── Toggle dropdown ──────────────────────────────────────────
	const toggleDropdown = (name: "case" | "lead" | "user") => {
		if (name === "case") setCaseSearch("");
		if (name === "lead") setLeadSearch("");
		if (name === "user") setUserSearch("");
		setOpenDropdown((prev) => (prev === name ? null : name));
	};

	// ── Submit ───────────────────────────────────────────────────
	const handleSubmit = async () => {
		if (!title.trim()) {
			toast.error("El título es obligatorio");
			return;
		}
		if (linkType === "case" && !caseId) {
			toast.error("Seleccioná un caso");
			return;
		}
		if (linkType === "lead" && !leadId) {
			toast.error("Seleccioná un lead");
			return;
		}
		if (!token) return;

		setIsSubmitting(true);
		try {
			const body: Record<string, unknown> = {
				title: title.trim(),
				description: description.trim() || null,
				priority,
				dueDate: dueDate || null,
			};

			if (linkType === "case") {
				body.caseId = caseId;
				body.leadId = null;
			} else {
				body.leadId = leadId;
				body.caseId = null;
			}

			if (assignedTo) body.assignedTo = assignedTo;

			const res = await fetch(TASKS_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			});

			if (res.ok) {
				toast.success("Tarea creada");
				onCreated();
				onClose();
			} else {
				const err = await res.json();
				toast.error(err.message || "Error al crear tarea");
			}
		} catch {
			toast.error("Error al crear tarea");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
			<div className="p-5">
				{/* Header */}
				<div className="flex items-center gap-3 mb-4">
					<div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
						<CheckSquare className="h-4.5 w-4.5 text-primary" />
					</div>
					<div>
						<h2 className="text-base font-bold text-gray-900 dark:text-white">
							Nueva Tarea
						</h2>
						<p className="text-xs text-gray-500">
							Creá una tarea y asignala a un responsable
						</p>
					</div>
				</div>

				<div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
					{/* ── Información de la tarea ── */}
					<div className="space-y-3">
						<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
							Información de la tarea
						</h3>

						<div>
							<label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
								Título <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Ej: Presentar escrito de demanda"
								className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 dark:text-white placeholder:text-gray-400"
							/>
						</div>

						<div>
							<label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
								Descripción
							</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Notas adicionales..."
								rows={2}
								className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 dark:text-white placeholder:text-gray-400"
							/>
						</div>
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800" />

					{/* ── Vinculación ── */}
					<div className="space-y-3">
						<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
							Vincular a
						</h3>

						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => setLinkType("case")}
								className={`flex items-center justify-center gap-2 px-3 py-2.5 border rounded-lg text-xs font-medium transition-all ${
									linkType === "case"
										? "border-primary bg-primary/5 ring-1 ring-primary/20 text-primary"
										: "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
								}`}
							>
								<FileText className="h-3.5 w-3.5" />
								Caso / Expediente
							</button>
							<button
								type="button"
								onClick={() => setLinkType("lead")}
								className={`flex items-center justify-center gap-2 px-3 py-2.5 border rounded-lg text-xs font-medium transition-all ${
									linkType === "lead"
										? "border-primary bg-primary/5 ring-1 ring-primary/20 text-primary"
										: "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
								}`}
							>
								<Users className="h-3.5 w-3.5" />
								Lead CRM
							</button>
						</div>

						{/* Case selector */}
						{linkType === "case" && (
							<div>
								<label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
									<FileText className="h-3.5 w-3.5 text-gray-400" />
									Caso <span className="text-red-500">*</span>
								</label>
								<div ref={caseDropdownRef} className="relative">
									<button
										type="button"
										onClick={() => toggleDropdown("case")}
										className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 truncate hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
									>
										<span
											className={`truncate ${!caseId ? "text-gray-400" : "text-gray-900 dark:text-white"}`}
										>
											{selectedCaseLabel}
										</span>
										<ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
									</button>
									{openDropdown === "case" && (
										<div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-44 overflow-auto">
											<div className="sticky top-0 bg-white dark:bg-gray-700 p-1.5 border-b border-gray-100 dark:border-gray-600">
												<div className="relative">
													<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
													<input
														ref={caseSearchRef}
														type="text"
														value={caseSearch}
														onChange={(e) => setCaseSearch(e.target.value)}
														placeholder="Buscar caso..."
														className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white outline-none"
													/>
												</div>
											</div>
											{filteredCases.map((c) => (
												<button
													key={c.id}
													type="button"
													onClick={() => {
														setCaseId(c.id);
														setOpenDropdown(null);
														setCaseSearch("");
													}}
													className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 ${caseId === c.id ? "bg-primary/5 dark:bg-primary/80/20 text-primary dark:text-primary font-medium" : "text-gray-700 dark:text-gray-200"}`}
												>
													{c.number && (
														<span className="font-semibold">{c.number}</span>
													)}
													{c.number && " - "}
													{c.title}
												</button>
											))}
											{filteredCases.length === 0 && (
												<p className="px-3 py-2 text-xs text-gray-400">
													Sin resultados
												</p>
											)}
										</div>
									)}
								</div>
								<p className="text-xs text-gray-400 mt-1">
									¿No encontrás el caso? Agregalo primero en la sección{" "}
									<span className="italic">Casos</span>
								</p>
							</div>
						)}

						{/* Lead selector */}
						{linkType === "lead" && (
							<div>
								<label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
									<Users className="h-3.5 w-3.5 text-gray-400" />
									Lead <span className="text-red-500">*</span>
								</label>
								<div ref={leadDropdownRef} className="relative">
									<button
										type="button"
										onClick={() => toggleDropdown("lead")}
										className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 truncate hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
									>
										<span
											className={`truncate ${!leadId ? "text-gray-400" : "text-gray-900 dark:text-white"}`}
										>
											{selectedLeadLabel}
										</span>
										<ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
									</button>
									{openDropdown === "lead" && (
										<div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-44 overflow-auto">
											<div className="sticky top-0 bg-white dark:bg-gray-700 p-1.5 border-b border-gray-100 dark:border-gray-600">
												<div className="relative">
													<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
													<input
														ref={leadSearchRef}
														type="text"
														value={leadSearch}
														onChange={(e) => setLeadSearch(e.target.value)}
														placeholder="Buscar lead..."
														className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white outline-none"
													/>
												</div>
											</div>
											{filteredLeads.map((l) => (
												<button
													key={l.id}
													type="button"
													onClick={() => {
														setLeadId(l.id);
														setOpenDropdown(null);
														setLeadSearch("");
													}}
													className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 ${leadId === l.id ? "bg-primary/5 dark:bg-primary/80/20 text-primary dark:text-primary font-medium" : "text-gray-700 dark:text-gray-200"}`}
												>
													{l.name}
													{l.email && (
														<span className="text-[11px] text-gray-400 ml-2">
															{l.email}
														</span>
													)}
												</button>
											))}
											{filteredLeads.length === 0 && (
												<p className="px-3 py-2 text-xs text-gray-400">
													Sin resultados
												</p>
											)}
										</div>
									)}
								</div>
								<p className="text-xs text-gray-400 mt-1">
									¿No encontrás el lead? Agregalo primero en la sección{" "}
									<span className="italic">CRM</span>
								</p>
							</div>
						)}
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800" />

					{/* ── Fecha y prioridad ── */}
					<div className="space-y-3">
						<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
							Fecha y prioridad
						</h3>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
									<Calendar className="h-3.5 w-3.5 text-gray-400" />
									Vencimiento
								</label>
								<input
									type="date"
									value={dueDate}
									onChange={(e) => setDueDate(e.target.value)}
									className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-700 dark:text-gray-300"
								/>
							</div>

							<div>
								<label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
									Prioridad
								</label>
								<div className="flex items-center gap-2">
									{PRIORITIES.map((p) => (
										<button
											key={p.value}
											type="button"
											onClick={() => setPriority(p.value)}
											className={`flex-1 px-2.5 py-2.5 rounded-lg text-xs font-medium border transition-all ${
												priority === p.value
													? `${p.color} ring-1 ring-current/20`
													: "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
											}`}
										>
											{p.label}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800" />

					{/* ── Responsable ── */}
					<div className="space-y-3">
						<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
							Responsable
						</h3>

						<div>
							<label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
								<Users className="h-3.5 w-3.5 text-gray-400" />
								Asignar a
							</label>
							<div className="relative" ref={userDropdownRef}>
								<button
									type="button"
									onClick={() => toggleDropdown("user")}
									className="w-full flex items-center justify-between text-sm text-left bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
								>
									<span
										className={`truncate flex items-center gap-2 ${!assignedTo ? "text-gray-400" : "text-gray-900 dark:text-white"}`}
									>
										{assignedTo && (
											<span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
												{selectedUserLabel.charAt(0).toUpperCase()}
											</span>
										)}
										{selectedUserLabel}
									</span>
									<ChevronDown
										className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${openDropdown === "user" ? "rotate-180" : ""}`}
									/>
								</button>

								{openDropdown === "user" && (
									<div className="absolute z-50 bottom-full mb-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
										<div className="p-2 border-b border-gray-100 dark:border-gray-800">
											<div className="relative">
												<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
												<input
													ref={userSearchRef}
													type="text"
													value={userSearch}
													onChange={(e) => setUserSearch(e.target.value)}
													placeholder="Buscar responsable..."
													className="w-full text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-md pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
												/>
											</div>
										</div>
										<div className="max-h-44 overflow-y-auto">
											{filteredUsers.map((u) => (
												<button
													key={u.id}
													type="button"
													onClick={() => {
														setAssignedTo(u.id);
														setOpenDropdown(null);
													}}
													className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 ${assignedTo === u.id ? "bg-primary/5" : ""}`}
												>
													<span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
														{u.name.charAt(0).toUpperCase()}
													</span>
													<span className="text-sm font-medium text-gray-900 dark:text-white truncate">
														{u.name}
													</span>
												</button>
											))}
											{filteredUsers.length === 0 && (
												<p className="px-3 py-4 text-xs text-gray-400 text-center">
													Sin resultados
												</p>
											)}
										</div>
									</div>
								)}
							</div>
							<p className="text-xs text-gray-400 mt-1">
								El responsable recibirá una notificación cuando se le asigne la
								tarea
							</p>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
					<Button variant="outline" onClick={onClose} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button
						variant="default"
						className="bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary/85 disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={handleSubmit}
						disabled={isSubmitting}
					>
						{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Crear Tarea
					</Button>
				</div>
			</div>
		</Modal>
	);
}
