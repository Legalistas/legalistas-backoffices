"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CUSTOMERS_ENDPOINT, CASES_ENDPOINT } from "@/constant/api-endpoints";
import { stageCases } from "@/lib/constant";

// Dominios de proveedores de email reales/conocidos
const REAL_EMAIL_DOMAINS = [
	"gmail.com",
	"hotmail.com",
	"hotmail.es",
	"hotmail.com.ar",
	"outlook.com",
	"outlook.es",
	"outlook.com.ar",
	"yahoo.com",
	"yahoo.com.ar",
	"yahoo.es",
	"live.com",
	"live.com.ar",
	"icloud.com",
	"me.com",
	"mac.com",
	"protonmail.com",
	"proton.me",
	"aol.com",
	"zoho.com",
	"mail.com",
	"gmx.com",
	"gmx.net",
	"yandex.com",
	"tutanota.com",
	"fastmail.com",
	"msn.com",
	"terra.com.ar",
	"fibertel.com.ar",
	"speedy.com.ar",
	"arnet.com.ar",
	"ciudad.com.ar",
	"uol.com.ar",
	"sinectis.com.ar",
];


interface Customer {
	id: number;
	name: string;
	email: string;
	userProfile?: { phone?: string } | null;
}

interface CaseWithCustomer {
	id: number;
	title: string;
	stageId: number;
	customer: { id: number; name: string; image: string | null } | null;
}

interface EmailStats {
	total: number;
	reales: Customer[];
	falsos: Customer[];
	sinEmail: Customer[];
	dominiosReales: Record<string, number>;
	dominiosFalsos: Record<string, number>;
}

interface CaseEmailStats {
	totalCasosActivos: number;
	conEmailReal: { caso: CaseWithCustomer; email: string; phone: string }[];
	conEmailFalso: { caso: CaseWithCustomer; email: string; phone: string }[];
	sinEmail: { caso: CaseWithCustomer; phone: string }[];
	porEtapa: Record<number, { total: number; reales: number; falsos: number; sinEmail: number; falsosConTel: number; falsosSinTel: number }>;
}

function classifyEmail(email: string | null | undefined): "real" | "falso" | "sin_email" {
	if (!email || email.trim() === "") return "sin_email";
	const domain = email.toLowerCase().split("@")[1];
	if (!domain) return "falso";
	if (REAL_EMAIL_DOMAINS.includes(domain)) return "real";
	return "falso";
}

type ViewType = "resumen" | "reales" | "falsos" | "sin_email" | "casos_resumen" | "casos_reales" | "casos_falsos" | "casos_sin_email";

export default function EmailAuditPage() {
	const { data: session } = useSession();
	const [stats, setStats] = useState<EmailStats | null>(null);
	const [caseStats, setCaseStats] = useState<CaseEmailStats | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [view, setView] = useState<ViewType>("resumen");
	const [expandedStage, setExpandedStage] = useState<number | null>(null);
	const [stageFilter, setStageFilter] = useState<"todos" | "real" | "falso" | "sin_email">("todos");

	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${session?.user?.accessToken}`,
	};

	const runAudit = async () => {
		if (!session?.user?.accessToken) {
			setError("No hay sesión activa");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// Traer clientes y casos activos en paralelo
			const [customersRes, casesRes] = await Promise.all([
				fetch(`${CUSTOMERS_ENDPOINT}?limit=99999&page=1`, { headers }),
				fetch(`${CASES_ENDPOINT}?limit=99999&page=1&excludeStageId=15`, { headers }),
			]);

			if (!customersRes.ok) throw new Error(`Error clientes: ${customersRes.status}`);
			if (!casesRes.ok) throw new Error(`Error casos: ${casesRes.status}`);

			const [customersJson, casesJson] = await Promise.all([
				customersRes.json(),
				casesRes.json(),
			]);

			const customers: Customer[] = customersJson.data || [];
			const cases: CaseWithCustomer[] = casesJson.data || [];

			// ── Clasificar clientes ──
			const reales: Customer[] = [];
			const falsos: Customer[] = [];
			const sinEmail: Customer[] = [];
			const dominiosReales: Record<string, number> = {};
			const dominiosFalsos: Record<string, number> = {};

			for (const c of customers) {
				const tipo = classifyEmail(c.email);
				const domain = c.email?.toLowerCase().split("@")[1] || "N/A";

				if (tipo === "real") {
					reales.push(c);
					dominiosReales[domain] = (dominiosReales[domain] || 0) + 1;
				} else if (tipo === "falso") {
					falsos.push(c);
					dominiosFalsos[domain] = (dominiosFalsos[domain] || 0) + 1;
				} else {
					sinEmail.push(c);
				}
			}

			setStats({ total: customers.length, reales, falsos, sinEmail, dominiosReales, dominiosFalsos });

			// ── Clasificar casos activos por email del cliente ──
			// Mapear customerId → email y teléfono
			const customerEmailMap = new Map<number, string>();
			const customerPhoneMap = new Map<number, string>();
			for (const c of customers) {
				customerEmailMap.set(c.id, c.email);
				if (c.userProfile?.phone) customerPhoneMap.set(c.id, c.userProfile.phone);
			}

			const conEmailReal: { caso: CaseWithCustomer; email: string; phone: string }[] = [];
			const conEmailFalso: { caso: CaseWithCustomer; email: string; phone: string }[] = [];
			const casosSinEmail: { caso: CaseWithCustomer; phone: string }[] = [];
			const porEtapa: Record<number, { total: number; reales: number; falsos: number; sinEmail: number; falsosConTel: number; falsosSinTel: number }> = {};

			for (const caso of cases) {
				const customerId = caso.customer?.id;
				const email = customerId ? customerEmailMap.get(customerId) || null : null;
				const phone = customerId ? customerPhoneMap.get(customerId) || "" : "";
				const tipo = classifyEmail(email);

				// Agrupar por etapa principal (1-7)
				const mainStage = caso.stageId;
				if (!porEtapa[mainStage]) {
					porEtapa[mainStage] = { total: 0, reales: 0, falsos: 0, sinEmail: 0, falsosConTel: 0, falsosSinTel: 0 };
				}
				porEtapa[mainStage].total++;

				if (tipo === "real") {
					conEmailReal.push({ caso, email: email!, phone });
					porEtapa[mainStage].reales++;
				} else if (tipo === "falso") {
					conEmailFalso.push({ caso, email: email!, phone });
					porEtapa[mainStage].falsos++;
					if (phone) {
						porEtapa[mainStage].falsosConTel++;
					} else {
						porEtapa[mainStage].falsosSinTel++;
					}
				} else {
					casosSinEmail.push({ caso, phone });
					porEtapa[mainStage].sinEmail++;
				}
			}

			setCaseStats({
				totalCasosActivos: cases.length,
				conEmailReal,
				conEmailFalso,
				sinEmail: casosSinEmail,
				porEtapa,
			});
		} catch (err: any) {
			setError(err.message || "Error al obtener datos");
		} finally {
			setLoading(false);
		}
	};

	const sortedDomains = (domains: Record<string, number>) =>
		Object.entries(domains).sort((a, b) => b[1] - a[1]);

	return (
		<div className="p-6 max-w-6xl mx-auto space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Auditoría de Emails - Clientes</h1>
					<p className="text-sm text-muted-foreground">
						Clasifica emails reales vs falsos y cruza con casos activos
					</p>
				</div>
				<Button onClick={runAudit} disabled={loading} size="lg">
					{loading ? (
						<>
							<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
							Analizando...
						</>
					) : (
						"Ejecutar Auditoría"
					)}
				</Button>
			</div>

			{error && (
				<div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
					<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
				</div>
			)}

			{stats && (
				<>
					{/* ═══ SECCIÓN 1: CLIENTES ═══ */}
					<h2 className="text-lg font-bold border-b pb-2">Clientes - Emails</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<Card className={`cursor-pointer hover:ring-2 ring-primary ${view === "resumen" ? "ring-2" : ""}`} onClick={() => setView("resumen")}>
							<CardContent className="pt-6">
								<p className="text-sm text-muted-foreground">Total Clientes</p>
								<p className="text-3xl font-bold">{stats.total}</p>
							</CardContent>
						</Card>
						<Card className={`cursor-pointer hover:ring-2 ring-green-500 ${view === "reales" ? "ring-2 ring-green-500" : ""}`} onClick={() => setView("reales")}>
							<CardContent className="pt-6">
								<p className="text-sm text-green-600">Emails Reales</p>
								<p className="text-3xl font-bold text-green-600">{stats.reales.length}</p>
								<p className="text-xs text-muted-foreground">
									{((stats.reales.length / stats.total) * 100).toFixed(1)}%
								</p>
							</CardContent>
						</Card>
						<Card className={`cursor-pointer hover:ring-2 ring-red-500 ${view === "falsos" ? "ring-2 ring-red-500" : ""}`} onClick={() => setView("falsos")}>
							<CardContent className="pt-6">
								<p className="text-sm text-red-600">Emails Falsos</p>
								<p className="text-3xl font-bold text-red-600">{stats.falsos.length}</p>
								<p className="text-xs text-muted-foreground">
									{((stats.falsos.length / stats.total) * 100).toFixed(1)}%
								</p>
							</CardContent>
						</Card>
						<Card className={`cursor-pointer hover:ring-2 ring-amber-500 ${view === "sin_email" ? "ring-2 ring-amber-500" : ""}`} onClick={() => setView("sin_email")}>
							<CardContent className="pt-6">
								<p className="text-sm text-amber-600">Sin Email</p>
								<p className="text-3xl font-bold text-amber-600">{stats.sinEmail.length}</p>
								<p className="text-xs text-muted-foreground">
									{((stats.sinEmail.length / stats.total) * 100).toFixed(1)}%
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Vista resumen: dominios */}
					{view === "resumen" && (
						<div className="grid md:grid-cols-2 gap-6">
							<Card>
								<CardHeader>
									<CardTitle className="text-green-600 text-base">Top Dominios Reales</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{sortedDomains(stats.dominiosReales).map(([domain, count]) => (
											<div key={domain} className="flex justify-between text-sm">
												<span className="font-mono">{domain}</span>
												<span className="font-semibold">{count}</span>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle className="text-red-600 text-base">Top Dominios Falsos</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2 max-h-96 overflow-y-auto">
										{sortedDomains(stats.dominiosFalsos).map(([domain, count]) => (
											<div key={domain} className="flex justify-between text-sm">
												<span className="font-mono">{domain}</span>
												<span className="font-semibold">{count}</span>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Lista de clientes por categoría */}
					{(view === "reales" || view === "falsos" || view === "sin_email") && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">
									{view === "reales" && `Clientes con Email Real (${stats.reales.length})`}
									{view === "falsos" && `Clientes con Email Falso (${stats.falsos.length})`}
									{view === "sin_email" && `Clientes sin Email (${stats.sinEmail.length})`}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="overflow-auto max-h-[500px] rounded-md border">
									<table className="w-full text-sm">
										<thead className="bg-muted/50 sticky top-0">
											<tr>
												<th className="px-3 py-2 text-left font-medium">ID</th>
												<th className="px-3 py-2 text-left font-medium">Nombre</th>
												<th className="px-3 py-2 text-left font-medium">Teléfono</th>
												<th className="px-3 py-2 text-left font-medium">Email</th>
												<th className="px-3 py-2 text-left font-medium">Dominio</th>
											</tr>
										</thead>
										<tbody>
											{(view === "reales" ? stats.reales : view === "falsos" ? stats.falsos : stats.sinEmail).map((c) => (
												<tr key={c.id} className="border-t hover:bg-muted/30">
													<td className="px-3 py-1.5 font-mono text-muted-foreground">{c.id}</td>
													<td className="px-3 py-1.5">{c.name || "-"}</td>
													<td className="px-3 py-1.5 font-mono text-xs">{c.userProfile?.phone || "-"}</td>
													<td className="px-3 py-1.5 font-mono text-xs">{c.email || "-"}</td>
													<td className="px-3 py-1.5 font-mono text-xs">{c.email?.split("@")[1] || "-"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					)}
				</>
			)}

			{/* ═══ SECCIÓN 2: CASOS ACTIVOS ═══ */}
			{caseStats && (
				<>
					<h2 className="text-lg font-bold border-b pb-2 mt-8">Casos Activos - Emails de Clientes</h2>

					{/* Totales generales */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-muted-foreground">Total Casos Activos</p>
								<p className="text-3xl font-bold">{caseStats.totalCasosActivos}</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-green-600">Con Email Real</p>
								<p className="text-3xl font-bold text-green-600">{caseStats.conEmailReal.length}</p>
								<p className="text-xs text-muted-foreground">
									{caseStats.totalCasosActivos > 0 ? ((caseStats.conEmailReal.length / caseStats.totalCasosActivos) * 100).toFixed(1) : 0}%
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-red-600">Con Email Falso</p>
								<p className="text-3xl font-bold text-red-600">{caseStats.conEmailFalso.length}</p>
								<p className="text-xs text-muted-foreground">
									{caseStats.totalCasosActivos > 0 ? ((caseStats.conEmailFalso.length / caseStats.totalCasosActivos) * 100).toFixed(1) : 0}%
								</p>
								<div className="mt-2 flex gap-3 text-[11px]">
									<span className="text-green-600">{caseStats.conEmailFalso.filter((r) => r.phone).length} con tel.</span>
									<span className="text-amber-600">{caseStats.conEmailFalso.filter((r) => !r.phone).length} sin tel.</span>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="pt-6">
								<p className="text-sm text-amber-600">Sin Email</p>
								<p className="text-3xl font-bold text-amber-600">{caseStats.sinEmail.length}</p>
								<p className="text-xs text-muted-foreground">
									{caseStats.totalCasosActivos > 0 ? ((caseStats.sinEmail.length / caseStats.totalCasosActivos) * 100).toFixed(1) : 0}%
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Cuadro individual por cada etapa */}
					{stageCases.map((stage) => {
						const data = caseStats.porEtapa[stage.id] || { total: 0, reales: 0, falsos: 0, sinEmail: 0 };
						if (data.total === 0) return null;

						const isExpanded = expandedStage === stage.id;
						const activeFilter = isExpanded ? stageFilter : "todos";
						const casosEtapa = [
							...caseStats.conEmailReal.filter((r) => r.caso.stageId === stage.id).map((r) => ({ ...r.caso, email: r.email, phone: r.phone, tipo: "real" as const })),
							...caseStats.conEmailFalso.filter((r) => r.caso.stageId === stage.id).map((r) => ({ ...r.caso, email: r.email, phone: r.phone, tipo: "falso" as const })),
							...caseStats.sinEmail.filter((r) => r.caso.stageId === stage.id).map((r) => ({ ...r.caso, email: null, phone: r.phone, tipo: "sin_email" as const })),
						];
						const casosFiltered = activeFilter === "todos"
							? casosEtapa
							: casosEtapa.filter((c) => c.tipo === activeFilter);

						const handleMiniCardClick = (filter: "todos" | "real" | "falso" | "sin_email") => {
							if (isExpanded && stageFilter === filter) {
								// Click mismo filtro → cerrar
								setExpandedStage(null);
								setStageFilter("todos");
							} else {
								setExpandedStage(stage.id);
								setStageFilter(filter);
							}
						};

						return (
							<Card key={stage.id}>
								<CardHeader
									className="cursor-pointer"
									onClick={() => {
										if (isExpanded) {
											setExpandedStage(null);
											setStageFilter("todos");
										} else {
											setExpandedStage(stage.id);
											setStageFilter("todos");
										}
									}}
								>
									<CardTitle className="text-base flex items-center justify-between">
										<span>{stage.label}</span>
										<span className="text-sm font-normal text-muted-foreground">
											{isExpanded ? "▲ Ocultar" : "▼ Ver detalle"}
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
										<div
											className={`rounded-lg p-3 text-center cursor-pointer transition-all ${isExpanded && activeFilter === "todos" ? "ring-2 ring-primary bg-muted" : "bg-muted/50 hover:bg-muted"}`}
											onClick={() => handleMiniCardClick("todos")}
										>
											<p className="text-xs text-muted-foreground">Total</p>
											<p className="text-2xl font-bold">{data.total}</p>
										</div>
										<div
											className={`rounded-lg p-3 text-center cursor-pointer transition-all ${isExpanded && activeFilter === "real" ? "ring-2 ring-green-500 bg-green-100 dark:bg-green-900/40" : "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"}`}
											onClick={() => handleMiniCardClick("real")}
										>
											<p className="text-xs text-green-600">Reales</p>
											<p className="text-2xl font-bold text-green-600">{data.reales}</p>
											<p className="text-[10px] text-muted-foreground">
												{data.total > 0 ? ((data.reales / data.total) * 100).toFixed(1) : 0}%
											</p>
										</div>
										<div
											className={`rounded-lg p-3 text-center cursor-pointer transition-all ${isExpanded && activeFilter === "falso" ? "ring-2 ring-red-500 bg-red-100 dark:bg-red-900/40" : "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"}`}
											onClick={() => handleMiniCardClick("falso")}
										>
											<p className="text-xs text-red-600">Falsos</p>
											<p className="text-2xl font-bold text-red-600">{data.falsos}</p>
											<p className="text-[10px] text-muted-foreground">
												{data.total > 0 ? ((data.falsos / data.total) * 100).toFixed(1) : 0}%
											</p>
											{data.falsos > 0 && (
												<div className="mt-1 flex justify-center gap-2 text-[10px]">
													<span className="text-green-600">{data.falsosConTel} tel</span>
													<span className="text-amber-600">{data.falsosSinTel} s/tel</span>
												</div>
											)}
										</div>
										<div
											className={`rounded-lg p-3 text-center cursor-pointer transition-all ${isExpanded && activeFilter === "sin_email" ? "ring-2 ring-amber-500 bg-amber-100 dark:bg-amber-900/40" : "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"}`}
											onClick={() => handleMiniCardClick("sin_email")}
										>
											<p className="text-xs text-amber-600">Sin Email</p>
											<p className="text-2xl font-bold text-amber-600">{data.sinEmail}</p>
											<p className="text-[10px] text-muted-foreground">
												{data.total > 0 ? ((data.sinEmail / data.total) * 100).toFixed(1) : 0}%
											</p>
										</div>
									</div>

									{isExpanded && (
										<div className="overflow-auto max-h-80 rounded-md border mt-3">
											<table className="w-full text-sm">
												<thead className="bg-muted/50 sticky top-0">
													<tr>
														<th className="px-3 py-2 text-left font-medium">ID</th>
														<th className="px-3 py-2 text-left font-medium">Causa</th>
														<th className="px-3 py-2 text-left font-medium">Cliente</th>
														<th className="px-3 py-2 text-left font-medium">Teléfono</th>
														<th className="px-3 py-2 text-left font-medium">Email</th>
														<th className="px-3 py-2 text-left font-medium">Estado</th>
													</tr>
												</thead>
												<tbody>
													{casosFiltered.map((c) => (
														<tr key={c.id} className="border-t hover:bg-muted/30">
															<td className="px-3 py-1.5 font-mono text-muted-foreground">{c.id}</td>
															<td className="px-3 py-1.5 font-medium">{c.title || "-"}</td>
															<td className="px-3 py-1.5">{c.customer?.name || "-"}</td>
															<td className="px-3 py-1.5 font-mono text-xs">{c.phone || "-"}</td>
															<td className="px-3 py-1.5 font-mono text-xs">{c.email || "-"}</td>
															<td className="px-3 py-1.5">
																<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
																	c.tipo === "real"
																		? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
																		: c.tipo === "falso"
																			? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
																			: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
																}`}>
																	{c.tipo === "real" ? "Real" : c.tipo === "falso" ? "Falso" : "Sin email"}
																</span>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</CardContent>
							</Card>
						);
					})}
				</>
			)}
		</div>
	);
}
