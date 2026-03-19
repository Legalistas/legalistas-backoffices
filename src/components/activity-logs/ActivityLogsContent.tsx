"use client";

import {
	ArrowLeft,
	Clock,
	Globe,
	LogIn,
	LogOut,
	Monitor,
	RefreshCw,
	Smartphone,
	Tablet,
	Wifi,
	WifiOff,
	X,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Autocomplete } from "@/components/shared/Autocomplete";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/Pagination";
import {
	ACTIVITY_LOGS_BY_USER_ENDPOINT,
	ACTIVITY_LOGS_ENDPOINT,
	ACTIVITY_LOGS_STATS_ENDPOINT,
	SETTINGS_ROLES_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import type { User } from "@/types/users";

// Roles internos del equipo - SOLO ESTOS deben mostrarse
const INTERNAL_TEAM_ROLES = [
	"admin",
	"director_general_ceo",
	"gerente_general_coo",
	"directora_area_legal",
	"coordinador_legal",
	"abogado_representante",
	"abogado_interno",
	"asistente_legal",
	"director_area_it",
	"coordinador_it",
	"administrador_sistemas",
	"desarrollador_software",
	"soporte_tecnico",
	"directora_area_ventas",
	"coordinador_ventas",
	"gerente_ventas",
	"ejecutivo_ventas",
	"representante_ventas",
	"analista_ventas",
	"directora_area_marketing",
	"coordinador_marketing",
	"director_marketing",
	"especialista_marketing_digital",
	"disenador_grafico",
	"investigador_mercado",
	"gestor_contenidos",
	"directora_area_contable",
	"coordinador_financiero",
	"director_financiero",
	"contador_senior",
	"analista_financiero",
	"tesorero",
	"auditor_interno",
];

interface Role {
	id: number;
	name: string;
	slug?: string;
	displayName: string;
}

interface ActivityLog {
	id: number;
	userId: number;
	loginAt: string;
	logoutAt: string | null;
	durationSecs: number | null;
	ipAddress: string | null;
	userAgent: string | null;
	browser: string | null;
	browserVersion: string | null;
	os: string | null;
	device: string | null;
	loginMethod: string | null;
	user?: {
		id: number;
		name: string;
		email: string;
		image: string | null;
		roleUser?: Array<{
			roleId: number;
			role: {
				id: number;
				name: string;
				slug?: string;
				displayName: string;
			};
		}>;
	};
}

interface Stats {
	totalSessions: number;
	todaySessions: number;
	weekSessions: number;
	activeSessions: number;
	avgDurationSecs: number;
}

function formatDuration(secs: number | null): string {
	if (!secs) return "-";
	if (secs < 60) return `${secs}s`;
	if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
	const h = Math.floor(secs / 3600);
	const m = Math.floor((secs % 3600) / 60);
	return `${h}h ${m}m`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function DeviceIcon({ device }: { device: string | null }) {
	if (device === "mobile")
		return <Smartphone className="h-4 w-4 text-blue-500" />;
	if (device === "tablet")
		return <Tablet className="h-4 w-4 text-purple-500" />;
	return <Monitor className="h-4 w-4 text-muted-foreground" />;
}

function BrowserIcon({ browser }: { browser: string | null }) {
	const b = (browser || "").toLowerCase();
	const colors: Record<string, string> = {
		chrome: "text-yellow-500",
		firefox: "text-orange-500",
		safari: "text-blue-400",
		edge: "text-blue-600",
	};
	const color =
		Object.entries(colors).find(([k]) => b.includes(k))?.[1] ?? "text-muted-foreground";
	return <Globe className={`h-4 w-4 ${color}`} />;
}

export default function ActivityLogsContent() {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const router = useRouter();

	const filterUserId = searchParams.get("userId");
	const filterUserName = searchParams.get("userName");

	const [logs, setLogs] = useState<ActivityLog[]>([]);
	const [stats, setStats] = useState<Stats | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	// Estados para filtros
	const [users, setUsers] = useState<User[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [selectedRoleId, setSelectedRoleId] = useState<string>("");

	const accessToken = (session?.user as any)?.accessToken;

	// Fetch usuarios con roles internos
	const fetchUsers = useCallback(async () => {
		if (!accessToken) return;
		try {
			const response = await fetch(`${USERS_ENDPOINT}?limit=1000000`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
			});
			if (!response.ok) return;
			const data = await response.json();

			// Filtrar solo usuarios con roles internos
			const filteredUsers = data.data.filter((user: User) => {
				return user.roleUser.some((roleUser) => {
					const roleIdentifier = (
						roleUser.role.name || roleUser.role.name
					).toLowerCase();
					return INTERNAL_TEAM_ROLES.includes(roleIdentifier);
				});
			});

			setUsers(filteredUsers);
		} catch (err) {
			console.error("Error fetching users:", err);
		}
	}, [accessToken]);

	// Fetch roles internos
	const fetchRoles = useCallback(async () => {
		if (!accessToken) return;
		try {
			const response = await fetch(`${SETTINGS_ROLES_ENDPOINT}?limit=10000`, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
			});
			if (!response.ok) return;
			const data = await response.json();

			// Filtrar solo roles internos
			const filteredRoles = (data.data || []).filter((role: Role) => {
				const roleIdentifier = (role.slug || role.name).toLowerCase();
				return INTERNAL_TEAM_ROLES.includes(roleIdentifier);
			});

			setRoles(filteredRoles);
		} catch (err) {
			console.error("Error fetching roles:", err);
		}
	}, [accessToken]);

	const fetchStats = useCallback(async () => {
		if (!accessToken) return;
		try {
			const res = await fetch(ACTIVITY_LOGS_STATS_ENDPOINT, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (res.ok) setStats(await res.json());
		} catch { }
	}, [accessToken]);

	const fetchLogs = useCallback(
		async (page = 1) => {
			if (!accessToken) return;
			setIsLoading(true);
			try {
				let url: string;
				if (filterUserId) {
					url = ACTIVITY_LOGS_BY_USER_ENDPOINT(Number(filterUserId));
				} else {
					const u = new URL(ACTIVITY_LOGS_ENDPOINT);
					u.searchParams.set("page", String(page));
					u.searchParams.set("limit", "20");

					// Agregar filtros si están seleccionados
					if (selectedUserId) {
						u.searchParams.set("userId", String(selectedUserId));
					}
					if (selectedRoleId) {
						u.searchParams.set("roleId", selectedRoleId);
					}

					url = u.toString();
				}

				const res = await fetch(url, {
					headers: { Authorization: `Bearer ${accessToken}` },
				});
				if (!res.ok) return;
				const data = await res.json();

				if (filterUserId) {
					setLogs(data);
					setTotal(data.length);
					setTotalPages(1);
				} else {
					// Si hay filtros aplicados, filtrar en el cliente también
					let filteredData = data.data || [];

					if (selectedUserId) {
						filteredData = filteredData.filter(
							(log: ActivityLog) => log.userId === selectedUserId,
						);
					}

					if (selectedRoleId) {
						filteredData = filteredData.filter((log: ActivityLog) => {
							return log.user?.roleUser?.some(
								(ru: any) => ru.roleId === Number(selectedRoleId),
							);
						});
					}

					setLogs(filteredData);
					setTotal(filteredData.length);
					setTotalPages(Math.ceil(filteredData.length / 20));
				}
			} catch {
			} finally {
				setIsLoading(false);
			}
		},
		[accessToken, filterUserId, selectedUserId, selectedRoleId],
	);

	useEffect(() => {
		fetchUsers();
		fetchRoles();
	}, [fetchUsers, fetchRoles]);

	useEffect(() => {
		fetchLogs(currentPage);
		if (!filterUserId) fetchStats();
	}, [fetchLogs, fetchStats, currentPage, filterUserId]);

	const handleRefresh = () => {
		fetchLogs(currentPage);
		if (!filterUserId) fetchStats();
	};

	const handleClearFilters = () => {
		setSelectedUserId(null);
		setSelectedRoleId("");
		setCurrentPage(1);
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					{filterUserId && (
						<button
							onClick={() => router.back()}
							className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
						>
							<ArrowLeft className="h-5 w-5" />
						</button>
					)}
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-foreground">
							Historial de Sesiones
						</h1>
						{filterUserId && filterUserName && (
							<p className="text-sm text-muted-foreground mt-0.5">
								Filtrando por:{" "}
								<span className="font-medium text-foreground">
									{filterUserName}
								</span>
							</p>
						)}
					</div>
				</div>
				<button
					onClick={handleRefresh}
					className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm text-muted-foreground"
				>
					<RefreshCw className="h-4 w-4" />
					Actualizar
				</button>
			</div>

			{/* Filtros */}
			{!filterUserId && (
				<div className="bg-card rounded-lg p-4 border border-border shadow-sm">
					<div className="flex flex-col gap-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold text-foreground">
								Filtros
							</h3>
							{(selectedUserId || selectedRoleId) && (
								<button
									onClick={handleClearFilters}
									className="flex items-center gap-1 text-xs text-primary hover:text-primary"
								>
									<X className="h-3 w-3" />
									Limpiar filtros
								</button>
							)}
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Filtro por Usuario */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-foreground">
									Filtrar por Usuario
								</label>
								<Autocomplete
									options={users}
									value={selectedUserId}
									onSelect={setSelectedUserId}
									placeholder="Selecciona un usuario..."
								/>
							</div>

							{/* Filtro por Rol */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-foreground">
									Filtrar por Rol
								</label>
								<select
									value={selectedRoleId}
									onChange={(e) => setSelectedRoleId(e.target.value)}
									className="w-full px-3 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
								>
									<option value="">Todos los roles</option>
									{roles.map((role) => (
										<option key={role.id} value={role.id.toString()}>
											{role.displayName}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Stats Cards - solo cuando no hay filtro por usuario */}
			{!filterUserId && stats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="bg-card rounded-lg p-4 border border-border shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-muted-foreground">
									Total sesiones
								</p>
								<p className="text-2xl font-bold text-foreground mt-1">
									{stats.totalSessions}
								</p>
							</div>
							<div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
								<LogIn className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
						</div>
					</div>
					<div className="bg-card rounded-lg p-4 border border-border shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-muted-foreground">
									Hoy
								</p>
								<p className="text-2xl font-bold text-foreground mt-1">
									{stats.todaySessions}
								</p>
							</div>
							<div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
								<Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
							</div>
						</div>
					</div>
					<div className="bg-card rounded-lg p-4 border border-border shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-muted-foreground">
									Activas ahora
								</p>
								<p className="text-2xl font-bold text-foreground mt-1">
									{stats.activeSessions}
								</p>
							</div>
							<div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
								<Wifi className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
							</div>
						</div>
					</div>
					<div className="bg-card rounded-lg p-4 border border-border shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-muted-foreground">
									Duración promedio
								</p>
								<p className="text-2xl font-bold text-foreground mt-1">
									{formatDuration(stats.avgDurationSecs)}
								</p>
							</div>
							<div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
								<Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Tabla */}
			<div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
				<div className="px-4 py-3 border-b border-border flex items-center justify-between">
					<p className="text-sm font-medium text-foreground">
						{total} {total === 1 ? "registro" : "registros"}
					</p>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
					</div>
				) : logs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
						<LogIn className="h-12 w-12 mb-3 opacity-30" />
						<p className="text-sm">No hay registros de sesión</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-225">
							<thead className="bg-muted">
								<tr>
									{!filterUserId && (
										<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											Usuario
										</th>
									)}
									<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Ingreso
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Salida
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Duración
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										IP
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Navegador / OS
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Método
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Estado
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{logs.map((log) => (
									<tr
										key={log.id}
										className="hover:bg-muted/50 transition-colors"
									>
										{!filterUserId && (
											<td className="px-4 py-3">
												<div className="flex items-center gap-2">
													{log.user?.image ? (
														<Image
															src={
																log.user.image.startsWith("http")
																	? log.user.image
																	: `${process.env.NEXT_PUBLIC_BACKEND_URL}${log.user.image}`
															}
															alt={log.user.name}
															width={28}
															height={28}
															className="rounded-full object-cover"
															onError={() => { }}
														/>
													) : (
														<div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
															{log.user?.name?.charAt(0).toUpperCase() ?? "?"}
														</div>
													)}
													<div>
														<p className="text-sm font-medium text-foreground leading-tight">
															{log.user?.name ?? "-"}
														</p>
														<p className="text-xs text-muted-foreground">
															{log.user?.email ?? ""}
														</p>
													</div>
												</div>
											</td>
										)}
										<td className="px-4 py-3">
											<div className="flex items-center gap-1.5 text-sm text-foreground">
												<LogIn className="h-3.5 w-3.5 text-green-500 shrink-0" />
												{formatDate(log.loginAt)}
											</div>
										</td>
										<td className="px-4 py-3">
											{log.logoutAt ? (
												<div className="flex items-center gap-1.5 text-sm text-foreground">
													<LogOut className="h-3.5 w-3.5 text-red-400 shrink-0" />
													{formatDate(log.logoutAt)}
												</div>
											) : (
												<span className="text-sm text-muted-foreground">-</span>
											)}
										</td>
										<td className="px-4 py-3">
											<span className="text-sm font-medium text-foreground">
												{formatDuration(log.durationSecs)}
											</span>
										</td>
										<td className="px-4 py-3">
											<code className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
												{log.ipAddress ?? "-"}
											</code>
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-col gap-0.5">
												<div className="flex items-center gap-1.5">
													<BrowserIcon browser={log.browser} />
													<span className="text-xs text-foreground">
														{log.browser ?? "-"}{" "}
														{log.browserVersion ? `v${log.browserVersion}` : ""}
													</span>
												</div>
												<div className="flex items-center gap-1.5">
													<DeviceIcon device={log.device} />
													<span className="text-xs text-muted-foreground">
														{log.os ?? "-"}
													</span>
												</div>
											</div>
										</td>
										<td className="px-4 py-3">
											<Badge
												variant="secondary"
											>
												{log.loginMethod === "google"
													? "Google"
													: "Credenciales"}
											</Badge>
										</td>
										<td className="px-4 py-3">
											{log.logoutAt ? (
												<div className="flex items-center gap-1 text-xs text-muted-foreground">
													<WifiOff className="h-3.5 w-3.5" />
													Cerrada
												</div>
											) : (
												<div className="flex items-center gap-1 text-xs text-emerald-600">
													<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
													Activa
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{!filterUserId && totalPages > 1 && (
					<div className="px-4 py-3 border-t border-border">
						<Pagination
							currentPage={currentPage}
							totalPages={totalPages}
							totalItems={total}
							itemsPerPage={20}
							onPageChange={setCurrentPage}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
