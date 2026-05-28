"use client";

import {
	AlertCircle,
	CheckCircle,
	CircleDot,
	Clock,
	FolderOpen,
	Inbox,
	Mail,
	MessageSquare,
	RefreshCw,
	TimerReset,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConsultationFilters } from "@/components/consultation-filters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
	CASES_CONSULTATIONS_GET_ALL_ENDPOINT,
	CASES_CONSULTATIONS_MARK_ALL_READ_ENDPOINT,
} from "@/constant/api-endpoints";
import type { CaseConsultations } from "@/types/cases";

interface ConsultationsPageProps {
	searchParams: Promise<{
		status?: string;
		search?: string;
		page?: string;
	}>;
}

interface PaginationMeta {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

interface ApiResponse {
	data: CaseConsultations[];
	meta: PaginationMeta;
}

type StatusKey = "all" | "PENDING" | "OPEN" | "CLOSED";

const STATUS_STYLES: Record<
	CaseConsultations["status"],
	{
		label: string;
		badge: string;
		dot: string;
		border: string;
		icon: typeof CircleDot;
	}
> = {
	PENDING: {
		label: "Pendiente",
		badge:
			"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
		dot: "bg-amber-500",
		border: "border-l-amber-500",
		icon: TimerReset,
	},
	OPEN: {
		label: "Abierta",
		badge:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
		dot: "bg-emerald-500",
		border: "border-l-emerald-500",
		icon: CircleDot,
	},
	CLOSED: {
		label: "Cerrada",
		badge:
			"bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
		dot: "bg-slate-400",
		border: "border-l-slate-400",
		icon: CheckCircle,
	},
};

const dateFormatOptions: Intl.DateTimeFormatOptions = {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
};

export default function ConsultationsPage({
	searchParams,
}: ConsultationsPageProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const urlParams = useSearchParams();
	const [consultations, setConsultations] = useState<CaseConsultations[]>([]);
	const [loading, setLoading] = useState(false);
	const [markingAllRead, setMarkingAllRead] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pagination, setPagination] = useState<PaginationMeta>({
		total: 0,
		page: 1,
		limit: 10,
		totalPages: 1,
	});
	const [statusCounts, setStatusCounts] = useState<
		Record<"PENDING" | "OPEN" | "CLOSED", number>
	>({ PENDING: 0, OPEN: 0, CLOSED: 0 });

	const resolvedSearchParams = React.use(searchParams);
	const currentStatus = (resolvedSearchParams.status ?? "all") as StatusKey;

	const fetchConsultations = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const token = session?.user?.accessToken;
			const headers = {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			};

			const buildUrl = (overrides: Record<string, string> = {}) => {
				const url = new URL(
					CASES_CONSULTATIONS_GET_ALL_ENDPOINT,
					window.location.origin,
				);
				Object.entries(resolvedSearchParams ?? {}).forEach(([key, value]) => {
					if (value !== undefined && value !== "") {
						url.searchParams.append(key, value);
					}
				});
				Object.entries(overrides).forEach(([key, value]) => {
					url.searchParams.set(key, value);
				});
				if (!url.searchParams.has("page")) url.searchParams.set("page", "1");
				if (!url.searchParams.has("limit")) url.searchParams.set("limit", "10");
				return url.toString();
			};

			const fetchCount = async (status: "PENDING" | "OPEN" | "CLOSED") => {
				const url = new URL(
					CASES_CONSULTATIONS_GET_ALL_ENDPOINT,
					window.location.origin,
				);
				url.searchParams.set("status", status);
				url.searchParams.set("page", "1");
				url.searchParams.set("limit", "1");
				const res = await fetch(url.toString(), { headers, method: "GET" });
				if (!res.ok) return 0;
				const json: ApiResponse = await res.json();
				return json.meta?.total ?? 0;
			};

			const [listRes, pending, open, closed] = await Promise.all([
				fetch(buildUrl(), { headers, method: "GET" }),
				fetchCount("PENDING"),
				fetchCount("OPEN"),
				fetchCount("CLOSED"),
			]);

			if (!listRes.ok) throw new Error("Error fetching consultations");

			const apiResponse: ApiResponse = await listRes.json();
			setConsultations(apiResponse.data);
			setPagination(apiResponse.meta);
			setStatusCounts({ PENDING: pending, OPEN: open, CLOSED: closed });
		} catch (err) {
			console.error("Failed to fetch consultations:", err);
			setError("No se pudieron cargar las consultas. Probá refrescar.");
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, resolvedSearchParams]);

	const handleMarkAllAsRead = async () => {
		try {
			setMarkingAllRead(true);
			const response = await fetch(CASES_CONSULTATIONS_MARK_ALL_READ_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!response.ok) throw new Error("Error marking all as read");

			setConsultations((prev) =>
				prev.map((c) => ({ ...c, unreadMessages: 0 })),
			);
			toast.success("Todas las consultas marcadas como leídas");
		} catch (err) {
			console.error("Error marking all as read:", err);
			toast.error("No se pudieron marcar como leídas");
		} finally {
			setMarkingAllRead(false);
		}
	};

	const handleStatusChange = (status: StatusKey) => {
		const params = new URLSearchParams(urlParams.toString());
		params.set("page", "1");
		if (status === "all") params.delete("status");
		else params.set("status", status);
		router.push(`/admin/consultations?${params.toString()}`);
	};

	const onPageChange = (page: number) => {
		const params = new URLSearchParams(urlParams.toString());
		params.set("page", page.toString());
		router.push(`/admin/consultations?${params.toString()}`);
	};

	useEffect(() => {
		if (session?.user?.accessToken) fetchConsultations();
	}, [session?.user?.accessToken, fetchConsultations]);

	const totalUnread = useMemo(
		() => consultations.reduce((sum, c) => sum + (c.unreadMessages || 0), 0),
		[consultations],
	);

	const grandTotal =
		statusCounts.PENDING + statusCounts.OPEN + statusCounts.CLOSED;

	const tabs: Array<{ key: StatusKey; label: string; count?: number }> = [
		{ key: "all", label: "Todas", count: grandTotal },
		{ key: "PENDING", label: "Pendientes", count: statusCounts.PENDING },
		{ key: "OPEN", label: "Abiertas", count: statusCounts.OPEN },
		{ key: "CLOSED", label: "Cerradas", count: statusCounts.CLOSED },
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<MessageSquare className="h-6 w-6 text-primary" />
						Gestor de Consultas
					</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						Mensajes de clientes sobre sus casos
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						onClick={fetchConsultations}
						disabled={loading}
						variant="outline"
						size="sm"
					>
						<RefreshCw
							className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
						/>
						Actualizar
					</Button>
					<Button
						onClick={handleMarkAllAsRead}
						variant="outline"
						size="sm"
						disabled={markingAllRead || totalUnread === 0}
					>
						<CheckCircle className="h-4 w-4 mr-2" />
						Marcar todas
					</Button>
				</div>
			</div>

			{/* Stats cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<StatCard
					icon={Inbox}
					label="Total"
					value={grandTotal}
					accent="text-primary"
				/>
				<StatCard
					icon={Mail}
					label="Sin leer"
					value={totalUnread}
					accent="text-amber-600 dark:text-amber-400"
					highlight={totalUnread > 0}
				/>
				<StatCard
					icon={TimerReset}
					label="Pendientes"
					value={statusCounts.PENDING}
					accent="text-amber-600 dark:text-amber-400"
				/>
				<StatCard
					icon={CircleDot}
					label="Abiertas"
					value={statusCounts.OPEN}
					accent="text-emerald-600 dark:text-emerald-400"
				/>
			</div>

			{/* Tabs + search */}
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
				<div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 overflow-x-auto">
					{tabs.map((tab) => {
						const active = currentStatus === tab.key;
						return (
							<button
								key={tab.key}
								onClick={() => handleStatusChange(tab.key)}
								className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
									active
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{tab.label}
								{typeof tab.count === "number" && (
									<span
										className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
											active
												? "bg-primary/10 text-primary"
												: "bg-muted text-muted-foreground"
										}`}
									>
										{tab.count}
									</span>
								)}
							</button>
						);
					})}
				</div>

				<ConsultationFilters />
			</div>

			{/* Error */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>No se pudieron cargar las consultas</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Content */}
			<div className="rounded-xl border border-border bg-card overflow-hidden">
				{loading ? (
					<LoadingSkeleton />
				) : consultations.length === 0 ? (
					<EmptyState status={currentStatus} />
				) : (
					<ul className="divide-y divide-border">
						{consultations.map((c) => (
							<ConsultationRow key={c.id} consultation={c} />
						))}
					</ul>
				)}

				{!loading && pagination.totalPages > 1 && (
					<div className="px-4 py-3 border-t border-border">
						<Pagination
							currentPage={pagination.page}
							totalPages={pagination.totalPages}
							totalItems={pagination.total}
							itemsPerPage={pagination.limit}
							onPageChange={onPageChange}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

// ── Sub-componentes ────────────────────────────────────────────────────

function StatCard({
	icon: Icon,
	label,
	value,
	accent,
	highlight,
}: {
	icon: typeof Inbox;
	label: string;
	value: number;
	accent: string;
	highlight?: boolean;
}) {
	return (
		<div
			className={`rounded-xl border bg-card p-4 ${
				highlight
					? "border-amber-300 ring-1 ring-amber-200 dark:border-amber-700 dark:ring-amber-900/30"
					: "border-border"
			}`}
		>
			<div className="flex items-center justify-between">
				<span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
					{label}
				</span>
				<Icon className={`h-4 w-4 ${accent}`} />
			</div>
			<p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
		</div>
	);
}

function ConsultationRow({
	consultation,
}: {
	consultation: CaseConsultations;
}) {
	const styles = STATUS_STYLES[consultation.status];
	const StatusIcon = styles.icon;
	const isUnread = consultation.unreadMessages > 0;
	const borderClass = isUnread ? "border-l-amber-500" : styles.border;

	return (
		<li>
			<Link
				href={`/admin/consultations/${consultation.id}`}
				className={`block px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors border-l-4 ${borderClass} ${
					isUnread ? "bg-amber-50/30 dark:bg-amber-900/5" : ""
				}`}
			>
				<div className="flex items-start gap-4">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
							<p
								className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}
							>
								{consultation.title}
							</p>
							<span
								className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}
							>
								<StatusIcon className="h-3 w-3" />
								{styles.label}
							</span>
							{isUnread && (
								<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500 text-white">
									<Mail className="h-3 w-3" />
									{consultation.unreadMessages}
								</span>
							)}
						</div>

						{consultation.cases?.title && (
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
								<FolderOpen className="h-3.5 w-3.5" />
								<span className="truncate">{consultation.cases.title}</span>
							</div>
						)}

						{consultation.lastMessagePreview && (
							<p className="text-sm text-muted-foreground mt-2 line-clamp-2">
								{consultation.lastMessagePreview}
							</p>
						)}
					</div>

					<div className="hidden md:flex flex-col items-end text-[11px] text-muted-foreground shrink-0 gap-1">
						<div className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{new Date(consultation.createdAt).toLocaleDateString(
								"es-ES",
								dateFormatOptions,
							)}
						</div>
					</div>
				</div>
			</Link>
		</li>
	);
}

function LoadingSkeleton() {
	return (
		<div className="divide-y divide-border">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="px-6 py-4 border-l-4 border-l-transparent">
					<div className="flex items-center gap-2 mb-2">
						<Skeleton className="h-4 w-4 rounded" />
						<Skeleton className="h-4 w-64" />
						<Skeleton className="h-4 w-16 rounded-full" />
					</div>
					<Skeleton className="h-3 w-48 mt-2" />
					<Skeleton className="h-3 w-full mt-2" />
				</div>
			))}
		</div>
	);
}

function EmptyState({ status }: { status: StatusKey }) {
	const labelByStatus: Record<StatusKey, string> = {
		all: "No hay consultas todavía",
		PENDING: "No hay consultas pendientes",
		OPEN: "No hay consultas abiertas",
		CLOSED: "No hay consultas cerradas",
	};
	return (
		<div className="py-16 text-center">
			<Inbox className="h-12 w-12 mx-auto text-muted-foreground/40" />
			<p className="mt-3 text-sm font-medium text-foreground">
				{labelByStatus[status]}
			</p>
			<p className="text-xs text-muted-foreground mt-1">
				Cuando un cliente envíe un mensaje desde el portal va a aparecer acá.
			</p>
		</div>
	);
}
